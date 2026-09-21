"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Building,
  Code2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Filter,
} from "lucide-react";

const GENDER_OPTIONS = [
  { value: "all", label: "Any pronouns" },
  { value: "male", label: "He/Him" },
  { value: "female", label: "She/Her" },
  { value: "non-binary", label: "They/Them" },
];

const FOLLOWER_PRESETS = [
  { value: "", label: "Any" },
  { value: "10", label: "10+" },
  { value: "50", label: "50+" },
  { value: "100", label: "100+" },
  { value: "500", label: "500+" },
  { value: "1000", label: "1k+" },
  { value: "5000", label: "5k+" },
];

const REPO_PRESETS = [
  { value: "", label: "Any" },
  { value: "5", label: "5+" },
  { value: "10", label: "10+" },
  { value: "25", label: "25+" },
  { value: "50", label: "50+" },
  { value: "100", label: "100+" },
];

const SORT_OPTIONS = [
  { value: "followers", label: "Followers" },
  { value: "repositories", label: "Repositories" },
  { value: "joined", label: "Recently joined" },
];

const ORDER_OPTIONS = [
  { value: "desc", label: "High → Low" },
  { value: "asc", label: "Low → High" },
];

const SEARCH_SCOPE_OPTIONS = [
  { value: "all", label: "All fields" },
  { value: "login", label: "Username" },
  { value: "fullname", label: "Display name" },
  { value: "email", label: "Public email" },
];

const CREATED_WITHIN_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "90", label: "Joined last 90 days" },
  { value: "180", label: "Joined last 6 months" },
  { value: "365", label: "Joined last year" },
  { value: "730", label: "Joined last 2 years" },
];

const FALLBACK_LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C#",
  "C++",
  "C",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "Dart",
  "Scala",
  "Elixir",
  "Haskell",
  "Clojure",
  "Lua",
  "R",
  "Shell",
  "SQL",
  "HTML",
  "CSS",
  "Vue",
  "Svelte",
  "Angular",
  "React",
  "Next.js",
  "Node.js",
  "Solidity",
  "Zig",
  "Nim",
  "Julia",
  "Matlab",
  "Perl",
  "Objective-C",
  "F#",
  "Groovy",
  "PowerShell",
  "WebAssembly",
];

const FALLBACK_LOCATIONS = [
  "Remote",
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Portugal",
  "Poland",
  "Ukraine",
  "India",
  "Japan",
  "South Korea",
  "Singapore",
  "Australia",
  "Brazil",
  "Argentina",
  "Mexico",
  "Nigeria",
  "South Africa",
  "Kenya",
  "Egypt",
  "United Arab Emirates",
  "Israel",
  "Turkey",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Italy",
  "Ireland",
  "Romania",
  "Vietnam",
  "Philippines",
  "Indonesia",
  "Thailand",
  "China",
  "Taiwan",
  "New Zealand",
  "Colombia",
  "Chile",
  "Peru",
  "Pakistan",
  "Bangladesh",
  "Malaysia",
  "Austria",
  "Belgium",
  "Greece",
  "Hungary",
  "Czech Republic",
  "London",
  "Berlin",
  "Bangalore",
  "Toronto",
  "São Paulo",
  "Tokyo",
  "Lagos",
  "New York",
  "San Francisco",
  "Remote",
];

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const selectClass =
  "w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-[34px] h-4 w-4 text-gray-400" />
    </div>
  );
}

