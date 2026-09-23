#!/usr/bin/env python3
"""Pack the portable page and the source site into one archive."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

out = Path('dist/zozhno-site.zip')
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    archive.write('dist/zozhno-onepage.html', 'zozhno-onepage.html')
    for path in sorted(Path('site').rglob('*')):
        if path.is_file():
            archive.write(path, path.as_posix())
print(out, out.stat().st_size)
