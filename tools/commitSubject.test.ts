import { test, expect } from "vitest";
import { subjectProblem } from "./commitSubject.ts";

test("a commit subject is a Conventional Commits line of 72 characters at most", () => {
  expect(subjectProblem("fix(store): a save whose write did not land is made again\n\nbody")).toBeNull();
  expect(subjectProblem("feat(tools): a \"closed\" column, when an item and all it spawned had ended")).toBe("the subject is 73 characters, 72 at most");
  expect(subjectProblem("made some changes")).toBe("the subject is not type(scope)!: summary, the type one of build, chore, ci, docs, feat, fix, perf, refactor, revert, style or test");
  expect(subjectProblem("refactor!: a breaking change")).toBeNull();
});

test("git's own messages and the editor's comment lines are left alone", () => {
  expect(subjectProblem("# Please enter the commit message\nfix: a thing\n")).toBeNull();
  expect(subjectProblem("Merge branch 'main' of somewhere")).toBeNull();
  expect(subjectProblem("fixup! fix: a thing")).toBeNull();
});
