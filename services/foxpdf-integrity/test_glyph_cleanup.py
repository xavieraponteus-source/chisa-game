"""Render at 360 DPI to detect even small old-glyph remnants after native removal."""
import unittest
import pymupdf as fitz
from engine import edit_run,inspect_pdf,sha
from operations import replace_text

def fixture(font,size,text=True,stroked=False):
    d=fitz.open();p=d.new_page(width=240,height=130)
    p.draw_rect((8,8,232,122),color=(.2,.3,.5),fill=(.88,.94,.98),width=.5)
    if text:p.insert_text((25,70),'fluffy gjpqy ffi',fontname=font,fontsize=size,color=(.1,.15,.3),render_mode=2 if stroked else 0,border_width=.3)
    b=d.tobytes();d.close();return b

class GlyphCleanupTests(unittest.TestCase):
    def test_small_bold_italic_and_descenders_leave_no_rendered_fragments(self):
        for font in ['helv','hebo','heit','hebi','tiit','tibi']:
            for size in [6.5,12,24]:
                with self.subTest(font=font,size=size):
                    b=fixture(font,size);info=inspect_pdf(b);run=info['pages'][0]['runs'][0]
                    for name,fn,options in [('run',edit_run,{'page':1,'run_id':run['id'],'text':' '}),('replace',replace_text,{'query':'fluffy gjpqy ffi','replacement':'','all':True})]:
                        out,_=fn(b,{'source_sha256':sha(b),**options})
                        with fitz.open(stream=out,filetype='pdf') as after,fitz.open(stream=fixture(font,size,False),filetype='pdf') as empty:
                            self.assertEqual(after[0].get_text().strip(),'')
                            self.assertEqual(after[0].get_pixmap(matrix=fitz.Matrix(5,5)).samples,empty[0].get_pixmap(matrix=fitz.Matrix(5,5)).samples,name+' left old-glyph pixels')
    def test_large_italic_paragraph_reflows_without_losing_overhangs(self):
        from layout import edit_paragraph
        b=fixture('tibi',24);p=inspect_pdf(b)['pages'][0]['paragraphs'][0]
        out,r=edit_paragraph(b,{'source_sha256':sha(b),'page':1,'paragraph_id':p['id'],'text':'Clean words','grow':False})
        with fitz.open(stream=out,filetype='pdf') as d:
            self.assertIn('Clean words',d[0].get_text());self.assertNotIn('fluffy',d[0].get_text())
        self.assertTrue(r['surrounding_pixels_unchanged'])
    def test_phrase_redaction_also_covers_italic_overhang_pixels(self):
        from engine import redact_image_copy
        b=fixture('tibi',24)
        out,_=redact_image_copy(b,{'terms':['fluffy gjpqy ffi'],'dpi':150},ocr=lambda p:p.get_textpage())
        with fitz.open(stream=b,filetype='pdf') as before,fitz.open(stream=out,filetype='pdf') as after:
            a=before[0].get_pixmap(dpi=150);z=after[0].get_pixmap(dpi=150);bg=(224,239,250)
            for y in range(90,175):
                for x in range(35,350):
                    pixel=a.pixel(x,y)
                    if max(abs(pixel[c]-bg[c]) for c in range(3))>30:
                        self.assertTrue(max(z.pixel(x,y))<10,(x,y,pixel,z.pixel(x,y)))

if __name__=='__main__':unittest.main()
