# FoxPDF Integrity engine

Native Find/Replace (`/search`, `replace_text`) supports one match or all matches, Unicode word boundaries, match case, deletion and bounded fit. It removes and rewrites affected original text runs with reusable fonts, verifies saved extraction and surrounding pixels, and preserves form state. Phrases spanning formatting runs are explicitly outside this search scope. Scans require OCR first.

Native paragraph movement (`move_text`) preserves span fonts, size and color within or between unrotated pages. The editor offers a drag handle and keyboard destination controls, alongside two editable page panes. Destination overlap with text, fields, links and annotations is rejected. Movement is a PDF change with Undo, not a visual overlay.

Document comparison (`/compare`) aligns pages by number, reports selectable-word differences, rendered-pixel changes, changed dimensions and added/removed pages. It accepts two PDFs totaling 20 MB, up to 100 pages each and a 50-million-pixel comparison budget. The report states the 72-DPI/channel-threshold limitations; metadata, attachments and invisible structure are not compared. Scanned pages receive visual comparison unless OCR is run first.

Sanitized redaction additionally accepts up to 100 manually marked rectangles in displayed page coordinates, including rotated pages. Manual regions cover image/vector content. Phrase detection still requires OCR on all pages; manual-only sanitization does not require OCR. Both paths rebuild and audit a fresh image-only PDF, removing original source objects. This cannot guarantee that a user or OCR selected every sensitive detail.

Stateless, private processing service. The web gateway forwards requests using a shared secret; uploaded files are processed in memory and are not retained. Request size, page count and raster pixel budgets are bounded. A single worker accepts one operation at a time.

Precise editing supports an individual original text run, reusable fonts and right-angle rotation. Edits reject overflow, overlapping text, signed PDFs, unsupported fonts and visible changes outside the selected run. The returned PDF is a separate copy. This does not provide arbitrary document reflow.

Sanitized redaction searches requested phrases using native extraction and mandatory OCR on every page, paints masks into fresh rendered pixels and rebuilds an image-only PDF. It audits the absence of text, fonts, forms, attachments, links, annotations, bookmarks and source metadata. OCR can miss phrases: review all pages and the detection report. The copy loses searchability, editable forms and existing signatures.

Run `python -m unittest -v test_engine`. Build with the included Dockerfile to install Tesseract and the supported OCR languages.

Paragraph editing (`edit_paragraph`) reflows supported horizontal paragraphs with original reusable fonts and mixed formatting mapped onto unchanged text. It supports explicit line breaks, alignment, constrained downward growth and optional bounded shrinking. With `flow`, overflow continues on up to ten new native-text pages appended at the end: existing page indexes, form fields and other content stay in place. `output_page_count` and `continuation_pages` describe the verified result. It does not push content through existing occupied pages.

With `table_grow`, a row in a detected regular rectangular table can grow, shifting later rows down if there is clear space. This is restricted to unrotated pages, uniform borders, white backgrounds and native horizontal text. Merged cells, decorative/colored tables, embedded images, links, annotations, fields and collisions are rejected. Original table text is removed and rewritten natively; the old grid is covered and a resized vector grid is drawn. This is editing, not a redaction workflow. Surrounding rendering and form state are checked after rebuilding and replacing the selected cell. Arbitrarily angled paragraphs and right-to-left shaping remain unsupported. Run `python -m unittest discover -v` for the full suite.

The frontend docks controls beside the PDF (below it on narrow screens). Verified text, OCR and compression results are committed in place through the editor's serialized mutation queue with one Undo step and a stale-source check. Sanitized redaction intentionally remains a separate document in the same editor. Export/password protection downloads files without opening extra tool dialogs.

This service uses PyMuPDF under GNU AGPL v3. Its corresponding source, requirements and build instructions are published in this directory. The service source in this directory is licensed under GNU AGPL v3; see https://www.gnu.org/licenses/agpl-3.0.html. This notice applies to this separate service, not unrelated repository files. A proprietary deployment requires an appropriate commercial PyMuPDF license or compliance with AGPL obligations.
