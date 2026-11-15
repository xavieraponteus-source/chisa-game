"""Native search/replace and text movement; bounded visual/text document comparison."""
import difflib,math,re
import pymupdf as fitz
from PIL import Image,ImageChops,ImageDraw
from engine import EngineError,open_pdf,sha,norm,resolve_font,field_state,runs

def unchanged_except(before,after,rects,matrix):
    if (before.width,before.height)!=(after.width,after.height):return False
    a=Image.frombytes('RGB',(before.width,before.height),before.samples)
    b=Image.frombytes('RGB',(after.width,after.height),after.samples)
    diff=ImageChops.difference(a,b).convert('L');mask=Image.new('L',a.size,255);draw=ImageDraw.Draw(mask)
    for rect in rects:
        r=fitz.Rect(rect)*matrix
        draw.rectangle((math.floor(r.x0-3),math.floor(r.y0-3),math.ceil(r.x1+3),math.ceil(r.y1+3)),fill=0)
    return ImageChops.multiply(diff,mask).getbbox() is None

def pattern(params):
    query=params.get('query','')
    if not isinstance(query,str) or not query.strip() or len(query)>200 or '\n' in query:raise EngineError('Enter a word or single-line phrase of up to 200 characters.')
    value=re.escape(query)
    if params.get('whole',True):value=r'(?<!\w)'+value+r'(?!\w)'
    return re.compile(value,0 if params.get('case') else re.IGNORECASE)

def matches(doc,regex):
    hits=[]
    for pn,page in enumerate(doc):
        for bi,block in enumerate(page.get_text('rawdict')['blocks']):
            for li,line in enumerate(block.get('lines',[])):
                for si,span in enumerate(line['spans']):
                    chars=span['chars'];text=''.join(c['c'] for c in chars)
                    for found in regex.finditer(text):
                        rect=fitz.Rect(chars[found.start()]['bbox'])
                        for c in chars[found.start()+1:found.end()]:rect|=fitz.Rect(c['bbox'])
                        hits.append({'index':len(hits),'page':pn+1,'run_id':f'{bi}:{li}:{si}','start':found.start(),'end':found.end(),'text':found.group(),'context':text[:220],'bbox':list(rect)})
                        if len(hits)>1000:raise EngineError('More than 1,000 matches. Narrow the search before replacing.')
    return hits

def search_pdf(data,params):
    with open_pdf(data) as doc:
        hits=matches(doc,pattern(params))
        return {'source_sha256':sha(data),'matches':hits,'total':len(hits),'scope':'Selectable text runs. Run OCR first for scanned pages; phrases split across formatting runs may need paragraph editing.'}

