/**
 * LinkedIn Email Finder
 * Uses LinkedIn profile to find company and guess email pattern
 */

// Common email patterns based on first/last name
const EMAIL_PATTERNS = [
  "{first}.{last}@{domain}",
  "{first}{last}@{domain}",
  "{first}_{last}@{domain}",
  "{first[0]}{last}@{domain}",
  "{first}{last[0]}@{domain}",
  "{first}@{domain}",
  "{last}@{domain}",
];

// Domain variations to try
const DOMAIN_VARIATIONS = [
  "{company}.com",
  "www.{company}.com",
  "{company}.io",
  "{company}.co",
];

// Common email providers for personal emails
const PERSONAL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "protonmail.com",
];

/**
 * Extract company domain from LinkedIn or company website
 */
async function findCompanyDomain(company: string, linkedinUrl?: string): Promise<string | null> {
  try {
    // Try to extract from LinkedIn URL
    if (linkedinUrl?.includes("linkedin.com/company/")) {
      const companySlug = linkedinUrl.split("linkedin.com/company/")[1]?.split("/")[0];
      if (companySlug) {
        // Check common domains
        for (const variation of DOMAIN_VARIATIONS) {
          const domain = variation.replace("{company}", companySlug.replace(/-/g, ""));
          try {
            const response = await fetch(`https://${domain}`, { 
              method: "HEAD",
              signal: AbortSignal.timeout(3000)
            });
            if (response.ok) {
              return domain;
            }
          } catch {
            // Domain doesn't exist
          }
        }
      }
    }

    // Clean company name
    const cleanCompany = company.replace(/^@/, "").trim().toLowerCase();
    
    // Try common variations
    for (const variation of DOMAIN_VARIATIONS) {
      const domain = variation.replace("{company}", cleanCompany.replace(/\s+/g, "").replace(/[^a-z0-9]/g, ""));
      try {
        const response = await fetch(`https://${domain}`, { 
          method: "HEAD",
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          return domain;
        }
      } catch {
        // Domain doesn't exist
      }
    }
  } catch (error) {
    console.error("Error finding company domain:", error);
  }
  
  return null;
}

/**
 * Try to find email using name and company
 */
export async function findEmailFromLinkedIn(
  name: string | null,
  username: string,
  company: string | null,
  linkedinUrl?: string
): Promise<{ email: string | null; source: string; confidence: string } | null> {
  if (!name && !company) {
    return null;
  }

  const nameParts = (name || username).split(" ");
  const firstName = nameParts[0]?.toLowerCase() || "";
  const lastName = nameParts.slice(1).join("").toLowerCase() || username.toLowerCase();

  // Try to find company domain
  let companyDomain = company ? await findCompanyDomain(company, linkedinUrl) : null;

  // If no company domain found, try to search for company website
  if (!companyDomain && company) {
    try {
      // Try Google search (simplified - in production use Google Custom Search API)
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(company + " official website")}`;
      // Note: Direct Google scraping is blocked, this is a placeholder
    } catch (error) {
      console.error("Error searching for company:", error);
    }
  }

  // Try company email patterns
  if (companyDomain) {
    for (const pattern of EMAIL_PATTERNS) {
      const email = pattern
        .replace("{first}", firstName)
        .replace("{first[0]}", firstName[0] || "")
        .replace("{last}", lastName)
        .replace("{last[0]}", lastName[0] || "")
        .replace("{domain}", companyDomain)
        .toLowerCase();

      // Verify email exists (simplified - in production use email verification API)
      const isValid = await verifyEmail(email);
      if (isValid) {
        return {
          email,
          source: "linkedin_company",
          confidence: "medium",
        };
      }
    }
  }

  return null;
}

/**
 * Verify if email exists (simplified version)
 * In production, use an email verification API like ZeroBounce, Hunter.io, or Abstract API
 */
async function verifyEmail(email: string): Promise<boolean> {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  // Don't verify personal email domains
  const domain = email.split("@")[1];
  if (PERSONAL_DOMAINS.includes(domain)) {
    return false;
  }

  // In production, call an email verification API here
  // For now, we'll return true for common patterns
  return true;
}

/**
 * Search for LinkedIn profile and extract info
 */
export async function searchLinkedIn(
  name: string | null,
  username: string,
  company?: string | null
): Promise<{ linkedinUrl?: string; company?: string } | null> {
  if (!name) return null;

  // Build search query
  const searchQuery = [
    name,
    company,
    "software engineer",
    "developer",
    "engineering",
    "GitHub",
    username,
  ].filter(Boolean).join(" ");

  // Note: LinkedIn doesn't have a public API
  // This would require a scraping service or LinkedIn API access
  // For now, return null and rely on manual profile lookup
  
  return null;
}
