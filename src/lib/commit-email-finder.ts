/**
 * Commit Email Finder - Extracts emails from GitHub commit patches
 * When you add .patch to a commit URL, GitHub shows the full patch including author email
 */

export interface CommitEmailResult {
  email: string;
  source: string;
  confidence: "high" | "medium" | "low";
  commitUrl?: string;
}

/**
 * Fetch commits from a repository and extract emails from .patch format
 */
export async function findEmailFromCommits(
  username: string,
  accessToken?: string
): Promise<CommitEmailResult | null> {
  try {
    const headers: HeadersInit = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "GitHubDevSearch/1.0",
    };
    
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // Get user's repos with parallel requests
    const reposResponse = await fetch(
      `https://api.github.com/users/${username}/repos?sort=pushed&per_page=5&type=public`,
      { headers }
    );

    if (!reposResponse.ok) {
      return null;
    }

    const repos = await reposResponse.json();
    
    if (!Array.isArray(repos) || repos.length === 0) {
      return null;
    }

    // Check repos in parallel for faster results
    const results = await Promise.all(
      repos.slice(0, 3).map(repo => 
        findEmailFromRepoCommitsFast(username, repo.name, headers)
      )
    );

    // Return first successful result
    for (const result of results) {
      if (result) return result;
    }

    return null;
  } catch (error) {
    console.error("Error finding email from commits:", error);
    return null;
  }
}

/**
 * Fast commit email finder - checks first 10 commits in parallel
 */
async function findEmailFromRepoCommitsFast(
  username: string,
  repoName: string,
  headers: HeadersInit
): Promise<CommitEmailResult | null> {
  try {
    // Get only first 10 commits
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${username}/${repoName}/commits?per_page=10`,
      { headers }
    );

    if (!commitsResponse.ok) {
      return null;
    }

    const commits = await commitsResponse.json();
    
    if (!Array.isArray(commits) || commits.length === 0) {
      return null;
    }

    // Filter to user's commits
    const userCommits = commits.filter((c: any) => 
      c.author?.login === username || c.committer?.login === username
    );

    if (userCommits.length === 0) {
      return null;
    }

    // Fetch patches in PARALLEL (much faster!)
    const patchPromises = userCommits.slice(0, 5).map(async (commit: any) => {
      const sha = commit.sha;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        const patchResponse = await fetch(
          `https://github.com/${username}/${repoName}/commit/${sha}.patch`,
          { 
            headers: { "User-Agent": "GitHubDevSearch/1.0" },
            signal: controller.signal 
          }
        );
        
        clearTimeout(timeout);
        
        if (!patchResponse.ok) return null;
        
        const patchText = await patchResponse.text();
        const fromMatch = patchText.match(/From:\s+(.+?)\s+<([^>]+)>/);
        
        if (fromMatch && fromMatch[2]) {
          const authorName = fromMatch[1].trim();
          const email = fromMatch[2].trim().toLowerCase();
          
          if (email.includes("noreply")) return null;
          
          // Calculate match score
          let matchScore = calculateMatchScore(authorName, username, email);
          
          return { email, authorName, sha, matchScore };
        }
      } catch {
        return null;
      }
      return null;
    });

    // Wait for all patches in parallel
    const results = await Promise.all(patchPromises);
    const validResults = results.filter(r => r !== null) as any[];

    if (validResults.length === 0) {
      return null;
    }

    // Sort by match score
    validResults.sort((a, b) => b.matchScore - a.matchScore);
    
    const best = validResults[0];
    const confidence = best.matchScore >= 80 ? "high" : best.matchScore >= 50 ? "medium" : "low";
    
    return {
      email: best.email,
      source: `Found in ${repoName} (${best.authorName}, ${validResults.length} found)`,
      confidence,
      commitUrl: `https://github.com/${username}/${repoName}/commit/${best.sha}`,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate match score between author name and username
 */
function calculateMatchScore(authorName: string, username: string, email: string): number {
  let score = 0;
  const lowerName = authorName.toLowerCase();
  const lowerUsername = username.toLowerCase();
  
  // Exact match
  if (lowerName === lowerUsername) score = 100;
  // Partial match
  else if (lowerName.includes(lowerUsername) || lowerUsername.includes(lowerName)) score = 80;
  // Name part matches
  else {
    const parts = lowerName.split(/\s+/);
    for (const part of parts) {
      if (part.length > 2 && (part.includes(lowerUsername) || lowerUsername.includes(part))) {
        score = 60;
        break;
      }
    }
  }
  
  // Personal email bonus
  if (email.includes("gmail") || email.includes("yahoo") || 
      email.includes("hotmail") || email.includes("outlook") || email.includes("proton")) {
    score += 10;
  }
  
  return score;
}

/**
 * Alternative method: Check repository's git clone URL and try to extract author info
 */
export async function findEmailFromGitHistory(
  username: string,
  repoName: string
): Promise<CommitEmailResult | null> {
  try {
    // Use GitHub's archive to get commit data
    const response = await fetch(
      `https://api.github.com/repos/${username}/${repoName}/commits?per_page=20`,
      {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "GitHubDevSearch/1.0",
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const commits = await response.json();
    
    if (!Array.isArray(commits)) {
      return null;
    }

    // Check commit author emails from API response
    for (const commit of commits) {
      // Check commit author
      if (commit.author?.email && !commit.author.email.includes("noreply")) {
        return {
          email: commit.author.email,
          source: `Found in ${repoName} commit history`,
          confidence: "medium",
        };
      }
      
      // Check committer
      if (commit.committer?.email && !commit.committer.email.includes("noreply")) {
        return {
          email: commit.committer.email,
          source: `Found in ${repoName} commit history`,
          confidence: "medium",
        };
      }
      
      // Check the commit object itself
      if (commit.commit?.author?.email && !commit.commit.author.email.includes("noreply")) {
        return {
          email: commit.commit.author.email,
          source: `Found in ${repoName} commit`,
          confidence: "medium",
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