def replace_text(data,params):
    if params.get('source_sha256')!=sha(data):raise EngineError('The PDF changed. Search again before replacing.')
    replacement=params.get('replacement','')
    if not isinstance(replacement,str) or len(replacement)>2000 or '\n' in replacement:raise EngineError('Enter a single-line replacement of up to 2,000 characters.')
    with open_pdf(data) as doc:
        if doc.get_sigflags()>0:raise EngineError('Use an unsigned copy before replacing text.')
        hits=matches(doc,pattern(params))
        if not hits:raise EngineError('No matching text remains. Search again.')
        if not params.get('all'):
            try:index=int(params['index']);hits=[hits[index]] if index>=0 else []
            except (KeyError,ValueError,IndexError,TypeError):raise EngineError('Select a current search result.')
            if not hits:raise EngineError('Select a current search result.')
        grouped={}
        for hit in hits:grouped.setdefault((hit['page']-1,hit['run_id']),[]).append(hit)
        plans=[];regions={};before={};matrices={};fields=field_state(doc)
        for (pn,identifier),changes in grouped.items():
            page=doc[pn];s,line=next((s,l) for ident,s,l in runs(page) if ident==identifier)
            if line.get('dir',(1,0))!=(1.0,0.0):raise EngineError('Use precise editing for rotated text runs.')
            rect=fitz.Rect(s['bbox'])
            if any(rect.intersects(w.rect) for w in (page.widgets() or [])):raise EngineError('Use form filling for text inside fields.')
            if any(a.type[0]==fitz.PDF_ANNOT_REDACT for a in (page.annots() or [])):raise EngineError('Apply or remove pending redaction marks first.')
            for ident,other,_ in runs(page):
                if ident!=identifier and (rect&fitz.Rect(other['bbox'])).get_area()>.1:raise EngineError('Overlapping text cannot be replaced safely.')
            text=s['text']
            for hit in reversed(changes):text=text[:hit['start']]+replacement+text[hit['end']:]
            font,buffer,name=resolve_font(doc,page,s['font']);size=s['size']
            if any(not font.has_glyph(ord(c)) for c in text if not c.isspace()):raise EngineError('An original font lacks a replacement character.')
            width=font.text_length(text,fontsize=size)
            if width>rect.width+.25:
                if not params.get('fit',True):raise EngineError('Replacement text does not fit. Enable fit-to-space or edit the paragraph.')
                size*=rect.width/width
                if size<6:raise EngineError('Replacement would be smaller than 6 pt. Edit the paragraph instead.')
            if pn not in before:before[pn]=page.get_pixmap(alpha=False,annots=True);matrices[pn]=fitz.Matrix(page.rotation_matrix)
            regions.setdefault(pn,[]).append(rect);plans.append((pn,s,rect,text,size,buffer,name))
        for pn,rects in regions.items():
            for rect in rects:doc[pn].add_redact_annot(rect,fill=False,cross_out=False)
            doc[pn].apply_redactions(images=0,graphics=0,text=0)
        for pn,s,rect,text,size,buffer,name in plans:
            if buffer:doc[pn].insert_font(fontname=name,fontbuffer=buffer)
            if text:doc[pn].insert_text(s['origin'],text,fontname=name,fontsize=size,color=fitz.sRGB_to_pdf(s['color']),fill_opacity=s.get('alpha',255)/255)
        output=doc.tobytes(garbage=4,deflate=True)
        with fitz.open(stream=output,filetype='pdf') as check:
            if len(check)!=len(doc) or field_state(check)!=fields:raise EngineError('Page or form verification failed.')
            for pn,rects in regions.items():
                if not unchanged_except(before[pn],check[pn].get_pixmap(alpha=False,annots=True),rects,matrices[pn]):raise EngineError('Rendering changed outside the replacements. Nothing was applied.')
            for pn,s,rect,text,*_ in plans:
                if norm(text)!=norm(check[pn].get_textbox(rect+(-1,-1,1,1))):raise EngineError('Saved replacement text could not be verified.')
        return output,{'operation':'replace_text','replacements':len(hits),'native_text_replaced':True,'forms_preserved':True,'surrounding_pixels_unchanged':True,'source_sha256':sha(data),'output_sha256':sha(output)}

def move_text(data,params):
    from layout import paragraphs
    if params.get('source_sha256')!=sha(data):raise EngineError('The PDF changed. Select the text again.')
    with open_pdf(data) as doc:
        if doc.get_sigflags()>0:raise EngineError('Use an unsigned copy before moving text.')
        try:
            pn=int(params['page'])-1;dest=int(params['target_page'])-1
            if min(pn,dest)<0 or max(pn,dest)>=len(doc):raise ValueError()
            source=doc[pn];target=doc[dest];p=next(p for p in paragraphs(source) if p['id']==params['paragraph_id'])
            x=float(params['x']);y=float(params['y'])
            if not math.isfinite(x+y):raise ValueError()
        except (KeyError,ValueError,TypeError,StopIteration):raise EngineError('Select text and a valid destination page/position.')
        if source.rotation or target.rotation or not p['editable']:raise EngineError('Native text dragging currently requires unrotated pages and horizontal text.')
        old=fitz.Rect(p['bbox']);new=fitz.Rect(x,y,x+old.width,y+old.height)
        if not target.rect.contains(new):raise EngineError('The entire text block must fit inside the destination page.')
        members=set(p['_members'])
        for page_no,region in [(pn,old),(dest,new)]:
            page=doc[page_no]
            if any(a.type[0]==fitz.PDF_ANNOT_REDACT for a in (page.annots() or [])):raise EngineError('Apply or remove pending redaction marks first.')
            obstacles=[w.rect for w in (page.widgets() or [])]+[a.rect for a in (page.annots() or [])]+[fitz.Rect(l['from']) for l in page.get_links()]
            for ident,s,_ in runs(page):
                if page_no==pn and ident in members:continue
                obstacles.append(fitz.Rect(s['bbox']))
            if any((region&r).get_area()>.1 for r in obstacles):raise EngineError('The text would overlap another text block, field, link or annotation.')
        before={n:doc[n].get_pixmap(alpha=False,annots=True) for n in set([pn,dest])};fields=field_state(doc)
        spans=[s for l in p['_lines'] for s in l['spans']];fonts={s['font']:resolve_font(doc,source,s['font']) for s in spans}
        for s in spans:source.add_redact_annot(s['bbox'],fill=False,cross_out=False)
        source.apply_redactions(images=0,graphics=0,text=0)
        for font,buffer,name in fonts.values():
            if buffer:target.insert_font(fontname=name,fontbuffer=buffer)
        for s in spans:target.insert_text((s['origin'][0]+x-old.x0,s['origin'][1]+y-old.y0),s['text'],fontname=fonts[s['font']][2],fontsize=s['size'],color=fitz.sRGB_to_pdf(s['color']),fill_opacity=s.get('alpha',255)/255)
        output=doc.tobytes(garbage=4,deflate=True)
        with fitz.open(stream=output,filetype='pdf') as check:
            if field_state(check)!=fields or len(check)!=len(doc):raise EngineError('Page or form verification failed.')
            for n in before:
                allowed=([old] if n==pn else [])+([new] if n==dest else [])
                if not unchanged_except(before[n],check[n].get_pixmap(alpha=False,annots=True),allowed,fitz.Matrix(1,0,0,1,0,0)):raise EngineError('Rendering changed outside the moved text. Nothing was applied.')
            if norm(check[dest].get_textbox(new+(-1,-1,1,1)))!=norm(p['text']):raise EngineError('The moved text could not be verified.')
        return output,{'operation':'move_text','source_page':pn+1,'target_page':dest+1,'bbox':list(new),'fonts_preserved':True,'surrounding_pixels_unchanged':True,'forms_preserved':True,'source_sha256':sha(data),'output_sha256':sha(output)}

