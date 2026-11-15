"""Native paragraph reflow. Existing objects outside the paragraph stay in place."""
import difflib, math, re, unicodedata
from collections import Counter
import pymupdf as fitz
from engine import EngineError, open_pdf, sha, norm, resolve_font, field_state, outside_pixels_unchanged, ensure_visible_text, original_ink_bounds, runs


def paragraphs(page):
    # PDF producers often put each line in a different block. Group spatially, with
    # conservative column/leading checks rather than trusting producer block IDs.
    result=[];groups=[];lines=[];rules=[]
    for drawing in page.get_drawings():
        if drawing.get("color") is None:continue
        for item in drawing["items"]:
            if item[0]=="l" and abs(item[1].y-item[2].y)<.5:
                rules.append((min(item[1].x,item[2].x),max(item[1].x,item[2].x),item[1].y))
            elif item[0]=="re":
                r=item[1];rules.extend([(r.x0,r.x1,r.y0),(r.x0,r.x1,r.y1)])
    for bi,block in enumerate(page.get_text("dict")["blocks"]):
        for li,line in enumerate(block.get("lines",[])):
            if not any(s.get("text","").strip() for s in line["spans"]):continue
            lines.append((bi,li,line))
    for bi,li,line in sorted(lines,key=lambda x:(x[2]["bbox"][1],x[2]["bbox"][0])):
        b=fitz.Rect(line["bbox"]);candidate=None
        for group in reversed(groups):
            previous=group[-1][2];a=fitz.Rect(previous["bbox"]);size=max(s["size"] for s in previous["spans"])
            next_size=max(s["size"] for s in line["spans"]);overlap=min(a.x1,b.x1)-max(a.x0,b.x0)
            separated=any(a.y1<y<b.y0 and min(a.x1,x1)>max(a.x0,x0) for x0,x1,y in rules)
            if not separated and size*.5<b.y0-a.y0<=size*1.9 and b.y0-a.y1<=size*.95 and abs(b.x0-a.x0)<=size*1.5 and overlap>min(a.width,b.width)*.5 and .9<next_size/size<1.1:
                candidate=group;break
        if candidate is None:candidate=[];groups.append(candidate)
        candidate.append((bi,li,line))
    for group in groups:
            rect=fitz.Rect(group[0][2]["bbox"]);text="";styles=[];members=[]
            for bi,li,line in group:
                if text:text+=" ";styles.append(styles[-1])
                rect|=fitz.Rect(line["bbox"])
                baseline=max(s["origin"][1] for s in line["spans"])
                for si,span in enumerate(line["spans"]):
                    span={**span,"_rise":span["origin"][1]-baseline}
                    value=span.get("text","").replace("\u00a0"," ")
                    text+=value;styles.extend([span]*len(value));members.append(f"{bi}:{li}:{si}")
            horizontal=all(abs(l.get("dir",(1,0))[0]-1)<.001 and abs(l.get("dir",(1,0))[1])<.001 for _,_,l in group)
            result.append({"id":f"{group[0][0]}:{group[0][1]}","text":text,"bbox":list(rect),"line_count":len(group),
                           "editable":horizontal,"_styles":styles,"_members":members,"_lines":[l for _,_,l in group]})
    return result


