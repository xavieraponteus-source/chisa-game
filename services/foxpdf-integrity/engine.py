"""FoxPDF's guarded run editor and image-only redaction export.

Input documents are never modified on disk. Unsafe or unverifiable edits fail closed.
"""
import hashlib, math, unicodedata, io
import pymupdf as fitz
from PIL import Image, ImageChops, ImageDraw
from fontTools.ttLib import TTFont

MAX_BYTES = 20 * 1024 * 1024
MAX_PAGES = 100

class EngineError(ValueError):
    pass

def sha(data):
    return hashlib.sha256(data).hexdigest()

def norm(text):
    return " ".join(unicodedata.normalize("NFKC", str(text)).split())

def open_pdf(data):
    if not data or len(data) > MAX_BYTES:
        raise EngineError("Choose a PDF smaller than 20 MB.")
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise EngineError("The PDF could not be opened safely.") from exc
    if doc.needs_pass:
        doc.close()
        raise EngineError("Open an unlocked PDF copy first.")
    if not 1 <= len(doc) <= MAX_PAGES:
        doc.close()
        raise EngineError("This workflow accepts 1 to 100 pages.")
    return doc

def runs(page):
    for bi, block in enumerate(page.get_text("dict")["blocks"]):
        for li, line in enumerate(block.get("lines", [])):
            for si, span in enumerate(line["spans"]):
                if span.get("text", "").strip():
                    yield f"{bi}:{li}:{si}", span, line

def ensure_visible_text(page,rect):
    # OCR search layers are usually invisible. Rewriting them cannot edit the scanned image.
    for trace in page.get_texttrace():
        if (trace.get('type')==3 or trace.get('opacity',1)<.01) and (fitz.Rect(rect)&fitz.Rect(trace['bbox'])).get_area()>.1:
            raise EngineError("This is hidden/OCR text. Recognition makes a scan searchable; native text editing cannot rewrite its underlying image. Use redaction or rebuild the text area instead.")


def original_ink_bounds(page,identifier,font,clip=None):
    """Include italic overhangs using each original character's actual baseline origin.

    This expands verification only. Redaction still selects the original run rectangle,
    so a wider italic bounding box never deletes neighboring characters.
    """
    bi,li,si=map(int,identifier.split(':'))
    line=page.get_text('rawdict')['blocks'][bi]['lines'][li];span=line['spans'][si]
    bounds=fitz.Rect(clip if clip is not None else span['bbox']);dx,dy=line.get('dir',(1,0));size=span['size']
    for char in span['chars']:
        if clip is not None and (fitz.Rect(char['bbox'])&fitz.Rect(clip)).get_area()<.1:continue
        if char['c'].isspace() or len(char['c'])!=1:continue
        glyph=font.glyph_bbox(ord(char['c']));ox,oy=char['origin']
        points=[fitz.Point(ox+size*(u*dx+v*dy),oy+size*(u*dy-v*dx)) for u in (glyph.x0,glyph.x1) for v in (glyph.y0,glyph.y1)]
        bounds|=fitz.Rect(min(p.x for p in points),min(p.y for p in points),max(p.x for p in points),max(p.y for p in points))
    return bounds


def inspect_pdf(data):
    from layout import inspect_paragraphs
    with open_pdf(data) as doc:
        pages = []
        for number, page in enumerate(doc):
            items = []
            for identifier, span, line in runs(page):
                direction = line.get("dir", (1, 0))
                angle = math.degrees(math.atan2(-direction[1], direction[0])) % 360
                items.append({"id": identifier, "text": span["text"], "font": span["font"],
                              "size": span["size"], "color": span["color"], "bbox": list(span["bbox"]),
                              "rotation": round(angle, 2), "editable": abs(angle / 90 - round(angle / 90)) < .001})
            pages.append({"page": number + 1, "width": page.rect.width, "height": page.rect.height,
                          "rotation": page.rotation, "runs": items,"paragraphs":inspect_paragraphs(page)})
        return {"source_sha256": sha(data), "pages": pages, "page_count": len(doc),
                "signed": any(p.get_sigflags() > 0 for p in [doc])}