def compare_pdfs(first,second):
    pages=[];budget=0
    with open_pdf(first) as a,open_pdf(second) as b:
        for n in range(max(len(a),len(b))):
            if n>=len(a) or n>=len(b):
                pages.append({'page':n+1,'changed':True,'kind':'added' if n>=len(a) else 'removed','text_changes':[]});continue
            p,q=a[n],b[n]
            estimate=max(math.ceil(p.rect.width),math.ceil(q.rect.width))*max(math.ceil(p.rect.height),math.ceil(q.rect.height))
            if estimate>10_000_000 or budget+estimate>50_000_000:raise EngineError('Comparison exceeds the render budget. Split the documents into smaller sections.')
            pa=p.get_pixmap(alpha=False,annots=True);pb=q.get_pixmap(alpha=False,annots=True)
            width=max(pa.width,pb.width);height=max(pa.height,pb.height);budget+=width*height
            if budget>50_000_000:raise EngineError('Comparison exceeds the render budget. Split the documents into smaller sections.')
            ia=Image.new('RGB',(width,height),'white');ib=ia.copy();ia.paste(Image.frombytes('RGB',(pa.width,pa.height),pa.samples),(0,0));ib.paste(Image.frombytes('RGB',(pb.width,pb.height),pb.samples),(0,0))
            diff=ImageChops.difference(ia,ib);channels=diff.split();mask=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2]).point(lambda v:255 if v>24 else 0)
            bbox=mask.getbbox();changed_pixels=mask.histogram()[255]
            ta=norm(p.get_text(sort=True));tb=norm(q.get_text(sort=True));changes=[]
            wa,wb=ta.split(),tb.split()
            if max(len(wa),len(wb))>20000:raise EngineError('A comparison page contains too much text. Split the document first.')
            for op,i,j,k,l in difflib.SequenceMatcher(None,wa,wb,autojunk=True).get_opcodes():
                if op!='equal':changes.append({'type':op,'before':' '.join(wa[i:j])[:600],'after':' '.join(wb[k:l])[:600]})
            dimension_changed=pa.width!=pb.width or pa.height!=pb.height
            pages.append({'page':n+1,'changed':bool(bbox or changes or dimension_changed),'kind':'modified' if bbox or changes or dimension_changed else 'unchanged','visual_bbox':list(bbox) if bbox else None,'pixel_difference_percent':round(changed_pixels/(width*height)*100,3),'dimensions_changed':dimension_changed,'text_changes':changes[:40],'text_changes_truncated':len(changes)>40,'image_only':not ta and not tb})
        return {'source_sha256':sha(first),'comparison_sha256':sha(second),'first_pages':len(a),'second_pages':len(b),'changed_pages':sum(p['changed'] for p in pages),'pages':pages,'method':'Page-number alignment, selectable-text diff and 72-DPI rendered-pixel comparison (channel threshold 24). Metadata, attachments and invisible structure are not compared. Image-only changes are visual; run OCR for word-level comparison.'}
