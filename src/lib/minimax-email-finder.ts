// AI-powered email finder using Minimax API

interface MinimaxResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function findEmailWithAI(
  username: string,
  name: string | null,
  bio: string | null,
  company: string | null,
  location: string | null,
  blog: string,
  repos: string[]
): Promise<string | null> {
  const apiKey = process.env.MINIMAX_API_KEY;
  
  if (!apiKey) {
    console.log("No Minimax API key found");
    return null;
  }

  try {
    // Build context from available info
    const context = `
GitHub Username: ${username}
Name: ${name || 'Unknown'}
Bio: ${bio || 'No bio'}
Company: ${company || 'Unknown'}
Location: ${location || 'Unknown'}
Blog/Website: ${blog || 'No blog'}
Repository names: ${repos.slice(0, 10).join(', ') || 'None'}

Based on this GitHub developer profile information, find or infer their likely professional email address.
Common patterns:
- firstname.lastname@company.com
- firstname@company.com
- username@email.com
- firstinitiallastname@company.com

If you cannot reasonably infer an email, respond with "NO_EMAIL_FOUND".
Otherwise, respond with just the email address (no explanation).
`;

    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          {
            role: 'user',
            content: context,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Minimax API error:", response.status, errorText);
      return null;
    }

    const data: MinimaxResponse = await response.json();
    const email = data.choices?.[0]?.message?.content?.trim();

    if (email && email !== "NO_EMAIL_FOUND" && email.includes("@")) {
      return email;
    }

    return null;
  } catch (error) {
    console.error("Error calling Minimax API:", error);
    return null;
  }
}

export async function analyzeAndSuggestEmail(
  githubData: {
    login: string;
    name?: string | null;
    bio?: string | null;
    company?: string | null;
    location?: string | null;
    blog?: string;
    topRepos?: string[];
  }
): Promise<{ email: string | null; confidence: 'high' | 'medium' | 'low' }> {
  const email = await findEmailWithAI(
    githubData.login,
    githubData.name || null,
    githubData.bio || null,
    githubData.company || null,
    githubData.location || null,
    githubData.blog || "",
    githubData.topRepos || []
  );

  if (!email) {
    return { email: null, confidence: 'low' };
  }

  // Determine confidence based on available data
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (githubData.company && email.includes(githubData.company.replace("@", ""))) {
    confidence = 'high';
  } else if (githubData.name || githubData.company) {
    confidence = 'medium';
  }

  return { email, confidence };
}