def resolve_font(doc, page, name):
    def clean(value):
        return str(value).split("+")[-1].replace(" ", "").lower()
    for xref, ext, kind, base, resource, *rest in page.get_fonts(full=True):
        if xref:
            content = doc.extract_font(xref)[3]
            if content:
                try:
                    embedded = fitz.Font(fontbuffer=content)
                    names = {clean(base), clean(embedded.name)}
                    try:
                        with TTFont(io.BytesIO(content), lazy=True) as table:
                            names.update(clean(table["name"].getDebugName(n)) for n in (1, 4, 6))
                    except Exception:
                        pass  # Non-SFNT fonts can still match the exact PDF/MuPDF name.
                    if clean(name) in names:
                        return embedded, content, "FoxRunEdit" + sha(content)[:12]
                except Exception:
                    if clean(base) == clean(name):
                        raise EngineError("This embedded font cannot be reused safely.")
    aliases = {"helvetica":"helv", "helvetica-bold":"hebo", "helvetica-oblique":"heit",
               "helvetica-boldoblique":"hebi", "times-roman":"tiro", "times-bold":"tibo",
               "times-italic":"tiit", "times-bolditalic":"tibi", "courier":"cour",
               "courier-bold":"cobo", "courier-oblique":"coit", "courier-boldoblique":"cobi"}
    alias = aliases.get(clean(name))
    if not alias:
        raise EngineError("The original font is unavailable. Import a font or use the existing guarded paragraph tool.")
    return fitz.Font(fontname=alias), None, alias

def field_state(doc):
    return [(n, w.field_name, str(w.field_value), w.field_type, tuple(w.rect))
            for n, page in enumerate(doc) for w in (page.widgets() or [])]

def outside_pixels_unchanged(before, after, rect, rotation_matrix):
    if (before.width, before.height) != (after.width, after.height):
        return False
    a = Image.frombytes("RGB", (before.width, before.height), before.samples)
    b = Image.frombytes("RGB", (after.width, after.height), after.samples)
    diff = ImageChops.difference(a, b).convert("L")
    mask = Image.new("L", a.size, 255)
    visible = rect * rotation_matrix
    ImageDraw.Draw(mask).rectangle((math.floor(visible.x0 - 3), math.floor(visible.y0 - 3),
                                    math.ceil(visible.x1 + 3), math.ceil(visible.y1 + 3)), fill=0)
    return ImageChops.multiply(diff, mask).getbbox() is None

