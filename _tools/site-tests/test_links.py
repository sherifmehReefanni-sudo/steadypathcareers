"""Every link and file reference written into the site's HTML points at something that exists in the repo.
No browser needed: this reads the files directly, so it catches a renamed page or a missing image before it is deployed.
(Links built by JavaScript at run time are covered by the page and portal tests instead.)"""
import os
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, unquote

import pytest

import server
from conftest import ROOT, html_files

RULES = server.load_redirects(ROOT)
OWN = re.compile(r'^https?://(www\.)?steadypathcareers\.com/?')
SKIP = ('mailto:', 'tel:', 'sms:', 'javascript:', 'data:', 'blob:', '#', 'http://', 'https://', '//')


class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for key in ('href', 'src', 'poster', 'data-src'):
            v = (a.get(key) or '').strip()
            if v and "'" not in v and '+' not in v:  # skip JS-built strings inside inline templates
                self.refs.append((tag, key, OWN.sub('/', v)))
        for key in ('srcset', 'imagesrcset'):
            for part in (a.get(key) or '').split(','):
                v = part.strip().split(' ')[0]
                if v:
                    self.refs.append((tag, key, OWN.sub('/', v)))


def page_url(file):
    rel = os.path.relpath(file, ROOT).replace(os.sep, '/')
    return '/' + (rel[:-len('index.html')] if rel.endswith('index.html') else rel)


def exists(path):
    path = unquote(path)
    if server.match_redirect(RULES, path):
        dst = server.match_redirect(RULES, path)[0]
        return dst != '/404.html' and exists(dst)
    local = os.path.join(ROOT, path.lstrip('/'))
    if path.endswith('/'):
        return os.path.isfile(os.path.join(local, 'index.html'))
    return os.path.isfile(local) or os.path.isfile(os.path.join(local, 'index.html'))


FILES = html_files()


@pytest.mark.parametrize('file', FILES, ids=[os.path.relpath(f, ROOT) for f in FILES])
def test_links_resolve(file):
    html = open(file, encoding='utf-8').read()
    html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.S | re.I)  # inline scripts hold templates, not links
    p = Refs()
    p.feed(html)
    base = page_url(file)
    broken = []
    for tag, key, v in p.refs:
        if v.lower().startswith(SKIP) or v.startswith('{{'):
            continue
        target = urlparse(urljoin('https://x' + base, v)).path
        if not exists(target):
            broken.append('<%s %s="%s">' % (tag, key, v))
    assert not broken, '%s has broken references:\n  ' % page_url(file) + '\n  '.join(sorted(set(broken)))


def test_sitemap_pages_exist():
    from conftest import sitemap_paths
    missing = [p for p in sitemap_paths() if not exists(p)]
    assert not missing, 'sitemap.xml lists pages that do not exist: %s' % missing
