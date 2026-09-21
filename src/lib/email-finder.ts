import { GitHubUser, getUserEmails, checkFollowing, createOctokit } from "./github";

export interface EmailResult {
  email: string | null;
  source: "github_public" | "github_oauth" | "bio" | "not_found";
  message: string;
  confidence: "high" | "medium" | "low";
}

interface ExtractedSocialLink {
  platform: string;
  url: string;
  username?: string;
}

/**
 * Parse a GitHub bio to extract social links and potential contact info
 */
export function parseBioForContacts(bio: string | null): ExtractedSocialLink[] {
  const links: ExtractedSocialLink[] = [];
  
  if (!bio) return links;

  // Twitter/X pattern
  const twitterMatch = bio.match(/@([a-zA-Z0-9_]+)/g);
  if (twitterMatch) {
    twitterMatch.forEach((match) => {
      const username = match.substring(1);
      if (!["github", "twitter", "tweet", "retweet"].includes(username.toLowerCase())) {
        links.push({
          platform: "Twitter",
          url: `https://twitter.com/${username}`,
          username,
        });
      }
    });
  }

  // LinkedIn pattern
  const linkedinMatch = bio.match(/linkedin\.com\/in\/([a-zA-Z0-9-_]+)/i);
  if (linkedinMatch) {
    links.push({
      platform: "LinkedIn",
      url: `https://linkedin.com/in/${linkedinMatch[1]}`,
      username: linkedinMatch[1],
    });
  }

  // Email pattern in bio
  const emailMatch = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    links.push({
      platform: "Email",
      url: `mailto:${emailMatch[0]}`,
    });
  }

  // Blog/Website
  const blogMatch = bio.match(/https?:\/\/[^\s]+|www\.[^\s]+/);
  if (blogMatch) {
    links.push({
      platform: "Website",
      url: blogMatch[0].startsWith("http") ? blogMatch[0] : `https://${blogMatch[0]}`,
    });
  }

  return links;
}

/**
 * Try to get email via OAuth (if user follows the target)
 */
export async function tryGetEmailViaOAuth(
  targetUsername: string,
  accessToken: string
): Promise<{ email: string | null; following: boolean }> {
  try {
    // Check if we follow the user (required for getting their email)
    const isFollowing = await checkFollowing(targetUsername, accessToken);
    
    if (!isFollowing) {
      return { email: null, following: false };
    }

    // Get user's emails
    const emails = await getUserEmails(accessToken);
    
    // Find primary verified email
    const primaryEmail = emails.find(
      (e: { email: string; primary: boolean; verified: boolean }) => 
        e.primary && e.verified
    );

    return {
      email: primaryEmail?.email || emails[0]?.email || null,
      following: true,
    };
  } catch (error) {
    console.error("Error getting email via OAuth:", error);
    return { email: null, following: false };
  }
}

/**
 * Comprehensive email finding for a GitHub user
 */
export async function findEmail(
  user: GitHubUser,
  userAccessToken?: string
): Promise<EmailResult> {
  // 1. Check if email is public on GitHub
  if (user.email) {
    return {
      email: user.email,
      source: "github_public",
      message: "Email found on GitHub profile",
      confidence: "high",
    };
  }

  // 2. Try to get via OAuth if logged in
  if (userAccessToken) {
    const oauthResult = await tryGetEmailViaOAuth(user.login, userAccessToken);
    
    if (oauthResult.email) {
      return {
        email: oauthResult.email,
        source: "github_oauth",
        message: "Email found via GitHub OAuth (you follow this user)",
        confidence: "high",
      };
    }

    if (!oauthResult.following) {
      return {
        email: null,
        source: "not_found",
        message: "Follow this developer on GitHub to see their email",
        confidence: "low",
      };
    }
  }

  // 3. Parse bio for email or social links
  const socialLinks = parseBioForContacts(user.bio);
  
  // Check if email is in bio
  const emailFromBio = socialLinks.find((link) => link.platform === "Email");
  if (emailFromBio) {
    return {
      email: emailFromBio.url.replace("mailto:", ""),
      source: "bio",
      message: "Email found in GitHub bio",
      confidence: "medium",
    };
  }

  // Return available social links as alternative contact methods
  if (socialLinks.length > 0) {
    return {
      email: null,
      source: "not_found",
      message: `Found ${socialLinks.length} contact link(s) in profile: ${socialLinks.map((l) => l.platform).join(", ")}`,
      confidence: "low",
    };
  }

  // 4. No email found
  return {
    email: null,
    source: "not_found",
    message: "No public email found. Try following this developer on GitHub.",
    confidence: "low",
  };
}
