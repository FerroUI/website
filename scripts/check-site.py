#!/usr/bin/env python3
"""Checks of the site that need no network: run by CI on every push and pull request.

- every local file that index.html or site.css names exists (src, href, srcset, url());
- every in-page link (#id) has its target;
- the versions of assets/js/config.js are not written into index.html;
- no emoji in the text files of the repository;
- the names the site must not use do not appear.
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT_SUFFIXES = {".html", ".css", ".js", ".md", ".py", ".yml", ".yaml", ".json", ".svg", ".txt"}
# Built from parts so that this file does not contain the names it looks for.
FORBIDDEN = re.compile("|".join(["aval" + "onia", "ax" + "aml", "ava" + "res", r"\bav" + "n"]), re.IGNORECASE)
EMOJI = re.compile("[" + "".join(chr(a) + "-" + chr(b) for a, b in ((0x1F000, 0x1FAFF), (0x2600, 0x27BF), (0xFE0F, 0xFE0F))) + "]")


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        for key in ("src", "href"):
            if a.get(key):
                self.refs.append((tag, a[key]))
        if a.get("srcset"):
            for part in a["srcset"].split(","):
                self.refs.append((tag, part.strip().split()[0]))


def main():
    errors = []
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    collector = Collector()
    collector.feed(page)

    for tag, ref in collector.refs:
        if ref.startswith(("http://", "https://", "mailto:")):
            continue
        if ref.startswith("#"):
            if ref != "#" and ref[1:] not in collector.ids:
                errors.append(f"index.html: no element with the id of the link {ref}")
            continue
        path = ROOT / ref.split("#")[0].split("?")[0]
        if not path.is_file():
            errors.append(f"index.html: <{tag}> names {ref}, which does not exist")

    css = (ROOT / "assets/css/site.css").read_text(encoding="utf-8")
    for ref in re.findall(r"url\(\s*['\"]?([^'\")]+)", css):
        if not ref.startswith(("data:", "http", "#")) and not (ROOT / "assets/css" / ref).resolve().is_file():
            errors.append(f"site.css: url({ref}) does not exist")

    config = (ROOT / "assets/js/config.js").read_text(encoding="utf-8")
    for key in ("version", "previewVersion"):
        value = re.search(key + r': "([^"]+)"', config).group(1)
        if re.search(re.escape(value) + r"(?![\w.-])", page):
            errors.append(f"index.html: names {value}; write {{{{version}}}} or data-version, the version lives in assets/js/config.js")

    for path in sorted(ROOT.rglob("*")):
        if ".git" in path.parts or "node_modules" in path.parts or not path.is_file():
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT)
        for number, line in enumerate(text.splitlines(), 1):
            if FORBIDDEN.search(line):
                errors.append(f"{rel}:{number}: a name the site does not use")
            if EMOJI.search(line):
                errors.append(f"{rel}:{number}: an emoji")

    for error in errors:
        print(error)
    if errors:
        sys.exit(1)
    print(f"ok: {len(collector.refs)} references, {len(collector.ids)} ids")


if __name__ == "__main__":
    main()
