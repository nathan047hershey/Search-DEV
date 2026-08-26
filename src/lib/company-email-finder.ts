/**
 * Company Email Finder - Searches company's website for developer emails
 */

export interface CompanyEmailResult {
  email: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Clean company name to create a potential domain
 */
function cleanCompanyName(company: string): string | null {
  if (!company) return null;
  
  // Remove common prefixes/suffixes
  let cleaned = company
    .replace(/^@/, "") // Remove @ prefix
    .replace(/\s+(Inc|LLC|Ltd|Corp|Corporation|Company|Co|GmbH|AG|SA|SARL|Pte|Ltd\.)$/i, "") // Remove company suffixes
    .replace(/[.,!?]/g, "") // Remove punctuation
    .trim();

  // Convert to domain-like format
  const domainMapping: Record<string, string> = {
    "google": "google.com",
    "microsoft": "microsoft.com",
    "amazon": "amazon.com",
    "facebook": "meta.com",
    "meta": "meta.com",
    "apple": "apple.com",
    "netflix": "netflix.com",
    "twitter": "twitter.com",
    "uber": "uber.com",
    "airbnb": "airbnb.com",
    "spotify": "spotify.com",
    "stripe": "stripe.com",
    "shopify": "shopify.com",
    "github": "github.com",
    "gitlab": "gitlab.com",
    "slack": "slack.com",
    "zoom": "zoom.us",
    "salesforce": "salesforce.com",
    "oracle": "oracle.com",
    "ibm": "ibm.com",
    "intel": "intel.com",
    "nvidia": "nvidia.com",
    "adobe": "adobe.com",
    "paypal": "paypal.com",
    "dropbox": "dropbox.com",
    "linkedin": "linkedin.com",
    "yahoo": "yahoo.com",
    "ebay": "ebay.com",
    "alibaba": "alibaba.com",
    "tencent": "tencent.com",
    "baidu": "baidu.com",
    "bytedance": "bytedance.com",
    "huawei": "huawei.com",
    "samsung": "samsung.com",
    "sony": "sony.com",
    "tesla": "tesla.com",
    "spacex": "spacex.com",
    "openai": "openai.com",
    "deepmind": "deepmind.com",
    "anthropic": "anthropic.com",
    "datadog": "datadoghq.com",
    "cloudflare": "cloudflare.com",
    "vercel": "vercel.com",
    "digitalocean": "digitalocean.com",
    "heroku": "heroku.com",
    "azure": "azure.microsoft.com",
    "aws": "aws.amazon.com",
    "gcp": "cloud.google.com",
  };

  const lowerCleaned = cleaned.toLowerCase();
  
  if (domainMapping[lowerCleaned]) {
    return domainMapping[lowerCleaned];
  }

  // For other companies, return a potential domain format
  return `${lowerCleaned.replace(/\s+/g, "")}.com`;
}

/**
 * Extract potential email patterns from name
 */
function getNamePatterns(name: string | null, login: string): string[] {
  const patterns: string[] = [];
  
  if (name) {
    const parts = name.toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      patterns.push(`${parts[0]}.${parts[parts.length - 1]}`);
      patterns.push(`${parts[0][0]}${parts[parts.length - 1]}`);
      patterns.push(`${parts[0]}_${parts[parts.length - 1]}`);
      patterns.push(`${parts[0]}${parts[parts.length - 1]}`);
    }
    if (parts.length === 1) {
      patterns.push(`${parts[0]}`);
    }
  }
  
  // Always include GitHub login
  patterns.push(login);
  
  return Array.from(new Set(patterns));
}

/**
 * Search company's website for developer email
 */
export async function searchCompanyForEmail(
  company: string,
  developerName: string | null,
  githubLogin: string
): Promise<CompanyEmailResult | null> {
  if (!company) return null;

  const domain = cleanCompanyName(company);
  if (!domain) return null;

  const namePatterns = getNamePatterns(developerName, githubLogin);
  const commonPrefixes = ["dev", "engineering", "software", "tech", "data", "product", "frontend", "backend"];

  // Build list of emails to check
  const emailsToTry: string[] = [];
  
  for (const namePattern of namePatterns) {
    for (const prefix of commonPrefixes) {
      emailsToTry.push(`${prefix}-${namePattern}@${domain}`);
      emailsToTry.push(`${namePattern}@${domain}`);
      emailsToTry.push(`${namePattern}.${domain.split('.')[0]}@${domain}`);
    }
  }

  // Try each potential email by checking if it exists
  // We'll try the company's careers/about page first to find contact info
  try {
    const urlsToCheck = [
      `https://${domain}/about`,
      `https://${domain}/contact`,
      `https://${domain}/team`,
      `https://${domain}/careers`,
      `https://${domain}`,
      `https://www.${domain}`,
    ];

    for (const url of urlsToCheck) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; GitHubDevSearch/1.0)",
          },
          redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) continue;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) continue;

        const html = await response.text();

        // Look for email patterns in the page
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = html.match(emailPattern) || [];

        // Filter out common emails and find relevant ones
        const relevantEmails = emails.filter(email => {
          const lower = email.toLowerCase();
          return !lower.includes("example.com") &&
                 !lower.includes("test.com") &&
                 !lower.includes("noreply") &&
                 !lower.includes("no-reply") &&
                 !lower.includes("support@") &&
                 !lower.includes("info@") &&
                 !lower.includes("help@") &&
                 domain.split('.')[0] === lower.split('@')[1]?.split('.')[0];
        });

        if (relevantEmails.length > 0) {
          return {
            email: relevantEmails[0],
            source: `Found on ${domain}`,
            confidence: "medium",
          };
        }

        // Look for team/about pages links
        const teamLinkMatch = html.match(/href=["']([^"']*(?:team|about|people|staff)[^"']*)["']/i);
        if (teamLinkMatch && teamLinkMatch[1]) {
          const teamUrl = new URL(teamLinkMatch[1], url).href;
          if (teamUrl !== url) {
            const teamResult = await checkTeamPageForEmail(teamUrl, namePatterns, domain);
            if (teamResult) return teamResult;
          }
        }
      } catch {
        continue;
      }
    }
  } catch (error) {
    console.error("Error searching company website:", error);
  }

  return null;
}

/**
 * Check a team/about page for developer email
 */
async function checkTeamPageForEmail(
  url: string,
  namePatterns: string[],
  domain: string
): Promise<CompanyEmailResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GitHubDevSearch/1.0)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // Look for developer by name pattern
    for (const pattern of namePatterns) {
      // Look for the name near an email
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const emailNearNamePattern = new RegExp(
        `${escapedPattern}[^<]*?<[^>]*>([^<]*@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})|<([^>]*@[^>]*)[^<]*${escapedPattern}`,
        'gi'
      );
      
      const matches = html.match(emailNearNamePattern);
      if (matches && matches.length > 0) {
        const emailMatch = matches[0].match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          return {
            email: emailMatch[0],
            source: `Found on team page ${url}`,
            confidence: "high",
          };
        }
      }
    }

    // Just look for any email on the page
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailPattern) || [];
    
    const companyEmails = emails.filter(email => 
      email.toLowerCase().includes(domain.split('.')[0])
    );

    if (companyEmails.length > 0) {
      return {
        email: companyEmails[0],
        source: `Found on team page`,
        confidence: "medium",
      };
    }
  } catch {
    // Ignore errors
  }

  return null;
}
