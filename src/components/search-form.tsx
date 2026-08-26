"use client";

import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Building, Users } from "lucide-react";

// Gender filter options
const GENDER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "male", label: "He/Him (Male)" },
  { value: "female", label: "She/Her (Female)" },
  { value: "non-binary", label: "They/Them (Non-binary)" },
];

interface SearchFilters {
  q: string;
  language: string;
  location: string;
  minFollowers: string;
  minRepos: string;
  minStars: string;
  company: string;
  hireable: boolean;
  sort: "followers" | "repositories" | "joined";
  order: "asc" | "desc";
  blog: string;
  bio: string;
  skills: string[];
  hasEmail: boolean;
  hasEmailOnly: boolean;
  gender: string;
}

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading: boolean;
}

// Common locations for autocomplete hints
const LOCATION_SUGGESTIONS = [
  "United States", "United Kingdom", "Germany", "France", "Canada", "Australia",
  "India", "Nigeria", "Brazil", "Japan", "China", "Singapore", "Netherlands",
  "Sweden", "Spain", "Italy", "Poland", "Russia", "Mexico", "Argentina",
  "South Korea", "Taiwan", "Indonesia", "Vietnam", "Turkey", "Egypt",
  "South Africa", "Kenya", "Ghana", "San Francisco", "New York", "Seattle",
  "Austin", "Boston", "London", "Berlin", "Paris", "Toronto", "Sydney",
  "Chicago", "Los Angeles", "Denver", "Atlanta", "Miami", "Manchester",
  "Munich", "Hamburg", "Lyon", "Vancouver", "Montreal", "Melbourne",
];

// Common companies for autocomplete hints
const COMPANY_SUGGESTIONS = [
  "Google", "Microsoft", "Apple", "Amazon", "Meta", "Facebook", "Netflix",
  "Twitter", "LinkedIn", "GitHub", "Stripe", "Shopify", "Airbnb", "Uber",
  "Lyft", "Spotify", "Slack", "Zoom", "Dropbox", "Square", "Twilio",
  "Cloudflare", "Datadog", "Elastic", "MongoDB", "Redis", "PostgreSQL",
  "Databricks", "Snowflake", "Datadog", "New Relic", "Sentry", "Vercel",
  "Netlify", "Cloudflare", "Fastly", "Akamai", "AWS", "Azure", "GCP",
  "DigitalOcean", "Heroku", "Render", "Fly.io", "Supabase", "Firebase",
  "Algolia", "Contentful", "Sanity", "Strapi", "Prisma", "GraphCMS",
  "Flutter", "React Native", "Electron", "Flutterwave", "Paystack", "Stripe",
  "Twilio", "Nexmo", "MessageBird", "Plivo", "Telnyx", "Amazon SES",
];

// Common programming languages
const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++",
  "C#", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB",
  "Dart", "Elixir", "Erlang", "Haskell", "Clojure", "F#", "Lua",
  "Perl", "Objective-C", "Assembly", "COBOL", "Fortran", "Pascal",
];

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");
  const [language, setLanguage] = useState("");
  const [gender, setGender] = useState("all");
  
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const locationRef = useRef<HTMLDivElement>(null);
  
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const companyRef = useRef<HTMLDivElement>(null);
  
  const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);

  // Filter location suggestions based on input
  useEffect(() => {
    if (location.length > 0) {
      const filtered = LOCATION_SUGGESTIONS.filter(loc =>
        loc.toLowerCase().includes(location.toLowerCase())
      ).slice(0, 8);
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(filtered.length > 0);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  }, [location]);

  // Filter company suggestions based on input
  useEffect(() => {
    if (company.length > 0) {
      const filtered = COMPANY_SUGGESTIONS.filter(comp =>
        comp.toLowerCase().includes(company.toLowerCase())
      ).slice(0, 8);
      setCompanySuggestions(filtered);
      setShowCompanySuggestions(filtered.length > 0);
    } else {
      setCompanySuggestions([]);
      setShowCompanySuggestions(false);
    }
  }, [company]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
      if (companyRef.current && !companyRef.current.contains(event.target as Node)) {
        setShowCompanySuggestions(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setShowLanguageSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectLocation = (loc: string) => {
    setLocation(loc);
    setShowLocationSuggestions(false);
  };

  const selectCompany = (comp: string) => {
    setCompany(comp);
    setShowCompanySuggestions(false);
  };

  const selectLanguage = (lang: string) => {
    setLanguage(lang);
    setShowLanguageSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      q,
      location,
      company,
      language,
      gender,
      minFollowers: "",
      minRepos: "",
      minStars: "",
      hireable: false,
      sort: "followers",
      order: "desc",
      blog: "",
      bio: "",
      skills: [],
      hasEmail: false,
      hasEmailOnly: false,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search developers..."
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          />
        </div>
        
        {/* Gender Filter Dropdown */}
        <div className="relative min-w-[160px]">
          <select
            name="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-3 px-4 text-sm outline-none focus:border-blue-500 bg-white appearance-none cursor-pointer"
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Location Input with Autocomplete */}
        <div ref={locationRef} className="relative min-w-[140px]">
          <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onFocus={() => location.length > 0 && setShowLocationSuggestions(locationSuggestions.length > 0)}
            placeholder="Location"
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          />
          {showLocationSuggestions && (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
              {locationSuggestions.map((loc, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectLocation(loc)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {loc.split(new RegExp(`(${location})`, 'gi')).map((part, i) => 
                      part.toLowerCase() === location.toLowerCase() ? (
                        <strong key={i} className="text-blue-600">{part}</strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Company Input with Autocomplete */}
        <div ref={companyRef} className="relative min-w-[140px]">
          <Building className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onFocus={() => company.length > 0 && setShowCompanySuggestions(companySuggestions.length > 0)}
            placeholder="Company"
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          />
          {showCompanySuggestions && (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
              {companySuggestions.map((comp, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectCompany(comp)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {comp.split(new RegExp(`(${company})`, 'gi')).map((part, i) => 
                      part.toLowerCase() === company.toLowerCase() ? (
                        <strong key={i} className="text-blue-600">{part}</strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Language Input with Autocomplete */}
        <div ref={languageRef} className="relative min-w-[140px]">
          <code className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{"<>"}</code>
          <input
            type="text"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            onFocus={() => setShowLanguageSuggestions(true)}
            placeholder="Language"
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          />
          {showLanguageSuggestions && (
            <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
              {LANGUAGES.filter(lang => 
                lang.toLowerCase().includes(language.toLowerCase())
              ).slice(0, 10).map((lang, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectLanguage(lang)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <code className="h-4 w-4 text-gray-400 text-xs">{"<>"}</code>
                  <span className="text-gray-700">{lang}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "..." : "Search"}
        </button>
      </div>
    </form>
  );
}
