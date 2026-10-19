import { test, expect } from "vitest";
import { untag, codeTags, quotedCode } from "./htmlTags.ts";

test("htmlTags: a <br/> ending a line goes with the spaces before it, quoted or not", () => {
  expect(untag("“Abandon hope, who enter here”  <br/>\nIs of course a mistranslation;  <br/>\nWhat should it read?")).toBe("“Abandon hope, who enter here”\nIs of course a mistranslation;\nWhat should it read?");
  expect(untag("> She tells her love while half asleep  <br/>\n> In the dark hours,   <br/>")).toBe("> She tells her love while half asleep\n> In the dark hours,");
});
test("htmlTags: <i> and <em> are italics, a line at a time", () => {
  expect(untag("I had a <em>London A-Z</em> once.")).toBe("I had a *London A-Z* once.");
  expect(untag("<i>Before the drinking, he’d gotten a new jacket.</i>\n– Ouch.  Yes.  <i>That</i> jacket.")).toBe("*Before the drinking, he’d gotten a new jacket.*\n– Ouch.  Yes.  *That* jacket.");
  expect(untag("<i>(‘The Subject is deeply maudlin </i>\n– Ha.")).toBe("*(‘The Subject is deeply maudlin* \n– Ha.");
  expect(untag("<i>The Seeker didn’t plead: the\n“I… can’t do this on my own,”</i>\n– Oh.")).toBe("*The Seeker didn’t plead: the*\n*“I… can’t do this on my own,”*\n– Oh.");
});
test("htmlTags: a <blockquote> is a quotation, every line of it quoted, the semicolon after it dropped", () => {
  expect(untag("From <i>The Witchfinders</i> (2018):\n\n<blockquote>JAMES: Before you die.\nTHIRTEEN: Why?\n\nhttps://www.youtube.com/watch?v=x</blockquote>;\n\nand more"))
    .toBe("From *The Witchfinders* (2018):\n\n> JAMES: Before you die.\n> THIRTEEN: Why?\n> \n> https://www.youtube.com/watch?v=x\n\nand more");
});
test("htmlTags: code is left", () => {
  expect(untag("```\nLINKS  <br/>\n<i>x</i>\n```\nJOURN:   <br/>\n2001.02.27  <br/>")).toBe("```\nLINKS  <br/>\n<i>x</i>\n```\nJOURN:\n2001.02.27");
});
test("htmlTags: an entity is its letter, an apostrophe's curled; code is left", () => {
  expect(untag("Hw&aelig;r cwom mearg?  Alfred’s grandson &AElig;thelstan")).toBe("Hwær cwom mearg?  Alfred’s grandson Æthelstan");
  expect(untag("## Episode One - World&#x27;s End")).toBe("## Episode One - World’s End");
  expect(untag("Nor read the salvage c&utilde;treis")).toBe("Nor read the salvage cũtreis");
  expect(untag("```\n&lt;p&gt;\n```")).toBe("```\n&lt;p&gt;\n```");
});
test("htmlTags: code pasted in <code> tags is a fenced block, its colouring dropped, a quoted line in it an indented one", () => {
  expect(codeTags("Make a tiny class. (code)\n\n<code>\npublic class C implements A<<span class=\"cloudy-red\">CatName</span>, <span class=\"cloudy-blue\">String</span>> {\n  public String f(CatName d) {\n\n> return d.getName();\n\n  }\n}\n</code>\n\nThe two little methods", "java"))
    .toBe("Make a tiny class. (code)\n\n```java\npublic class C implements A<CatName, String> {\n  public String f(CatName d) {\n    return d.getName();\n  }\n}\n```\n\nThe two little methods");
});
test("htmlTags: code pasted as a quotation is a fenced block, a deeper quote its indent, a link folded round a tag its address", () => {
  const md = "## BSI / LearnerShape graphs\n\n>> <!-- <script src=\"[https://cdn.x/core.js\"></script>](https://cdn.x/core.js%22></script>);\n>> \n>> <!-- <script>\n>>      var data = {};\n>> \n>>> var chart = anychart.graph(data);\n>>> \n>>> chart.draw();\n>>> </script> -->\n\nAfter.";
  expect(quotedCode(md, "html")).toBe("## BSI / LearnerShape graphs\n\n```html\n<!-- <script src=\"https://cdn.x/core.js\"></script>\n\n<!-- <script>\n     var data = {};\n\n     var chart = anychart.graph(data);\n\n     chart.draw();\n</script> -->\n```\n\nAfter.");
});
