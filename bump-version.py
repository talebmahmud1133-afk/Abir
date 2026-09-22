#!/usr/bin/env python3
"""
bump-version.py

Bumps the cache-busting "?v=" query string on local CSS/JS references
(e.g. css/style.css?v=20260917121128) across every .html file in the
current folder (and subfolders), AND keeps version.json in sync with
the same new version number in the same run — so `auto-update.js`
(which polls version.json) always matches what's actually on the
HTML pages. External links (http:// or https://, like CDN scripts)
are left untouched.

Run this ONE script after any content change (HTML/CSS/JS), then deploy.
No other manual step is needed — version.json no longer needs to be
edited by hand.

Usage:
    python3 bump-version.py
        -> scans the current directory recursively, updates all .html files
           and this folder's version.json

    python3 bump-version.py /path/to/site
        -> scans that folder instead
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Matches href="css/xxx.css?v=OLDVERSION" or src="js/xxx.js?v=OLDVERSION"
# but NOT http(s):// links (those are skipped).
PATTERN = re.compile(
    r'((?:href|src)=")(?!https?://)([^"]+?\.(?:css|js))\?v=\d+(")'
)


def bump_file(path: Path, new_version: str) -> int:
    text = path.read_text(encoding="utf-8")
    new_text, count = PATTERN.subn(
        lambda m: f"{m.group(1)}{m.group(2)}?v={new_version}{m.group(3)}",
        text,
    )
    if count:
        path.write_text(new_text, encoding="utf-8")
    return count


def bump_version_json(root: Path, new_version: str) -> bool:
    """Writes {"version": new_version} to version.json at the project root
    (creates it if missing) so auto-update.js's live-update banner always
    matches the ?v= number actually on the HTML pages."""
    vfile = root / "version.json"
    try:
        vfile.write_text(json.dumps({"version": new_version}, indent=2) + "\n", encoding="utf-8")
        return True
    except Exception as e:
        print(f"  ! could not write {vfile} ({e})")
        return False


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    if not root.exists():
        print(f"Error: path not found: {root}")
        sys.exit(1)

    new_version = datetime.now().strftime("%Y%m%d%H%M%S")
    html_files = sorted(root.rglob("*.html"))

    if not html_files:
        print(f"No .html files found under: {root.resolve()}")
        sys.exit(1)

    total_files_changed = 0
    total_links_changed = 0

    for html_file in html_files:
        try:
            changed = bump_file(html_file, new_version)
        except Exception as e:
            print(f"  ! skipped {html_file} ({e})")
            continue
        if changed:
            total_files_changed += 1
            total_links_changed += changed
            print(f"  ✓ {html_file} — {changed} link(s) updated")

    print()
    print(f"New version: {new_version}")
    print(f"Files updated: {total_files_changed}/{len(html_files)}")
    print(f"Links updated: {total_links_changed}")

    if bump_version_json(root, new_version):
        print(f"version.json updated to match: {new_version}")


if __name__ == "__main__":
    main()
