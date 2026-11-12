import { test, expect } from "vitest";
import { speechMarks } from "./speechMarks.ts";

test("speechMarks: each read mark replaced where its words stand, every place found in the text as it was", () => {
  const md = "“Greece,” Marta said.  ‘*Ancient* Greece.’\n‘*Hélas!*’ she said.  ‘*Le colonel!*’ and got up\n";
  const { out, marks } = speechMarks(md, [
    { find: "said.  ⟦‘⟧*Ancient*", to: "“" }, { find: "Greece.⟦’⟧", to: "”" },
    { find: "⟦‘⟧*Hélas!*", to: "“" }, { find: "*Hélas!*⟦’⟧", to: "”" },
    { find: "she said.  ⟦‘⟧*Le", to: "“" }, { find: "colonel!*⟦’⟧", to: "”" },
  ]);
  expect(out).toBe("“Greece,” Marta said.  “*Ancient* Greece.”\n“*Hélas!*” she said.  “*Le colonel!*” and got up\n");
  expect(marks.map((m) => out[m])).toEqual(["“", "”", "“", "”", "“", "”"]);
});
test("speechMarks: a mark and the space before it replaced as one", () => {
  expect(speechMarks("‘ ‘For some groom\n", [{ find: "‘⟦ ‘⟧For", to: "“" }]).out).toBe("‘“For some groom\n");
});
test("speechMarks: words found twice or not at all are refused", () => {
  expect(() => speechMarks("said ‘a’ and said ‘b’\n", [{ find: "said ⟦‘⟧", to: "“" }])).toThrow(/2 places/);
  expect(() => speechMarks("said ‘a’\n", [{ find: "told ⟦‘⟧", to: "“" }])).toThrow(/0 places/);
});
