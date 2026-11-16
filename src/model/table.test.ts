import { test, expect } from "vitest";
import { tableLines, readTable, isTableStart } from "./table.ts";

test("a table written is its header, a divider, then a row a line, a cell's pipe escaped", () => {
  expect(tableLines([["a", "b"], ["1", "x|y"]])).toEqual(["| a | b |", "| --- | --- |", "| 1 | x\\|y |"]);
  expect(tableLines([["a"]])).toEqual(["| a |", "| --- |"]);
});

test("cells written and read back are the cells: a pipe, a backslash, an escaped pipe, a trailing backslash, a code span's pipe, an empty cell", () => {
  const rows = [["h", "i", "j"], ["x|y", "c:\\path", "a\\|b"], ["ends\\", "`p|q`", ""]];
  expect(readTable(tableLines(rows), 0)).toEqual({ rows, next: 4 });
});

test("a table starts at a row with a divider under it, takes the rows after it, and pads or trims each to the header", () => {
  const lines = ["before", "| a | b |", "| :-- | --: |", "| 1 |", "| 1 | 2 | 3 |", "after"];
  expect(readTable(lines, 1)).toEqual({ rows: [["a", "b"], ["1", ""], ["1", "2"]], next: 5 });
  expect([isTableStart(lines, 1), isTableStart(lines, 0), isTableStart(["| a |", "| b |"], 0), isTableStart(["| a |"], 0)]).toEqual([true, false, false, false]);
  expect(readTable(lines, 0)).toBeNull();
});