def edit_run(data, params):
    if params.get("source_sha256") != sha(data):
        raise EngineError("The document changed. Inspect the current copy again.")
    text = str(params.get("text", ""))
    if not text or len(text) > 2000 or "\n" in text or "\r" in text:
        raise EngineError("Enter one text run, up to 2,000 characters. Use paragraph editing for multiple lines.")
    with open_pdf(data) as doc:
        if doc.get_sigflags() > 0:
            raise EngineError("Editing would invalidate an existing signature. Use an unsigned copy.")
        try:
            pn = int(params["page"]) - 1
            if pn < 0 or pn >= len(doc): raise ValueError()
            page = doc[pn]
            match = next((s, line) for identifier, s, line in runs(page) if identifier == params["run_id"])
        except (KeyError, ValueError, StopIteration, TypeError):
            raise EngineError("The selected text run is no longer available.")
        span, line = match
        rect = fitz.Rect(span["bbox"])
        ensure_visible_text(page,rect)
        for annot in page.annots() or []:
            if annot.type[0] == fitz.PDF_ANNOT_REDACT:
                raise EngineError("Apply or remove existing redaction marks before editing this page.")
        if any(rect.intersects(w.rect) for w in (page.widgets() or [])):
            raise EngineError("Use form filling to change text inside a form field.")
        for identifier, other, other_line in runs(page):
            if identifier == params["run_id"]: continue
            intersection = rect & fitz.Rect(other["bbox"])
            if not intersection.is_empty and intersection.get_area() > .05:
                raise EngineError("This text overlaps another run. The engine will not risk deleting neighboring content.")
        direction = line.get("dir", (1, 0))
        angle = math.degrees(math.atan2(-direction[1], direction[0])) % 360
        rotate = round(angle / 90) * 90 % 360
        if min(abs(angle - rotate), abs(angle - rotate - 360)) > .1:
            raise EngineError("Arbitrarily angled text cannot be changed safely yet.")
        font, buffer, fontname = resolve_font(doc, page, span["font"])
        verification_rect=original_ink_bounds(page,params['run_id'],font)
        if any(not font.has_glyph(ord(c)) for c in text if not c.isspace()):
            raise EngineError("The original font does not contain every replacement character.")
        size = float(span["size"])
        available = rect.height if rotate in (90, 270) else rect.width
        required = font.text_length(text, fontsize=size)
        if required > available + .25:
            if not params.get("fit"):
                raise EngineError("The replacement is longer than this run. Enable fit-to-space or edit the paragraph.")
            size *= available / required
            if size < 6:
                raise EngineError("The replacement would be too small to read. Use paragraph editing.")
        before = page.get_pixmap(alpha=False, annots=True)
        fields_before = field_state(doc)
        page.add_redact_annot(rect, fill=False, cross_out=False)
        page.apply_redactions(images=0, graphics=0, text=0)
        if buffer:
            page.insert_font(fontname=fontname, fontbuffer=buffer)
        color = fitz.sRGB_to_pdf(span["color"])
        page.insert_text(span["origin"], text, fontsize=size, fontname=fontname, rotate=rotate,
                         color=color, fill_opacity=span.get("alpha", 255) / 255)
        after = page.get_pixmap(alpha=False, annots=True)
        if not outside_pixels_unchanged(before, after, verification_rect, page.rotation_matrix):
            raise EngineError("Rendering changed outside the selected run. No edited copy was committed.")
        output = doc.tobytes(garbage=4, deflate=True)
        with fitz.open(stream=output, filetype="pdf") as reopened:
            if len(reopened) != len(doc) or field_state(reopened) != fields_before:
                raise EngineError("Page or form integrity verification failed.")
            extracted = norm(reopened[pn].get_textbox(rect + (-1, -1, 1, 1)))
            if norm(text) not in extracted:
                raise EngineError("The saved replacement could not be verified.")
        return output, {"operation":"edit_run", "page":pn + 1, "font_preserved":True,
                        "font_size":round(size, 3), "surrounding_pixels_unchanged":True,
                        "forms_preserved":True, "source_sha256":sha(data), "output_sha256":sha(output)}

def audit_image_only(data):
    with fitz.open(stream=data, filetype="pdf") as doc:
        checks = {"no_searchable_text":all(not p.get_text().strip() for p in doc),
                  "no_fonts":all(not p.get_fonts() for p in doc),
                  "no_form_fields":not field_state(doc),
                  "no_annotations":all(not list(p.annots() or []) for p in doc),
                  "no_links":all(not p.get_links() for p in doc),
                  "no_attachments":doc.embfile_count() == 0,
                  "no_xml_metadata":not doc.get_xml_metadata(),
                  "no_bookmarks":not doc.get_toc(),
                  "no_source_metadata":all(not doc.metadata.get(k) for k in ["title","author","subject","keywords","creator","producer"]),
                  "image_on_every_page":all(bool(p.get_images()) for p in doc)}
        catalog = doc.xref_get_keys(doc.pdf_catalog())
        checks["no_active_or_hidden_catalogs"] = not any(k in catalog for k in
            ["Names","AcroForm","OpenAction","AA","OCProperties","Metadata","StructTreeRoot"])
        if not all(checks.values()):
            raise EngineError("The rebuilt export failed its structural sanitation audit.")
        return checks

