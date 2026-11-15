"""Grow a row in a simple rectangular, white-background native PDF table."""
import math,re
import pymupdf as fitz
from engine import EngineError,open_pdf,sha,norm,resolve_font,field_state,outside_pixels_unchanged


def edit_growing_table(data,params):
    from layout import paragraphs,edit_paragraph
    text=params.get('text','')
    if not isinstance(text,str) or not text.strip() or len(text)>10000:raise EngineError('Enter 1 to 10,000 characters.')
    with open_pdf(data) as doc:
        if doc.get_sigflags()>0:raise EngineError('Use an unsigned copy before editing.')
        try:
            pn=int(params['page'])-1
            if pn<0 or pn>=len(doc):raise ValueError()
            page=doc[pn];selected=next(p for p in paragraphs(page) if p['id']==params['paragraph_id'])
        except (KeyError,ValueError,StopIteration,TypeError):raise EngineError('Inspect and select the current table paragraph again.')
        if page.rotation:raise EngineError('Automatic table-row growth currently requires an unrotated page.')
        if any(a.type[0]==fitz.PDF_ANNOT_REDACT for a in (page.annots() or [])):raise EngineError('Apply or remove existing redaction marks first.')
        matches=[];target=fitz.Rect(selected['bbox'])
        for table in page.find_tables().tables:
            for ri,row in enumerate(table.rows):
                for ci,cell in enumerate(row.cells):
                    if cell and fitz.Rect(cell).contains(target):matches.append((table,ri,ci,fitz.Rect(cell)))
        if len(matches)!=1:raise EngineError('Select text inside one detected rectangular table cell.')
        table,row_index,column,cell=matches[0];bounds=fitz.Rect(table.bbox)
        cells=[c for row in table.rows for c in row.cells]
        if len(cells)>200 or any(c is None for c in cells):raise EngineError('Merged or oversized tables require manual layout editing.')
        xs=sorted(set(round(v,3) for c in cells for v in (c[0],c[2])))
        ys=sorted(set(round(v,3) for c in cells for v in (c[1],c[3])))
        if len(xs)!=table.col_count+1 or len(ys)!=table.row_count+1:raise EngineError('Only a regular rectangular table grid can grow automatically.')
        spans=[];outside=[]
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines',[]):
                for s in line['spans']:
                    r=fitz.Rect(s['bbox'])
                    if not s.get('text','').strip():continue
                    if bounds.intersects(r):
                        if not bounds.contains(r) or line.get('dir',(1,0))!=(1.0,0.0):raise EngineError('The table has overlapping or rotated text.')
                        spans.append(s)
                    else:outside.append(r)
        protected=[w.rect for w in (page.widgets() or [])]+[a.rect for a in (page.annots() or [])]+[fitz.Rect(l['from']) for l in page.get_links()]+[fitz.Rect(i['bbox']) for i in page.get_image_info()]
        if any(bounds.intersects(r) for r in protected):raise EngineError('Tables containing images, links, annotations or form fields cannot grow automatically.')
        fonts={s['font']:resolve_font(doc,page,s['font']) for s in spans}
        styles=selected['_styles'];padding=max(3,target.y0-cell.y0)
        left=max(cell.x0+3,target.x0);right=cell.x1-4;width=right-left
        if width<=12:raise EngineError('The selected table cell is too narrow.')
        # Conservative original-font measurement chooses enough row height before reflow.
        lines=1;used=0
        for token in re.findall(r'\n|[^\S\n]+|[^\s]+',text):
            if token=='\n':lines+=1;used=0;continue
            advance=max(fonts[s['font']][0].text_length(token,fontsize=s['size']) for s in styles)
            if advance>width:raise EngineError('A replacement word is wider than the table cell.')
            if used and used+advance>width and not token.isspace():lines+=1;used=0
            if used or not token.isspace():used+=advance
        line_height=max((s.get('ascender',1.1)-s.get('descender',-.3))*s['size'] for s in styles)
        new_height=max(cell.height,lines*max(line_height,max(s['size'] for s in styles)*1.25)+padding+4)
        delta=new_height-cell.height
        expanded=fitz.Rect(bounds.x0,bounds.y0,bounds.x1,bounds.y1+delta)
        if expanded.y1>page.rect.y1-18 or any(expanded.intersects(r) for r in outside+protected):
            raise EngineError('The expanded table would collide with content below it. Use continuation pages instead.')
        strokes=[]
        for drawing in page.get_drawings():
            r=fitz.Rect(drawing['rect'])
            if not (bounds+(-1,-1,1,1)).intersects(r) and not bounds.contains(r):continue
            if drawing.get('fill') is not None and any(abs(c-1)>.001 for c in drawing['fill']):raise EngineError('Colored table backgrounds are not supported for automatic row growth.')
            if drawing.get('color') is None:continue
            for item in drawing['items']:
                if item[0]=='l':
                    a,b=item[1:3]
                    if abs(a.x-b.x)>.1 and abs(a.y-b.y)>.1:raise EngineError('Decorative table paths cannot be resized safely.')
                elif item[0]!='re':raise EngineError('Decorative table paths cannot be resized safely.')
            strokes.append((drawing['color'],drawing.get('width',1)))
        if not strokes:raise EngineError('A bordered table is required for automatic row growth.')
        if any(v!=strokes[0] for v in strokes):raise EngineError('Mixed table-border styles cannot be resized safely.')
        before=page.get_pixmap(alpha=False,annots=True);fields=field_state(doc)
        for s in spans:page.add_redact_annot(s['bbox'],fill=False,cross_out=False)
        page.apply_redactions(images=0,graphics=0,text=0)
        page.draw_rect(expanded,color=None,fill=(1,1,1),overlay=True)
        shifted_ys=[y+delta if y>=cell.y1-.01 else y for y in ys]
        color,stroke_width=strokes[0]
        for y in shifted_ys:page.draw_line((bounds.x0,y),(bounds.x1,y),color=color,width=stroke_width)
        for x in xs:page.draw_line((x,bounds.y0),(x,expanded.y1),color=color,width=stroke_width)
        for font,buffer,name in fonts.values():
            if buffer:page.insert_font(fontname=name,fontbuffer=buffer)
        for s in spans:
            x,y=s['origin'];shift=delta if s['bbox'][1]>=cell.y1-.01 else 0
            page.insert_text((x,y+shift),s['text'],fontname=fonts[s['font']][2],fontsize=s['size'],color=fitz.sRGB_to_pdf(s['color']),fill_opacity=s.get('alpha',255)/255)
        prepared=doc.tobytes(garbage=4,deflate=True)
        with fitz.open(stream=prepared,filetype='pdf') as next_doc:
            candidates=[p for p in paragraphs(next_doc[pn]) if norm(p['text'])==norm(selected['text']) and abs(p['bbox'][0]-target.x0)<1 and abs(p['bbox'][1]-target.y0)<1]
            if len(candidates)!=1:raise EngineError('The selected cell could not be matched after row growth.')
            chosen=candidates[0]
        new_params={**params,'table_grow':False,'flow':False,'fit':False,'source_sha256':sha(prepared),'paragraph_id':chosen['id']}
        region=fitz.Rect(left,target.y0,right,cell.y1+delta-3)
        output,report=edit_paragraph(prepared,new_params,region_override=region)
        with fitz.open(stream=output,filetype='pdf') as final:
            if field_state(final)!=fields or not outside_pixels_unchanged(before,final[pn].get_pixmap(alpha=False,annots=True),expanded,fitz.Matrix(1,0,0,1,0,0)):
                raise EngineError('Table layout verification failed. No changes were committed.')
        report.update(source_sha256=sha(data),table_row_grown=True,row_height_increase=round(delta,2),table_bbox=list(expanded))
        return output,report