function SuggestInput({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 40);
    const starts = suggestions.filter((s) => s.toLowerCase().startsWith(q));
    const contains = suggestions.filter(
      (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q)
    );
    return [...starts, ...contains].slice(0, 60);
  }, [value, suggestions]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputClass} pl-9`}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
            >
              <Icon className="h-3.5 w-3.5 text-gray-400" />
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSuggestInput({
  label,
  values,
  onChange,
  placeholder,
  icon: Icon,
  suggestions,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestions: string[];
  hint?: string;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase();
    const selected = new Set(values.map((v) => v.toLowerCase()));
    const pool = suggestions.filter((s) => !selected.has(s.toLowerCase()));
    if (!q) return pool.slice(0, 40);
    const starts = pool.filter((s) => s.toLowerCase().startsWith(q));
    const contains = pool.filter(
      (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q)
    );
    return [...starts, ...contains].slice(0, 60);
  }, [input, suggestions, values]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    if (values.some((v) => v.toLowerCase() === cleaned.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...values, cleaned]);
    setInput("");
    setOpen(true);
  };

  const remove = (item: string) => {
    onChange(values.filter((v) => v !== item));
  };

  return (
    <div ref={ref} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <div
        className={`flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100`}
      >
        <Icon className="ml-1 h-4 w-4 flex-shrink-0 text-gray-400" />
        {values.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800"
          >
            {item}
            <button
              type="button"
              onClick={() => remove(item)}
              className="rounded p-0.5 hover:bg-indigo-200"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && !input && values.length) {
              remove(values[values.length - 1]);
            }
          }}
          placeholder={values.length ? "Add another…" : placeholder}
          className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => add(item)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
            >
              <Icon className="h-3.5 w-3.5 text-gray-400" />
              {item}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

function toList(value?: string | string[] | null): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : String(value).split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

export type SearchFilters = {
  q?: string;
  language?: string;
  languages?: string[];
  location?: string;
  minFollowers?: string;
  maxFollowers?: string;
  minRepos?: string;
  company?: string;
  hireable?: boolean;
  hasEmail?: boolean;
  hasEmailOnly?: boolean;
  gender?: string;
  sort?: string;
  order?: string;
  bio?: string;
  blog?: string;
  skills?: string[];
  /** User account created within N days */
  createdWithin?: string;
  /** Keyword search scope */
  searchScope?: string;
  page?: number;
};

/** Normalize restored/URL filters so UI chips and selects stay correctly formatted */
export function normalizeSearchFilters(
  filters?: SearchFilters | null
): SearchFilters | null {
  if (!filters) return null;
  const languages = toList(filters.languages?.length ? filters.languages : filters.language);
  const skills = toList(filters.skills);
  const minFollowers = String(filters.minFollowers || "");
  const maxFollowers = String(filters.maxFollowers || "");
  const minRepos = String(filters.minRepos || "");
  const gender = filters.gender || "all";
  const sort = filters.sort || "followers";
  const order = filters.order || "desc";
  const searchScope = filters.searchScope || "all";
  const createdWithin = String(filters.createdWithin || "");
  const q = String(filters.q || "")
    .replace(/\s+/g, " ")
    .trim();

  const sortOk = SORT_OPTIONS.some((o) => o.value === sort);

  return {
    q,
    location: filters.location || "",
    company: filters.company || "",
    languages,
    language: languages[0] || "",
    minFollowers: FOLLOWER_PRESETS.some((p) => p.value === minFollowers)
      ? minFollowers
      : "",
    maxFollowers: FOLLOWER_PRESETS.some((p) => p.value === maxFollowers)
      ? maxFollowers
      : "",
    minRepos: REPO_PRESETS.some((p) => p.value === minRepos) ? minRepos : "",
    hireable: !!filters.hireable,
    hasEmail: !!filters.hasEmail,
    hasEmailOnly: !!filters.hasEmailOnly,
    gender: GENDER_OPTIONS.some((o) => o.value === gender) ? gender : "all",
    sort: sortOk ? sort : "followers",
    order: ORDER_OPTIONS.some((o) => o.value === order) ? order : "desc",
    bio: filters.bio || "",
    blog: filters.blog || "",
    skills,
    createdWithin: CREATED_WITHIN_OPTIONS.some((o) => o.value === createdWithin)
      ? createdWithin
      : "",
    searchScope: SEARCH_SCOPE_OPTIONS.some((o) => o.value === searchScope)
      ? searchScope
      : "all",
    page: filters.page && filters.page > 0 ? filters.page : 1,
  };
}

export function SearchForm({
  onSearch,
  isLoading,
  initialFilters,
  onResetFilters,
}: {
  onSearch: (f: SearchFilters) => void;
  isLoading: boolean;
  initialFilters?: SearchFilters | null;
  onResetFilters?: () => void;
}) {
  const seed = normalizeSearchFilters(initialFilters);

  const [q, setQ] = useState(seed?.q || "");
  const [location, setLocation] = useState(seed?.location || "");
  const [company, setCompany] = useState(seed?.company || "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    seed?.languages || []
  );
  const [minFollowers, setMinFollowers] = useState(seed?.minFollowers || "");
  const [maxFollowers, setMaxFollowers] = useState(seed?.maxFollowers || "");
  const [minRepos, setMinRepos] = useState(seed?.minRepos || "");
  const [hireable, setHireable] = useState(!!seed?.hireable);
  const [hasEmail, setHasEmail] = useState(!!seed?.hasEmail);
  const [hasEmailOnly, setHasEmailOnly] = useState(!!seed?.hasEmailOnly);
  const [gender, setGender] = useState(seed?.gender || "all");
  const [sort, setSort] = useState(seed?.sort || "followers");
  const [order, setOrder] = useState(seed?.order || "desc");
  const [bio, setBio] = useState(seed?.bio || "");
  const [blog, setBlog] = useState(seed?.blog || "");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(seed?.skills || []);
  const [createdWithin, setCreatedWithin] = useState(seed?.createdWithin || "");
  const [searchScope, setSearchScope] = useState(seed?.searchScope || "all");
  const [showAdvanced, setShowAdvanced] = useState(
    !!(
      seed?.bio ||
      seed?.blog ||
      (seed?.skills && seed.skills.length > 0) ||
      seed?.createdWithin ||
      (seed?.searchScope && seed.searchScope !== "all") ||
      seed?.maxFollowers
    )
  );

  const [languages, setLanguages] = useState<string[]>(FALLBACK_LANGUAGES);
  const [locations, setLocations] = useState<string[]>(FALLBACK_LOCATIONS);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/filters/languages").then((r) => r.json()).catch(() => null),
      fetch("/api/filters/locations").then((r) => r.json()).catch(() => null),
      fetch("/api/filters/skills").then((r) => r.json()).catch(() => null),
    ]).then(([langs, locs, sk]) => {
      if (Array.isArray(langs) && langs.length) setLanguages(langs);
      if (Array.isArray(locs) && locs.length) setLocations(locs);
      if (Array.isArray(sk) && sk.length) setSkillOptions(sk);
    });
  }, []);

  const skillSuggestions = useMemo(() => {
    const qv = skillInput.trim().toLowerCase();
    const pool = skillOptions.length
      ? skillOptions
      : ["react", "nodejs", "docker", "kubernetes", "aws", "dotnet"];
    return pool
      .filter((s) => !skills.includes(s))
      .filter((s) => !qv || s.toLowerCase().includes(qv))
      .slice(0, 8);
  }, [skillInput, skillOptions, skills]);

  const addSkill = (skill: string) => {
    const cleaned = skill.trim().toLowerCase();
    if (!cleaned || skills.includes(cleaned)) return;
    setSkills((prev) => [...prev, cleaned]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const buildFilters = (): SearchFilters =>
    normalizeSearchFilters({
      q,
      language: selectedLanguages[0] || "",
      languages: selectedLanguages,
      location,
      minFollowers,
      maxFollowers,
      minRepos,
      company,
      hireable,
      hasEmail,
      hasEmailOnly,
      gender,
      sort,
      order,
      bio,
      blog,
      skills,
      createdWithin,
      searchScope,
      page: 1,
    })!;

  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const skipAutoSearchRef = useRef(true);

  const needsManualSearch =
    hasEmail || hasEmailOnly || (gender && gender !== "all");

  const hasCriteria = Boolean(
    q.trim() ||
      location.trim() ||
      company.trim() ||
      selectedLanguages.length ||
      minFollowers ||
      maxFollowers ||
      minRepos ||
      hireable ||
      hasEmail ||
      hasEmailOnly ||
      (gender && gender !== "all") ||
      bio.trim() ||
      blog.trim() ||
      skills.length ||
      createdWithin
  );

  // Re-run search whenever filters change (debounced). Skip first mount.
  useEffect(() => {
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false;
      return;
    }
    if (needsManualSearch || !hasCriteria) {
      return;
    }
    const timer = window.setTimeout(() => {
      onSearchRef.current(buildFilters());
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    q,
    location,
    company,
    selectedLanguages,
    minFollowers,
    maxFollowers,
    minRepos,
    hireable,
    hasEmail,
    hasEmailOnly,
    gender,
    sort,
    order,
    bio,
    blog,
    skills,
    createdWithin,
    searchScope,
    needsManualSearch,
    hasCriteria,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCriteria) {
      return;
    }
    onSearch(buildFilters());
  };

  const handleReset = () => {
    setQ("");
    setLocation("");
    setCompany("");
    setSelectedLanguages([]);
    setMinFollowers("");
    setMaxFollowers("");
    setMinRepos("");
    setHireable(false);
    setHasEmail(false);
    setHasEmailOnly(false);
    setGender("all");
    setSort("followers");
    setOrder("desc");
    setBio("");
    setBlog("");
    setSkills([]);
    setSkillInput("");
    setCreatedWithin("");
    setSearchScope("all");
    onResetFilters?.();
  };

  const activeCount = [
    q,
    location,
    company,
    selectedLanguages.length > 0,
    minFollowers,
    maxFollowers,
    minRepos,
    hireable,
    hasEmail,
    hasEmailOnly,
    gender !== "all",
    bio,
    blog,
    skills.length > 0,
    createdWithin,
    searchScope !== "all",
  ].filter(Boolean).length;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Search filters</h2>
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {activeCount} active
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* Main search */}
      <div className="mb-4">
        <FieldLabel>Keywords</FieldLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or username"
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {/* Primary filters grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SuggestInput
          label="Location"
          value={location}
          onChange={setLocation}
          placeholder="City or country"
          icon={MapPin}
          suggestions={locations}
        />
        <div>
          <FieldLabel>Company</FieldLabel>
          <div className="relative">
            <Building className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        <SelectField
          label="Pronouns"
          value={gender}
          onChange={setGender}
          options={GENDER_OPTIONS}
        />
      </div>

      <div className="mt-4">
        <MultiSuggestInput
          label="Languages"
          values={selectedLanguages}
          onChange={setSelectedLanguages}
          placeholder="e.g. Python, TypeScript"
          icon={Code2}
          suggestions={languages}
          hint="Select multiple — each language appears as a chip"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Min followers"
          value={minFollowers}
          onChange={setMinFollowers}
          options={FOLLOWER_PRESETS}
        />
        <SelectField
          label="Max followers"
          value={maxFollowers}
          onChange={setMaxFollowers}
          options={FOLLOWER_PRESETS}
        />
        <SelectField
          label="Min repos"
          value={minRepos}
          onChange={setMinRepos}
          options={REPO_PRESETS}
        />
        <SelectField
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
        />
        <SelectField
          label="Order"
          value={order}
          onChange={setOrder}
          options={ORDER_OPTIONS}
        />
      </div>

      {/* Toggle filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
            hireable
              ? "border-blue-300 bg-blue-50 text-blue-800"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
            checked={hireable}
            onChange={(e) => setHireable(e.target.checked)}
          />
          Hireable only
        </label>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
            hasEmail
              ? "border-blue-300 bg-blue-50 text-blue-800"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
            checked={hasEmail}
            onChange={(e) => {
              setHasEmail(e.target.checked);
              if (!e.target.checked) setHasEmailOnly(false);
            }}
          />
          Has email
        </label>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
            hasEmailOnly
              ? "border-blue-300 bg-blue-50 text-blue-800"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
            checked={hasEmailOnly}
            onChange={(e) => {
              setHasEmailOnly(e.target.checked);
              if (e.target.checked) setHasEmail(true);
            }}
          />
          Public GitHub email
        </label>
        {(hasEmail || hasEmailOnly) && (
          <span className="text-xs text-amber-700">
            Only shows developers with a public email (extra GitHub calls —
            slower). Turn off for the fastest search.
          </span>
        )}
      </div>

      {/* Advanced */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        Advanced filters
      </button>

      {showAdvanced && (
        <div className="mt-3 space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Search keywords in"
              value={searchScope}
              onChange={setSearchScope}
              options={SEARCH_SCOPE_OPTIONS}
            />
            <SelectField
              label="Account created"
              value={createdWithin}
              onChange={setCreatedWithin}
              options={CREATED_WITHIN_OPTIONS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Bio contains</FieldLabel>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. fullstack, open source"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Blog / website contains</FieldLabel>
              <input
                type="text"
                value={blog}
                onChange={(e) => setBlog(e.target.value)}
                placeholder="e.g. medium.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Skills / topics</FieldLabel>
            <div className="relative">
              <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                placeholder="Type a skill and press Enter"
                className={`${inputClass} pl-9`}
              />
              {skillInput && skillSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {skillSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="flex w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="rounded-full p-0.5 hover:bg-blue-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isLoading || !hasCriteria}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading ? "Searching…" : "Search"}
        </button>
        {isLoading ? (
          <p className="inline-flex items-center gap-2 text-sm text-blue-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            {hasEmail || hasEmailOnly
              ? "Scanning profiles for public email…"
              : "Updating results…"}
          </p>
        ) : !hasCriteria ? (
          <p className="text-xs text-amber-700">
            Add a keyword, location, language, or another filter first
          </p>
        ) : needsManualSearch ? (
          <p className="text-xs text-amber-700">
            Email/gender filters use a dedicated Search click
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            Results also update when you change filters
          </p>
        )}
      </div>
    </form>
  );
}
