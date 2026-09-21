/** Display names for GitHub languages / stack hint tokens in outreach copy. */

const TECH_LABELS: Record<string, string> = {
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  golang: "Go",
  go: "Go",
  csharp: "C#",
  "c#": "C#",
  dotnet: ".NET",
  ".net": ".NET",
  react: "React",
  vue: "Vue",
  angular: "Angular",
  next: "Next.js",
  nextjs: "Next.js",
  nestjs: "NestJS",
  express: "Express",
  fastify: "Fastify",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  redis: "Redis",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  fullstack: "Full-stack",
  "full-stack": "Full-stack",
  "full stack": "Full-stack",
  ml: "ML",
  "machine learning": "Machine Learning",
  devops: "DevOps",
  sre: "SRE",
  ios: "iOS",
  android: "Android",
  flutter: "Flutter",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  php: "PHP",
  ruby: "Ruby",
  rails: "Rails",
  laravel: "Laravel",
  django: "Django",
  fastapi: "FastAPI",
  spring: "Spring",
};

export function prettyTechLabel(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase();
  if (TECH_LABELS[key]) return TECH_LABELS[key];
  // Already mixed-case product names (TypeScript, PostgreSQL, etc.)
  if (/[A-Z]/.test(trimmed.slice(1)) || trimmed.includes(".") || trimmed.includes("#")) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function sameTech(a: string, b: string): boolean {
  const left = prettyTechLabel(a).toLowerCase();
  const right = prettyTechLabel(b).toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}
