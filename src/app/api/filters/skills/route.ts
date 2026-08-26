import { NextResponse } from "next/server";

// Comprehensive list of skills, technologies, and tools
const SKILLS = [
  // Frontend Frameworks
  "react",
  "vue",
  "angular",
  "svelte",
  "nextjs",
  "nuxt",
  "gatsby",
  "remix",
  "solidjs",
  "ember",
  
  // Backend Frameworks
  "nodejs",
  "express",
  "nestjs",
  "fastify",
  "django",
  "flask",
  "fastapi",
  "rails",
  "laravel",
  "spring-boot",
  "aspnet",
  "phoenix",
  "elixir",
  
  // Programming Languages
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "csharp",
  "cpp",
  "c",
  "scala",
  "haskell",
  "clojure",
  "dart",
  "lua",
  "r",
  "matlab",
  "perl",
  "groovy",
  "julia",
  
  // Cloud & DevOps
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "terraform",
  "ansible",
  "jenkins",
  "gitlab-ci",
  "github-actions",
  "circleci",
  "devops",
  "ci-cd",
  "linux",
  "nginx",
  "apache",
  
  // Databases
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "elasticsearch",
  "cassandra",
  "dynamodb",
  "sqlite",
  "mariadb",
  "oracle",
  "sqlserver",
  "neo4j",
  "influxdb",
  
  // Data Science & ML
  "machine-learning",
  "deep-learning",
  "tensorflow",
  "pytorch",
  "keras",
  "pandas",
  "numpy",
  "scikit-learn",
  "data-science",
  "data-analysis",
  "nlp",
  "computer-vision",
  "artificial-intelligence",
  "mlops",
  "spark",
  "hadoop",
  
  // Mobile Development
  "react-native",
  "flutter",
  "swift",
  "kotlin",
  "ionic",
  "xamarin",
  "cordova",
  
  // API & Integration
  "graphql",
  "rest-api",
  "grpc",
  "websockets",
  "webhook",
  "oauth",
  "jwt",
  
  // Testing
  "testing",
  "jest",
  "cypress",
  "selenium",
  "unittest",
  "pytest",
  
  // Version Control
  "git",
  "github",
  "gitlab",
  "bitbucket",
  
  // Tools & Others
  "webpack",
  "vite",
  "babel",
  "npm",
  "yarn",
  "pnpm",
  "sass",
  "tailwindcss",
  "bootstrap",
  "material-ui",
  "figma",
  "sketch",
  "adobe-xd",
  
  // Blockchain & Web3
  "blockchain",
  "ethereum",
  "solidity",
  "web3",
  "nft",
  "smart-contracts",
  
  // Security
  "security",
  "cybersecurity",
  "penetration-testing",
  "owasp",
  "ssl",
  
  // Other
  "microservices",
  "serverless",
  "SaaS",
  "api-design",
  "system-design",
  "agile",
  "scrum",
];

export async function GET() {
  return NextResponse.json(SKILLS);
}
