# FoxPDF Integrity engine

Stateless, private processing service. The web gateway forwards requests using a shared secret; uploaded files are processed in memory and are not retained. Request size, page count and raster pixel budgets are bounded. A single worker accepts one operation at a time.

Precise editing supports an individual original text run, reusable fonts and right-angle rotation. Edits reject overflow, overlapping text, signed PDFs, unsupported fonts and visible changes outside the selected run. The returned PDF is a separate copy. This does not provide arbitrary document reflow.

Sanitized redaction searches requested phrases using native extraction and mandatory OCR on every page, paints masks into fresh rendered pixels and rebuilds an image-only PDF. It audits the absence of text, fonts, forms, attachments, links, annotations, bookmarks and source metadata. OCR can miss phrases: review all pages and the detection report. The copy loses searchability, editable forms and existing signatures.

Run `python -m unittest -v test_engine`. Build with the included Dockerfile to install Tesseract and the supported OCR languages.

Paragraph editing (`edit_paragraph`) reflows supported horizontal paragraphs with original reusable fonts and mixed formatting mapped onto unchanged text. It supports explicit line breaks, left/center/right/justified alignment, optional downward growth constrained by text, images, links, annotations, form fields and table rules, and optional bounded shrinking. Saved text, surrounding rendering and form state are checked before returning a separate editable preview. Other objects and pages stay fixed: automatic cross-page reflow, table-row resizing, arbitrary angled paragraphs and right-to-left shaping are not implemented. Run `python -m unittest discover -v` to include paragraph regressions.

This service uses PyMuPDF under GNU AGPL v3. Its corresponding source, requirements and build instructions are published in this directory. The service source in this directory is licensed under GNU AGPL v3; see https://www.gnu.org/licenses/agpl-3.0.html. This notice applies to this separate service, not unrelated repository files. A proprietary deployment requires an appropriate commercial PyMuPDF license or compliance with AGPL obligations.
