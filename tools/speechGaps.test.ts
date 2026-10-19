import { test, expect } from "vitest";
import { closeSpeeches } from "./speechGaps.ts";

const run = (md: string, apart: string[] = []) => closeSpeeches(md, apart).text;

test("speechGaps: the blank lines between a speech's lines go; those before a speaker and round a direction stay", () => {
  const md = "::: verse\n**Un marquis, voyant la salle à moitié vide.**\nHé quoi ! Nous arrivons ainsi que les drapiers,\n\nSans déranger les gens ? sans marcher sur les pieds ?\n\nAh ! fi ! fi ! fi !\n\n" +
    "*(Il se trouve devant d’autres gentilshommes entrés peu avant.)*\n\nCuigy ! Brissaille !\n\n**Cuigy.**\nDes fidèles !…\n:::";
  expect(run(md)).toBe("::: verse\n**Un marquis, voyant la salle à moitié vide.**\nHé quoi ! Nous arrivons ainsi que les drapiers,\nSans déranger les gens ? sans marcher sur les pieds ?\nAh ! fi ! fi ! fi !\n\n" +
    "*(Il se trouve devant d’autres gentilshommes entrés peu avant.)*\n\nCuigy ! Brissaille !\n\n**Cuigy.**\nDes fidèles !…\n:::");
});
test("speechGaps: a line wholly italic and not in brackets is a line of the speech", () => {
  expect(run("::: verse\n*Je jette avec grâce mon feutre,*\n\n*Je fais lentement l’abandon*\n:::")).toBe("::: verse\n*Je jette avec grâce mon feutre,*\n*Je fais lentement l’abandon*\n:::");
});
test("speechGaps: a gap whose line above is listed apart stays", () => {
  const md = "::: verse\n*Qu’à la fin de l’envoi, je touche.*\n\n*Il me manque une rime en eutre…*\n\n*Vous rompez, plus blanc qu’amidon ?*\n:::";
  expect(run(md, ["*Qu’à la fin de l’envoi, je touche.*"])).toBe("::: verse\n*Qu’à la fin de l’envoi, je touche.*\n\n*Il me manque une rime en eutre…*\n*Vous rompez, plus blanc qu’amidon ?*\n:::");
});
test("speechGaps: blank lines in a run inside the block become one", () => {
  expect(run("::: verse\nS’il était aussi maldisant que bien coiffé !\n\n\n\n**Cyrano, après un temps.**\nVous m’avez fait venir pour me dire cela ?\n:::"))
    .toBe("::: verse\nS’il était aussi maldisant que bien coiffé !\n\n**Cyrano, après un temps.**\nVous m’avez fait venir pour me dire cela ?\n:::");
});
test("speechGaps: outside a verse block nothing moves; a block's starting number is still the block", () => {
  expect(run("# Acte 1\n\nOne\n\nTwo\n\n\n::: verse 91\nA\n\nB\n:::\n\nC\n\nD")).toBe("# Acte 1\n\nOne\n\nTwo\n\n\n::: verse 91\nA\nB\n:::\n\nC\n\nD");
});
test("speechGaps: each change says its line and the lines either side", () => {
  expect(closeSpeeches("::: verse\nA\n\nB\n\n\n**C.**\n:::", []).changes).toEqual([
    { line: 2, above: "A", below: "B", kind: "joined" },
    { line: 4, above: "B", below: "**C.**", kind: "collapsed" },
  ]);
});
test("speechGaps: a verse block inside a quotation is closed up the same way", () => {
  expect(run("> ::: verse 91\n> **Cyrano.**\n> Oui, tous les mots sont fins quand la moustache est fine.\n> \n> — Mais si c’était un sot !…\n> \n> **Roxane, frappant du pied.**\n> :::\n\n> One\n\n> Two"))
    .toBe("> ::: verse 91\n> **Cyrano.**\n> Oui, tous les mots sont fins quand la moustache est fine.\n> — Mais si c’était un sot !…\n> \n> **Roxane, frappant du pied.**\n> :::\n\n> One\n\n> Two");
});
