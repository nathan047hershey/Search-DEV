/**
 * Email Scraper - Attempts to find email addresses from developer websites
 */

export interface ScrapedEmail {
  email: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Scrape a website for email addresses
 */
export async function scrapeWebsiteForEmails(url: string): Promise<ScrapedEmail | null> {
  if (!url) return null;

  try {
    // Normalize URL
    let fetchUrl = url;
    if (!fetchUrl.startsWith("http://") && !fetchUrl.startsWith("https://")) {
      fetchUrl = `https://${fetchUrl}`;
    }

    // Add timeout and follow redirects
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GitHubDevSearch/1.0)",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    
    // Only parse HTML pages
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();

    // Multiple email patterns to try
    const emailPatterns = [
      // Standard email pattern
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // Email with mailto:
      /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      // Obfuscated email (dots and @ symbol split)
      /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\s*\[dot\]\s*[a-zA-Z]{2,}/gi,
      // Email in href
      /href=["']mailto:([^"']+)["']/gi,
    ];

    for (const pattern of emailPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Clean up the email
          let email = match;
          
          // Remove mailto:
          email = email.replace(/mailto:/gi, "");
          
          // Convert obfuscated emails
          email = email.replace(/\[at\]/gi, "@");
          email = email.replace(/\[dot\]/gi, ".");
          email = email.replace(/\s*\[at\]\s*/gi, "@");
          email = email.replace(/\s*\[dot\]\s*/gi, ".");
          
          // Remove any surrounding quotes or href parts
          email = email.replace(/^["']|["']$/g, "");
          email = email.trim();

          // Basic validation
          if (isValidEmail(email) && !isCommonEmail(email)) {
            return {
              email,
              source: `Found on ${new URL(fetchUrl).hostname}`,
              confidence: "medium",
            };
          }
        }
      }
    }

    // Look for contact page patterns
    const contactPatterns = [
      /contact[@.]/gi,
      /info[@.]/gi,
      /hello[@.]/gi,
    ];

    for (const pattern of contactPatterns) {
      if (pattern.test(html)) {
        // Try to find contact page link
        const contactMatch = html.match(/href=["']([^"']*contact[^"']*)["']/i);
        if (contactMatch && contactMatch[1]) {
          // Recursively check contact page (limited depth)
          const contactUrl = new URL(contactMatch[1], fetchUrl).href;
          if (contactUrl !== fetchUrl) {
            return scrapeWebsiteForEmails(contactUrl);
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error scraping website:", error);
    return null;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Filter out common/generic emails
 */
function isCommonEmail(email: string): boolean {
  const commonEmails = [
    "example@example.com",
    "test@test.com",
    "admin@example.com",
    "noreply@github.com",
    "support@github.com",
    "privacy@github.com",
  ];
  return commonEmails.includes(email.toLowerCase());
}

/**
 * Scrape multiple URLs (blog + portfolio)
 */
export async function scrapeMultipleUrls(urls: string[]): Promise<ScrapedEmail | null> {
  for (const url of urls) {
    if (url) {
      const result = await scrapeWebsiteForEmails(url);
      if (result) {
        return result;
      }
    }
  }
  return null;
}