def redact_image_copy(data, params, ocr=None):
    if not isinstance(params.get("terms"), list) or any(not isinstance(t, str) for t in params["terms"]):
        raise EngineError("Enter phrases as a list of text strings.")
    terms = list(dict.fromkeys(str(t).strip() for t in params.get("terms", []) if str(t).strip()))
    regions=params.get("rectangles",[])
    if not isinstance(regions,list) or len(regions)>100: raise EngineError("Choose up to 100 redaction regions.")
    if (not terms and not regions) or len(terms) > 20 or any(len(t) > 200 for t in terms):
        raise EngineError("Enter up to 20 exact phrases or mark a redaction region.")
    dpi = int(params.get("dpi", 150))
    if dpi not in (150, 200):
        raise EngineError("Choose 150 or 200 DPI.")
    with open_pdf(data) as doc, fitz.open() as rebuilt:
        selected={}
        for region in regions:
            try:
                n=int(region['page'])-1;r=fitz.Rect(region['bbox'])
                if n<0 or n>=len(doc) or not all(math.isfinite(v) for v in r) or r.is_empty or not doc[n].rect.contains(r): raise ValueError()
                r=r*doc[n].derotation_matrix
            except (KeyError,TypeError,ValueError): raise EngineError("A marked region is invalid or outside its page.")
            selected.setdefault(n,[]).append(r)
        if doc.get_sigflags() > 0 and not params.get("allow_signed_copy"):
            raise EngineError("This export removes existing signatures. Explicitly acknowledge creating an unsigned copy.")
        counts = {term:0 for term in terms}
        ocr_pages, pixels = [], 0
        for number, page in enumerate(doc):
            pixels += math.ceil(page.rect.width * dpi / 72) * math.ceil(page.rect.height * dpi / 72)
            if pixels > 80_000_000:
                raise EngineError("This document is too large for a high-assurance export. Split it into smaller copies.")
            # OCR every rendered page to also search outlined text and mixed vector/image content.
            language = params.get("language", "eng")
            if language not in ("eng", "eng+spa", "eng+jpn"):
                raise EngineError("Choose a supported OCR language.")
            try:
                textpage = (ocr(page) if ocr else page.get_textpage_ocr(language=language, dpi=180, full=True)) if terms else None
            except Exception as exc:
                raise EngineError("OCR is required for high-assurance phrase detection but could not finish. No redacted copy was exported.") from exc
            if terms: ocr_pages.append(number + 1)
            boxes = list(selected.get(number,[]))
            for term in terms:
                hits = list(page.search_for(term))
                if textpage is not None:
                    hits += list(page.search_for(term, textpage=textpage))
                unique = {tuple(round(v, 2) for v in rect):rect for rect in hits}
                counts[term] += len(unique)
                for hit in unique.values():
                    ink=fitz.Rect(hit)
                    for identifier,span,_ in runs(page):
                        if (hit&fitz.Rect(span['bbox'])).get_area()>.1:
                            try:font=resolve_font(doc,page,span['font'])[0]
                            except EngineError:raise EngineError("A detected phrase uses an unsupported font. Mark its full visible area manually instead.")
                            ink|=original_ink_bounds(page,identifier,font,clip=hit)
                    boxes.append(ink)
            # Paint on fresh pixels, not source PDF objects. This keeps background graphics intact
            # while ensuring the output cannot carry recoverable covered text or source images.
            pix = page.get_pixmap(dpi=dpi, alpha=False, annots=False)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            paint = ImageDraw.Draw(image)
            for rect in boxes:
                visible = (rect + (-.75, -.75, .75, .75)) * page.rotation_matrix
                scale = dpi / 72
                paint.rectangle((math.floor(visible.x0*scale), math.floor(visible.y0*scale),
                                 math.ceil(visible.x1*scale), math.ceil(visible.y1*scale)), fill="black")
            import io
            encoded = io.BytesIO();image.save(encoded, format="PNG")
            new_page = rebuilt.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(new_page.rect, stream=encoded.getvalue())
        if any(count == 0 for count in counts.values()):
            raise EngineError("At least one requested phrase had no detected matches. Review the wording or run OCR; no copy was exported.")
        rebuilt.set_metadata({})
        output = rebuilt.tobytes(garbage=4, deflate=True)
        if len(output) > 40 * 1024 * 1024:
            raise EngineError("The rebuilt copy exceeds 40 MB. Split the original into smaller documents.")
        checks = audit_image_only(output)
        return output, {"operation":"redact_image_copy", "page_count":len(doc), "matches":counts,
                        "ocr_pages":ocr_pages, "manual_regions":len(regions), "dpi":dpi, "checks":checks,
                        "source_sha256":sha(data), "output_sha256":sha(output),
                        "warning":"Image-only copy: text search, forms, annotations and existing signatures are removed. Review all visible pages before sharing. Detection is limited to the phrases and OCR results reported here."}
