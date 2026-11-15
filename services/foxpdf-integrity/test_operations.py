import unittest
import pymupdf as fitz
from engine import EngineError,inspect_pdf,sha,redact_image_copy,audit_image_only
from operations import search_pdf,replace_text,move_text,compare_pdfs

def fixture():
    d=fitz.open();p=d.new_page(width=400,height=400)
    p.insert_text((30,50),'Apple apple pineapple apple.',fontsize=12)
    p.insert_text((30,100),'Keep this paragraph unchanged.',fontsize=12)
    d.new_page(width=400,height=400)
    data=d.tobytes();d.close();return data

class OperationsTests(unittest.TestCase):
    def test_find_case_and_whole_word(self):
        b=fixture()
        self.assertEqual(search_pdf(b,{'query':'apple'})['total'],3)
        self.assertEqual(search_pdf(b,{'query':'apple','case':True})['total'],2)
        self.assertEqual(search_pdf(b,{'query':'apple','whole':False})['total'],4)
    def test_replace_one_and_all_are_native(self):
        b=fixture();opts={'query':'apple','source_sha256':sha(b),'replacement':'Pear','index':1}
        out,r=replace_text(b,opts);self.assertEqual(r['replacements'],1)
        with fitz.open(stream=out,filetype='pdf') as d:self.assertIn('Apple Pear pineapple apple.',d[0].get_text())
        out,r=replace_text(b,{**opts,'all':True});self.assertEqual(r['replacements'],3)
        with fitz.open(stream=out,filetype='pdf') as d:
            self.assertIn('Pear Pear pineapple Pear.',d[0].get_text());self.assertIn('Keep this paragraph unchanged.',d[0].get_text())
        self.assertEqual(search_pdf(out,{'query':'apple'})['total'],0)
    def test_empty_replacement(self):
        b=fixture();out,_=replace_text(b,{'query':'apple','source_sha256':sha(b),'replacement':'','all':True})
        self.assertEqual(search_pdf(out,{'query':'apple'})['total'],0)
    def test_reject_stale_and_overflow(self):
        b=fixture()
        with self.assertRaises(EngineError):replace_text(b,{'query':'apple','replacement':'Pear','all':True})
        with self.assertRaises(EngineError):replace_text(b,{'query':'apple','source_sha256':sha(b),'replacement':'x'*500,'all':True})
    def move_options(self,b,**kw):
        p=inspect_pdf(b)['pages'][0]['paragraphs'][0]
        return {'source_sha256':sha(b),'page':1,'paragraph_id':p['id'],'target_page':2,'x':40,'y':150,**kw}
    def test_move_between_pages_saved(self):
        b=fixture();out,r=move_text(b,self.move_options(b))
        with fitz.open(stream=out,filetype='pdf') as d:
            self.assertNotIn('Apple',d[0].get_text());self.assertIn('Apple apple pineapple apple.',d[1].get_text())
            self.assertIn('Keep this paragraph unchanged.',d[0].get_text())
        self.assertTrue(r['surrounding_pixels_unchanged'])
    def test_move_same_page(self):
        b=fixture();out,_=move_text(b,self.move_options(b,target_page=1,y=200))
        with fitz.open(stream=out,filetype='pdf') as d:
            self.assertEqual(d[0].get_text().count('Apple'),1);self.assertGreater(d[0].search_for('Apple')[0].y0,190)
    def test_move_reject_collision_outside_and_stale(self):
        b=fixture()
        for kw in [{'target_page':1,'y':87},{'x':390},{'source_sha256':'stale'},{'x':float('nan')}]:
            with self.assertRaises(EngineError):move_text(b,self.move_options(b,**kw))
    def test_compare_identical_and_native_change(self):
        b=fixture();self.assertEqual(compare_pdfs(b,b)['changed_pages'],0)
        out,_=replace_text(b,{'query':'apple','source_sha256':sha(b),'replacement':'Pear','all':True})
        r=compare_pdfs(b,out);self.assertEqual(r['changed_pages'],1);self.assertTrue(r['pages'][0]['text_changes']);self.assertTrue(r['pages'][0]['visual_bbox'])
    def test_compare_visual_only_and_added_page(self):
        b=fixture()
        with fitz.open(stream=b,filetype='pdf') as d:
            d[1].draw_rect((20,20,60,60),fill=(1,0,0));d.new_page();out=d.tobytes()
        r=compare_pdfs(b,out);self.assertEqual(r['changed_pages'],2);self.assertTrue(r['pages'][1]['image_only']);self.assertEqual(r['pages'][2]['kind'],'added')
    def test_manual_redaction_covers_pixels_and_strips_objects(self):
        b=fixture();out,r=redact_image_copy(b,{'terms':[],'rectangles':[{'page':1,'bbox':[25,30,250,60]}]})
        self.assertTrue(all(audit_image_only(out).values()));self.assertEqual(r['manual_regions'],1);self.assertEqual(r['ocr_pages'],[])
        with fitz.open(stream=out,filetype='pdf') as d:
            p=d[0].get_pixmap();self.assertEqual(p.pixel(40,45),(0,0,0));self.assertEqual(d[0].get_text(),'')
    def test_manual_redaction_rotated_display_coordinates(self):
        with fitz.open(stream=fixture(),filetype='pdf') as d:d[0].set_rotation(90);b=d.tobytes()
        out,_=redact_image_copy(b,{'terms':[],'rectangles':[{'page':1,'bbox':[300,20,380,90]}]})
        with fitz.open(stream=out,filetype='pdf') as d:self.assertEqual(d[0].get_pixmap().pixel(340,50),(0,0,0))
    def test_invalid_region_is_rejected(self):
        for rect in [[-1,0,10,10],[10,10,10,20],[0,0,9999,9999]]:
            with self.assertRaises(EngineError):redact_image_copy(fixture(),{'terms':[],'rectangles':[{'page':1,'bbox':rect}]})

if __name__=='__main__':unittest.main()
