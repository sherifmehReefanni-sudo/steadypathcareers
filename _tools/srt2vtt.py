#!/usr/bin/env python3
"""Convert SRT captions to WebVTT for the home page welcome video.

Where the real files go (nothing is published until these exist and the flag is set):
  1. Put Sherif's recorded video at        video/welcome.mp4   (H.264 + AAC, 16:9, about 60 seconds)
  2. Make the captions:  python3 _tools/srt2vtt.py welcome.srt video/welcome.vtt
     Read the captions once: they must say "I", never "we".
  3. In index.html, on <figure class="me" id="me">, set
        data-video="/video/welcome.mp4" data-captions="/video/welcome.vtt"
     That one attribute is the flag: while data-video is empty, the play button stays hidden.

The video never autoplays: it loads only when the visitor taps the button (preload="none"),
opens in a dialog with captions showing, and Esc closes it.
"""
import re
import sys


def srt_to_vtt(text: str) -> str:
    text = text.replace('\r\n', '\n').replace('\r', '\n').lstrip('﻿').strip()
    out = ['WEBVTT', '']
    for block in re.split(r'\n\s*\n', text):
        lines = [l for l in block.split('\n')]
        if not lines or not ''.join(lines).strip():
            continue
        if re.fullmatch(r'\d+', lines[0].strip()):
            lines = lines[1:]
        if not lines:
            continue
        m = re.match(r'\s*(\d{1,2}:\d{2}:\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2})[,.](\d{3})(.*)$', lines[0])
        if not m:
            raise ValueError('Bad timing line: %r' % lines[0])
        start = m.group(1).zfill(8) + '.' + m.group(2)
        end = m.group(3).zfill(8) + '.' + m.group(4)
        cue = [l.replace('-->', '->') for l in lines[1:]]
        out.append(start + ' --> ' + end)
        out.extend(cue)
        out.append('')
    return '\n'.join(out)


def main():
    if len(sys.argv) != 3:
        sys.exit('usage: srt2vtt.py input.srt output.vtt')
    with open(sys.argv[1], encoding='utf-8-sig') as f:
        vtt = srt_to_vtt(f.read())
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        f.write(vtt)
    cues = vtt.count(' --> ')
    we = len(re.findall(r'\b(we|our|us)\b', vtt, re.I))
    print('wrote %s: %d cues' % (sys.argv[2], cues))
    if we:
        print('warning: %d use(s) of "we", "our" or "us" in the captions. The site speaks as "I".' % we)


if __name__ == '__main__':
    main()
