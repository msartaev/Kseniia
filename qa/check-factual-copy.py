#!/usr/bin/env python3
"""Verify the current consultation format in source, exports and copy."""
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile
import re


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script"):
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in ("style", "script"):
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def check_html(label, html):
    parser = VisibleText()
    parser.feed(html)
    visible = " ".join(parser.parts)
    assert "Как проходит консультация?" in visible, label
    assert "Консультация проходит онлайн." in visible, label
    assert not re.search(r"\b(?:zoom|москв\w*|очно|очн\w*|встретиться лично)\b", visible, re.I), label
    assert "три промежуточных созвона и связь в Telegram" in visible, label
    assert "Напишите Ксении в Telegram." in visible, label
    assert 'href="https://t.me/Rrroxy"' in html, label
    assert 'href="https://t.me/zozhno_vozmozhno"' in html, label
    print("PASS", label)


source = Path("site/index.html").read_text()
standalone = Path("dist/zozhno-onepage.html").read_text()
check_html("source", source)
check_html("standalone", standalone)
with ZipFile("dist/zozhno-site.zip") as archive:
    check_html("ZIP/source", archive.read("site/index.html").decode())
    check_html("ZIP/standalone", archive.read("zozhno-onepage.html").decode())

copy = Path("copy.md").read_text()
assert "Вопрос — «Как проходит консультация?»" in copy
assert "Ответ: «Консультация проходит онлайн.»" in copy
assert not re.search(r"\b(?:zoom|москв\w*|очно|очн\w*|встретиться лично)\b", copy, re.I)
assert "три промежуточных созвона и связь в Telegram" in copy
print("PASS copy.md")
