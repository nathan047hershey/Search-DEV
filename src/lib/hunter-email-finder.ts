/**
 * Hunter.io Email Finder
 * Uses Hunter.io API to find professional emails
 * 
 * Get a free API key at: https://hunter.io/api
 * Free tier: 25 searches/month
 */

const HUNTER_API_BASE = "https://api.hunter.io/v2";

interface HunterEmailResult {
  email: string | null;
  source: string;
  confidence: number;
  pattern?: string;
  company?: string;
}

/**
 * Search for email using domain and name
 */
export async function findEmailWithHunter(
  firstName: string,
  lastName: string,
  domain: string,
  companyName?: string
): Promise<HunterEmailResult | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  
  if (!apiKey) {
    console.log("Hunter.io API key not configured");
    return null;
  }

  try {
    // Try domain search with name
    const url = new URL(`${HUNTER_API_BASE}/email-finder`);
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("domain", domain);
    url.searchParams.append("first_name", firstName);
    url.searchParams.append("last_name", lastName);
    if (companyName) {
      url.searchParams.append("company", companyName);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error("Hunter API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.data?.email) {
      return {
        email: data.data.email,
        source: "hunter_io",
        confidence: data.data.score || 70,
        pattern: data.data.pattern,
        company: data.data.company,
      };
    }

    return null;
  } catch (error) {
    console.error("Hunter.io error:", error);
    return null;
  }
}

/**
 * Search for emails on a domain
 */
export async function searchDomainEmails(
  domain: string,
  limit: number = 10
): Promise<HunterEmailResult[]> {
  const apiKey = process.env.HUNTER_API_KEY;
  
  if (!apiKey) {
    return [];
  }

  try {
    const url = new URL(`${HUNTER_API_BASE}/domain-search`);
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("domain", domain);
    url.searchParams.append("limit", limit.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    return (data.data?.emails || []).map((email: any) => ({
      email: email.value,
      source: "hunter_io",
      confidence: email.score || 50,
      pattern: email.type,
    }));
  } catch (error) {
    console.error("Hunter domain search error:", error);
    return [];
  }
}

/**
 * Find company domain from company name
 */
export async function findCompanyDomainWithHunter(
  companyName: string
): Promise<string | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    const url = new URL(`${HUNTER_API_BASE}/domain-search`);
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("domain", companyName.replace(/\s+/g, "").toLowerCase() + ".com");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    return data.data?.domain || null;
  } catch (error) {
    console.error("Hunter company search error:", error);
    return null;
  }
}
