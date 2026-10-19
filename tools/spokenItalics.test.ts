import { test, expect } from "vitest";
import { declareLines } from "./spokenItalics.ts";

const run = (md: string, directions: string[] = []) => declareLines(md, directions).text;

test("spokenItalics: a row wholly italic and not in brackets is declared a line; a bracketed direction and a speaker are left", () => {
  const md = "::: verse\n*Le Public, qui arrive peu à peu.*\n\n**Cyrano, fermant une seconde les yeux.**\n*Je jette avec grâce mon feutre,*\n*Je fais lentement l’abandon*\n\n*(Premiers engagements de fer.)*\n\n*Vous auriez bien dû rester neutre ;*\n:::";
  expect(run(md)).toBe("::: verse\n*Le Public, qui arrive peu à peu.*\n\n**Cyrano, fermant une seconde les yeux.**\n⟨line⟩*Je jette avec grâce mon feutre,*\n⟨line⟩*Je fais lentement l’abandon*\n\n*(Premiers engagements de fer.)*\n\n⟨line⟩*Vous auriez bien dû rester neutre ;*\n:::");
});
test("spokenItalics: the block's first row, the cast, is left", () => {
  expect(run("# Acte 1\n\n::: verse 91\n*Roxane, Cyrano.*\n\n**Roxane.**\n*« Philis !… »*\n:::")).toBe("# Acte 1\n\n::: verse 91\n*Roxane, Cyrano.*\n\n**Roxane.**\n⟨line⟩*« Philis !… »*\n:::");
});
test("spokenItalics: a row partly roman, a row already declared, and a row listed as a direction are left", () => {
  const md = "::: verse\n*Cast.*\n\n**Roxane, vivement.**\n« *Donnez pour le couvent cent vingt pistoles.* »\n⟨line⟩*Already.*\nMacarons, citronnée…\n*Les violons commencent à jouer.*\n:::";
  expect(run(md, ["*Les violons commencent à jouer.*"])).toBe(md);
});
test("spokenItalics: outside a verse block nothing moves", () => {
  expect(run("*An italic paragraph.*\n\n::: verse\n*Cast.*\n:::\n\n*Another.*")).toBe("*An italic paragraph.*\n\n::: verse\n*Cast.*\n:::\n\n*Another.*");
});
test("spokenItalics: each mark says its line and the row", () => {
  expect(declareLines("::: verse\n*Cast.*\n**A.**\n*Feu !*\n:::", []).marks).toEqual([{ line: 3, row: "*Feu !*" }]);
});