def safe_region(page, paragraph, grow=False):
    original=fitz.Rect(paragraph["bbox"]);region=fitz.Rect(original)
    unrotated=page.rect*page.derotation_matrix
    if grow:region.y1=max(original.y1,min(original.y1+200,unrotated.y1-18))
    obstacles=[]
    members=set(paragraph["_members"])
    for bi,block in enumerate(page.get_text("dict")["blocks"]):
        for li,line in enumerate(block.get("lines",[])):
            for si,span in enumerate(line["spans"]):
                if f"{bi}:{li}:{si}" not in members and span.get("text","").strip():obstacles.append(fitz.Rect(span["bbox"]))
    obstacles += [fitz.Rect(item["bbox"]) for item in page.get_image_info()]
    obstacles += [w.rect for w in (page.widgets() or [])]
    obstacles += [fitz.Rect(link["from"]) for link in page.get_links()]
    obstacles += [a.rect for a in (page.annots() or []) if a.type[0]!=fitz.PDF_ANNOT_REDACT]
    # Stroked table-cell borders and rules are hard boundaries. Filled backgrounds stay intact.
    for drawing in page.get_drawings():
        if drawing.get("color") is None:continue
        for item in drawing["items"]:
            if item[0]=="l":
                a,b=item[1:3]
                if abs(a.y-b.y)<.5:obstacles.append(fitz.Rect(min(a.x,b.x),a.y-.5,max(a.x,b.x),a.y+.5))
            elif item[0]=="re":
                r=fitz.Rect(item[1]);obstacles += [fitz.Rect(r.x0,r.y0-.5,r.x1,r.y0+.5),fitz.Rect(r.x0,r.y1-.5,r.x1,r.y1+.5)]
    for obstacle in obstacles:
        if min(region.x1,obstacle.x1)-max(region.x0,obstacle.x0) <= .1:continue
        if obstacle.y0>=original.y1-.1:region.y1=min(region.y1,max(original.y1,obstacle.y0-2))
        elif (original&obstacle).get_area()>.1:
            raise EngineError("This paragraph overlaps another object. Select a smaller text run instead.")
    return region


def inspect_paragraphs(page):
    output=[]
    for p in paragraphs(page):
        item={k:v for k,v in p.items() if not k.startswith("_")}
        item["fonts"]=list(dict.fromkeys(s["font"] for s in p["_styles"]))
        first=p["_styles"][0]
        item["font_size"]=first["size"];item["color"]=first["color"]
        item["bold"]=bool(first.get("flags",0)&16);item["italic"]=bool(first.get("flags",0)&2)
        try:item["available_bbox"]=list(safe_region(page,p,True))
        except EngineError:item["editable"]=False;item["available_bbox"]=item["bbox"]
        output.append(item)
    return output


def styled_replacement(old, styles, text, preserve=True):
    counts=Counter(id(s) for s in styles);dominant=max(styles,key=lambda s:counts[id(s)])
    mapped=[dominant]*len(text)
    if preserve:
        for kind,i,j,a,b in difflib.SequenceMatcher(None,old,text,autojunk=False).get_opcodes():
            if kind=="equal":mapped[a:b]=styles[i:j]
            elif kind in ("replace","insert"):
                inherited=styles[min(i,len(styles)-1)] if i<len(styles) else styles[-1]
                mapped[a:b]=[inherited]*(b-a)
    return mapped


