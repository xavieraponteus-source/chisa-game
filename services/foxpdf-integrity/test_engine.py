import io, json, unittest
from pathlib import Path
import pymupdf as fitz
from PIL import Image
from engine import inspect_pdf, edit_run, redact_image_copy, EngineError, sha, audit_image_only, norm

OUT = Path(__file__).parent / "test-artifacts"

def sample():
    doc = fitz.open(); page = doc.new_page(width=612, height=792)
    page.draw_rect((35,40,570,180), color=(.2,.3,.4), fill=(.93,.95,.98))
    page.insert_text((50,75), "Original regular text", fontsize=12, fontname="helv", color=(.1,.2,.4))
    page.insert_text((50,105), "Original bold text", fontsize=12, fontname="hebo", color=(.6,.1,.1))
    page.insert_text((320,75), "Second column stays", fontsize=11, fontname="tiro")
    page.insert_text((50,155), "SECRET-4827 visible", fontsize=12)
    page.insert_text((50,220), "SECRET-4827 hidden", fontsize=12, render_mode=3)
    page.add_text_annot((30,280), "SECRET-4827 annotation")
    widget = fitz.Widget(); widget.field_name="private_field";widget.field_type=fitz.PDF_WIDGET_TYPE_TEXT
    widget.field_value="SECRET-4827 field";widget.rect=fitz.Rect(50,300,240,325);page.add_widget(widget)
    doc.embfile_add("private.txt", b"SECRET-4827 attachment")
    doc.set_metadata({"title":"SECRET-4827 title","author":"Private Author"})
    doc.set_xml_metadata('<metadata>SECRET-4827 XML</metadata>')
    doc.set_toc([[1,"SECRET-4827 bookmark",1]])
    second=doc.new_page(width=792,height=612);second.insert_text((50,70),"Landscape page unchanged")
    data=doc.tobytes();doc.close();return data

def options(data, wanted="Original regular text", text="Edited regular text", **extra):
    info=inspect_pdf(data)
    run=next(r for r in info["pages"][0]["runs"] if norm(r["text"])==wanted)
    return {"source_sha256":info["source_sha256"],"page":1,"run_id":run["id"],"text":text,**extra}

class EngineTests(unittest.TestCase):
    def test_embedded_font_preserved(self):
        fontfile=Path("C:/Windows/Fonts/arial.ttf")
        if not fontfile.exists():self.skipTest("Local embedded-font fixture unavailable")
        d=fitz.open();p=d.new_page();p.insert_font(fontname="Fixture",fontfile=str(fontfile));p.insert_text((50,70),"Original embedded text",fontname="Fixture");data=d.tobytes();d.close()
        output,report=edit_run(data,options(data,"Original embedded text","Edited embedded text"))
        self.assertTrue(report["font_preserved"]);self.assertTrue(report["surrounding_pixels_unchanged"])
    def test_bad_terms_rejected(self):
        with self.assertRaises(EngineError):redact_image_copy(sample(),{"terms":"secret"})
    def test_sanitized_background_is_preserved(self):
        data=sample();output,_=redact_image_copy(data,{"terms":["SECRET-4827"]},ocr=lambda p:p.get_textpage())
        with fitz.open(stream=output,filetype="pdf") as doc:
            pix=doc[0].get_pixmap();self.assertEqual(pix.pixel(40,45),(237,242,249))
    def test_native_edit_preserves_columns_background_and_forms(self):
        data=sample();output,report=edit_run(data,options(data))
        with fitz.open(stream=output,filetype="pdf") as d:
            self.assertIn("Edited regular text",d[0].get_text());self.assertNotIn("Original regular text",d[0].get_text())
            self.assertIn("Second column stays",d[0].get_text());self.assertEqual(len(d),2)
            self.assertEqual(next(d[0].widgets()).field_value,"SECRET-4827 field")
        self.assertTrue(report["surrounding_pixels_unchanged"])
        OUT.mkdir(exist_ok=True);(OUT/"complex-edited.pdf").write_bytes(output)
    def test_bold_color_is_preserved(self):
        data=sample();output,report=edit_run(data,options(data,"Original bold text","Edited bold text"))
        info=inspect_pdf(output);run=next(r for r in info["pages"][0]["runs"] if r["text"]=="Edited bold text")
        self.assertIn("Bold",run["font"]);self.assertEqual(run["color"],inspect_pdf(data)["pages"][0]["runs"][1]["color"])
    def test_stale_edit_rejected(self):
        data=sample();params=options(data);params["source_sha256"]="stale"
        with self.assertRaises(EngineError):edit_run(data,params)
    def test_overflow_rejected_without_fit(self):
        data=sample()
        with self.assertRaises(EngineError):edit_run(data,options(data,text="This replacement is far longer than the original text run can hold"))
    def test_fit_is_bounded(self):
        data=sample();output,report=edit_run(data,options(data,text="A slightly longer replacement",fit=True));self.assertGreaterEqual(report["font_size"],6)
    def test_high_assurance_removes_hidden_objects(self):
        data=sample();output,report=redact_image_copy(data,{"terms":["SECRET-4827"]},ocr=lambda p:p.get_textpage())
        self.assertTrue(all(report["checks"].values()))
        with fitz.open(stream=output,filetype="pdf") as d:
            self.assertEqual(len(d),2);self.assertEqual(d[1].rect.width,792)
            self.assertEqual(d.embfile_count(),0);self.assertEqual(d.get_toc(),[])
            for n in range(1,d.xref_length()):self.assertNotIn("SECRET-4827",d.xref_object(n))
        OUT.mkdir(exist_ok=True);(OUT/"sanitized.pdf").write_bytes(output)
    def test_missing_phrase_does_not_export(self):
        with self.assertRaisesRegex(EngineError,"no detected matches"):redact_image_copy(sample(),{"terms":["does not exist"]},ocr=lambda p:p.get_textpage())
    def test_image_page_requires_ocr(self):
        d=fitz.open();p=d.new_page();im=Image.new("RGB",(50,20),"white");buf=io.BytesIO();im.save(buf,format="PNG");p.insert_image((50,50,200,110),stream=buf.getvalue());data=d.tobytes();d.close()
        def fail(page):raise RuntimeError("OCR unavailable")
        with self.assertRaisesRegex(EngineError,"OCR is required"):redact_image_copy(data,{"terms":["secret"]},ocr=fail)
    def test_native_edit_of_rotated_run(self):
        d=fitz.open();p=d.new_page();p.insert_text((200,300),"Original rotated text",rotate=90,fontsize=12);data=d.tobytes();d.close()
        output,report=edit_run(data,options(data,"Original rotated text","Edited rotated text"))
        self.assertIn("Edited rotated text",inspect_pdf(output)["pages"][0]["runs"][0]["text"])
    def test_page_rotation_is_preserved(self):
        d=fitz.open(stream=sample(),filetype="pdf");d[0].set_rotation(90);data=d.tobytes();d.close()
        output,report=edit_run(data,options(data));self.assertEqual(inspect_pdf(output)["pages"][0]["rotation"],90)

if __name__=="__main__":unittest.main()
