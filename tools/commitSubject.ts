/* node tools/commitSubject.ts <message-file> */
import { readFileSync } from "node:fs";

const TYPES = ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"];
const SHAPE = new RegExp("^(" + TYPES.join("|") + ")(\\([^()]+\\))?!?: \\S");
const MOST = 72;
/* git writes these itself */
const GITS = /^(Merge |fixup! |squash! |amend! )/;

export function subjectProblem(message: string): string | null {
  const subject = message.split("\n").find((l) => l.trim() && !l.startsWith("#")) ?? "";
  if (!subject || GITS.test(subject)) return null;
  const length = [...subject].length;
  if (length > MOST) return "the subject is " + length + " characters, " + MOST + " at most";
  if (!SHAPE.test(subject)) return "the subject is not type(scope)!: summary, the type one of " + TYPES.slice(0, -1).join(", ") + " or " + TYPES[TYPES.length - 1];
  return null;
}

if (import.meta.url === "file://" + process.argv[1]) {
  const problem = subjectProblem(readFileSync(process.argv[2], "utf8"));
  if (problem) { console.error("commit refused: " + problem); process.exit(1); }
}
