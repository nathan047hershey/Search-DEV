// Gender filter helper - detects pronouns in bio
const detectGender = (bio: string | null): string | null => {
  if (!bio) return null;
  const lowerBio = bio.toLowerCase();
  if (/\b(non-binary|nonbinary|enby|agender|genderfluid|genderqueer|bigender|pangender)\b/i.test(lowerBio)) {
    return "non-binary";
  }
  if (/\b(pronouns?[:\s]+(they|them))\b/i.test(lowerBio) || 
      /\b(uses?[:\s]+(they|them))\b/i.test(lowerBio)) {
    return "non-binary";
  }
  const shePatterns = /\b(she|her|hers)\b/gi;
  const sheMatches = lowerBio.match(shePatterns);
  if (sheMatches && sheMatches.length > 0) {
    return "female";
  }
  const hePatterns = /\b(he|him|his)\b/gi;
  const heMatches = lowerBio.match(hePatterns);
  if (heMatches && heMatches.length > 0) {
    return "male";
  }
  return null;
};

import { NextRequest, NextResponse } from "next/server";
import { searchUsers, getUser } from "@/lib/github";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findEmailForDeveloper } from "@/lib/email-orchestrator";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const searchParams = request.nextUrl.searchParams;

  const q = searchParams.get("q") || "";
  const language = searchParams.get("language") || "";
  const location = searchParams.get("location") || "";
  const minFollowers = searchParams.get("minFollowers") || "";
  const minRepos = searchParams.get("minRepos") || "";
  const minStars = searchParams.get("minStars") || "";
  const company = searchParams.get("company") || "";
  const hireable = searchParams.get("hireable") === "true";
  const blog = searchParams.get("blog") || "";
  const bio = searchParams.get("bio") || "";
  const skills = searchParams.get("skills") || "";
  const gender = searchParams.get("gender") || "all";
  const sort = (searchParams.get("sort") as "followers" | "repositories" | "joined") || "followers";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";
  const page = parseInt(searchParams.get("page") || "1");

  try {
    let query = q;

    if (language) {
      query += ` language:${language}`;
    }
    if (location) {
      query += ` location:${location}`;
    }
    if (minFollowers) {
      query += ` followers:>=${minFollowers}`;
    }
    if (company) {
      query += ` company:${company}`;
    }
    if (hireable) {
      query += " hireable:true";
    }
    if (blog) {
      query += ` blog:${blog}`;
    }
    if (bio) {
      query += ` bio:${bio}`;
    }
    if (skills) {
      const skillList = skills.split(",");
      skillList.forEach((skill) => {
        query += ` topic:${skill.trim()}`;
      });
    }

    const searchResults = await searchUsers(
      {
        q: query,
        language: language,
        location: location,
        minFollowers: minFollowers ? parseInt(minFollowers) : undefined,
        sort,
        order,
        page,
        per_page: 100,
      },
      session?.user?.accessToken
    );
    
    const usersWithEmails = await Promise.all(
      (searchResults.items || []).map(async (user: any) => {
        try {
          const userDetail = await getUser(user.login);

          // Run the multi-strategy email orchestrator (try in parallel for speed)
          const orchestratorResult = await findEmailForDeveloper({
            login: userDetail.login,
            name: userDetail.name || null,
            bio: userDetail.bio || null,
            company: userDetail.company || null,
            location: userDetail.location || null,
            blog: userDetail.blog || "",
            publicEmail: userDetail.email || null,
            accessToken: session?.user?.accessToken,
          });

          const finalEmail = orchestratorResult.email;
          const hasAnyEmail = !!finalEmail;
          const hasGitHubEmail = orchestratorResult.source === "github_public";

          return {
            ...user,
            hasEmail: hasAnyEmail,
            hasEmailOnly: hasGitHubEmail,
            email: finalEmail,
            emailValidated: hasAnyEmail,
            emailSource: orchestratorResult.source,
            emailSourceLabel: orchestratorResult.sourceLabel,
            strategiesTried: orchestratorResult.strategiesTried,
            resumeUrls: orchestratorResult.resumeUrls,
            portfolioUrls: orchestratorResult.portfolioUrls,
            blog: userDetail.blog || "",
            bio: userDetail.bio || "",
          };
        } catch {
          return {
            ...user,
            hasEmail: false,
            hasEmailOnly: false,
            email: null,
            emailValidated: false,
            emailSource: "not_found",
            blog: user.blog || "",
            bio: user.bio || "",
          };
        }
      })
    );

    let usersWithDetails = usersWithEmails;

    const hasEmailFilter = searchParams.get("hasEmail") === "true";
    const hasEmailOnlyFilter = searchParams.get("hasEmailOnly") === "true";

    if (hasEmailOnlyFilter) {
      usersWithDetails = usersWithDetails.filter((user: any) => user.hasEmailOnly);
    } else if (hasEmailFilter) {
      usersWithDetails = usersWithDetails.filter((user: any) => user.hasEmail);
    }

    if (minRepos) {
      const minReposNum = parseInt(minRepos);
      usersWithDetails = usersWithDetails.filter(
        (user: any) => (user.public_repos || 0) >= minReposNum
      );
    }

    return NextResponse.json({
      ...searchResults,
      users: usersWithDetails,
      query: {
        q,
        language,
        location,
        minFollowers,
        minRepos,
        minStars,
        company,
        hireable,
        blog,
        bio,
        skills,
        gender,
        sort,
        order,
        page,
      },
    });
  } catch (error: unknown) {
    console.error("Search error:", error);
    
    const errorObj = error as { status?: number; message?: string };
    if (errorObj?.status === 403 || errorObj?.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Please wait and try again.", rateLimited: true },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "Search failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
