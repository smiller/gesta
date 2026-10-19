import { test, expect } from "vitest";
import { commentMarkdown } from "./commentHtml.ts";

const md = (html: string) => commentMarkdown(html).text;

test("commentHtml: a quotation in italics and its reply the line beneath, straight quotes curled", () => {
  expect(md("<p><i>tafelshrews</i><br />\n– Another <i>Lungbarrow</i> reference!  Drink!  (At least I think that's where I encountered them…)</p>"))
    .toBe("*tafelshrews*\n– Another *Lungbarrow* reference!  Drink!  (At least I think that’s where I encountered them…)");
});
test("commentHtml: a quotation of several lines is italic line by line", () => {
  expect(md("<p><i>You'll get along,<br />\nThe pain that you feel<br />\nBy living.</i><br />\n– Ooh.  Perfect.</p>"))
    .toBe("*You’ll get along,*\n*The pain that you feel*\n*By living.*\n– Ooh.  Perfect.");
});
test("commentHtml: the doubled italics round quotation and reply come out as the plain form", () => {
  expect(md("<p>\n  <i><i>He did not have the mental space, but maybe in 50 years?</i><br />\n– Eh, fair enough.  Plus, time machine.</i>\n</p>"))
    .toBe("*He did not have the mental space, but maybe in 50 years?*\n– Eh, fair enough.  Plus, time machine.");
  expect(md("<p>\n  <i><i>“It’s my story, but it’s… not?”</i><br />\n– That's what stories <i>do</i>.</i>\n</p>"))
    .toBe("*“It’s my story, but it’s… not?”*\n– That’s what stories *do*.");
});
test("commentHtml: a reply with no break before it, or a stray [I, is still the reply", () => {
  expect(md("<p>\n  <i><i>a piece of music her new husband had composed for her.</i>\n– Ah.  Okay, here we go.</i>\n</p>")).toBe("*a piece of music her new husband had composed for her.*\n– Ah.  Okay, here we go.");
  expect(md("<p>\n  <i><i>a great deal of confidence</i><br />\n[I– Shocker.  Not.</i>\n</p>")).toBe("*a great deal of confidence*\n– Shocker.  Not.");
});
test("commentHtml: a reply over several lines keeps them", () => {
  expect(md("<p>\n  <i><i>“You want approval,” the Seeker dryly observed</i><br />\n– DOCTOR: I can explain.<br />\nAMY: You want to be forgiven.</i>\n</p>"))
    .toBe("*“You want approval,” the Seeker dryly observed*\n– DOCTOR: I can explain.\nAMY: You want to be forgiven.");
});
test("commentHtml: a quotation with no reply joins the entry after it; words of one's own wrapped in italics are plain; an empty paragraph goes", () => {
  expect(md("<p>\n  <i>\n\n> <i>“Damn you,” she said.</i>\n\n  </i>\n</p>\n\n<p>\n  <i>\n\n> <i>He held up his glass.</i>\n\n  </i>\n</p>\n\n<p>\n  <i><i>“Mazel Tov,” he responded.</i><br />\n– Okay, I love them both.</i>\n</p>\n\n<p></p>\n\n<p>\n  <i>Oh.  Or not.   Well, fair enough.</i>\n</p>"))
    .toBe("*“Damn you,” she said.*\n*He held up his glass.*\n*“Mazel Tov,” he responded.*\n– Okay, I love them both.\n\nOh.  Or not.   Well, fair enough.");
  expect(md("<p>\n  <i>\n\n> <i>Roda studied him for a long moment.</i>\n\n  </i>\n</p>\n\n<p>\n  <i><i>He wasn’t sure what was going through her head</i><br />\n– Yes.  No.</i>\n</p>"))
    .toBe("*Roda studied him for a long moment.*\n*He wasn’t sure what was going through her head*\n– Yes.  No.");
});
test("commentHtml: a reply typed with a hyphen is given the dash", () => {
  expect(md("<p>\n  <i><i>he had to sit down for a fully five minutes</i><br />\n- Yes.  That.</i>\n</p>")).toBe("*he had to sit down for a fully five minutes*\n– Yes.  That.");
});
test("commentHtml: a blockquote is a quotation, the aside after it a paragraph of one's own", () => {
  expect(md("<p>\n  <i><i>telling himself</i><br />\n– Yeah, kiddo.</i></p><blockquote>\n  <i>Fais tout haut l’orgueilleux,<br />\nDis-moi tout simplement.</i>\n</blockquote><i>(From <i>Cyrano de Bergerac</i>, approximately, “You can.”)</i>"))
    .toBe("*telling himself*\n– Yeah, kiddo.\n\n> Fais tout haut l’orgueilleux,\n> Dis-moi tout simplement.\n\n(From *Cyrano de Bergerac*, approximately, “You can.”)");
});
test("commentHtml: entities are decoded", () => {
  expect(md("<p>\n  <i>Their very first visitor was Matt&gt;<br />\n– Oh, good.</i>\n</p>")).toBe("*Their very first visitor was Matt>*\n– Oh, good.");
});
