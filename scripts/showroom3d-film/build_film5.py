#!/usr/bin/env python3
"""Render the picture of v5 ("fifty thousand" cut of the all-AI film v1). Same sources, same edit as build_film.py;
only the on-screen counter changes: it counts up to 50,000 instead of 10,000 (same digit width, same layout).
No photograph of a real person is used anywhere: the sources are v1's AI illustrations and clips.

Usage: python3 build_film5.py --src <src-dir> --fonts <fonts-dir> --logo <official-logo.jpg> --out <work-dir>   (same options as build_film.py)
"""
import inspect

import build_film as b

src = inspect.getsource(b.overlay_10k).replace("10000", "50000")
assert "50000" in src
exec(src, b.__dict__)

# smaller picture master (disk): same pipeline, CRF 14 / superfast instead of CRF 8 / ultrafast; the final encode is ~1 Mbps anyway
rc = inspect.getsource(b.render_chunk).replace('"ultrafast", "-crf", "8"', '"superfast", "-crf", "14"')
assert "superfast" in rc
exec(rc, b.__dict__)

if __name__ == "__main__":
    b.main()
