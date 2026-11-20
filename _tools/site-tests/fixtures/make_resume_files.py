"""Makes fixtures/files/<name>.pdf and <name>.docx from the fake resumes in fixtures/resumes.json, one line of text per PDF line
and one paragraph per DOCX line, so test_resume.py can read real PDF and DOCX files through the self-hosted pdf.js and mammoth.
Not a test and not run by the suite: the files it makes are committed. Run it again only if resumes.json changes:
    pip install reportlab python-docx
    python _tools/site-tests/fixtures/make_resume_files.py"""
import json
import os

from docx import Document
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'files')


def make_pdf(path, lines):
    c = canvas.Canvas(path, pagesize=letter, invariant=1)  # invariant: the same input gives the same bytes
    c.setFont('Helvetica', 10)
    y = 740
    for line in lines:
        if y < 60:
            c.showPage()
            c.setFont('Helvetica', 10)
            y = 740
        c.drawString(60, y, line)
        y -= 16
    c.showPage()
    c.save()


def make_docx(path, lines):
    d = Document()
    for line in lines:
        d.add_paragraph(line)
    d.save(path)


def main():
    texts = json.load(open(os.path.join(HERE, 'resumes.json'), encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    for name, text in texts.items():
        lines = text.split('\n') if text else []
        make_pdf(os.path.join(OUT, name + '.pdf'), lines)
        make_docx(os.path.join(OUT, name + '.docx'), lines)
        print(name, len(lines), 'lines')


if __name__ == '__main__':
    main()
