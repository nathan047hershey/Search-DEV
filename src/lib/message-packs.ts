import { LOOKING_SOFT_SKILLS, enrichWhyUs, pickOfferBullets, pickSubject } from "./company-voice";

export type DevTrack =
  | "frontend"
  | "backend"
  | "fullstack"
  | "mobile"
  | "data"
  | "ml"
  | "devops"
  | "cloud"
  | "security"
  | "qa"
  | "game"
  | "blockchain"
  | "embedded"
  | "rust"
  | "golang"
  | "java"
  | "dotnet"
  | "nodejs"
  | "python"
  | "php"
  | "ruby"
  | "csharp"
  | "typescript"
  | "react"
  | "vue"
  | "angular"
  | "flutter"
  | "ios"
  | "android"
  | "sre"
  | "platform";

export type MessageStyle =
  | "professional"
  | "warm"
  | "concise"
  | "technical"
  | "direct"
  | "formal"
  | "short"
  | "curious"
  | "peer"
  | "followup"
  | "followup-value"
  | "followup-close"
  | "collab";

export interface TrackPack {
  label: string;
  roleTitle: string;
  roleBlurb: string;
  responsibilities: string[];
  techLines: string[];
  lookingFor: string[];
  offer: string[];
  whyUs: string;
  subject: string;
  /** Keywords used to personalize openings / tech emphasis */
  stackHints: string[];
}

export const MESSAGE_STYLES: Array<{
  id: MessageStyle;
  label: string;
  description: string;
}> = [
  {
    id: "professional",
    label: "Professional",
    description: "Formal recruiter tone, clear and complete",
  },
  {
    id: "warm",
    label: "Warm",
    description: "Friendly but still business-appropriate",
  },
  {
    id: "concise",
    label: "Concise",
    description: "Shorter opening, same substance below",
  },
  {
    id: "technical",
    label: "Technical",
    description: "More stack-specific, engineer-to-engineer feel",
  },
  {
    id: "short",
    label: "Short first-touch",
    description: "Hook + role brief + one CTA (research-backed first touch)",
  },
  {
    id: "curious",
    label: "Curious",
    description: "Soft ask — is this on your radar? Low pressure",
  },
  {
    id: "peer",
    label: "Peer note",
    description: "Reads like a hiring note from someone who ships",
  },
  {
    id: "followup",
    label: "Follow-up (bump)",
    description: "Short nudge 3–5 days later — new angle, same role",
  },
  {
    id: "followup-value",
    label: "Follow-up (value)",
    description: "Second touch: one concrete reason the role is worth their time",
  },
  {
    id: "followup-close",
    label: "Follow-up (close)",
    description: "Polite last note — easy yes/no, then stop",
  },
  {
    id: "direct",
    label: "Direct",
    description: "Straight to the role and next step",
  },
  {
    id: "formal",
    label: "Formal",
    description: "More corporate letter tone",
  },
  {
    id: "collab",
    label: "Collaborate",
    description: "Open source contribution or project partnership",
  },
];

export function isFollowupStyle(style: MessageStyle): boolean {
  return (
    style === "followup" ||
    style === "followup-value" ||
    style === "followup-close"
  );
}

export function isCompactStyle(style: MessageStyle): boolean {
  return style === "short" || isFollowupStyle(style);
}

const SHARED_OFFER = pickOfferBullets("pivotalstacks-default", 4);

const SHARED_ENGLISH = LOOKING_SOFT_SKILLS;

/** Turn long AI-style blurbs into plain recruiter English. */
function polishRoleBlurb(html: string, roleTitle: string): string {
  let text = String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  text = text
    .replace(/^PivotalStacks is hiring an?\s+/i, "This role is for a ")
    .replace(/^PivotalStacks is hiring a\s+/i, "This role is for a ")
    .replace(/\s+—\s+with clear ownership[^.]*/gi, "")
    .replace(/\s+with clear ownership[^.]*/gi, "")
    .replace(/cloud platforms/gi, "product platforms")
    .replace(/high-quality\s+/gi, "")
    .replace(/not throwaway prototypes/gi, "production work")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Keep natural recruiter openings; never force "This {role} role…" onto them.
  const alreadyHuman =
    /^(This|We're|We are|We need|You'll|You will|Looking for|We're looking|We're hiring)\b/i.test(
      text
    );
  if (!alreadyHuman && roleTitle) {
    const stripped = text
      .replace(new RegExp(`^(?:a |an )?${roleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:to|,)?\\s*`, "i"), "")
      .replace(/^to\s+/i, "");
    // Only rewrite if it still reads like a bare job description fragment
    if (stripped.length > 40 && !/^(we|you|looking|hiring)\b/i.test(stripped)) {
      text = `We're looking for a ${roleTitle} who can ${stripped.charAt(0).toLowerCase()}${stripped.slice(1)}`;
    }
  }

  // Keep to ~2 sentences
  const parts = text.split(/(?<=\.)\s+/).filter(Boolean);
  text = parts.slice(0, 2).join(" ");
  if (!/[.!?]$/.test(text)) text += ".";

  // Re-wrap role title in strong for HTML packs
  const escapedTitle = roleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(escapedTitle, "g"),
    `<strong>${roleTitle}</strong>`
  );
}

function polishWhyUs(why: string): string {
  return String(why || "")
    .replace(/\s+/g, " ")
    .replace(/—/g, ",")
    .replace(/clear ownership of product surfaces,?/gi, "")
    .replace(/thoughtful collaboration,?/gi, "")
    .replace(/room to raise the bar without drowning in process/gi, "practical standards")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/\.$/, "");
}

