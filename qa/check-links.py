#!/usr/bin/env python3
"""Allow only the personal Telegram link, page anchors and bundled assets."""

from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
import re


PERSONAL = "https://t.me/Rrroxy"
ASSETS = {
    "assets/fonts.css",
    "assets/IMG_7260.jpeg",
    "assets/02-warm-closeup.jpg",
}


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for name in ("href", "src", "action", "poster"):
            if name in attrs:
                self.values.append((tag, name, attrs[name]))
        if tag == "meta" and attrs.get("property", attrs.get("name")) in ("og:image", "twitter:image"):
            self.values.append((tag, "content", attrs.get("content", "")))


def check(label, html):
    refs = References()
    refs.feed(html)
    ids = set(re.findall(r'\bid="([^"]+)"', html))
    anchors = [value for tag, name, value in refs.values if tag == "a" and name == "href"]
    assert PERSONAL in anchors, f"{label}: personal Telegram link missing"

    for tag, name, value in refs.values:
        allowed = (
            (tag == "a" and name == "href" and (value == PERSONAL or (value.startswith("#") and value[1:] in ids)))
            or value in ASSETS
            or (tag == "img" and name == "src" and value.startswith("data:image/"))
        )
        assert allowed, f"{label}: unexpected {tag} {name}={value[:100]!r}"

    # Also catch URLs in inline CSS, scripts and metadata outside href/src.
    urls = set(re.findall(r"https?://[^\s\"'<>)]*", html))
    assert urls == {PERSONAL}, f"{label}: unexpected external URLs {sorted(urls)}"
    css_urls = re.findall(r"url\(([^)]+)\)", html)
    for value in css_urls:
        value = value.strip(" \"'")
        assert value.startswith("data:font/woff2;base64,") or value in ASSETS, f"{label}: unexpected CSS URL {value[:100]!r}"
    assert "zozhno_vozmozhno" not in html, f"{label}: unverified channel remains"
    print(f"PASS {label}: {len(anchors)} navigation links, {len(refs.values)} references, {len(css_urls)} CSS URLs")


if __name__ == "__main__":
    check("source", Path("site/index.html").read_text())
    check("standalone", Path("dist/zozhno-onepage.html").read_text())
    with TemporaryDirectory() as extracted, ZipFile("dist/zozhno-site.zip") as archive:
        archive.extract("site/index.html", extracted)
        archive.extract("zozhno-onepage.html", extracted)
        check("ZIP/source", (Path(extracted) / "site/index.html").read_text())
        check("ZIP/standalone", (Path(extracted) / "zozhno-onepage.html").read_text())
