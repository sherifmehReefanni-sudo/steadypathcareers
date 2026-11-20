# Vendored browser libraries

Self-hosted copies of the two resume reading libraries, so the intake (/start/, /start/v2/) and the portal (/portal/) never load
script from another host. assets/resume-read.js loads them from these paths only when a PDF or DOCX resume is chosen.

The files are copied byte for byte from the npm packages. Do not edit them. To upgrade, copy the new versions into a new
folder named with the new version, update the paths in assets/resume-read.js, and update this file.

## Sources

| Folder | npm package | Tarball integrity (from the npm registry) | License |
|---|---|---|---|
| pdfjs-3.11.174/ | pdfjs-dist@3.11.174 | sha512-TdTZPf1trZ8/UFu5Cx/GXB7GZM30LT+wWUNfsi6Bq8ePLnb+woNKtDymI2mxZYBpMbonNFqKmiz684DIfnd8dA== | Apache-2.0 (pdfjs-3.11.174/LICENSE) |
| mammoth-1.6.0/ | mammoth@1.6.0 | sha512-jOwbj6BwJzxCf6jr2l1zmSemniIkLnchvELXnDJCANlJawhzyIKObIq48B8kWEPLgUUh57k7FtEO3DHFQMnjMg== | BSD-2-Clause (mammoth-1.6.0/LICENSE) |

Files taken from each package: pdfjs-dist build/pdf.min.js, build/pdf.worker.min.js and LICENSE; mammoth mammoth.browser.min.js
and LICENSE. mammoth.browser.min.js bundles mammoth's own npm dependencies (among them JSZip, @xmldom/xmldom, bluebird and
underscore), each under its own license.

## sha256 of each file

```
5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946  pdfjs-3.11.174/pdf.min.js
feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b  pdfjs-3.11.174/pdf.worker.min.js
0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594  pdfjs-3.11.174/LICENSE
596ef52239e52d8ee3cee10b2ee4a72596abf900d0e4f468593f956e9f1809b0  mammoth-1.6.0/mammoth.browser.min.js
6663bbd049205d38a496ccacb412a151980b444627d38de218b3b809aef330f1  mammoth-1.6.0/LICENSE
```

Check them from this folder with `sha256sum -c` on the block above. _tools/site-tests/test_resume.py checks them on every run.
