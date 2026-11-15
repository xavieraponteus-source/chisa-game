import unittest,io
from pathlib import Path
import pymupdf as fitz
from PIL import Image
from engine import inspect_pdf,EngineError,norm
from layout import edit_paragraph

OUT=Path(__file__).parent/'test-artifacts'
def fixture(table=False,image=False,rotation=0):
    d=fitz.open();p=d.new_page(width=612,height=792)
    p.draw_rect((35,40,290,260),fill=(.94,.96,.98),color=(.3,.4,.5))
    p.insert_text((50,70),'Original paragraph with ',fontsize=12)
    x=50+fitz.get_text_length('Original paragraph with ',fontsize=12)
    p.insert_text((x,70),'bold words',fontname='hebo',fontsize=12,color=(.6,0,0))
    p.insert_text((50,88),'continues on the second line.',fontsize=12)
    p.insert_text((330,70),'Second column must remain unchanged.',fontsize=11)
    p.insert_text((50,310),'Next paragraph must remain unchanged.',fontsize=12)
    if table:p.draw_line((40,110),(285,110),color=(0,0,0));p.draw_line((40,40),(40,110),color=(0,0,0));p.draw_line((285,40),(285,110),color=(0,0,0))
    if image:
        b=io.BytesIO();Image.new('RGB',(100,20),'green').save(b,format='PNG');p.insert_image((50,120,250,150),stream=b.getvalue())
    w=fitz.Widget();w.field_name='sample';w.field_type=fitz.PDF_WIDGET_TYPE_TEXT;w.field_value='Keep field';w.rect=fitz.Rect(330,120,520,145);p.add_widget(w)
    p.set_rotation(rotation);p=d.new_page(width=792,height=612);p.insert_text((50,70),'Landscape unchanged')
    data=d.tobytes();d.close();return data
def params(data,text,**kw):
    info=inspect_pdf(data);p=next(p for p in info['pages'][0]['paragraphs'] if p['text'].startswith('Original'))
    return {'source_sha256':info['source_sha256'],'page':1,'paragraph_id':p['id'],'text':text,**kw}

class ParagraphTests(unittest.TestCase):
    def test_edit_inside_table_cell(self):
        data=fixture(table=True);out,r=edit_paragraph(data,params(data,'Updated paragraph with bold words continues here.',grow=True))
        self.assertLess(r['paragraph_bbox'][3],110);self.assertTrue(r['surrounding_pixels_unchanged'])
    def test_embedded_paragraph_font(self):
        font=Path('C:/Windows/Fonts/arial.ttf')
        if not font.exists():self.skipTest('Local embedded-font fixture unavailable')
        d=fitz.open();p=d.new_page();p.insert_font(fontname='Fixture',fontfile=str(font));p.insert_text((50,70),'Original embedded paragraph text.',fontname='Fixture');p.insert_text((50,87),'continues in the same font.',fontname='Fixture');data=d.tobytes();d.close()
        out,r=edit_paragraph(data,params(data,'Updated embedded paragraph text continues in the same font and wraps into more lines.',grow=True))
        self.assertTrue(r['surrounding_pixels_unchanged']);self.assertEqual(r['fonts_reused'],['ArialMT'])
    def test_bounded_font_fit(self):
        data=fixture();out,r=edit_paragraph(data,params(data,'Revised paragraph with bold words continues on another line and needs a little more space.',fit=True))
        self.assertLess(r['font_scale'],1);self.assertGreaterEqual(r['font_scale'],.5)
    def test_justify(self):
        data=fixture();out,r=edit_paragraph(data,params(data,'This replacement paragraph wraps into several lines while keeping other objects completely unchanged.',align='justify',grow=True))
        self.assertTrue(r['surrounding_pixels_unchanged'])
    def test_multiline_mixed_styles_and_columns(self):
        data=fixture();text='Revised paragraph with bold words continues on the second line, and now wraps into additional lines.'
        output,report=edit_paragraph(data,params(data,text,grow=True))
        self.assertGreater(report['line_count'],2);self.assertTrue(report['surrounding_pixels_unchanged'])
        with fitz.open(stream=output,filetype='pdf') as d:
            spans=[s for b in d[0].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
            styled=' '.join(s['text'].strip() for s in spans if 'Bold' in s['font'] and s['color']!=0)
            self.assertIn('bold words',styled)
            self.assertIn('Second column must remain unchanged.',d[0].get_text());self.assertNotIn('Original paragraph',d[0].get_text())
            self.assertEqual(next(d[0].widgets()).field_value,'Keep field')
            self.assertEqual(len(d),2)
        OUT.mkdir(exist_ok=True);(OUT/'paragraph-edited.pdf').write_bytes(output);(OUT/'paragraph-original.pdf').write_bytes(data)
    def test_overflow_fails_without_growth(self):
        data=fixture()
        with self.assertRaisesRegex(EngineError,'does not fit'):edit_paragraph(data,params(data,'A long replacement paragraph. '*20))
    def test_table_rule_blocks_growth(self):
        data=fixture(table=True)
        with self.assertRaisesRegex(EngineError,'does not fit'):edit_paragraph(data,params(data,'A long replacement paragraph. '*20,grow=True))
        p=next(p for p in inspect_pdf(data)['pages'][0]['paragraphs'] if p['text'].startswith('Original'))
        self.assertLess(p['available_bbox'][3],110)
    def test_image_blocks_growth(self):
        data=fixture(image=True)
        p=next(p for p in inspect_pdf(data)['pages'][0]['paragraphs'] if p['text'].startswith('Original'))
        self.assertLess(p['available_bbox'][3],120)
    def test_rotated_page_keeps_rotation(self):
        data=fixture(rotation=90);output,report=edit_paragraph(data,params(data,'Updated paragraph with bold words continues on the second line.',grow=True))
        self.assertEqual(inspect_pdf(output)['pages'][0]['rotation'],90)
    def test_alignment_and_explicit_line_break(self):
        data=fixture();output,report=edit_paragraph(data,params(data,'First line\nSecond line',align='center',grow=True))
        self.assertEqual(report['line_count'],2)
    def test_stale_source_rejected(self):
        data=fixture();p=params(data,'Changed paragraph');p['source_sha256']='stale'
        with self.assertRaisesRegex(EngineError,'changed'):edit_paragraph(data,p)
    def test_columns_not_combined(self):
        info=inspect_pdf(fixture());p=next(p for p in info['pages'][0]['paragraphs'] if p['text'].startswith('Original'))
        self.assertNotIn('Second column',p['text']);self.assertEqual(p['line_count'],2)
    def test_unavailable_glyph_rejected(self):
        data=fixture()
        with self.assertRaisesRegex(EngineError,'lacks replacement'):edit_paragraph(data,params(data,'Emoji \U0001f6f8'))
    def test_repeated_edits_reopen(self):
        data=fixture();a,_=edit_paragraph(data,params(data,'Updated paragraph with bold words continues on the second line.',grow=True))
        p=next(p for p in inspect_pdf(a)['pages'][0]['paragraphs'] if p['text'].startswith('Updated'))
        b,r=edit_paragraph(a,{'source_sha256':inspect_pdf(a)['source_sha256'],'page':1,'paragraph_id':p['id'],'text':'Another editable paragraph.','grow':True})
        self.assertTrue(r['surrounding_pixels_unchanged'])

if __name__=='__main__':unittest.main()
