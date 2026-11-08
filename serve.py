"""Local preview server for Locus that never lets the browser cache files.

python3's plain http.server lets browsers keep old copies of .js files, so edits
don't show up until a hard refresh. This sends Cache-Control: no-store instead.

Usage: python3 serve.py [port]   (default 3000)
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    print(f"Serving Locus at http://localhost:{port} (no cache)")
    # always serve the folder this file lives in, wherever it is started from
    root = os.path.dirname(os.path.abspath(__file__))
    ThreadingHTTPServer(("", port), partial(NoCacheHandler, directory=root)).serve_forever()
