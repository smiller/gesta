import { describe, expect, it } from "vitest";
import { fixPlay } from "./stageDirections.ts";

const tey = (md: string) => fixPlay(md, { capitals: true, join: false });
const williams = (md: string, join = false) => fixPlay(md, { capitals: false, join });

describe("a direction on its own line", () => {
  it("becomes one italic run, the brackets inside, a missing ] added", () => {
    expect(williams("*[To the ACCUSER*").md).toBe("*[To the ACCUSER]*");
    expect(williams("[*The* SOLDIER *salutes and goes out.*").md).toBe("*[The SOLDIER salutes and goes out.]*");
    expect(williams("[WALL holds up his fingers").md).toBe("*[WALL holds up his fingers]*");
  });
  it("one already right is left as it is, and not counted a change", () => {
    const r = williams("*[The BISHOP enters, vested, with acolytes and incense, and goes round the stage.]*");
    expect(r.md).toBe("*[The BISHOP enters, vested, with acolytes and incense, and goes round the stage.]*");
    expect(r.changes).toHaveLength(0);
  });
  it("its full stops go inside", () => {
    expect(tey("[*They consider it*.]").md).toBe("*[They consider it.]*");
  });
  it("Tey: the words left outside the italics are names, put in capitals, a possessive's s kept small", () => {
    expect(tey("[*Enter from below, R*., valerius.  *He overtakes* aemilius.]").md).toBe("*[Enter from below, R., VALERIUS.  He overtakes AEMILIUS.]*");
    expect(tey("[*To* sara, *as the* two men *take leave of each other*.]").md).toBe("*[To SARA, as the TWO MEN take leave of each other.]*");
  });
  it("Williams: no capitals added, the names being in them already", () => {
    expect(williams("[*The* MARSHAL *and the* PREFECT *come in abruptly.*").md).toBe("*[The MARSHAL and the PREFECT come in abruptly.]*");
  });
  it("speech after a closed direction stays outside it, so the row is still a line", () => {
    expect(williams("[To SHAKESPEARE:] Now, what make you on’t?").md).toBe("*[To SHAKESPEARE:]* Now, what make you on’t?");
    expect(williams("[*To the audience*] So will you.").md).toBe("*[To the audience]* So will you.");
  });
  it("a row whose speech is italic beside a roman direction is left, and listed", () => {
    for (const row of ["[Advances] *Romeo!*", "[Kisses him *Thy lips are warm!*", "[Burden: *Bow, wow*, dispersedly"]) {
      const r = williams(row);
      expect(r.md).toBe(row);
      expect(r.left).toHaveLength(1);
    }
  });
  it("the stray marks of earlier fixes go: a space before ’s, a “ for an apostrophe, a space after [", () => {
    expect(williams("*[* OROYO *catches* ASSANTU *’s wrist from behind.*").md).toBe("*[OROYO catches ASSANTU’s wrist from behind.]*");
    expect(williams("*[He touches ASSANTU“s head*").md).toBe("*[He touches ASSANTU’s head]*");
  });
  it("a quoted line keeps its marker", () => {
    expect(tey("> [*Enter* parkin.]").md).toBe("> *[Enter PARKIN.]*");
  });
});

describe("a direction run over several rows", () => {
  it("joined into one row when asked: the italic rows after an open bracket, up to a blank line", () => {
    const md = "*[He runs in a circle round ASSANTU and ANTHONY*\n*and comes to a stop opposite* ASSANTU, *exhibiting*\n*himself in his glory*\n\nIt was we whom the holy ones heard";
    expect(williams(md, true).md).toBe("*[He runs in a circle round ASSANTU and ANTHONY and comes to a stop opposite ASSANTU, exhibiting himself in his glory]*\n\nIt was we whom the holy ones heard");
  });
  it("stops at a row that is not italic: that row is speech", () => {
    expect(williams("*[He begins to move among the trees.*\nThe trees are dark.", true).md).toBe("*[He begins to move among the trees.]*\nThe trees are dark.");
  });
  it("never joined when not asked: an open bracket before italic speech is the printing's way", () => {
    expect(williams("[Exeunt some of the Watch\n*Pitiful sight! here lies the county slain,*").md).toBe("*[Exeunt some of the Watch]*\n*Pitiful sight! here lies the county slain,*");
  });
});

describe("a direction inside a speech", () => {
  it("Tey: one italic run in its parentheses, the names in capitals", () => {
    expect(tey("**Rivers**  That would be no bad thing, surely. (*The unheeding* prince *is busy putting out the counters again*)").md)
      .toBe("**Rivers**  That would be no bad thing, surely. (*The unheeding PRINCE is busy putting out the counters again*)");
    expect(tey("**Demetrius**  Look. (*He takes back the skin from* cogi’s *shoulder, shows* rufus *the thickness*)").md)
      .toBe("**Demetrius**  Look. (*He takes back the skin from COGI’s shoulder, shows RUFUS the thickness*)");
  });
  it("names already capitalised go to capitals too", () => {
    expect(tey("(*To* Mr Biddle, *who has come down*)").md).toBe("(*To MR BIDDLE, who has come down*)");
  });
  it("a foreign phrase or a title set roman is italic with the rest, not capitalised", () => {
    expect(tey("(*As a* quid pro quo)").md).toBe("(*As a quid pro quo*)");
    expect(tey("(*seeing that* judd *is performing an odd* pas seul)").md).toBe("(*seeing that JUDD is performing an odd pas seul*)");
    expect(tey("(*Shaking the* Post *at her*)").md).toBe("(*Shaking the Post at her*)");
  });
  it("one already wholly italic is left", () => {
    expect(tey("**Andrew**  (*ignoring him*) You are talking.").changes).toHaveLength(0);
  });
});

describe("what is not a direction", () => {
  it("an editor's closing note is left", () => {
    expect(tey("[The end of *Plays vol. 1* by Gordon Daviot]").md).toBe("[The end of *Plays vol. 1* by Gordon Daviot]");
    expect(tey("[End of *Richard of Bordeaux* by Gordon Daviot]").changes).toHaveLength(0);
  });
  it("a fence line, a heading and plain speech are left", () => {
    const md = "::: verse\n# Act I\nWho goes there?\n:::";
    expect(williams(md, true).md).toBe(md);
  });
});
