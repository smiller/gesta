import { test, expect } from "vitest";
import { hocrLines, findLine } from "./harvardStrips.ts";

// scan A's hOCR markup, its words each a span inside the line's
const HOCR = `<div class="ocr_page" id="page_000415" title="bbox 0 0 1780 2713">
 <span class="ocr_line" id="line_000415_000000" title="bbox 120 103 269 129; baseline 0 0">
  <span class="ocrx_word" id="w0" title="bbox 120 104 218 129">BOOK</span>
  <span class="ocrx_word" id="w1" title="bbox 231 103 269 129">IV</span>
 </span>
 <span class="ocr_line" id="line_000415_000002" title="bbox 397 169 1153 218; baseline 0.007 -14">
  <span class="ocrx_word" id="w2" title="bbox 397 170 554 205">Sorrows</span>
  <span class="ocrx_word" id="w3" title="bbox 560 170 600 205">&amp;</span>
  <span class="ocrx_word" id="w4" title="bbox 610 170 700 205">fears</span>
 </span>
 <span class="ocr_line" id="line_000415_000003" title="bbox 397 230 1153 270">
  <span class="ocrx_word" id="w5" title="bbox 397 230 554 270">Sorrows</span>
  <span class="ocrx_word" id="w6" title="bbox 560 230 600 270">and</span>
  <span class="ocrx_word" id="w7" title="bbox 610 230 700 270">tears</span>
 </span>
</div><div class="ocr_page" id="page_000416" title="bbox 0 0 1668 2700">
 <span class="ocr_line" id="line_000416_000000" title="bbox 400 300 1100 340"><span class="ocrx_word" id="w8" title="bbox 400 300 500 340">Sorrows</span> <span class="ocrx_word" id="w9" title="bbox 510 300 600 340">and</span> <span class="ocrx_word" id="w10" title="bbox 610 300 700 340">fears</span></span>
</div>`;

test("the hOCR's lines with their page and box, the words joined and the entities read", () => {
  expect(hocrLines(HOCR)).toEqual([
    { page: 415, box: [120, 103, 269, 129], text: "BOOK IV" },
    { page: 415, box: [397, 169, 1153, 218], text: "Sorrows & fears" },
    { page: 415, box: [397, 230, 1153, 270], text: "Sorrows and tears" },
    { page: 416, box: [400, 300, 1100, 340], text: "Sorrows and fears" },
  ]);
});

test("a line found by its words and the line after, within the pages asked, else none", () => {
  const lines = hocrLines(HOCR);
  expect(findLine(lines, "Sorrows and fears", "Sorrows and tears")?.box).toEqual([397, 169, 1153, 218]);
  expect(findLine(lines, "Sorrows and fears", "", 416)?.page).toBe(416);
  expect(findLine(lines, "Of man’s first disobedience, and the fruit")).toBe(null);
});
