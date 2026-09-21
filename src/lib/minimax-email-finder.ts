// AI-powered email finder using Minimax API (MiniMax-M2.7 by default)

import { minimaxChatCompletion } from "./minimax-client";

export async function findEmailWithAI(
  username: string,
  name: string | null,
  bio: string | null,
  company: string | null,
  location: string | null,
  blog: string,
  repos: string[]
): Promise<string | null> {
  const context = `
GitHub Username: ${username}
Name: ${name || "Unknown"}
Bio: ${bio || "No bio"}
Company: ${company || "Unknown"}
Location: ${location || "Unknown"}
Blog/Website: ${blog || "No blog"}
Repository names: ${repos.slice(0, 10).join(", ") || "None"}

Based on this GitHub developer profile information, find or infer their likely professional email address.
Common patterns:
- firstname.lastname@company.com
- firstname@company.com
- username@email.com
- firstinitiallastname@company.com

If you cannot reasonably infer an email, respond with "NO_EMAIL_FOUND".
Otherwise, respond with just the email address (no explanation).
`;

  try {
    const result = await minimaxChatCompletion(
      [{ role: "user", content: context }],
      { temperature: 0.3, maxTokens: 120 }
    );

    if (!result) {
      console.log("No Minimax API key found or Minimax call failed");
      return null;
    }

    const email = result.content.trim().split(/\s+/)[0] || "";

    if (email && email !== "NO_EMAIL_FOUND" && email.includes("@")) {
      return email.replace(/[<>,"']/g, "");
    }

    return null;
  } catch (error) {
    console.error("Error calling Minimax API:", error);
    return null;
  }
}

export async function analyzeAndSuggestEmail(githubData: {
  login: string;
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  blog?: string;
  topRepos?: string[];
}): Promise<{ email: string | null; confidence: "high" | "medium" | "low" }> {
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
    return { email: null, confidence: "low" };
  }

  let confidence: "high" | "medium" | "low" = "low";

  if (
    githubData.company &&
    email.includes(githubData.company.replace("@", "").toLowerCase())
  ) {
    confidence = "high";
  } else if (githubData.name || githubData.company) {
    confidence = "medium";
  }

  return { email, confidence };
}
