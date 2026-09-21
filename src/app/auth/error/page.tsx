"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? null;

  const getErrorMessage = () => {
    switch (error) {
      case "OAuthSignin":
        return "Error starting the sign-in process. Please try again.";
      case "OAuthCallback":
        return "Error during the OAuth callback. Please try again.";
      case "OAuthCreateAccount":
        return "Could not create account with OAuth provider. Please try email signup.";
      case "Callback":
        return "Error in the callback. Please try again.";
      case "OAuthAccountNotLinked":
        return "This email is already linked to another account.";
      case "EmailSignin":
        return "Could not send the verification email. Please try again.";
      case "CredentialsSignin":
        return "Invalid email or password. Please check your credentials.";
      case "session_required":
        return "You must be signed in to access this page.";
      case "default":
      default:
        return "An error occurred during authentication. Please try again.";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="mb-6 text-gray-600">{getErrorMessage()}</p>

        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full rounded-lg bg-blue-600 py-3 text-center font-medium text-white hover:bg-blue-700"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
