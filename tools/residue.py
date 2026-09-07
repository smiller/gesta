#!/usr/bin/env python3
"""Every file the corpus report lists, as file:line and the line itself, grouped
by class — the walk-through list for fixing data by hand. Reads
tools/out/corpus-report.txt and the corpus it names; writes nothing."""
import re, os, sys, collections
R = open("tools/out/corpus-report.txt", encoding="utf-8").read().split("\n")
corpus = R[0].split(": ", 1)[1]
blocks = []; cur = None
for l in R[4:]:
    if not l.strip():
        if cur: blocks.append(cur); cur = None
        continue
    if not l.startswith("  ") and not re.match(r'^(NOT A FIXED|DOCUMENT|ROUND TRIP|ASTERISKS|MORE|FEWER|TEXT DIFFERS|THREW)', l):
        cur = {"file": l, "classes": collections.OrderedDict()}; last = None; continue
    if cur is None: continue
    m = re.match(r'^(NOT A FIXED POINT|DOCUMENT CHANGED|ROUND TRIP DIFFERS|ASTERISKS GREW|MORE ASTERISKS|FEWER ASTERISKS|TEXT DIFFERS|THREW)', l)
    if m: last = m.group(1); cur["classes"][last] = []
    elif last: cur["classes"][last].append(l)
if cur: blocks.append(cur)
collapse = lambda s: re.sub(r"\s+", " ", s).strip()
def lines_of(f):
    return open(os.path.join(corpus, f), encoding="utf-8").read().split("\n")
def find_line(lines, text):
    for i, l in enumerate(lines):
        if l == text: return i + 1
    return None
def find_snippet(lines, snippet):
    """the line holding the longest run of the snippet's words"""
    words = collapse(snippet).split(" ")
    best = (0, None)
    for i, l in enumerate(lines):
        cl = collapse(l)
        for n in range(len(words), 2, -1):
            for k in range(0, len(words) - n + 1):
                if " ".join(words[k:k + n]) in cl and n > best[0]:
                    best = (n, i + 1); break
            if best[1] == i + 1: break
    return best[1]
out = collections.defaultdict(list)
for b in blocks:
    lines = lines_of(b["file"])
    for cls, d in b["classes"].items():
        if cls == "ROUND TRIP DIFFERS":
            for k in range(0, len(d), 2):
                src = re.match(r'  line \d+: (.*)$', d[k])
                if not src: continue
                text = eval(src.group(1)) if src.group(1).startswith('"') else src.group(1)
                n = find_line(lines, text)
                out[cls].append((b["file"], n, text, eval(d[k + 1].split(": ", 1)[1]) if k + 1 < len(d) else ""))
        else:
            for k in range(0, len(d), 2):
                at = re.match(r'  at \d+: (.*)$', d[k])
                if not at: continue
                snippet = eval(at.group(1)); n = find_snippet(lines, snippet)
                out[cls].append((b["file"], n, lines[n - 1] if n else snippet, eval(d[k + 1].split(": ", 1)[1])))
# shapes that need no hand: the successor's own canonical spelling, or a
# reading that is right where the current parser's was not
SETTLED = [
    (r"^\*\[[^\]]*\]\([^)]*\)\*$", "emphasis and link on one title: written [*t*](u)"),
    (r"^\*{5,}\s*$", "a rule of asterisks"),
    (r"\(\*1\.5\)", "a multiplication sign kept literal"),
    (r"^\[[^\]]*\[[^\]]*\]\(", "a bracketed note holding a link, read right"),
    (r"^\[(20\d\d-\d\d-\d\d|From |Yes, |Greek )", "a bracketed note holding a link, read right"),
]
W = 120
settled = collections.Counter()
for cls in ["ROUND TRIP DIFFERS", "MORE ASTERISKS", "FEWER ASTERISKS", "TEXT DIFFERS"]:
    sites = []
    for f, n, text, became in out[cls]:
        why = next((w for rx, w in SETTLED if re.search(rx, text)), None)
        # an italic run that opens on this line and closes on a later one: the
        # current app shows the stars, the successor reads the italics
        if not why and cls == "FEWER ASTERISKS" and re.match(r"^>? ?\*[^*]+$", text): why = "italics across lines, read as italics"
        if why: settled[why] += 1
        else: sites.append((f, n, text, became))
    print(f"\n## {cls} ({len(sites)} sites to look at)")
    for f, n, text, became in sites:
        print(f"{f}:{n or '?'}")
        print(f"    {text[:W]}")
        if cls == "ROUND TRIP DIFFERS": print(f"    -> {became[:W]}")
        else: print(f"    read as: {became[:W]}")
print("\n## settled, no hand needed")
for why, c in settled.most_common(): print(f"  {c:3d}  {why}")
