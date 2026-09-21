"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  MapPin,
  Building,
  Link as LinkIcon,
  Calendar,
  Users,
  BookOpen,
  ArrowLeft,
  Mail,
  Github,
  Globe,
  ExternalLink,
  Star,
  Briefcase,
  FileCode,
} from "lucide-react";
import { EmailComposer } from "@/components/email-composer";

interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  email: string | null;
  twitter_username?: string | null;
  linkedin_username?: string | null;
  hireable?: boolean | null;
  blog_url?: string;
  portfolio_url?: string;
  scrapedEmail?: {
    email: string;
    source: string;
    confidence: string;
  } | null;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const username = (params?.username as string) || "";

  useEffect(() => {
    async function fetchUser() {
      try {
        // Use profile API to get email and social links
        const response = await fetch(`/api/profile/${username}`);
        if (!response.ok) {
          throw new Error("User not found");
        }
        const data = await response.json();
        
        // Process blog/portfolio URL
        let portfolioUrl = data.blog;
        if (data.blog && !data.blog.startsWith("http")) {
          portfolioUrl = `https://${data.blog}`;
        }
        
        // Email from search is already available in data.email
        // The search already fetched the GitHub public email
        const email = data.email;
        
        // Store all email sources for display
        const scrapedEmail = data.scrapedEmail;
        
      setUser({
        ...data,
        email,
        emailSource: data.emailSource,
        portfolio_url: portfolioUrl,
        scrapedEmail,
        companyEmail: data.companyEmail,
        commitEmail: data.commitEmail,
      } as any);
      } catch (err) {
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      fetchUser();
    }
  }, [username]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {error || "User not found"}
        </h1>
        <Link
          href="/"
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <Link href="/" className="text-xl font-bold text-gray-900">
            Search Dev GitHub
          </Link>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Profile Card */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>

          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            <div className="-mt-16">
              <Image
                src={user.avatar_url}
                alt={user.login}
                width={128}
                height={128}
                className="rounded-full border-4 border-white shadow-lg"
              />
              {user.hireable && (
                <span className="absolute -mt-8 ml-20 rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                  Available for hire
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.name || user.login}
                </h1>
                <p className="text-lg text-gray-600">@{user.login}</p>
              </div>

              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
              >
                <Github className="h-5 w-5" />
                View on GitHub
              </a>
            </div>

            {user.bio && (
              <p className="mt-4 text-lg text-gray-700">{user.bio}</p>
            )}

            {/* Info Grid */}
            <div className="mt-6 flex flex-wrap gap-4">
              {user.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  {user.location}
                </div>
              )}
              {user.company && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building className="h-5 w-5" />
                  {user.company}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-5 w-5" />
                Joined {formatDate(user.created_at)}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 flex gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {user.followers.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {user.following.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Following</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {user.public_repos.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Repositories</div>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio & Contact Section */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Portfolio Section */}
          {user.portfolio_url && (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Globe className="h-5 w-5 text-purple-600" />
                  Portfolio
                </h2>
              </div>
              <div className="p-6">
                <a
                  href={user.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 transition-colors hover:bg-purple-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <ExternalLink className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-purple-900">
                      {user.portfolio_url}
                    </p>
                    <p className="text-sm text-purple-600">Visit portfolio website</p>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Contact Section */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Mail className="h-5 w-5 text-blue-600" />
                Contact
              </h2>
            </div>
            <div className="space-y-3 p-6">
              <button
                type="button"
                onClick={() => {
                  if (!session) {
                    router.push("/auth/signin?callbackUrl=" + encodeURIComponent(`/profile/${username}`));
                    return;
                  }
                  setShowComposer(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Mail className="h-4 w-4" />
                Send Message
              </button>

              {user.email ? (
                <a
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-blue-900">
                      {user.email}
                    </p>
                    <p className="text-sm text-blue-600">
                      {(user as any).emailSource === 'github_public' ? 'GitHub Profile' :
                       (user as any).emailSource === 'github_oauth' ? 'GitHub OAuth' :
                       (user as any).emailSource === 'ai_minimax' ? 'AI Minimax' :
                       (user as any).emailSource === 'linkedin' ? 'LinkedIn/Company' :
                       (user as any).emailSource === 'hunter_io' ? 'Hunter.io' :
                       (user as any).emailSource === 'scraped' ? 'Portfolio Scraped' :
                       (user as any).emailSource === 'company' ? 'Company Website' :
                       (user as any).emailSource === 'commit' ? 'GitHub Commit' : 'Found'}
                    </p>
                  </div>
                </a>
              ) : null}
              
              {user.scrapedEmail?.email && user.email !== user.scrapedEmail?.email ? (
                <a
                  href={`mailto:${user.scrapedEmail.email}`}
                  className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 transition-colors hover:bg-green-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Globe className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-green-900">
                      {user.scrapedEmail.email}
                    </p>
                    <p className="text-sm text-green-600">Found on portfolio</p>
                  </div>
                </a>
              ) : null}
              
              {(user as any).companyEmail?.email && user.email !== (user as any).companyEmail?.email ? (
                <a
                  href={`mailto:${(user as any).companyEmail.email}`}
                  className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 transition-colors hover:bg-purple-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <Building className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-purple-900">
                      {(user as any).companyEmail.email}
                    </p>
                    <p className="text-sm text-purple-600">
                      Found on company website
                    </p>
                  </div>
                </a>
              ) : null}
              
              {(user as any).commitEmail?.email && user.email !== (user as any).commitEmail?.email ? (
                <a
                  href={`mailto:${(user as any).commitEmail.email}`}
                  className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 transition-colors hover:bg-orange-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                    <FileCode className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-orange-900">
                      {(user as any).commitEmail.email}
                    </p>
                    <p className="text-sm text-orange-600">
                      Found in commit history
                    </p>
                  </div>
                </a>
              ) : null}
              
              {!user.email && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="font-medium text-yellow-800">Email not found</p>
                  <p className="mt-1 text-sm text-yellow-600">
                    Visit their GitHub profile or social media to find contact info.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <ExternalLink className="h-5 w-5 text-gray-600" />
              Links & Social
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* GitHub */}
              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Github className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">GitHub</p>
                  <p className="text-sm text-gray-500">@{user.login}</p>
                </div>
              </a>

              {/* Portfolio */}
              {user.portfolio_url && (
                <a
                  href={user.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-purple-200 p-4 transition-colors hover:bg-purple-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <Globe className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Portfolio</p>
                    <p className="truncate text-sm text-gray-500">Website</p>
                  </div>
                </a>
              )}

              {/* Twitter */}
              {user.twitter_username && (
                <a
                  href={`https://twitter.com/${user.twitter_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-sky-200 p-4 transition-colors hover:bg-sky-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                    <span className="text-lg font-bold text-sky-500">X</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Twitter</p>
                    <p className="text-sm text-gray-500">@{user.twitter_username}</p>
                  </div>
                </a>
              )}

              {/* Blog */}
              {user.blog && user.blog !== user.portfolio_url && (
                <a
                  href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-green-200 p-4 transition-colors hover:bg-green-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <BookOpen className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Blog</p>
                    <p className="truncate text-sm text-gray-500">Read articles</p>
                  </div>
                </a>
              )}

              {/* Company */}
              {user.company && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                    <Building className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Company</p>
                    <p className="text-sm text-gray-500">{user.company}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hire Status Banner */}
        {user.hireable && (
          <div className="mt-6 overflow-hidden rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-900">
              Available for Hire
            </h3>
            <p className="mt-2 text-green-700">
              This developer is open to new opportunities. Contact them through their email or portfolio!
            </p>
            <button
              type="button"
              onClick={() => {
                if (!session) {
                  router.push("/auth/signin?callbackUrl=" + encodeURIComponent(`/profile/${username}`));
                  return;
                }
                setShowComposer(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Mail className="h-4 w-4" />
              Send Hire Message
            </button>
          </div>
        )}
      </main>

      {showComposer && user && (
        <EmailComposer
          isOpen={true}
          onClose={() => setShowComposer(false)}
          developer={user}
        />
      )}
    </div>
  );
}
