#!/usr/bin/env python3
"""Writes the crate table of index.html from the crate table of the FerroUI README.

    python3 scripts/update-crates.py path/to/FerroUI/README.md            # rows only
    python3 scripts/update-crates.py path/to/FerroUI/README.md --crates-io  # also look up crates.io

The README's table (between its crates-table markers) gives the groups, the names and the
descriptions. With --crates-io, every crate is looked up on crates.io (one request a second); a
crate that is not there yet gets `data-new`, which the page shows as "New in <version>" while
`releasePending` is true in assets/js/config.js. Without the flag, the marks of the rows already in
index.html are kept.
"""

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
BEGIN = re.compile(r"<!-- crates:begin[^>]*-->\n")
END = "<!-- crates:end -->"

GROUPS = {
    "Core": ("core", "Core"),
    "Controls and themes": ("controls", "Controls and themes"),
    "Markup and build": ("markup", "Markup and build"),
    "Render backends and text": ("render", "Render and text"),
    "Platforms": ("platforms", "Platforms"),
    "Tools and designer support": ("tools", "Tools"),
}

ROW = re.compile(r"^\| \[`([^`]+)`\]\([^)]*\) \| (.*?) \| \[!\[version")


def read_table(readme):
    text = readme.read_text(encoding="utf-8")
    start = text.index("<!-- crates-table:begin")
    end = text.index("<!-- crates-table:end")
    group = None
    crates = []
    for line in text[start:end].splitlines():
        heading = re.match(r"^\*\*(.+)\*\*$", line.strip())
        if heading:
            group = heading.group(1)
            if group not in GROUPS:
                sys.exit(f"unknown group in the README: {group}")
            continue
        row = ROW.match(line)
        if row:
            crates.append({"name": row.group(1), "desc": row.group(2), "group": group})
    if not crates:
        sys.exit("no crates found in the README")
    return crates


def on_crates_io(name):
    request = urllib.request.Request(
        f"https://crates.io/api/v1/crates/{name}",
        headers={"User-Agent": "ferroui-website (https://github.com/FerroUI/website)"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            json.load(response)
        return True
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return False
        raise


def describe(desc):
    # Markdown code spans of the README become <code>; everything else is escaped.
    parts = desc.split("`")
    return "".join(html.escape(p) if i % 2 == 0 else f"<code>{html.escape(p)}</code>" for i, p in enumerate(parts))


def render(crates, new):
    rows = []
    for c in crates:
        key, label = GROUPS[c["group"]]
        name = html.escape(c["name"])
        mark = " data-new" if c["name"] in new else ""
        rows.append(
            f'              <tr data-group="{key}"{mark}>'
            f'<td class="name"><a href="https://crates.io/crates/{name}">{name}</a>'
            f'<br><span class="badge rust new">New in <span data-version></span></span></td>'
            f'<td class="desc">{describe(c["desc"])}</td>'
            f'<td class="group">{label}</td>'
            f'<td class="links"><a href="https://crates.io/crates/{name}" aria-label="{name} on crates.io">crates.io</a>'
            f'<a href="https://docs.rs/{name}" aria-label="{name} on docs.rs">docs.rs</a>'
            f'<span class="pending">With the release</span></td></tr>'
        )
    return "\n".join(rows) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("readme", type=Path)
    parser.add_argument("--crates-io", action="store_true", help="look every crate up on crates.io")
    args = parser.parse_args()

    crates = read_table(args.readme)
    page = INDEX.read_text(encoding="utf-8")
    begin = BEGIN.search(page)
    end = page.index(END)
    if not begin or end < begin.end():
        sys.exit("the crate markers of index.html are missing")

    if args.crates_io:
        new = set()
        for c in crates:
            if not on_crates_io(c["name"]):
                new.add(c["name"])
            time.sleep(1.0)
    else:
        new = set(re.findall(r'<tr data-group="[a-z]+" data-new><td class="name"><a href="https://crates.io/crates/([^"]+)"',
                             page[begin.end():end]))

    page = page[: begin.end()] + render(crates, new) + page[end:]
    INDEX.write_text(page, encoding="utf-8")
    print(f"{len(crates)} crates, {len(new)} not on crates.io yet")


if __name__ == "__main__":
    main()
