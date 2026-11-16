"""Tiny static server that serves the repo the way Cloudflare does for the parts the tests touch:
folder/ -> folder/index.html, /folder -> 308 to /folder/, rules from _redirects, and 404.html for anything missing.
Used by conftest.py when SP_BASE_URL is not set. Run by hand:  python3 _tools/site-tests/server.py 8727"""
import http.server
import os
import sys
import threading
from functools import partial

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def load_redirects(root=ROOT):
    rules = []
    path = os.path.join(root, '_redirects')
    if not os.path.exists(path):
        return rules
    for line in open(path, encoding='utf-8'):
        parts = line.split()
        if len(parts) >= 2 and not parts[0].startswith('#'):
            code = int(parts[2]) if len(parts) > 2 else 302
            rules.append((parts[0], parts[1], code))
    return rules


def match_redirect(rules, path):
    for src, dst, code in rules:
        if src.endswith('/*'):
            base = src[:-2]
            if path == base or path.startswith(base + '/'):
                return dst, code
        elif path == src:
            return dst, code
    return None


class Handler(http.server.SimpleHTTPRequestHandler):
    rules = []

    def log_message(self, *a):
        pass

    def _route(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        hit = match_redirect(self.rules, path)
        if hit:
            dst, code = hit
            if code == 200 or dst == '/404.html':  # Cloudflare rewrites or hides these
                return ('file', dst, 404 if dst == '/404.html' else 200)
            return ('redirect', dst, code)
        local = os.path.join(self.directory, path.lstrip('/'))
        if os.path.isdir(local):
            if not path.endswith('/'):
                return ('redirect', path + '/', 308)
            if os.path.exists(os.path.join(local, 'index.html')):
                return ('ok', None, 200)
            return ('file', '/404.html', 404)
        if os.path.isfile(local):
            return ('ok', None, 200)
        if os.path.isfile(local + '.html'):
            return ('file', path + '.html', 200)
        return ('file', '/404.html', 404)

    def _send_file(self, rel, code):
        f = os.path.join(self.directory, rel.lstrip('/'))
        data = open(f, 'rb').read()
        self.send_response(code)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def _handle(self):
        kind, dst, code = self._route()
        if kind == 'redirect':
            self.send_response(code)
            self.send_header('Location', dst)
            self.end_headers()
        elif kind == 'file':
            self._send_file(dst, code)
        else:
            super().do_GET() if self.command == 'GET' else super().do_HEAD()

    def do_GET(self):
        self._handle()

    def do_HEAD(self):
        self._handle()

    def do_POST(self):  # the site has no same-origin POST endpoints; anything that tries one is a bug
        self.send_response(405)
        self.end_headers()


def start(port=0, root=ROOT):
    Handler.rules = load_redirects(root)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


if __name__ == '__main__':
    s = start(int(sys.argv[1]) if len(sys.argv) > 1 else 8727)
    print('Serving %s at http://127.0.0.1:%d' % (ROOT, s.server_address[1]))
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass
