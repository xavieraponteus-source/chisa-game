import unittest
from pathlib import Path
import pymupdf as fitz
from test_layout import fixture,params
from layout import edit_paragraph
from engine import inspect_pdf,EngineError,norm

OUT=Path(__file__).parent/'test-artifacts'
def grid(blocked=False,colored=False):
    d=fitz.open();p=d.new_page(width=612,height=792)
    if colored:p.draw_rect((50,60,450,180),color=None,fill=(.8,.9,1))
    for y in [60,100,140,180]:p.draw_line((50,y),(450,y),color=(0,0,0),width=.5)
    for x in [50,250,450]:p.draw_line((x,60),(x,180),color=(0,0,0),width=.5)
    for y,a,b in [(82,'Original cell','Other cell'),(122,'Second row','Second value'),(162,'Third row','Third value')]:
        p.insert_text((57,y),a,fontsize=11);p.insert_text((257,y),b,fontsize=11)
    p.insert_text((50,210 if blocked else 500),'Outside table stays unchanged')
    return d.tobytes()

class FlowTableTests(unittest.TestCase):
    def test_continuation_keeps_original_pages_and_forms(self):
        data=fixture();text='A longer paragraph that flows into native editable continuation pages. '*40
        output,r=edit_paragraph(data,params(data,text,grow=True,flow=True))
        self.assertTrue(r['continuation_pages']);self.assertEqual(r['continuation_pages'][0],3)
        with fitz.open(stream=data,filetype='pdf') as a,fitz.open(stream=output,filetype='pdf') as b:
            self.assertEqual(a[1].get_pixmap().samples,b[1].get_pixmap().samples)
            self.assertEqual(next(b[0].widgets()).field_value,'Keep field')
            actual=norm(b[0].get_textbox(fitz.Rect(r['paragraph_bbox'])))+' '+ ' '.join(norm(b[i-1].get_text()) for i in r['continuation_pages'])
            self.assertEqual(actual.replace(' ',''),norm(text).replace(' ',''))
        OUT.mkdir(exist_ok=True);(OUT/'continuation.pdf').write_bytes(output)
    def test_table_row_growth_moves_remaining_rows(self):
        data=grid();text='This replacement cell contains enough text to wrap into several lines and automatically increase the row height.'
        out,r=edit_paragraph(data,params(data,text,table_grow=True,grow=True))
        self.assertTrue(r['table_row_grown']);self.assertGreater(r['row_height_increase'],0)
        with fitz.open(stream=out,filetype='pdf') as d:
            self.assertNotIn('Original cell',d[0].get_text());self.assertIn('Second row',d[0].get_text());self.assertIn('Other cell',d[0].get_text())
            self.assertIn('Outside table stays unchanged',d[0].get_text())
        OUT.mkdir(exist_ok=True);(OUT/'grown-table.pdf').write_bytes(out)
    def test_table_collision_blocks_write(self):
        data=grid(blocked=True)
        with self.assertRaisesRegex(EngineError,'collide'):edit_paragraph(data,params(data,'Long replacement text. '*20,table_grow=True))
    def test_colored_table_rejected(self):
        data=grid(colored=True)
        with self.assertRaisesRegex(EngineError,'Colored'):edit_paragraph(data,params(data,'Long replacement text. '*5,table_grow=True))

if __name__=='__main__':unittest.main()