def edit_paragraph(data, params, region_override=None):
    if params.get("source_sha256")!=sha(data):raise EngineError("The document changed. Inspect the current copy again.")
    if params.get("table_grow"):
        from tables import edit_growing_table
        return edit_growing_table(data,params)
    text=params.get("text","")
    if not isinstance(text,str) or len(text)>10000:raise EngineError("Enter up to 10,000 characters.")
    text=text.replace("\r\n","\n").replace("\r","\n").replace("\t","    ")
    if any(unicodedata.bidirectional(c) in ("R","AL","AN","RLE","RLO","RLI") for c in text):
        raise EngineError("Right-to-left paragraph shaping is not supported by this reflow tool yet.")
    align=params.get("align","left")
    if align not in ("left","center","right","justify"):raise EngineError("Choose a supported alignment.")
    with open_pdf(data) as doc:
        if doc.get_sigflags()>0:raise EngineError("Editing would invalidate an existing signature. Use an unsigned copy.")
        try:
            pn=int(params["page"])-1
            if pn<0 or pn>=len(doc):raise ValueError()
            page=doc[pn];p=next(p for p in paragraphs(page) if p["id"]==params["paragraph_id"])
        except (KeyError,ValueError,StopIteration,TypeError):raise EngineError("Inspect and select the current paragraph again.")
        if not p["editable"]:raise EngineError("Use precise text editing for rotated text runs.")
        ensure_visible_text(page,p['bbox'])
        if any(a.type[0]==fitz.PDF_ANNOT_REDACT for a in (page.annots() or [])):
            raise EngineError("Apply or remove existing redaction marks first.")
        try:
            font_scale=float(params.get("font_scale",1))
            if not math.isfinite(font_scale) or not .25<=font_scale<=4:raise ValueError()
        except (ValueError,TypeError):raise EngineError("Text size must be between 25% and 400%.")
        if min(s["size"] for s in p["_styles"])*font_scale<6:raise EngineError("Text must stay at least 6 points.")
        adjusted={**p,"bbox":list(p["bbox"])}
        adjusted["bbox"][2]=min((page.rect*page.derotation_matrix).x1-2,p["bbox"][0]+(p["bbox"][2]-p["bbox"][0])*max(1,font_scale))
        region=safe_region(page,adjusted,bool(params.get("grow")))
        if region_override is not None:region=fitz.Rect(region_override)
        styles=styled_replacement(p["text"],p["_styles"],text,params.get("preserve_styles",True))
        scaled={}
        styles=[scaled.setdefault(id(s),{**s,"size":s["size"]*font_scale,"_rise":s.get("_rise",0)*font_scale}) for s in styles]
        fonts={}
        for s in styles:
            if s["font"] not in fonts:fonts[s["font"]]=resolve_font(doc,page,s["font"])
        if any(not fonts[s["font"]][0].has_glyph(ord(c)) for c,s in zip(text,styles) if not c.isspace()):
            raise EngineError("An original font lacks replacement characters. No edited copy was created.")
        page_size=page.rect*page.derotation_matrix
        continuation=fitz.Rect(region.x0,54,region.x1,page_size.y1-54)
        def layout(scale,flow=False):
            units=[]
            for match in re.finditer(r"\n|[^\S\n]+|[^\s]+",text):
                segment=[(c,styles[i]) for i,c in enumerate(text[match.start():match.end()],match.start())]
                units.append(segment)
            rows=[];current=[];width=0
            for unit in units:
                if unit[0][0]=="\n":rows.append((current,width,True));current=[];width=0;continue
                measure=sum(fonts[s["font"]][0].text_length(c,fontsize=s["size"]*scale) for c,s in unit)
                if measure>region.width+.1:raise EngineError("A word exceeds the paragraph width. Shorten it or use a wider source paragraph.")
                if current and width+measure>region.width+.1 and not unit[0][0].isspace():
                    while current and current[-1][0].isspace():
                        c,s=current.pop();width-=fonts[s["font"]][0].text_length(c,fontsize=s["size"]*scale)
                    rows.append((current,width,False));current=[];width=0
                if not current and unit[0][0].isspace():continue
                current.extend(unit);width+=measure
            if current:rows.append((current,width,True))
            placed=[];y=region.y0;part=0;area=region
            for row_index,(row,width,hard) in enumerate(rows):
                if not row:y+=max(s["size"] for s in styles)*scale*1.25;continue
                ascent=max((s.get("ascender",fonts[s["font"]][0].ascender)*s["size"]-s.get("_rise",0))*scale for _,s in row)
                descent=max((-s.get("descender",fonts[s["font"]][0].descender)*s["size"]+s.get("_rise",0))*scale for _,s in row)
                baseline=y+ascent
                if baseline+descent>area.y1+.25:
                    if not flow:return None
                    part+=1;area=continuation;y=area.y0;baseline=y+ascent
                    if part>10 or len(doc)+part>100 or baseline+descent>area.y1:raise EngineError("The paragraph exceeds the continuation-page limit.")
                x=area.x0+(max(0,area.width-width)/2 if align=="center" else max(0,area.width-width) if align=="right" else 0)
                spaces=sum(c==" " for c,_ in row)
                extra=(region.width-width)/spaces if align=="justify" and not hard and spaces else 0
                for c,s in row:
                    advance=fonts[s["font"]][0].text_length(c,fontsize=s["size"]*scale)
                    placed.append((part,x,baseline+s.get("_rise",0)*scale,c,s));x+=advance+(extra if c==" " else 0)
                y+=max(ascent+descent,max(s["size"] for _,s in row)*scale*1.25)
            return placed,len(rows)
        scale=1.0;plan=layout(scale)
        if plan is None and params.get("fit"):
            for step in range(99,49,-1):
                scale=step/100
                if min(s["size"] for s in styles)*scale<6:break
                plan=layout(scale)
                if plan is not None:break
        if plan is None and params.get("flow"):
            scale=1.0;plan=layout(scale,True)
        if plan is None:raise EngineError("The paragraph does not fit. Allow safe downward growth or smaller text, or shorten the replacement.")
        verification_region=fitz.Rect(region)
        for identifier,span,_ in runs(page):
            if identifier in p['_members']:
                original_font=resolve_font(doc,page,span['font'])[0]
                verification_region|=original_ink_bounds(page,identifier,original_font)
        before=page.get_pixmap(alpha=False,annots=True);fields=field_state(doc);rotation_matrix=fitz.Matrix(page.rotation_matrix)
        # Remove only selected original span rectangles, never images or background graphics.
        for line in p["_lines"]:
            for span in line["spans"]:page.add_redact_annot(span["bbox"],fill=False,cross_out=False)
        page.apply_redactions(images=0,graphics=0,text=0)
        original_count=len(doc);extra_pages=max((item[0] for item in plan[0]),default=0)
        for _ in range(extra_pages):doc.new_page(width=page_size.width,height=page_size.height)
        targets=[pn]+list(range(original_count,len(doc)))
        for target in targets:
            for font,buffer,name in fonts.values():
                if buffer:doc[target].insert_font(fontname=name,fontbuffer=buffer)
        # Merge adjacent characters of one style back into native PDF text strings.
        groups=[]
        for part,x,y,c,s in plan[0]:
            if groups:
                g=groups[-1]
                expected=g[1]+fonts[s["font"]][0].text_length(g[3],fontsize=s["size"]*scale) if g[4] is s else -1
                if g[0]==part and g[4] is s and abs(g[2]-y)<.01 and abs(expected-x)<.01:g[3]+=c;continue
            groups.append([part,x,y,c,s])
        for part,x,y,value,s in groups:
            doc[targets[part]].insert_text((x,y),value,fontname=fonts[s["font"]][2],fontsize=s["size"]*scale,
                             color=fitz.sRGB_to_pdf(s["color"]),fill_opacity=s.get("alpha",255)/255)
        output=doc.tobytes(garbage=4,deflate=True)
        if len(output)>40*1024*1024:raise EngineError("The edited PDF exceeds 40 MB. Split the document first.")
        with fitz.open(stream=output,filetype="pdf") as check:
            if len(check)!=original_count+extra_pages or field_state(check)!=fields:raise EngineError("Page or form verification failed.")
            if not outside_pixels_unchanged(before,check[pn].get_pixmap(alpha=False,annots=True),verification_region,rotation_matrix):
                raise EngineError("Rendering changed outside the paragraph. No edited copy was created.")
            actual=norm(check[pn].get_textbox(region+(-1,-1,1,1)))
            for target in targets[1:]:actual+=" "+norm(check[target].get_text())
            # Extraction can introduce line/space boundaries; compare visible non-whitespace text.
            if re.sub(r"\s+","",norm(text))!=re.sub(r"\s+","",actual):
                raise EngineError("The saved paragraph text could not be verified. No edited copy was created.")
        report={"operation":"edit_paragraph","page":pn+1,"line_count":plan[1],"font_scale":scale,
                       "styles_preserved":bool(params.get("preserve_styles",True)),"fonts_reused":list(fonts),
                       "surrounding_pixels_unchanged":True,"forms_preserved":True,"page_count_preserved":extra_pages==0,
                       "output_page_count":len(doc),"continuation_pages":[i+1 for i in targets[1:]],
                       "paragraph_bbox":list(region),"source_sha256":sha(data),"output_sha256":sha(output)}

        if params.get("position") is not None:
            if extra_pages or params.get("table_grow"):raise EngineError("Finish continuation or table growth before moving text.")
            if text.strip():
                from operations import move_text
                with fitz.open(stream=output,filetype="pdf") as placed:
                    matches=[q for q in paragraphs(placed[pn]) if re.sub(r"\s+","",norm(q["text"]))==re.sub(r"\s+","",norm(text)) and (fitz.Rect(q["bbox"])&region).get_area()>0]
                    if len(matches)!=1:raise EngineError("The edited paragraph could not be selected safely for movement.")
                    q=matches[0]
                pos=params["position"]
                if not isinstance(pos,dict):raise EngineError("Choose a valid text position.")
                output,moved=move_text(output,{"source_sha256":sha(output),"page":pn+1,"paragraph_id":q["id"],"target_page":pn+1,"x":pos.get("x"),"y":pos.get("y")})
                report["moved_bbox"]=moved["bbox"];report["output_sha256"]=sha(output)
        report["requested_font_scale"]=font_scale
        return output,report
