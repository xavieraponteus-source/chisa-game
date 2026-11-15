import unittest,math
import pymupdf as fitz
from engine import inspect_pdf,EngineError,sha
from layout import edit_paragraph

class LiveTextTests(unittest.TestCase):
    def source(self):
        d=fitz.open();p=d.new_page(width=500,height=600);p.draw_rect((20,30,470,220),fill=(.8,.9,1),color=None);p.insert_text((40,90),'Clean words',fontname='tibi',fontsize=24);p.insert_text((40,300),'Keep this line unchanged.',fontsize=12);d.new_page().insert_text((40,70),'Second page');return d.tobytes()
    def options(self,data,**values):
        p=next(p for p in inspect_pdf(data)['pages'][0]['paragraphs'] if p['text']=='Clean words');return {'source_sha256':sha(data),'page':1,'paragraph_id':p['id'],'text':'Public edit','grow':True,**values}
    def test_empty_preview_removes_ink_and_keeps_colored_background(self):
        data=self.source();out,r=edit_paragraph(data,self.options(data,text=''))
        with fitz.open(stream=out,filetype='pdf') as d:
            self.assertNotIn('Clean words',d[0].get_text());self.assertIn('Keep this line unchanged.',d[0].get_text());self.assertTrue(r['surrounding_pixels_unchanged']);self.assertEqual(d[0].get_pixmap().pixel(45,80),(204,229,255))
    def test_larger_and_smaller_native_fonts_survive_save(self):
        data=self.source()
        for scale in [.75,1.1,1.5]:
            out,r=edit_paragraph(data,self.options(data,font_scale=scale))
            with fitz.open(stream=out,filetype='pdf') as d:
                spans=[s for b in d[0].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] if 'Public' in s['text']];self.assertTrue(spans);self.assertAlmostEqual(spans[0]['size'],24*scale,places=3);self.assertIn('Keep this line unchanged.',d[0].get_text())
    def test_typed_resized_text_can_move_in_one_verified_edit(self):
        data=self.source();out,r=edit_paragraph(data,self.options(data,font_scale=1.1,position={'x':60,'y':150}))
        self.assertIn('moved_bbox',r)
        with fitz.open(stream=out,filetype='pdf') as d:
            self.assertIn('Public edit',d[0].get_text());self.assertNotIn('Clean words',d[0].get_text());self.assertAlmostEqual(r['moved_bbox'][0],60);self.assertAlmostEqual(r['moved_bbox'][1],150)
    def test_collision_and_invalid_sizes_are_rejected(self):
        data=self.source()
        for scale in [float('nan'),0,5]:
            with self.assertRaises(EngineError):edit_paragraph(data,self.options(data,font_scale=scale))
        with self.assertRaisesRegex(EngineError,'overlap'):edit_paragraph(data,self.options(data,position={'x':40,'y':290}))
if __name__=='__main__':unittest.main()
