"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Users, BookOpen, Mail, Globe } from "lucide-react";

interface DeveloperCardProps {
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
    name?: string | null;
    bio?: string | null;
    location?: string | null;
    followers?: number;
    following?: number;
    public_repos?: number;
    email?: string | null;
    blog?: string;
    hasEmail?: boolean;
    hasEmailOnly?: boolean;
    hireable?: boolean;
    matched_repo?: string | null;
    matched_repo_full_name?: string | null;
    matched_repo_pushed_at?: string | null;
  };
  onFavorite?: (user: DeveloperCardProps["user"]) => void;
  isFavorited?: boolean;
  onSendEmail?: (user: DeveloperCardProps["user"]) => void;
}

export function DeveloperCard({
  user,
  onFavorite,
  isFavorited,
  onSendEmail,
}: DeveloperCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        <Image
          src={user.avatar_url}
          alt={user.login}
          width={64}
          height={64}
          className="rounded-full"
        />
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${user.login}`}
            className="block font-semibold text-gray-900 hover:text-blue-600"
          >
            {user.name || user.login}
          </Link>
          <p className="text-sm text-gray-500">@{user.login}</p>
          {user.matched_repo && (
            <p className="mt-1 text-xs text-blue-700">
              Repo:{" "}
              <a
                href={`https://github.com/${user.matched_repo_full_name || `${user.login}/${user.matched_repo}`}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
              >
                {user.matched_repo}
              </a>
              {user.matched_repo_pushed_at
                ? ` · pushed ${new Date(user.matched_repo_pushed_at).toLocaleDateString()}`
                : ""}
            </p>
          )}
          {user.bio && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {user.bio}
            </p>
          )}
        </div>
        {onFavorite && (
          <button
            onClick={() => onFavorite(user)}
            className={`rounded-full p-2 ${
              isFavorited
                ? "bg-red-100 text-red-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill={isFavorited ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        )}
      </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
        {user.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{user.location}</span>
          </div>
        )}
        {(user.followers ?? 0) > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{user.followers!.toLocaleString()} followers</span>
          </div>
        )}
        {(user.public_repos ?? 0) > 0 && (
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{user.public_repos!.toLocaleString()} repos</span>
          </div>
        )}
      </div>
      
      {/* Email/Blog Section */}
      {(user.email || user.blog) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {user.email && (
            <a
              href={`mailto:${user.email}`}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              <Mail className="h-3 w-3" />
              {user.email}
            </a>
          )}
          {user.blog && (
            <a
              href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <Globe className="h-3 w-3" />
              Blog
            </a>
          )}
        </div>
      )}

      {onSendEmail && (
        <button
          onClick={() => onSendEmail(user)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Mail className="h-4 w-4" />
          Send Message
        </button>
      )}
      {onSendEmail && !user.email && (
        <p className="mt-1 text-center text-xs text-gray-500">
          Enter email manually in the next step
        </p>
      )}

      <Link
        href={`/profile/${user.login}`}
        className="mt-4 block w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        View Profile
      </Link>
    </div>
  );
}