function pack(input: {
  label: string;
  roleTitle: string;
  roleBlurb: string;
  responsibilities: string[];
  techLines: string[];
  lookingFor: string[];
  whyUs: string;
  subject?: string;
  stackHints: string[];
  offer?: string[];
}): TrackPack {
  return {
    label: input.label,
    roleTitle: input.roleTitle,
    roleBlurb: polishRoleBlurb(input.roleBlurb, input.roleTitle),
    responsibilities: input.responsibilities.slice(0, 5),
    techLines: input.techLines,
    lookingFor: [...input.lookingFor.slice(0, 3), ...SHARED_ENGLISH],
    offer: input.offer || SHARED_OFFER,
    whyUs: enrichWhyUs(polishWhyUs(input.whyUs), input.label),
    subject: input.subject || pickSubject(input.roleTitle, input.label),
    stackHints: input.stackHints,
  };
}

export const TRACK_OPTIONS: Array<{ id: DevTrack; label: string }> = [
  { id: "frontend", label: "Frontend" },
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "angular", label: "Angular" },
  { id: "typescript", label: "TypeScript" },
  { id: "backend", label: "Backend" },
  { id: "nodejs", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "dotnet", label: ".NET / C#" },
  { id: "csharp", label: "C#" },
  { id: "golang", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "fullstack", label: "Full-stack" },
  { id: "mobile", label: "Mobile" },
  { id: "ios", label: "iOS / Swift" },
  { id: "android", label: "Android / Kotlin" },
  { id: "flutter", label: "Flutter" },
  { id: "data", label: "Data Engineering" },
  { id: "ml", label: "AI / ML" },
  { id: "devops", label: "DevOps" },
  { id: "cloud", label: "Cloud" },
  { id: "sre", label: "SRE" },
  { id: "platform", label: "Platform Engineering" },
  { id: "security", label: "Security" },
  { id: "qa", label: "QA / Test" },
  { id: "game", label: "Game Dev" },
  { id: "blockchain", label: "Blockchain / Web3" },
  { id: "embedded", label: "Embedded / Systems" },
];

