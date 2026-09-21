import { NextResponse } from "next/server";

// Gender filter options based on pronoun detection
const GENDERS = [
  { value: "all", label: "All" },
  { value: "male", label: "He/Him (Male)" },
  { value: "female", label: "She/Her (Female)" },
  { value: "non-binary", label: "They/Them (Non-binary)" },
];

export async function GET() {
  return NextResponse.json(GENDERS);
}
