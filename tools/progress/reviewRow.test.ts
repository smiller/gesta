import { test, expect } from "vitest";
import { typed, rowEvents, hookAnswer } from "./reviewRow.ts";
import type { Event } from "./events.ts";

const at = (hm: string): string => "2026-11-22T" + hm;
const begun: Event[] = [{ at: at("07:30"), ev: "begin", next: { A: 9 } }];
const REVIEW = "The batch review: /code-review at HIGH over 5a8edc7..305cdee";

test("a typed command is read from the expansion's name and arguments, a plugin's prefix dropped, or from the prompt's line", () => {
  expect(typed({ command_name: "code-review", command_args: "high 5a8edc7..305cdee" })).toEqual({ name: "code-review", args: "high 5a8edc7..305cdee" });
  expect(typed({ command_name: "some-plugin:code-review", command_args: "" })).toEqual({ name: "code-review", args: "" });
  expect(typed({ prompt: "/code-review high a..b\n" })).toEqual({ name: "code-review", args: "high a..b" });
  expect(typed({ prompt: "why is the corner hard to read?" })).toBe(null);
  expect(typed(null)).toBe(null);
});

test("a review typed adds its row on the architecture list and starts it, the line it was typed as in the description", () => {
  const out = rowEvents({ name: "code-review", args: "high 5a8edc7..305cdee" }, begun, at("07:30"));
  expect(out).toMatchObject([
    { ev: "add", id: "A9", list: "A", title: REVIEW },
    { ev: "start", id: "A9" },
  ]);
  expect((out[0] as { detail: string }).detail).toMatch(/^Asked: \/code-review high 5a8edc7\.\.305cdee, typed at 07:30\. Why: .+ Done when: .+/);
});

test("a review's title carries its level and its target, its flags left out; with neither, the current diff", () => {
  const title = (args: string) => (rowEvents({ name: "code-review", args }, begun, at("08:00"))[0] as { title: string }).title;
  expect(title("high --fix 1e43685..HEAD")).toBe("The batch review: /code-review at HIGH over 1e43685..HEAD");
  expect(title("1e43685..HEAD")).toBe("The batch review: /code-review over 1e43685..HEAD");
  expect(title("")).toBe("The batch review: /code-review over the current diff");
});

test("a review whose row was added when its line was handed over is started, not added again; one already started is left", () => {
  const handed: Event[] = [...begun, { at: at("07:20"), ev: "add", id: "A9", list: "A", title: REVIEW }];
  expect(rowEvents({ name: "code-review", args: "high 5a8edc7..305cdee" }, handed, at("07:30"))).toEqual([{ at: at("07:30"), ev: "start", id: "A9" }]);
  expect(rowEvents({ name: "code-review", args: "high 5a8edc7..305cdee" }, [...handed, { at: at("07:30"), ev: "start", id: "A9" }], at("07:31"))).toEqual([]);
});

test("an architecture run starts the row waiting under the last review, or adds one there", () => {
  const reviewed: Event[] = [...begun, { at: at("07:30"), ev: "add", id: "A9", list: "A", title: REVIEW }];
  const waiting: Event[] = [...reviewed, { at: at("07:51"), ev: "add", id: "A9.1", list: "A", parent: "A9", title: "The architecture run over the batch's files" }];
  const run = { name: "improve-codebase-architecture", args: "src/editor/passage.ts" };
  expect(rowEvents(run, waiting, at("09:00"))).toEqual([{ at: at("09:00"), ev: "start", id: "A9.1" }]);
  expect(rowEvents(run, reviewed, at("09:00"))).toMatchObject([
    { ev: "add", id: "A9.1", list: "A", parent: "A9", title: "The architecture run over the batch's files" },
    { ev: "start", id: "A9.1" },
  ]);
});

test("an architecture run with no review on the day is a row of its own", () => {
  expect(rowEvents({ name: "improve-codebase-architecture", args: "" }, begun, at("09:00"))).toMatchObject([
    { ev: "add", id: "A9", list: "A", title: "The architecture run over the batch's files" },
    { ev: "start", id: "A9" },
  ]);
});

test("any other command writes nothing", () => {
  expect(rowEvents({ name: "simplify", args: "" }, begun, at("09:00"))).toEqual([]);
});

test("the hook's answer is context for the event that fired: the rows written, and both pages to publish now with their files", () => {
  const lines = ['{"ev":"add","id":"A13"}', "republish tools/out/progress/d.html → https://claude.ai/artifact/D, beside it tools/out/progress/c.html tools/out/progress/d.html"];
  const out = JSON.parse(hookAnswer("UserPromptExpansion", "code-review", lines));
  expect(out.hookSpecificOutput.hookEventName).toBe("UserPromptExpansion");
  expect(out.hookSpecificOutput.additionalContext).toMatch(/^Progress rows written for \/code-review\. Publish both progress pages now, in this turn, before anything else/);
  expect(out.hookSpecificOutput.additionalContext).toContain(lines[1]);
});
