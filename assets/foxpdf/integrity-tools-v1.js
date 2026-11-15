/* Engine-backed precise text editing and audited image-only redaction copies. */
(function(){"use strict";
const ready=fn=>document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();
ready(()=>{
const app=window.FoxPDFBridge;if(!app)return;
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const css=document.createElement("link");css.rel="stylesheet";css.href="/fox-assets/integrity-tools-v1.css?v=1.5";document.head.append(css);
let modal=null,lastFocus=null,keyTrap=null,fabState=null,clearHandle=null;
const same=(a,b)=>!!a&&!!b&&a.name===b.name&&a.bytes.length===b.bytes.length&&a.bytes.every((v,i)=>v===b.bytes[i]);
function close(){clearHandle?.();if(keyTrap)document.removeEventListener("keydown",keyTrap,true);keyTrap=null;const fab=document.getElementById("chatFab");if(fabState&&fab){if(fabState.value)fab.style.setProperty("display",fabState.value,fabState.priority);else fab.style.removeProperty("display")}fabState=null,clearHandle=null;modal?.parentElement?.classList.remove("fxi-docked");modal?.remove();modal=null;lastFocus?.focus?.();window.dispatchEvent(new Event("resize"))}
function button(text,action,primary=false){const e=make("button",text,primary?"fxi-primary":"");e.type="button";e.onclick=action;return e}
function field(label,control){const e=make("label");e.append(make("span",label),control);return e}
function select(choices){const e=make("select");for(const [value,label] of choices){const o=make("option",label);o.value=value;e.append(o)}return e}
function dialog(title){
 close();lastFocus=document.activeElement;modal=make("aside",undefined,"fxi-panel");
 const box=make("section",undefined,"fxi-dialog");box.setAttribute("role","region");box.setAttribute("aria-label",title);
 const header=make("header");header.append(make("h2",title),button("Close",close));
 const body=make("div",undefined,"fxi-body"),status=make("p","Ready.","fxi-status");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const tabs=make("nav",undefined,"fxi-tabs");tabs.setAttribute("aria-label","Editor tools");tabs.append(button("Paragraph",()=>paragraph()),button("Find",search),button("Move",()=>moveText()),button("Compare",compare),button("Precise",edit),button("Redact",redact),button("More",()=>processing("ocr")));
 box.append(header,tabs,body,status);modal.append(box);const host=document.querySelector(".fxie-layout");if(!host)throw Error("Open the PDF editor first.");host.classList.add("fxi-docked");host.append(modal);
 const fab=document.getElementById("chatFab");if(fab){fabState={value:fab.style.getPropertyValue("display"),priority:fab.style.getPropertyPriority("display")};fab.style.setProperty("display","none","important")}
 keyTrap=e=>{if(modal&&box.contains(document.activeElement)&&e.key==="Escape"){e.preventDefault();e.stopPropagation();close()}};document.addEventListener("keydown",keyTrap,true);window.dispatchEvent(new Event("resize"));
 header.querySelector("button").focus();return {body,status,box,root:modal};
}
async function request(source,path,operation,params,service="integrity"){
 if(source.bytes.length>20*1024*1024)throw Error("This workflow accepts PDFs smaller than 20 MB.");
 const form=new FormData();form.append("file",new File([source.bytes],source.name,{type:"application/pdf"}));
 if(operation){form.append("operation",operation);form.append("params",JSON.stringify(params||{}))}
 const response=await fetch("/api/"+service+"/"+path,{method:"POST",body:form,credentials:"omit"});
 if(!response.ok){let error="The engine could not finish ("+response.status+").";try{error=(await response.json()).detail||error}catch{}throw Error(error)}return response;
}
function disclosure(body){const detail=make("details");detail.append(make("summary","Processing and privacy"),make("p","Inspect and Apply temporarily upload this PDF to FoxPDF’s processor. Text edits update this document with Undo. Sanitized redaction creates a separate image-only document in the same editor.","fxi-note"));const source=make("a","Engine source and license","fxi-note");source.href="https://github.com/xavieraponteus-source/chisa-game/tree/main/services/foxpdf-integrity";source.target="_blank";source.rel="noopener";detail.append(source);body.append(detail)}
async function installCopy(source,response,suffix){
 const bytes=new Uint8Array(await response.arrayBuffer()),pdf=await PDFLib.PDFDocument.load(bytes.slice());
 if(pdf.getPageCount()!==source.count)throw Error("The returned copy has a different page count. It was not opened.");
 let report={};try{report=JSON.parse(response.headers.get("x-foxpdf-details")||"{}")}catch{}
 const name=source.name.replace(/\.pdf$/i,"")+suffix+".pdf";
 const index=await app.addDocument(name,bytes);await app.select(index);modal?.querySelector("button")?.focus();return report;
}
function reportView(body,report){
 const details=make("details",undefined,"fxi-report");details.append(make("summary","Verification details"));
 const pre=make("pre",JSON.stringify(report,null,2));details.append(pre);
 details.append(button("Download verification report",()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));const a=make("a");a.href=url;a.download="FoxPDF-verification.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),20000)}));body.append(details);
}
async function applyResult(source,response,allowFlow=false){
 const bytes=new Uint8Array(await response.arrayBuffer());let report={};try{report=JSON.parse(response.headers.get("x-foxpdf-details")||"{}")}catch{}
 const pdf=await PDFLib.PDFDocument.load(bytes.slice()),count=pdf.getPageCount();
 const expected=allowFlow?Number(report.output_page_count):source.count;
 if(count!==expected||count<source.count||count>source.count+10)throw Error("The returned page count could not be verified. Nothing was applied.");
 if(!same(source,app.readCurrent()))throw Error("The PDF changed during processing. Your newer edits were kept.");
 if(!window.FoxPDFInteractiveEditor?.commitVerified)throw Error("Refresh FoxPDF to load in-place editing.");
 await window.FoxPDFInteractiveEditor.commitVerified(source,bytes);return report;
}
function edit(){
 const initial=app.readCurrent();if(!initial){app.open();return app.say("Open a PDF, then choose Precise text editing.")}
 const ui=dialog("Precise original-text editing");disclosure(ui.body);
 ui.body.append(make("p","Edit one original text run at a time, including mixed-font paragraphs and right-angle text. The engine reuses its font and checks that rendering outside the selected run stays unchanged. Unsupported layouts are rejected.","fxi-note"));
 const load=button("Inspect text layout",async()=>{load.disabled=true;ui.status.textContent="Inspecting fonts and text runs…";try{
  if(!same(initial,app.readCurrent()))throw Error("The selected document changed. Reopen this tool.");
  const response=await request(initial,"inspect"),info=await response.json();if(modal!==ui.root)return;
  if(info.signed)throw Error("This PDF already has a signature. Use an unsigned copy for editing.");
  const page=select(info.pages.map(p=>[String(p.page),"Page "+p.page])),run=select([]),replacement=make("textarea");replacement.rows=3;replacement.maxLength=2000;
  const fit=make("input");fit.type="checkbox";
  const metadata=make("p",undefined,"fxi-note");
  const chosen=()=>info.pages.find(p=>p.page===Number(page.value))?.runs.find(r=>r.id===run.value);
  const show=()=>{const r=chosen();replacement.value=r?.text||"";metadata.textContent=r?r.font+" · "+r.size.toFixed(1)+" pt · "+r.rotation+"°":"No text runs on this page. Run OCR for scanned pages."};
  const pageChanged=()=>{run.replaceChildren();for(const r of info.pages.find(p=>p.page===Number(page.value))?.runs||[]){const o=make("option",r.text.slice(0,130));o.value=r.id;run.append(o)}show()};
  page.onchange=pageChanged;run.onchange=show;pageChanged();
  const apply=button("Apply to PDF",async()=>{apply.disabled=true;ui.status.textContent="Editing and verifying the saved PDF…";try{
   if(!same(initial,app.readCurrent()))throw Error("The PDF changed. Inspect the current copy again.");
   const r=chosen();if(!r||!r.editable)throw Error("Select a supported text run.");
   const response=await request(initial,"process","edit_run",{source_sha256:info.source_sha256,page:Number(page.value),run_id:r.id,text:replacement.value,fit:fit.checked});
   const report=await applyResult(initial,response);ui.status.textContent="Applied to this PDF. Undo restores the previous version.";reportView(ui.body,report);ui.body.append(button("Edit another text run",edit));
  }catch(e){ui.status.textContent=e.message}finally{apply.disabled=false}},true);
  ui.body.append(field("Page",page),field("Original text run",run),metadata,field("Replacement text",replacement),field("Allow a smaller font to fit the original space (minimum 6 pt)",fit),apply);
  load.remove();ui.status.textContent="Layout inspected. Select an original text run and enter its replacement.";
 }catch(e){ui.status.textContent=e.message;load.disabled=false}},true);ui.body.append(load);
}
function redact(){
 const source=app.readCurrent();if(!source){app.open();return app.say("Open a PDF, then choose High-assurance redaction.")}
 const ui=dialog("Redact and sanitize a copy");disclosure(ui.body);
 ui.body.append(make("p","The processor searches selectable text and performs OCR on every page. It covers detected phrases in rendered pixels, then builds a fresh image-only PDF. The copy contains no original text objects, forms, attachments, comments, links, scripts or document metadata.","fxi-note"));
 const terms=make("textarea");terms.rows=4;terms.placeholder="One exact phrase per line";
 const regions=[],regionList=make("p","No manually marked regions.","fxi-note");
 const mark=button("Mark a region on the PDF",()=>{try{
  clearHandle?.();const pn=app.current()?.page,surface=window.FoxPDFInteractiveEditor.pageSurface(pn);if(!surface)throw Error("Wait for the page to render first.");
  const layer=make("div",undefined,"fxi-redact-layer");surface.sheet.append(layer);clearHandle=()=>{layer.remove();clearHandle=null};let start=null,outline=null;
  const point=e=>{const r=surface.sheet.getBoundingClientRect();return {x:Math.max(0,Math.min(r.width,e.clientX-r.left)),y:Math.max(0,Math.min(r.height,e.clientY-r.top))}};
  layer.onpointerdown=e=>{if(e.pointerType==="mouse"&&e.button!==0)return;e.preventDefault();e.stopPropagation();start=point(e);outline=make("div",undefined,"fxi-redact-outline");layer.append(outline);layer.setPointerCapture(e.pointerId)};
  layer.onpointermove=e=>{if(!start)return;const end=point(e);Object.assign(outline.style,{left:Math.min(start.x,end.x)+"px",top:Math.min(start.y,end.y)+"px",width:Math.abs(end.x-start.x)+"px",height:Math.abs(end.y-start.y)+"px"})};
  layer.onpointercancel=()=>{start=null;clearHandle?.()};layer.onpointerup=e=>{if(!start)return;e.preventDefault();e.stopPropagation();const end=point(e),bbox=[Math.min(start.x,end.x),Math.min(start.y,end.y),Math.max(start.x,end.x),Math.max(start.y,end.y)].map(v=>v/surface.scale);start=null;
   if(bbox[2]-bbox[0]<2||bbox[3]-bbox[1]<2){clearHandle?.();ui.status.textContent="Choose a larger region.";return}
   if(regions.length>=100){clearHandle?.();ui.status.textContent="A maximum of 100 regions is supported.";return}
   regions.push({page:pn,bbox});regionList.textContent=regions.map((r,i)=>(i+1)+". Page "+r.page+" · "+r.bbox.map(Math.round).join(", ")).join("; ");clearHandle?.();ui.status.textContent="Region marked. It will be permanently covered in the sanitized copy; the source is unchanged.";
  };ui.status.textContent="Drag a rectangle over content to remove. Marked coordinates are listed here before export.";
 }catch(e){ui.status.textContent=e.message}});
 const language=select([["eng","English"],["eng+spa","English and Spanish"],["eng+jpn","English and Japanese"]]),dpi=select([["150","150 DPI · smaller file"],["200","200 DPI · sharper text"]]);
 const ack=make("input");ack.type="checkbox";
 ui.body.append(field("Phrases to remove (up to 20)",terms),mark,regionList,button("Clear marked regions",()=>{regions.length=0;clearHandle?.();regionList.textContent="No manually marked regions."}),field("OCR language",language),field("Export resolution",dpi),field("Create an image-only copy without searchable text, editable fields, annotations or existing signatures",ack));
 ui.body.append(make("p","Review every page before sharing. Text recognition may miss content; the report lists detected matches. If a requested phrase has no matches or OCR fails, no copy is exported.","fxi-note"));
 const run=button("Create sanitized copy",async()=>{run.disabled=true;ui.status.textContent="Recognizing, redacting and rebuilding pages…";try{
  if(!ack.checked)throw Error("Acknowledge the image-only export before continuing.");
  if(!same(source,app.readCurrent()))throw Error("The selected document changed. Reopen this tool.");
  const phrases=[...new Set(terms.value.split(/\r?\n/).map(t=>t.trim()).filter(Boolean))];if((!phrases.length&&!regions.length)||phrases.length>20)throw Error("Enter up to 20 phrases or mark a region.");
  clearHandle?.();const response=await request(source,"process","redact_image_copy",{terms:phrases,rectangles:regions,language:language.value,dpi:Number(dpi.value),allow_signed_copy:ack.checked});
  const report=await installCopy(source,response,"-sanitized");ui.status.textContent="Sanitized copy opened. Source objects and hidden document data were not copied. Review every visible page, then Save PDF.";reportView(ui.body,report);
 }catch(e){ui.status.textContent=e.message}finally{run.disabled=false}},true);
 ui.body.append(run,button("Use standard searchable-text redaction instead",()=>{close();app.advanced("redact")}));
}
function paragraph(selection=null){
 const source=app.readCurrent();if(!source){app.open();return app.say("Open a PDF, then choose Paragraph edit.")}
 const ui=dialog("Edit and reflow a paragraph");disclosure(ui.body);
 ui.body.append(make("p","Rewrite a paragraph here while keeping the PDF visible. Apply updates this document; Undo restores the previous version.","fxi-note"));
 const inspect=button("Inspect paragraphs",async()=>{inspect.disabled=true;ui.status.textContent="Identifying paragraph boundaries and nearby objects…";try{
  if(!same(source,app.readCurrent()))throw Error("The document changed. Reopen this tool.");
  const response=await request(source,"inspect"),info=await response.json();if(modal!==ui.root)return;
  if(info.signed)throw Error("Use an unsigned copy before editing a signed PDF.");
  if(!info.pages.every(p=>Array.isArray(p.paragraphs)))throw Error("The paragraph engine is being upgraded. Refresh FoxPDF shortly and try again.");
  const page=select(info.pages.map(p=>[String(p.page),"Page "+p.page])),choice=select([]),text=make("textarea");text.rows=8;text.maxLength=10000;
  const grow=make("input");grow.type="checkbox";grow.checked=true;
  const fit=make("input");fit.type="checkbox";
  const flow=make("input");flow.type="checkbox";
  const tableGrow=make("input");tableGrow.type="checkbox";
  const styles=make("input");styles.type="checkbox";styles.checked=true;
  const align=select([["left","Left"],["center","Center"],["right","Right"],["justify","Justify"]]),summary=make("p",undefined,"fxi-note");
  const selected=()=>info.pages.find(p=>p.page===Number(page.value))?.paragraphs.find(p=>p.id===choice.value);
  const show=()=>{const p=selected();text.value=p?.text||"";summary.textContent=p?p.line_count+" original lines · "+p.fonts.join(", ")+" · "+Math.round(p.bbox[2]-p.bbox[0])+" pt wide · up to "+Math.round(p.available_bbox[3]-p.bbox[1])+" pt high with safe growth":"No paragraphs found. Run OCR on an image-only PDF first."};
  const changed=()=>{choice.replaceChildren();for(const p of info.pages.find(p=>p.page===Number(page.value))?.paragraphs||[]){const o=make("option",(p.editable?"":"Unsupported · ")+p.text.slice(0,140));o.value=p.id;choice.append(o)}show()};page.onchange=changed;choice.onchange=show;page.value=String(selection?.page||app.current()?.page||1);changed();
  if(selection?.text){const matches=info.pages.find(p=>p.page===Number(page.value))?.paragraphs.filter(p=>p.text.includes(selection.text.trim()))||[];if(matches.length===1){choice.value=matches[0].id;show()}}
  const apply=button("Apply paragraph",async()=>{apply.disabled=true;ui.status.textContent="Wrapping text, saving and checking surrounding content…";try{
   if(!same(source,app.readCurrent()))throw Error("The document changed. Inspect the current copy again.");
   const p=selected();if(!p||!p.editable)throw Error("Choose a supported horizontal paragraph. Use Precise text for rotated runs.");
   if(flow.checked&&tableGrow.checked)throw Error("Choose either continuation pages or table-row growth for this edit.");
   const response=await request(source,"process","edit_paragraph",{source_sha256:info.source_sha256,page:Number(page.value),paragraph_id:p.id,text:text.value,grow:grow.checked,fit:fit.checked,flow:flow.checked,table_grow:tableGrow.checked,preserve_styles:styles.checked,align:align.value});
   const report=await applyResult(source,response,flow.checked);ui.status.textContent="Applied. Undo restores this edit."+(report.continuation_pages?.length?" Continued on added pages "+report.continuation_pages.join(", ")+".":"");reportView(ui.body,report);ui.body.append(button("Move edited paragraph",()=>moveText({page:Number(page.value),text:text.value})),button("Edit another paragraph",()=>paragraph()));
  }catch(e){ui.status.textContent=e.message}finally{apply.disabled=false}},true);
  ui.body.append(field("Page",page),field("Original paragraph",choice),summary,field("Replacement paragraph",text),field("Alignment",align),field("Preserve mixed formatting",styles),field("Grow into free space below",grow),field("Allow smaller text (minimum 6 pt)",fit),field("Continue overflow on new pages at the end",flow),field("Grow a row in a simple white-background table",tableGrow),button("Move this paragraph",()=>moveText({page:Number(page.value),text:selected()?.text})),make("p","Continuation preserves existing pages. Table growth keeps the grid and other cell text, moving later rows only when space is clear; merged, decorated or colored tables are rejected.","fxi-note"),apply);
  inspect.remove();ui.status.textContent="Paragraphs ready. Choose a paragraph and review the replacement before creating a copy.";
 }catch(e){ui.status.textContent=e.message;inspect.disabled=false}},true);ui.body.append(inspect);
}
function processing(kind){
 const source=app.readCurrent();if(!source){app.open();return app.say("Open a PDF first.")}
 const ui=dialog("PDF tools");disclosure(ui.body);
 const tool=select([["ocr","Recognize scanned text (OCR)"],["compress","Compress PDF"],["convert","Export to another format"],["encrypt","Password-protect a download"]]);tool.value=kind;
 const options=make("div");let language,format,password,confirmation;
 const show=()=>{options.replaceChildren();if(tool.value==="ocr"){language=select([["eng","English"],["spa","Spanish"],["jpn","Japanese"]]);options.append(field("Language",language))}if(tool.value==="convert"){format=select([['docx','Word (.docx)'],['xlsx','Excel (.xlsx)'],['pptx','PowerPoint (.pptx)'],['txt','Plain text'],['html','HTML'],['png','PNG images'],['jpg','JPEG images']]);options.append(field("Export format",format))}if(tool.value==="encrypt"){password=make("input");confirmation=make("input");password.type=confirmation.type="password";password.autocomplete=confirmation.autocomplete="new-password";options.append(field("Open password (8–40 characters)",password),field("Confirm password",confirmation));}};
 tool.onchange=show;show();
 const run=button("Run selected tool",async()=>{run.disabled=true;ui.status.textContent="Processing the selected PDF…";try{
  if(!same(source,app.readCurrent()))throw Error("The document changed. Reopen this tool.");
  const op=tool.value,params=op==="ocr"?{language:language.value}:op==="convert"?{format:format.value}:op==="encrypt"?{password:password.value}:{};
  if(op==="encrypt"&&(password.value!==confirmation.value||password.value.length<8||password.value.length>40))throw Error("Enter matching passwords of 8–40 characters.");
  const response=await request(source,"process",op,params,"advanced");
  if(op==="ocr"||op==="compress"){await applyResult(source,response);ui.status.textContent="Applied to this PDF. Undo restores the previous version.";ui.body.append(button("Continue with another tool",()=>processing(op)))}
  else{const blob=await response.blob(),url=URL.createObjectURL(blob),a=make("a");a.href=url;const raw=response.headers.get("content-disposition")||"";a.download=raw.match(/filename="?([^";]+)"?/i)?.[1]||"FoxPDF-export";a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);if(password){password.value="";confirmation.value=""}ui.status.textContent="Download prepared. Your open PDF is unchanged.";}
 }catch(e){ui.status.textContent=e.message}finally{run.disabled=false}},true);
 ui.body.append(field("Tool",tool),options,run);
}
function search(){
 const source=app.readCurrent();if(!source){app.open();return app.say("Open a PDF first.")}
 const ui=dialog("Find and replace original text");disclosure(ui.body);
 const query=make("input"),replacement=make("input"),whole=make("input"),sensitive=make("input"),fit=make("input"),results=select([]);
 query.maxLength=200;replacement.maxLength=2000;whole.type=sensitive.type=fit.type="checkbox";whole.checked=fit.checked=true;
 let found=null,criteria=null;
 const options=()=>({query:query.value,whole:whole.checked,case:sensitive.checked});
 const invalidate=()=>{found=null;results.replaceChildren();one.disabled=all.disabled=true};
 query.oninput=whole.onchange=sensitive.onchange=invalidate;
 const locate=()=>{const hit=found?.matches[Number(results.value)];if(hit)app.setPage(hit.page)};results.onchange=locate;
 const scan=button("Find matches",async()=>{scan.disabled=true;invalidate();ui.status.textContent="Searching selectable text…";try{
  if(!same(source,app.readCurrent()))throw Error("The PDF changed. Reopen Find / Replace.");
  criteria=options();const response=await request(source,"search","search",criteria);const info=await response.json();if(modal!==ui.root)return;found=info;
  for(const h of found.matches){const o=make("option","Page "+h.page+" · "+h.context);o.value=String(h.index);results.append(o)}
  one.disabled=all.disabled=!found.total;locate();ui.status.textContent=found.total+" matches. "+found.scope;
 }catch(e){ui.status.textContent=e.message}finally{scan.disabled=false}},true);
 async function replace(every){one.disabled=all.disabled=scan.disabled=true;ui.status.textContent="Replacing original text and verifying the saved PDF…";try{
  if(!found||!same(source,app.readCurrent()))throw Error("The PDF changed. Search the current PDF again.");
  const response=await request(source,"process","replace_text",{...criteria,source_sha256:found.source_sha256,replacement:replacement.value,all:every,index:Number(results.value),fit:fit.checked});
  const report=await applyResult(source,response);ui.status.textContent=report.replacements+" replacements saved. Original matching text was removed. Undo restores this edit.";reportView(ui.body,report);ui.body.append(button("Search the updated PDF",search));found=null;
 }catch(e){ui.status.textContent=e.message;one.disabled=all.disabled=!found?.total}finally{scan.disabled=false}}
 const one=button("Replace selected match",()=>replace(false)),all=button("Replace all matches",()=>replace(true),true);one.disabled=all.disabled=true;
 ui.body.append(field("Find",query),field("Whole words",whole),field("Match case",sensitive),scan,field("Matches",results),field("Replace with (leave empty to delete)",replacement),field("Fit replacement into original space (minimum 6 pt)",fit),one,all,make("p","This replaces PDF text objects. Scanned pages need OCR first. Phrases split across font changes may require Paragraph editing; rotated or overlapping text is rejected safely.","fxi-note"));
}
function moveText(selection=null){
 const source=app.readCurrent();if(!source){app.open();return app.say("Open a PDF first.")}
 const ui=dialog("Move original text");disclosure(ui.body);
 ui.body.append(make("p","Select a paragraph, then drag its handle on the PDF or choose a destination below. Movement updates actual PDF text and supports Undo. Horizontal text on unrotated pages is supported; overlapping text and fields are rejected.","fxi-note"));
 const inspect=button("Detect movable paragraphs",async()=>{inspect.disabled=true;ui.status.textContent="Detecting paragraphs…";try{
  if(!same(source,app.readCurrent()))throw Error("The PDF changed. Reopen Move text.");
  const info=await (await request(source,"inspect")).json();if(modal!==ui.root)return;
  const page=select(info.pages.map(p=>[String(p.page),"Page "+p.page])),choice=select([]),target=select(info.pages.map(p=>[String(p.page),"Page "+p.page]));
  const x=make("input"),y=make("input");x.type=y.type="number";x.min=y.min="0";x.step=y.step="1";x.value="40";y.value="150";
  const selected=()=>info.pages.find(p=>p.page===Number(page.value))?.paragraphs.find(p=>p.id===choice.value);
  const changed=()=>{clearHandle?.();choice.replaceChildren();for(const p of info.pages.find(p=>p.page===Number(page.value))?.paragraphs||[]){const o=make("option",p.text.slice(0,140));o.value=p.id;choice.append(o)}};
  page.onchange=changed;choice.onchange=()=>clearHandle?.();page.value=String(selection?.page||app.current()?.page||1);changed();target.value=page.value;
  if(selection?.text){const p=info.pages.find(p=>p.page===Number(page.value))?.paragraphs.find(p=>p.text.includes(selection.text.trim()));if(p)choice.value=p.id}
  async function commit(pn,left,top){
   if(!same(source,app.readCurrent()))throw Error("The PDF changed. Select the current paragraph again.");
   const p=selected();if(!p)throw Error("Choose a paragraph first.");
   ui.status.textContent="Moving original text and checking the saved PDF…";
   const response=await request(source,"process","move_text",{source_sha256:info.source_sha256,page:Number(page.value),paragraph_id:p.id,target_page:pn,x:left,y:top});
   const report=await applyResult(source,response);clearHandle?.();await app.setPage(pn);ui.status.textContent="Text moved to page "+pn+". Undo restores its original position.";reportView(ui.body,report);ui.body.append(button("Move another paragraph",()=>moveText()));
  }
  const apply=button("Move to destination",async()=>{apply.disabled=true;try{await commit(Number(target.value),Number(x.value),Number(y.value))}catch(e){ui.status.textContent=e.message}finally{apply.disabled=false}},true);
  const show=button("Show drag handle on PDF",async()=>{show.disabled=true;try{
   clearHandle?.();const p=selected();if(!p?.editable)throw Error("Choose a supported horizontal paragraph.");
   await app.setPage(Number(page.value));await new Promise(resolve=>setTimeout(resolve,300));
   if(modal!==ui.root)return;
   const api=window.FoxPDFInteractiveEditor,surface=api.pageSurface(Number(page.value));if(!surface)throw Error("Wait for the page to render, then try again.");
   const frame=make("div",undefined,"fxi-text-handle");frame.setAttribute("role","group");frame.setAttribute("aria-label","Selected paragraph: drag to move text");
   const grip=make("button","Drag text","fxi-text-grip");grip.type="button";frame.append(grip);
   function position(){frame.style.left=p.bbox[0]*surface.scale+"px";frame.style.top=p.bbox[1]*surface.scale+"px";frame.style.width=(p.bbox[2]-p.bbox[0])*surface.scale+"px";frame.style.height=(p.bbox[3]-p.bbox[1])*surface.scale+"px"}
   position();surface.sheet.append(frame);clearHandle=()=>{frame.remove();clearHandle=null};let drag=null,busy=false;
   frame.onclick=e=>e.stopPropagation();
   grip.onpointerdown=e=>{if(busy||(e.pointerType==="mouse"&&e.button!==0))return;e.preventDefault();e.stopPropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY};grip.setPointerCapture(e.pointerId)};
   grip.onpointermove=e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();frame.style.transform="translate("+(e.clientX-drag.x)+"px,"+(e.clientY-drag.y)+"px)"};
   grip.onpointercancel=()=>{drag=null;frame.style.transform=""};grip.onlostpointercapture=()=>{if(drag){drag=null;frame.style.transform=""}};
   grip.onpointerup=async e=>{if(drag?.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const start=drag;drag=null;
    frame.style.visibility="hidden";const under=document.elementFromPoint(e.clientX,e.clientY);frame.style.visibility="";
    const pn=under?.closest(".fxie-right-edit-sheet")?api.otherPage():under?.closest(".fxie-sheet")?app.current()?.page:0;
    const dest=api.pageSurface(pn);if(!dest){position();frame.style.transform="";ui.status.textContent="Drop inside a visible PDF page.";return}
    const box=dest.sheet.getBoundingClientRect();let left,top;
    if(pn===Number(page.value)){left=p.bbox[0]+(e.clientX-start.x)/surface.scale;top=p.bbox[1]+(e.clientY-start.y)/surface.scale}
    else{left=(e.clientX-box.left)/dest.scale-(p.bbox[2]-p.bbox[0])/2;top=(e.clientY-box.top)/dest.scale}
    busy=true;grip.disabled=true;try{await commit(pn,left,top)}catch(err){frame.style.transform="";position();ui.status.textContent=err.message}finally{busy=false;grip.disabled=false}
   };
   ui.status.textContent="Drag the gold handle. To move between pages, open a second page below, then drag onto it. Destination controls also work with a keyboard.";
  }catch(e){ui.status.textContent=e.message}finally{show.disabled=false}});
  ui.body.append(field("Source page",page),field("Paragraph",choice),show,field("Destination page",target),button("Open destination beside current page",()=>window.FoxPDFInteractiveEditor.openBeside(Number(target.value))),field("Left position in PDF points",x),field("Top position in PDF points",y),apply);inspect.remove();ui.status.textContent="Paragraphs detected. Choose one to move.";
 }catch(e){ui.status.textContent=e.message;inspect.disabled=false}},true);ui.body.append(inspect);
}
function compare(){
 const source=app.readCurrent();if(!source){app.open();return app.say("Open the first PDF before comparing.")}
 const ui=dialog("Compare documents");disclosure(ui.body);
 ui.body.append(make("p","Compare selectable words and visible page changes with another PDF. Pages align by page number. The current PDF stays editable on the left; the selected comparison page appears here.","fxi-note"));
 const docs=app.documents(),choice=select([["file","Choose another PDF file"],...docs.map((d,i)=>[String(d.index??i),d.name])]),file=make("input");file.type="file";file.accept="application/pdf,.pdf";
 choice.onchange=()=>file.hidden=choice.value!=="file";
 const results=make("div"),preview=make("div",undefined,"fxi-compare-preview");let task=null,revision=0;
 const run=button("Compare PDFs",async()=>{run.disabled=true;ui.status.textContent="Comparing text and rendered pages…";try{
  const other=choice.value==="file"?(file.files[0]?{name:file.files[0].name,bytes:new Uint8Array(await file.files[0].arrayBuffer())}:null):app.read(Number(choice.value));
  if(!other)throw Error("Choose the second PDF.");if(source.bytes.length+other.bytes.length>20*1024*1024)throw Error("The two PDFs together must be smaller than 20 MB.");
  const form=new FormData();form.append("file",new File([source.bytes],source.name,{type:"application/pdf"}));form.append("other",new File([other.bytes],other.name,{type:"application/pdf"}));
  const response=await fetch("/api/integrity/compare",{method:"POST",body:form,credentials:"omit"});if(!response.ok){let message="Comparison failed ("+response.status+").";try{message=(await response.json()).detail||message}catch{}throw Error(message)}
  const report=await response.json();if(modal!==ui.root)return;if(!same(source,app.readCurrent()))throw Error("The current PDF changed during comparison. Reopen Compare for the latest version.");results.replaceChildren();preview.replaceChildren();
  const pages=select(report.pages.map(p=>[String(p.page),"Page "+p.page+" · "+p.kind+(p.pixel_difference_percent?" · "+p.pixel_difference_percent+"% pixels changed":"")]));
  const changes=make("div");results.append(field("Comparison page",pages),changes,preview);reportView(results,report);
  const lib=await window.FoxPDFInteractiveEditor.pdfjs();await task?.destroy?.();task=await lib.getDocument({data:other.bytes.slice()}).promise;clearHandle=()=>{revision++;task?.destroy?.();clearHandle=null};
  async function show(){const seq=++revision,p=report.pages.find(p=>p.page===Number(pages.value));changes.replaceChildren();preview.replaceChildren();
   if(same(source,app.readCurrent())&&p.page<=source.count)await app.setPage(p.page);
   for(const c of p.text_changes){const item=make("p",undefined,"fxi-note");item.append(make("strong",c.type+": "),make("span",(c.before||"(nothing)")+" → "+(c.after||"(nothing)")));changes.append(item)}
   if(p.page>report.second_pages){preview.append(make("p","This page is absent from the comparison PDF."));return}
   const page=await task.getPage(p.page),base=page.getViewport({scale:1}),scale=Math.min(1.5,Math.max(200,ui.body.clientWidth-30)/base.width),viewport=page.getViewport({scale});
   const canvas=make("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
   if(seq!==revision||modal!==ui.root)return;preview.append(make("p",other.name+" · page "+p.page,"fxi-note"),canvas);
  }
  pages.onchange=()=>show().catch(e=>ui.status.textContent=e.message);pages.value=String(report.pages.find(p=>p.changed)?.page||1);await show();
  ui.status.textContent=report.changed_pages+" changed pages. "+report.method;
 }catch(e){ui.status.textContent=e.message}finally{run.disabled=false}},true);
 ui.body.append(field("Compare current PDF with",choice),file,run,results);
}
window.FoxPDFIntegrity={open:type=>type==="compare"?compare():type==="search"?search():type==="move"?moveText():type==="redact"?redact():type==="paragraph"?paragraph():["ocr","compress","convert","protect"].includes(type)?processing(type==="protect"?"encrypt":type):edit(),editSelection:selection=>paragraph(selection),sameSource:same};
const bar=document.querySelector(".fxie-barleft");if(bar){bar.append(button("Paragraph edit",paragraph),button("Precise text",edit),button("Redact & sanitize",redact),button("PDF tools",()=>processing("ocr")))}
const convert=document.getElementById("fxieConvert");if(convert)convert.onclick=()=>processing("convert");
const advanced=document.getElementById("fxieAdvanced");if(advanced)advanced.onclick=()=>processing("ocr");
const searchButton=document.getElementById("fxieSearch");if(searchButton)searchButton.onclick=search;
const findButton=document.querySelector(".fxie-find-open");if(findButton){const native=findButton.cloneNode(true);findButton.replaceWith(native);native.onclick=search}
if(bar)bar.append(button("Move text",()=>moveText()),button("Compare PDFs",compare));
const selectedBox=document.getElementById("fxieReplaceBox");if(selectedBox)selectedBox.append(button("Precise original-text editor",edit));
if(selectedBox)selectedBox.append(button("Reflow whole paragraph",paragraph));
});
})();