export const TRACK_PACKS: Record<DevTrack, TrackPack> = {
  frontend: pack({
    label: "Frontend",
    roleTitle: "Senior Frontend Developer",
    roleBlurb:
      "We're hiring a <strong>Senior Frontend Developer</strong> to own product UI end to end — features, shared components, performance, and accessibility — working with design and backend on contracts that ship.",
    responsibilities: [
      "Ship production UI from design handoff through release",
      "Grow reusable components and shared frontend patterns",
      "Keep performance, accessibility (WCAG), and browser quality honest",
      "Partner with backend on APIs, auth, and edge-case UX",
      "Review code, guide testing, and keep docs practical",
    ],
    techLines: [
      "<strong>Core:</strong> React, Vue, Angular, TypeScript, Next.js",
      "<strong>UI:</strong> design systems, WCAG, responsive CSS",
      "<strong>Quality:</strong> unit, integration, and e2e tests",
      "<strong>Integration:</strong> REST / GraphQL, auth, state management",
    ],
    lookingFor: [
      "Production frontend work on product teams",
      "TypeScript and depth in at least one major UI framework",
      "Care for maintainability, accessibility, and UX detail",
    ],
    whyUs: "You'd own product UI people use every day, with room to set practical standards",
    stackHints: ["react", "vue", "angular", "typescript", "javascript", "css", "next"],
  }),

  react: pack({
    label: "React",
    roleTitle: "Senior React Developer",
    roleBlurb:
      "We're hiring a <strong>Senior React Developer</strong> for React/TypeScript product UI — component structure, performance, and API-driven features that already run in production.",
    responsibilities: [
      "Ship React features with TypeScript in production codebases",
      "Improve component libraries and shared UI patterns",
      "Fix rendering performance, bundle size, and client reliability",
      "Work with design and backend on contracts and loading states",
      "Lead useful testing (unit, integration, e2e where it pays off)",
    ],
    techLines: [
      "<strong>Core:</strong> React, TypeScript, hooks, Next.js / SPA",
      "<strong>State &amp; data:</strong> Redux / Zustand / React Query / GraphQL",
      "<strong>Quality:</strong> Jest, Testing Library, Playwright/Cypress",
      "<strong>Delivery:</strong> design systems, CI, staged releases",
    ],
    lookingFor: [
      "Deep React production experience",
      "Solid TypeScript and modern frontend tooling",
      "Comfort with API-driven product features",
    ],
    whyUs: "You'd own real React product interfaces and help define patterns other teams reuse",
    stackHints: ["react", "next", "typescript", "jsx", "tsx"],
  }),

  vue: pack({
    label: "Vue",
    roleTitle: "Senior Vue Developer",
    roleBlurb:
      "This <strong>Senior Vue Developer</strong> role delivers product interfaces with Vue 3, TypeScript, and related tooling used in production.",
    responsibilities: [
      "Build and maintain production Vue applications",
      "Define reusable components and Composition API patterns",
      "Improve performance, accessibility, and release quality",
      "Integrate with backend APIs and auth flows",
      "Support reviews, testing, and frontend standards",
    ],
    techLines: [
      "<strong>Core:</strong> Vue 3, Composition API, TypeScript, Nuxt",
      "<strong>Ecosystem:</strong> Pinia, Vue Router, Vite",
      "<strong>Quality:</strong> Vitest, Playwright, accessibility checks",
      "<strong>Integration:</strong> REST / GraphQL, design systems",
    ],
    lookingFor: [
      "Vue 3 / Nuxt production experience",
      "TypeScript fluency and clean component structure",
      "Product focus with attention to UX detail",
    ],
    whyUs: "You'd own Vue UI quality and deepen the stack with practical standards - not demo apps",
    stackHints: ["vue", "nuxt", "pinia"],
  }),

  angular: pack({
    label: "Angular",
    roleTitle: "Senior Angular Developer",
    roleBlurb:
      "This <strong>Senior Angular Developer</strong> role builds structured product frontends with Angular and TypeScript.",
    responsibilities: [
      "Deliver production Angular modules and features",
      "Apply RxJS, routing, and strict typing effectively",
      "Improve architecture, testing, and performance",
      "Partner with backend teams on API contracts",
      "Help set Angular standards across the team",
    ],
    techLines: [
      "<strong>Core:</strong> Angular, TypeScript, RxJS, NgRx where useful",
      "<strong>Architecture:</strong> modular apps, lazy loading, strict typing",
      "<strong>Quality:</strong> Jasmine/Jest, Cypress, accessibility",
      "<strong>Delivery:</strong> CI, design systems, enterprise UI patterns",
    ],
    lookingFor: [
      "Production Angular experience with TypeScript",
      "Comfort with RxJS and scalable app structure",
      "Clear communication on architecture and tradeoffs",
    ],
    whyUs: "You'd work on Angular product surfaces where structure and maintainability actually matter",
    stackHints: ["angular", "rxjs", "ngrx"],
  }),

  typescript: pack({
    label: "TypeScript",
    roleTitle: "Senior TypeScript Engineer",
    roleBlurb:
      "This <strong>Senior TypeScript Engineer</strong> role covers typed application work across UI, APIs, or both, with a focus on safe delivery in production.",
    responsibilities: [
      "Deliver typed features in production TypeScript codebases",
      "Improve shared types, API contracts, and developer experience",
      "Balance delivery speed with maintainable architecture",
      "Raise testing and review quality",
      "Collaborate across frontend and backend as needed",
    ],
    techLines: [
      "<strong>Language:</strong> TypeScript (strict), modern ES tooling",
      "<strong>Apps:</strong> React / Node / Next.js or similar TS stacks",
      "<strong>Quality:</strong> type-safe APIs, unit/integration tests",
      "<strong>Delivery:</strong> CI, linting, pragmatic architecture",
    ],
    lookingFor: [
      "Strong TypeScript production experience",
      "Ability to ship product features, not only tooling",
      "Comfort across UI and/or Node services",
    ],
    whyUs: "You'd help ship safer TypeScript software without drowning in process",
    stackHints: ["typescript", "ts", "tsx"],
  }),

  backend: pack({
    label: "Backend",
    roleTitle: "Senior Backend Developer",
    roleBlurb:
      "We're hiring a <strong>Senior Backend Developer</strong> to design and run services and APIs — data flow, reliability, and delivery other teams depend on every day.",
    responsibilities: [
      "Design and implement production services and APIs",
      "Improve reliability, observability, and data consistency",
      "Use messaging, caching, and background jobs when needed",
      "Partner with frontend and platform engineers on delivery",
      "Drive quality through reviews, tests, and practical docs",
    ],
    techLines: [
      "<strong>Languages:</strong> Node.js, Python, Java, C# / .NET, Go, Ruby, PHP",
      "<strong>Data:</strong> SQL / NoSQL, migrations, query performance",
      "<strong>Systems:</strong> services, queues, caching, background jobs",
      "<strong>Delivery:</strong> Docker, Kubernetes, AWS, CI/CD",
    ],
    lookingFor: [
      "Professional backend experience in production systems",
      "Strong API design, debugging, and operational judgment",
      "Solid database and distributed-systems fundamentals",
    ],
    whyUs: "You'd influence backend architecture and reliability on systems that stay in production",
    stackHints: ["api", "backend", "server", "postgres", "sql"],
  }),

  nodejs: pack({
    label: "Node.js",
    roleTitle: "Senior Node.js Developer",
    roleBlurb:
      "We're hiring a <strong>Senior Node.js Developer</strong> to build and operate TypeScript backends — services, API contracts, and the habits that keep releases stable.",
    responsibilities: [
      "Build and maintain Node.js / TypeScript services and APIs",
      "Improve performance, reliability, logging, and observability",
      "Design clean contracts for clients and partner services",
      "Work with databases, queues, caching, and background jobs",
      "Support testing, reviews, CI, and release readiness",
    ],
    techLines: [
      "<strong>Core:</strong> Node.js, TypeScript, Express / NestJS / Fastify",
      "<strong>Data:</strong> PostgreSQL, MongoDB, Redis, migrations",
      "<strong>Systems:</strong> REST / GraphQL, queues, caching, auth",
      "<strong>Delivery:</strong> Docker, CI/CD, AWS, Kubernetes familiarity",
    ],
    lookingFor: [
      "Production Node.js experience (preferably with TypeScript)",
      "Strong API and data-layer judgment",
      "Comfort operating services beyond local development",
    ],
    whyUs: "You'd own Node services product teams depend on, with modern tooling and real platform support",
    stackHints: ["node", "nodejs", "express", "nestjs", "fastify"],
  }),

  python: pack({
    label: "Python",
    roleTitle: "Senior Python Developer",
    roleBlurb:
      "We're hiring a <strong>Senior Python Developer</strong> for backends, APIs, and data-aware services — modern Python that stays maintainable in production.",
    responsibilities: [
      "Deliver production Python services and APIs",
      "Improve code quality, testing, and operational readiness",
      "Work with SQL/NoSQL stores and async workflows",
      "Collaborate with product and frontend partners",
      "Document interfaces and runbooks where useful",
    ],
    techLines: [
      "<strong>Core:</strong> Python 3, FastAPI / Django / Flask",
      "<strong>Data:</strong> PostgreSQL, SQLAlchemy, pandas where relevant",
      "<strong>Systems:</strong> Celery / RQ, Redis, REST APIs",
      "<strong>Delivery:</strong> Docker, CI, cloud services",
    ],
    lookingFor: [
      "Strong Python production experience",
      "Solid API and database fundamentals",
      "Clear written communication",
    ],
    whyUs: "You'd ship Python backends and product features that stay maintainable - not throwaway scripts",
    stackHints: ["python", "django", "fastapi", "flask"],
  }),

  java: pack({
    label: "Java",
    roleTitle: "Senior Java Developer",
    roleBlurb:
      "This <strong>Senior Java Developer</strong> role builds services with Java and modern JVM practices for production use.",
    responsibilities: [
      "Design and implement production Java services",
      "Improve reliability, performance, and API design",
      "Work with relational data and messaging as needed",
      "Partner with product and platform teams on delivery",
      "Raise standards through reviews and testing",
    ],
    techLines: [
      "<strong>Core:</strong> Java, Spring Boot, JVM tooling",
      "<strong>Data:</strong> SQL, JPA/Hibernate, migrations",
      "<strong>Systems:</strong> REST, messaging, microservices patterns",
      "<strong>Delivery:</strong> Maven/Gradle, Docker, CI/CD",
    ],
    lookingFor: [
      "Production Java / Spring experience",
      "Strong service design and debugging skills",
      "Comfort with SQL and distributed service basics",
    ],
    whyUs: "You'd work on durable Java systems where correctness and long-term ownership matter",
    stackHints: ["java", "spring", "jvm", "kotlin"],
  }),

  dotnet: pack({
    label: ".NET / C#",
    roleTitle: "Senior .NET Developer",
    roleBlurb:
      "This <strong>Senior .NET Developer</strong> role builds APIs and services with C# and the modern .NET stack.",
    responsibilities: [
      "Deliver production ASP.NET / .NET services and APIs",
      "Improve data access, reliability, and observability",
      "Collaborate with frontend and cloud partners",
      "Support testing, reviews, and release quality",
      "Help evolve .NET practices across the team",
    ],
    techLines: [
      "<strong>Core:</strong> C#, .NET, ASP.NET Core",
      "<strong>Data:</strong> SQL Server / PostgreSQL, Entity Framework",
      "<strong>Systems:</strong> REST, messaging, background workers",
      "<strong>Delivery:</strong> Azure / cloud, Docker, CI/CD",
    ],
    lookingFor: [
      "Strong C# / .NET production experience",
      "Solid API and database design skills",
      "Comfort shipping and supporting services in production",
    ],
    whyUs: "You'd own important .NET product backends with modern tooling and clear ownership",
    stackHints: [".net", "dotnet", "csharp", "c#", "asp.net"],
  }),

  csharp: pack({
    label: "C#",
    roleTitle: "Senior C# Developer",
    roleBlurb:
      "This <strong>Senior C# Developer</strong> role focuses on C# services, APIs, and product backends in production.",
    responsibilities: [
      "Build and maintain production C# applications and services",
      "Improve architecture, testing, and operational quality",
      "Work with SQL data layers and service integrations",
      "Collaborate across product engineering",
      "Document decisions that help the team move faster",
    ],
    techLines: [
      "<strong>Language:</strong> C#, modern .NET practices",
      "<strong>Apps:</strong> ASP.NET Core APIs, workers, integrations",
      "<strong>Data:</strong> SQL, EF Core, migrations",
      "<strong>Delivery:</strong> CI/CD, Docker, cloud hosting",
    ],
    lookingFor: [
      "Deep C# experience in production systems",
      "Strong debugging and API design judgment",
      "Collaborative remote working style",
    ],
    whyUs: "You'd shape C# backend quality with practical ownership, not ticket-only work",
    stackHints: ["c#", "csharp", ".net"],
  }),

  golang: pack({
    label: "Go",
    roleTitle: "Senior Go Developer",
    roleBlurb:
      "This <strong>Senior Go Developer</strong> role builds services, APIs, and infrastructure tooling in Go for production use.",
    responsibilities: [
      "Design and ship production Go services",
      "Improve concurrency, reliability, and performance",
      "Work with SQL/NoSQL stores and messaging as needed",
      "Partner with platform and product teams",
      "Raise Go standards through reviews and clear interfaces",
    ],
    techLines: [
      "<strong>Core:</strong> Go, idiomatic concurrency, modules",
      "<strong>Services:</strong> gRPC / REST, workers, CLIs",
      "<strong>Data:</strong> PostgreSQL, Redis, messaging",
      "<strong>Delivery:</strong> Docker, Kubernetes, CI",
    ],
    lookingFor: [
      "Production Go experience",
      "Strong systems and API fundamentals",
      "Comfort with cloud delivery practices",
    ],
    whyUs: "You'd build Go services where simplicity, performance, and operability matter day to day",
    stackHints: ["go", "golang", "grpc"],
  }),

  rust: pack({
    label: "Rust",
    roleTitle: "Senior Rust Developer",
    roleBlurb:
      "This <strong>Senior Rust Developer</strong> role covers performance-sensitive services, tooling, or systems work where Rust is the right choice.",
    responsibilities: [
      "Build and maintain production Rust components or services",
      "Improve correctness, performance, and packaging",
      "Integrate with surrounding services and APIs",
      "Document unsafe boundaries and operational concerns",
      "Collaborate with platform and backend partners",
    ],
    techLines: [
      "<strong>Core:</strong> Rust, Cargo, async (Tokio) where relevant",
      "<strong>Systems:</strong> APIs, CLIs, performance-critical modules",
      "<strong>Interop:</strong> FFI / service boundaries as needed",
      "<strong>Delivery:</strong> CI, containers, careful release practices",
    ],
    lookingFor: [
      "Hands-on Rust experience beyond tutorials",
      "Strong systems thinking and ownership habits",
      "Clear communication about tradeoffs and safety",
    ],
    whyUs: "You'd take on Rust problems where reliability and performance justify deeper investment",
    stackHints: ["rust", "tokio", "cargo"],
  }),

  php: pack({
    label: "PHP",
    roleTitle: "Senior PHP Developer",
    roleBlurb:
      "This <strong>Senior PHP Developer</strong> role builds and evolves product backends with modern PHP frameworks.",
    responsibilities: [
      "Deliver production PHP features and APIs",
      "Improve architecture, testing, and maintainability",
      "Work with relational databases and queues",
      "Collaborate with frontend and product partners",
      "Support safe releases and operational readiness",
    ],
    techLines: [
      "<strong>Core:</strong> PHP 8+, Laravel / Symfony",
      "<strong>Data:</strong> MySQL / PostgreSQL, Eloquent / Doctrine",
      "<strong>Systems:</strong> queues, caching, REST APIs",
      "<strong>Delivery:</strong> Docker, CI, cloud hosting",
    ],
    lookingFor: [
      "Modern PHP production experience (Laravel or Symfony preferred)",
      "Solid SQL and API design skills",
      "Product-oriented delivery habits",
    ],
    whyUs: "You'd own modern PHP product backends - not legacy-only maintenance",
    stackHints: ["php", "laravel", "symfony"],
  }),

  ruby: pack({
    label: "Ruby",
    roleTitle: "Senior Ruby Developer",
    roleBlurb:
      "We need a <strong>Senior Ruby Developer</strong> to lead Rails backend work: services, product APIs, and a maintainable codebase as we scale.",
    responsibilities: [
      "Design and implement Ruby on Rails services for the platform",
      "Work with product and frontend on clear REST API contracts",
      "Improve data models, query performance, and ActiveRecord use",
      "Drive quality with RSpec, automated tests, and CI",
      "Operate Sidekiq jobs, caching, and production habits",
    ],
    techLines: [
      "<strong>Core:</strong> Ruby, Ruby on Rails, RSpec",
      "<strong>Secondary:</strong> Go, JavaScript, Python for tooling when useful",
      "<strong>Data &amp; jobs:</strong> PostgreSQL, ActiveRecord, Sidekiq, Redis",
      "<strong>Platform:</strong> AWS, containers / Kubernetes",
    ],
    lookingFor: [
      "Proficiency in Ruby on Rails and REST API design",
      "Experience with CI/CD and automated testing",
      "Clear communication and ability to mentor juniors",
    ],
    whyUs: "You'd ship Rails product with pragmatic ownership and modern cloud delivery",
    stackHints: ["ruby", "rails", "sidekiq"],
  }),

  fullstack: pack({
    label: "Full-stack",
    roleTitle: "Senior Full-Stack Developer",
    roleBlurb:
      "We're hiring a <strong>Senior Full-Stack Developer</strong> who can own features across UI and APIs — solid tradeoffs, complete increments, and quality from browser to database.",
    responsibilities: [
      "Deliver features spanning UI, API, and data layers",
      "Balance product speed with maintainable architecture",
      "Collaborate with design, product, and specialists when needed",
      "Improve testing, reviews, observability, and release readiness",
      "Make technical decisions that keep delivery sustainable",
    ],
    techLines: [
      "<strong>Frontend:</strong> React, TypeScript, Vue, Angular (depth in at least one)",
      "<strong>Backend:</strong> Node.js, Python, C# / .NET, Java, Go, or Rails",
      "<strong>Data &amp; platform:</strong> SQL/NoSQL, cloud services, Docker",
      "<strong>Delivery:</strong> iterative releases, CI/CD, pragmatic architecture",
    ],
    lookingFor: [
      "Proven full-stack product delivery in production",
      "Comfort across UI and backend/API work",
      "Clear communication on scope, quality, and tradeoffs",
    ],
    whyUs: "You'd connect product intent to working software across the stack, end to end",
    stackHints: ["fullstack", "full-stack", "react", "node"],
  }),

  mobile: pack({
    label: "Mobile",
    roleTitle: "Senior Mobile Developer",
    roleBlurb:
      "This <strong>Senior Mobile Developer</strong> role builds mobile apps with solid architecture and disciplined release practice.",
    responsibilities: [
      "Develop production iOS, Android, or cross-platform apps",
      "Improve performance, stability, and release quality",
      "Integrate with APIs and mobile-friendly contracts",
      "Contribute to testing and store-ready delivery",
      "Partner with product and backend on consistent UX",
    ],
    techLines: [
      "<strong>Mobile:</strong> Swift, Kotlin, React Native, Flutter",
      "<strong>Quality:</strong> performance, offline UX, crash analytics",
      "<strong>Integration:</strong> REST / GraphQL, auth, push notifications",
      "<strong>Release:</strong> CI, store submissions, staged rollouts",
    ],
    lookingFor: [
      "Shipped production mobile apps (native or cross-platform)",
      "Strong product sense and mobile UX attention",
      "Experience with APIs and release tooling",
    ],
    whyUs: "You'd shape how users experience the product on device, with real release ownership",
    stackHints: ["mobile", "ios", "android", "flutter", "react native"],
  }),

  ios: pack({
    label: "iOS / Swift",
    roleTitle: "Senior iOS Developer",
    roleBlurb:
      "This <strong>Senior iOS Developer</strong> role builds Swift applications with strong architecture and App Store quality.",
    responsibilities: [
      "Ship production iOS features in Swift",
      "Improve architecture, performance, and crash resilience",
      "Integrate with backend APIs and push/auth flows",
      "Support TestFlight / App Store release practices",
      "Collaborate with design and product on iOS UX",
    ],
    techLines: [
      "<strong>Core:</strong> Swift, SwiftUI / UIKit, Xcode",
      "<strong>Architecture:</strong> MVVM / similar, modular apps",
      "<strong>Integration:</strong> REST, auth, push notifications",
      "<strong>Quality:</strong> XCTest, Instruments, store releases",
    ],
    lookingFor: [
      "Production Swift / iOS shipping experience",
      "Strong attention to UX and performance",
      "Comfort with API integration and release cycles",
    ],
    whyUs: "You'd own iOS device-quality experiences and help set mobile standards",
    stackHints: ["ios", "swift", "swiftui", "xcode"],
  }),

  android: pack({
    label: "Android / Kotlin",
    roleTitle: "Senior Android Developer",
    roleBlurb:
      "This <strong>Senior Android Developer</strong> role builds Android apps with Kotlin and modern Android tooling.",
    responsibilities: [
      "Deliver production Android features in Kotlin",
      "Improve architecture, performance, and stability",
      "Integrate APIs, auth, and notifications cleanly",
      "Support Play Store release and testing practices",
      "Collaborate with product and design on Android UX",
    ],
    techLines: [
      "<strong>Core:</strong> Kotlin, Jetpack Compose / Views, Android SDK",
      "<strong>Architecture:</strong> MVVM, coroutines, modular apps",
      "<strong>Integration:</strong> Retrofit/OkHttp, auth, push",
      "<strong>Quality:</strong> Espresso/Compose tests, Play releases",
    ],
    lookingFor: [
      "Production Kotlin / Android experience",
      "Solid architecture and performance instincts",
      "Comfort with API-driven product work",
    ],
    whyUs: "You'd ship user-facing Android apps with modern Kotlin practices and clear ownership",
    stackHints: ["android", "kotlin", "jetpack", "compose"],
  }),

  flutter: pack({
    label: "Flutter",
    roleTitle: "Senior Flutter Developer",
    roleBlurb:
      "This <strong>Senior Flutter Developer</strong> role delivers cross-platform mobile experiences with Flutter and Dart.",
    responsibilities: [
      "Build and maintain production Flutter applications",
      "Improve performance, UX consistency, and release quality",
      "Integrate with backend APIs and platform channels as needed",
      "Support CI and store delivery for iOS and Android",
      "Collaborate with design on shared mobile UX",
    ],
    techLines: [
      "<strong>Core:</strong> Flutter, Dart, widgets, state management",
      "<strong>Platform:</strong> iOS + Android delivery, plugins",
      "<strong>Integration:</strong> REST, auth, push",
      "<strong>Quality:</strong> widget/integration tests, CI, store releases",
    ],
    lookingFor: [
      "Shipped Flutter apps in production",
      "Strong Dart and mobile UX skills",
      "Comfort with dual-platform release concerns",
    ],
    whyUs: "You'd own Flutter cross-platform product surfaces with clear shipping goals",
    stackHints: ["flutter", "dart"],
  }),

  data: pack({
    label: "Data Engineering",
    roleTitle: "Senior Data Engineer",
    roleBlurb:
      "This <strong>Senior Data Engineer</strong> role builds pipelines and data platforms that product and analytics teams can rely on.",
    responsibilities: [
      "Build and maintain production data pipelines",
      "Improve data quality, modeling, and operational visibility",
      "Partner with analytics, ML, and backend teams",
      "Clarify contracts, SLAs, and handoff points",
      "Prefer reproducible delivery over one-off scripts",
    ],
    techLines: [
      "<strong>Languages:</strong> Python, SQL, Scala where relevant",
      "<strong>Platform:</strong> warehouses, ETL/ELT, batch and streaming",
      "<strong>Tooling:</strong> Airflow / dbt / Spark-style workflows",
      "<strong>Ops:</strong> monitoring, lineage basics, cloud data services",
    ],
    lookingFor: [
      "Hands-on production data engineering experience",
      "Strong Python and SQL fundamentals",
      "Clear communication with non-data stakeholders",
    ],
    whyUs: "You'd build data systems other teams can trust every day - not one-off pipelines",
    stackHints: ["data", "etl", "warehouse", "spark", "airflow", "dbt"],
  }),

  ml: pack({
    label: "AI / ML",
    roleTitle: "Senior ML / AI Engineer",
    roleBlurb:
      "This <strong>Senior ML / AI Engineer</strong> role turns models and LLM workflows into reliable product capability with engineering partners.",
    responsibilities: [
      "Build and improve ML/LLM features used in product contexts",
      "Strengthen evaluation, monitoring, and delivery practices",
      "Partner with backend and product on usable interfaces",
      "Clarify assumptions, metrics, and failure modes",
      "Prefer reproducible pipelines over notebook-only work",
    ],
    techLines: [
      "<strong>Core:</strong> Python, PyTorch / TensorFlow, scikit-learn",
      "<strong>LLM product:</strong> prompting, RAG, evaluation, serving basics",
      "<strong>Data:</strong> feature pipelines, SQL, experiment tracking",
      "<strong>Delivery:</strong> APIs, monitoring, reproducible training/serving",
    ],
    lookingFor: [
      "Applied ML or LLM product experience beyond coursework",
      "Strong Python and pragmatic engineering habits",
      "Ability to explain tradeoffs to product stakeholders",
    ],
    whyUs: "You'd ship useful ML systems with product partners - not demos that die in a notebook",
    stackHints: [
      "machine learning",
      "deep learning",
      "pytorch",
      "tensorflow",
      "llm",
      "openai",
      "ai",
    ],
  }),

  devops: pack({
    label: "DevOps",
    roleTitle: "Senior DevOps Engineer",
    roleBlurb:
      "This <strong>Senior DevOps Engineer</strong> role improves how we build, ship, and run software through CI/CD and automation.",
    responsibilities: [
      "Own and improve CI/CD pipelines and release automation",
      "Manage containers and deployment workflows",
      "Raise observability and operational readiness",
      "Support application teams with clear tooling",
      "Document runbooks and reduce everyday delivery friction",
    ],
    techLines: [
      "<strong>Platform:</strong> Docker, Kubernetes, Terraform",
      "<strong>Delivery:</strong> CI/CD, infra as code, environment automation",
      "<strong>Reliability:</strong> monitoring, logging, incident-ready practices",
      "<strong>Cloud:</strong> AWS / GCP / Azure collaboration",
    ],
    lookingFor: [
      "Production DevOps / delivery experience",
      "Practical CI/CD and container skills",
      "Clear communication with application engineers",
    ],
    whyUs: "You'd make delivery safer and faster for every product team, with visible impact",
    stackHints: ["devops", "ci/cd", "docker", "kubernetes", "terraform"],
  }),

  cloud: pack({
    label: "Cloud",
    roleTitle: "Senior Cloud Engineer",
    roleBlurb:
      "This <strong>Senior Cloud Engineer</strong> role designs and operates cloud infrastructure that keeps product teams shipping safely.",
    responsibilities: [
      "Design and manage cloud infrastructure and networking basics",
      "Improve cost, security baselines, and reliability",
      "Automate environments with infrastructure as code",
      "Support application teams with clear cloud interfaces",
      "Document architecture and operational playbooks",
    ],
    techLines: [
      "<strong>Cloud:</strong> AWS, GCP, and/or Azure",
      "<strong>IaC:</strong> Terraform, CloudFormation, Pulumi",
      "<strong>Runtime:</strong> containers, serverless, managed databases",
      "<strong>Ops:</strong> monitoring, IAM hygiene, cost awareness",
    ],
    lookingFor: [
      "Hands-on production cloud experience",
      "Infrastructure-as-code skills",
      "Security-aware operational judgment",
    ],
    whyUs: "You'd shape the cloud foundation product teams run on, with room to improve it",
    stackHints: ["aws", "gcp", "azure", "cloud"],
  }),

  sre: pack({
    label: "SRE",
    roleTitle: "Senior Site Reliability Engineer",
    roleBlurb:
      "This <strong>Senior Site Reliability Engineer</strong> role improves reliability, observability, and incident readiness for production systems.",
    responsibilities: [
      "Raise SLOs, alerting quality, and incident response practices",
      "Improve observability across services",
      "Reduce toil through automation",
      "Partner with developers on production readiness",
      "Document runbooks and post-incident learning",
    ],
    techLines: [
      "<strong>Reliability:</strong> SLOs, error budgets, incident process",
      "<strong>Observability:</strong> metrics, logs, traces",
      "<strong>Platform:</strong> Kubernetes, cloud services, automation",
      "<strong>Collaboration:</strong> production readiness with app teams",
    ],
    lookingFor: [
      "Production SRE or reliability-focused experience",
      "Strong debugging and systems instincts",
      "Calm communication during and after incidents",
    ],
    whyUs: "You'd protect user trust by making systems measurable, operable, and recoverable",
    stackHints: ["sre", "reliability", "observability", "prometheus", "grafana"],
  }),

  platform: pack({
    label: "Platform Engineering",
    roleTitle: "Senior Platform Engineer",
    roleBlurb:
      "This <strong>Senior Platform Engineer</strong> role builds internal developer platforms that make product teams faster and safer.",
    responsibilities: [
      "Build internal tooling and platform services for engineers",
      "Improve CI, environments, and self-service workflows",
      "Reduce friction between app teams and infrastructure",
      "Define clear platform interfaces and documentation",
      "Balance enablement with sensible guardrails",
    ],
    techLines: [
      "<strong>Platform:</strong> Kubernetes, developer portals, shared services",
      "<strong>Delivery:</strong> CI/CD templates, golden paths",
      "<strong>Languages:</strong> Go / TypeScript / Python as needed",
      "<strong>Focus:</strong> DX, reliability, and operational clarity",
    ],
    lookingFor: [
      "Experience building platforms or shared engineering tooling",
      "Empathy for application developers",
      "Strong automation and documentation habits",
    ],
    whyUs: "You'd improve how every team ships - platform work with real leverage",
    stackHints: ["platform engineer", "developer platform", "internal tools"],
  }),

  security: pack({
    label: "Security",
    roleTitle: "Senior Application Security Engineer",
    roleBlurb:
      "This <strong>Senior Application Security Engineer</strong> role hardens product security while helping teams ship with confidence.",
    responsibilities: [
      "Improve application security reviews and secure defaults",
      "Help remediate findings with pragmatic guidance",
      "Strengthen auth, secrets, and dependency hygiene",
      "Partner with engineering on threat-aware design",
      "Document clear security playbooks for product teams",
    ],
    techLines: [
      "<strong>AppSec:</strong> secure SDLC, code review, dependency scanning",
      "<strong>Identity:</strong> OAuth/OIDC, secrets management",
      "<strong>Cloud:</strong> IAM baselines, network hygiene",
      "<strong>Collaboration:</strong> enablement over gatekeeping",
    ],
    lookingFor: [
      "Application security or secure engineering experience",
      "Ability to explain risk clearly to developers",
      "Practical remediation mindset",
    ],
    whyUs: "You'd protect customers without becoming a process bottleneck",
    stackHints: ["security", "appsec", "owasp", "penetration", "infosec"],
  }),

  qa: pack({
    label: "QA / Test",
    roleTitle: "Senior QA / Test Automation Engineer",
    roleBlurb:
      "This <strong>Senior QA / Test Automation Engineer</strong> role strengthens product quality through automation and clear risk coverage.",
    responsibilities: [
      "Design and maintain automated test suites",
      "Improve regression coverage for critical flows",
      "Partner with developers on testability",
      "Clarify quality signals before release",
      "Reduce flaky tests and slow feedback loops",
    ],
    techLines: [
      "<strong>Automation:</strong> Playwright, Cypress, Selenium, or similar",
      "<strong>API testing:</strong> contract and integration checks",
      "<strong>CI:</strong> quality gates in pipelines",
      "<strong>Mindset:</strong> risk-based coverage, not checkbox QA",
    ],
    lookingFor: [
      "Hands-on test automation experience",
      "Comfort reading application code and APIs",
      "Clear communication about risk and coverage",
    ],
    whyUs: "You'd partner with engineering to help the product ship safely - not only find bugs late",
    stackHints: ["qa", "testing", "playwright", "cypress", "selenium", "quality"],
  }),

  game: pack({
    label: "Game Dev",
    roleTitle: "Senior Game Developer",
    roleBlurb:
      "This <strong>Senior Game Developer</strong> role builds interactive experiences with strong engineering discipline.",
    responsibilities: [
      "Implement gameplay systems and tooling",
      "Improve performance, stability, and iteration speed",
      "Collaborate with design on feel and polish",
      "Support builds, content pipelines, and releases",
      "Raise engineering quality in game codebases",
    ],
    techLines: [
      "<strong>Engines:</strong> Unity, Unreal, or custom engines",
      "<strong>Languages:</strong> C#, C++, Godot/GDScript as relevant",
      "<strong>Systems:</strong> gameplay, networking, tooling",
      "<strong>Quality:</strong> profiling, playtest feedback loops",
    ],
    lookingFor: [
      "Shipped game or interactive experience work",
      "Strong engineering fundamentals in a game stack",
      "Collaborative iteration with design partners",
    ],
    whyUs: "You'd combine craft and engineering for playable, maintainable game systems",
    stackHints: ["unity", "unreal", "game", "godot"],
  }),

  blockchain: pack({
    label: "Blockchain / Web3",
    roleTitle: "Senior Blockchain / Web3 Engineer",
    roleBlurb:
      "This <strong>Senior Blockchain / Web3 Engineer</strong> role builds smart-contract and web3 product work with careful engineering judgment.",
    responsibilities: [
      "Design and implement smart contracts or web3 integrations",
      "Improve security review habits and testing coverage",
      "Build reliable off-chain services where needed",
      "Collaborate on UX for wallet and chain interactions",
      "Document assumptions and operational risks clearly",
    ],
    techLines: [
      "<strong>Contracts:</strong> Solidity, Foundry/Hardhat, audits mindset",
      "<strong>App layer:</strong> TypeScript, ethers/viem, wallet flows",
      "<strong>Security:</strong> testing, threat modeling, careful upgrades",
      "<strong>Infra:</strong> indexing, RPCs, monitoring",
    ],
    lookingFor: [
      "Hands-on smart contract or web3 product experience",
      "Security-conscious engineering habits",
      "Clear communication about risk and tradeoffs",
    ],
    whyUs: "You'd prioritize correctness and user trust over Web3 hype",
    stackHints: ["solidity", "ethereum", "web3", "blockchain", "smart contract"],
  }),

  embedded: pack({
    label: "Embedded / Systems",
    roleTitle: "Senior Embedded / Systems Engineer",
    roleBlurb:
      "This <strong>Senior Embedded / Systems Engineer</strong> role covers low-level, performance-sensitive, or device-adjacent software.",
    responsibilities: [
      "Build and maintain embedded or systems-level software",
      "Improve reliability, timing, and hardware integration",
      "Collaborate with product and firmware/hardware partners",
      "Strengthen testing and bring-up practices",
      "Document interfaces and constraints clearly",
    ],
    techLines: [
      "<strong>Languages:</strong> C, C++, Rust as relevant",
      "<strong>Systems:</strong> RTOS/Linux, drivers, protocols",
      "<strong>Tooling:</strong> debugging, flashing, CI for firmware",
      "<strong>Quality:</strong> determinism, resource constraints, safety habits",
    ],
    lookingFor: [
      "Embedded or systems production experience",
      "Comfort with hardware constraints and debugging",
      "Clear written communication of technical limits",
    ],
    whyUs: "You'd solve hard physical-world constraints carefully, with engineering depth",
    stackHints: ["embedded", "firmware", "rtos", "microcontroller", "c++"],
  }),
};

