import { NextResponse } from "next/server";

// Popular programming languages on GitHub
const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "C#",
  "C++",
  "C",
  "Dart",
  "Scala",
  "Elixir",
  "Clojure",
  "Haskell",
  "Lua",
  "R",
  "Shell",
  "Jupyter Notebook",
  "Vue",
  "Svelte",
  "Angular",
  "Next.js",
];

export async function GET() {
  return NextResponse.json(LANGUAGES);
}
