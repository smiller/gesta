import { test, expect } from "vitest";
import { contIndents } from "./continuations.ts";

const line = (end: number) => ({ kind: "line" as const, end, room: 600 });
const cont = (end: number, room = 600) => ({ kind: "cont" as const, end, room });
const other = { kind: "other" as const, end: 0, room: 600 };

test("the rest of a split line starts a space past where the half above ends, past the speakers between", () => {
  expect(contIndents([line(140), other, cont(90)], 5)).toEqual([0, 0, 145]);
});

test("a line split three ways steps on: each rest past the one before it", () => {
  expect(contIndents([line(140), other, cont(90), other, cont(120)], 5)).toEqual([0, 0, 145, 0, 145 + 90 + 5]);
});

test("a rest with no half above it in the block is not set in; one that would run past the row is set in only as far as it fits", () => {
  expect(contIndents([other, cont(90), line(100)], 5)).toEqual([0, 0, 0]);
  expect(contIndents([line(500), cont(200)], 5)).toEqual([0, 400]);
  expect(contIndents([line(500), cont(700)], 5)).toEqual([0, 0]);
});