export function styleOpeningHint(style: MessageStyle): string {
  const trust =
    "Make the candidate believe this is a real role: specific, honest, respectful. No flattery, no hype.";
  if (style === "short") {
    return `${trust} SHORT first-touch. Opening 2 sentences naming the role + one personalization signal. Keep day-to-day / stack / looking-for tight (≤3 each). One clear CTA. No flattery.`;
  }
  if (style === "curious") {
    return `${trust} CURIOUS tone. Soft question angle (is this on your radar?). Still name the role and one signal. No pushy close.`;
  }
  if (style === "peer") {
    return `${trust} PEER note. Sound like someone who ships product, not a blast sequence. Name stack or ownership. Skip corporate adjectives.`;
  }
  if (style === "followup") {
    return `${trust} FOLLOW-UP bump (~60-90 words). Assume they saw the first email. One new angle. No full JD. Soft CTA.`;
  }
  if (style === "followup-value") {
    return `${trust} FOLLOW-UP with one concrete reason the role is worth their time (~70-100 words). No flattery. One CTA.`;
  }
  if (style === "followup-close") {
    return `${trust} LAST polite follow-up (~50-80 words). Easy yes/no. Make it clear you will not keep emailing.`;
  }
  if (style === "warm") {
    return `${trust} Warm but brief. One personal note max (company or language). Do not start with Hi — greeting is separate.`;
  }
  if (style === "concise") {
    return `${trust} Two short sentences in the opening. No filler.`;
  }
  if (style === "technical") {
    return `${trust} Precise. Name one stack signal. Recruiter voice, not buzzwords.`;
  }
  if (style === "direct") {
    return `${trust} Direct. Name the role in sentence one.`;
  }
  if (style === "formal") {
    return `${trust} Formal letter English. Complete sentences. No marketing adjectives.`;
  }
  if (style === "collab") {
    return `${trust} COLLABORATION note. Interest in their open source work or project. Name what you admire in their repos. No job pitch. One clear ask.`;
  }
  return `${trust} Clear, specific, restrained.`;
}
