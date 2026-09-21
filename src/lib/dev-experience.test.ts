import test from "node:test";
import assert from "node:assert/strict";
import {
  adjustRoleTitleForExperience,
  estimateExperienceFromGithub,
  experienceRequirementBullet,
  roleMatchSentence,
  yearsFromBio,
} from "./dev-experience";
import { prettyTechLabel, sameTech } from "./tech-labels";

test("yearsFromBio parses common patterns", () => {
  assert.equal(yearsFromBio("5 years of experience building APIs"), 5);
  assert.equal(yearsFromBio("10+ years exp"), 10);
  assert.equal(yearsFromBio("Software Engineer"), null);
});

test("old GitHub accounts are discounted and capped (not 17-year careers)", () => {
  const exp = estimateExperienceFromGithub({
    created_at: "2010-01-01T00:00:00.000Z",
    earliest_repo_at: "2010-06-01T00:00:00.000Z",
    public_repos: 127,
    followers: 50,
    language: "TypeScript",
  });

  assert.ok(exp.years <= 10, `expected <=10, got ${exp.years}`);
  assert.equal(exp.band, "senior");
  assert.equal(exp.requiredYearsText, "4–6 years");
});

test("junior profiles get junior title and 1–2 year requirement", () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const exp = estimateExperienceFromGithub({
    created_at: oneYearAgo.toISOString(),
    public_repos: 5,
    followers: 2,
  });
  assert.equal(exp.band, "junior");
  assert.equal(
    adjustRoleTitleForExperience("Senior React Developer", exp.band),
    "Junior React Developer"
  );
  assert.equal(
    experienceRequirementBullet("React", exp),
    "1–2 years of relevant React experience"
  );
});

test("prettyTechLabel fixes nodejs casing", () => {
  assert.equal(prettyTechLabel("nodejs"), "Node.js");
  assert.equal(prettyTechLabel("node.js"), "Node.js");
  assert.equal(prettyTechLabel("typescript"), "TypeScript");
  assert.ok(sameTech("nodejs", "Node.js"));
});

test("fit sentence is professional recruiter voice", () => {
  const exp = estimateExperienceFromGithub({
    created_at: "2018-01-01T00:00:00.000Z",
    public_repos: 40,
    language: "TypeScript",
  });
  const withCompany = roleMatchSentence({
    roleTitle: "Senior Full-Stack Developer",
    trackLabel: "Full-stack",
    experience: exp,
    language: null,
    company: "FuturFusion",
  });
  assert.match(withCompany, /FuturFusion/);
  assert.match(withCompany, /relevant|lined up|hiring for|worth a note|search needs/i);
  assert.ok(!/stood out|Came across|strong fit|we believe you would be/i.test(withCompany));

  const nodeAwkward = roleMatchSentence({
    roleTitle: "Node.js Developer",
    trackLabel: "Node.js",
    experience: exp,
    language: "nodejs",
  });
  assert.match(nodeAwkward, /Node\.js/);
  assert.match(nodeAwkward, /background|hiring for|search needs|opening|careful note/i);
  assert.ok(!/strong candidate|nodejs background/i.test(nodeAwkward));
});
