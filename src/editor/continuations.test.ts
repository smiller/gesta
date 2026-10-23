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
  expect(contIndents([line(500), cont(200)], 5)).toEqual([0, 399]);
  expect(contIndents([line(500), cont(700)], 5)).toEqual([0, 0]);
});

test("a rest opening a block is set in past the half carried from the block before, where there is one", () => {
  expect(contIndents([cont(90), line(100)], 5, 200)).toEqual([205, 0]);
  expect(contIndents([cont(90), cont(50)], 5, 200)).toEqual([205, 300]);
  expect(contIndents([line(100), cont(90)], 5, 400)).toEqual([0, 105]);
});

test("a rest is set in a pixel short of filling its row: text a fraction wider than its measure wrapped", () => {
  expect(contIndents([line(211), cont(244, 450)], 5.4)).toEqual([0, 205]);
});
