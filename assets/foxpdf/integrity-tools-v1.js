/* Engine-backed precise text editing and audited image-only redaction copies. */
(function(){"use strict";
const ready=fn=>document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();
ready(()=>{
const app=window.FoxPDFBridge;if(!app)return;
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const css=document.createElement("link");css.rel="stylesheet";css.href="/fox-assets/integrity-tools-v1.css?v=1.0";document.head.append(css);
let modal=null,lastFocus=null,keyTrap=null;
const same=(a,b)=>!!a&&!!b&&a.name===b.name&&a.bytes.length===b.bytes.length&&a.bytes.every((v,i)=>v===b.bytes[i]);
function close(){if(keyTrap)document.removeEventListener("keydown",keyTrap,true);keyTrap=null;modal?.remove();modal=null;lastFocus?.focus?.()}
function button(text,action,primary=false){const e=make("button",text,primary?"fxi-primary":"");e.type="button";e.onclick=action;return e}
function field(label,control){const e=make("label");e.append(make("span",label),control);return e}
function select(choices){const e=make("select");for(const [value,label] of choices){const o=make("option",label);o.value=value;e.append(o)}return e}
function dialog(title){
 close();lastFocus=document.activeElement;modal=make("div",undefined,"fxi-overlay");
 const box=make("section",undefined,"fxi-dialog");box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");box.setAttribute("aria-label",title);
 const header=make("header");header.append(make("h2",title),button("Close",close));
 const body=make("div",undefined,"fxi-body"),status=make("p","Ready.","fxi-status");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 box.append(header,body,status);modal.append(box);document.body.append(modal);
 keyTrap=e=>{if(!modal)return;if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();return}if(e.key==="Tab"){const nodes=[...box.querySelectorAll("button,input,select,textarea,a[href]")].filter(n=>!n.disabled&&!n.hidden);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(!box.contains(document.activeElement)){e.preventDefault();first.focus()}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener("keydown",keyTrap,true);
 header.querySelector("button").focus();return {body,status,box,root:modal};
}
async function request(source,path,operation,params){
 if(source.bytes.length>20*1024*1024)throw Error("This workflow accepts PDFs smaller than 20 MB.");
 const form=new FormData();form.append("file",new File([source.bytes],source.name,{type:"application/pdf"}));
 if(operation){form.append("operation",operation);form.append("params",JSON.stringify(params||{}))}
 const response=await fetch("/api/integrity/"+path,{method:"POST",body:form,credentials:"omit"});
 if(!response.ok){let error="The engine could not finish ("+response.status+").";try{error=(await response.json()).detail||error}catch{}throw Error(error)}return response;
}
function disclosure(body){body.append(make("p","This tool temporarily uploads the selected PDF to FoxPDF’s Railway processor. Your original stays in the workspace; a successful result opens as a separate copy.","fxi-note"));const source=make("a","Processing engine source and license","fxi-note");source.href="https://github.com/xavieraponteus-source/chisa-game/tree/main/services/foxpdf-integrity";source.target="_blank";source.rel="noopener";body.append(source)}
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
  const apply=button("Create edited copy",async()=>{apply.disabled=true;ui.status.textContent="Editing and verifying the saved PDF…";try{
   if(!same(initial,app.readCurrent()))throw Error("The PDF changed. Inspect the current copy again.");
   const r=chosen();if(!r||!r.editable)throw Error("Select a supported text run.");
   const response=await request(initial,"process","edit_run",{source_sha256:info.source_sha256,page:Number(page.value),run_id:r.id,text:replacement.value,fit:fit.checked});
   const report=await installCopy(initial,response,"-precise-edit");ui.status.textContent="Edited copy opened. Original font and surrounding layout verified; review the result, then Save PDF.";reportView(ui.body,report);
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
 const language=select([["eng","English"],["eng+spa","English and Spanish"],["eng+jpn","English and Japanese"]]),dpi=select([["150","150 DPI · smaller file"],["200","200 DPI · sharper text"]]);
 const ack=make("input");ack.type="checkbox";
 ui.body.append(field("Phrases to remove (up to 20)",terms),field("OCR language",language),field("Export resolution",dpi),field("Create an image-only copy without searchable text, editable fields, annotations or existing signatures",ack));
 ui.body.append(make("p","Review every page before sharing. Text recognition may miss content; the report lists detected matches. If a requested phrase has no matches or OCR fails, no copy is exported.","fxi-note"));
 const run=button("Create sanitized copy",async()=>{run.disabled=true;ui.status.textContent="Recognizing, redacting and rebuilding pages…";try{
  if(!ack.checked)throw Error("Acknowledge the image-only export before continuing.");
  if(!same(source,app.readCurrent()))throw Error("The selected document changed. Reopen this tool.");
  const phrases=[...new Set(terms.value.split(/\r?\n/).map(t=>t.trim()).filter(Boolean))];if(!phrases.length||phrases.length>20)throw Error("Enter 1 to 20 exact phrases.");
  const response=await request(source,"process","redact_image_copy",{terms:phrases,language:language.value,dpi:Number(dpi.value),allow_signed_copy:ack.checked});
  const report=await installCopy(source,response,"-sanitized");ui.status.textContent="Sanitized copy opened. Source objects and hidden document data were not copied. Review every visible page, then Save PDF.";reportView(ui.body,report);
 }catch(e){ui.status.textContent=e.message}finally{run.disabled=false}},true);
 ui.body.append(run,button("Use standard searchable-text redaction instead",()=>{close();app.advanced("redact")}));
}
function paragraph(){
 const source=app.readCurrent();if(!source){app.open();return app.say("Open a PDF, then choose Paragraph edit.")}
 const ui=dialog("Edit and reflow a paragraph");disclosure(ui.body);
 ui.body.append(make("p","Rewrite a whole paragraph and wrap it into new lines. Unchanged words retain their original fonts, sizes and colors; new words inherit nearby formatting. Column boundaries, table rules, images and forms constrain the available space. The original PDF remains unchanged.","fxi-note"));
 const inspect=button("Inspect paragraphs",async()=>{inspect.disabled=true;ui.status.textContent="Identifying paragraph boundaries and nearby objects…";try{
  if(!same(source,app.readCurrent()))throw Error("The document changed. Reopen this tool.");
  const response=await request(source,"inspect"),info=await response.json();if(modal!==ui.root)return;
  if(info.signed)throw Error("Use an unsigned copy before editing a signed PDF.");
  if(!info.pages.every(p=>Array.isArray(p.paragraphs)))throw Error("The paragraph engine is being upgraded. Refresh FoxPDF shortly and try again.");
  const page=select(info.pages.map(p=>[String(p.page),"Page "+p.page])),choice=select([]),text=make("textarea");text.rows=8;text.maxLength=10000;
  const grow=make("input");grow.type="checkbox";grow.checked=true;
  const fit=make("input");fit.type="checkbox";
  const styles=make("input");styles.type="checkbox";styles.checked=true;
  const align=select([["left","Left"],["center","Center"],["right","Right"],["justify","Justify"]]),summary=make("p",undefined,"fxi-note");
  const selected=()=>info.pages.find(p=>p.page===Number(page.value))?.paragraphs.find(p=>p.id===choice.value);
  const show=()=>{const p=selected();text.value=p?.text||"";summary.textContent=p?p.line_count+" original lines · "+p.fonts.join(", ")+" · "+Math.round(p.bbox[2]-p.bbox[0])+" pt wide · up to "+Math.round(p.available_bbox[3]-p.bbox[1])+" pt high with safe growth":"No paragraphs found. Run OCR on an image-only PDF first."};
  const changed=()=>{choice.replaceChildren();for(const p of info.pages.find(p=>p.page===Number(page.value))?.paragraphs||[]){const o=make("option",(p.editable?"":"Unsupported · ")+p.text.slice(0,140));o.value=p.id;choice.append(o)}show()};page.onchange=changed;choice.onchange=show;changed();
  const apply=button("Create reflowed preview copy",async()=>{apply.disabled=true;ui.status.textContent="Wrapping text, saving and checking surrounding content…";try{
   if(!same(source,app.readCurrent()))throw Error("The document changed. Inspect the current copy again.");
   const p=selected();if(!p||!p.editable)throw Error("Choose a supported horizontal paragraph. Use Precise text for rotated runs.");
   const response=await request(source,"process","edit_paragraph",{source_sha256:info.source_sha256,page:Number(page.value),paragraph_id:p.id,text:text.value,grow:grow.checked,fit:fit.checked,preserve_styles:styles.checked,align:align.value});
   const report=await installCopy(source,response,"-paragraph-edit");ui.status.textContent="Reflowed copy opened. Surrounding rendering, page count and form values verified. Review the layout, then Save PDF.";reportView(ui.body,report);
  }catch(e){ui.status.textContent=e.message}finally{apply.disabled=false}},true);
  ui.body.append(field("Page",page),field("Original paragraph",choice),summary,field("Replacement paragraph",text),field("Alignment",align),field("Preserve mixed formatting on unchanged words",styles),field("Allow downward growth into verified free space",grow),field("Allow smaller text if needed (minimum 6 pt)",fit),make("p","This tool keeps other objects and pages in place. It blocks overflow instead of moving another column, table row or image. The preview is a separate editable PDF.","fxi-note"),apply);
  inspect.remove();ui.status.textContent="Paragraphs ready. Choose a paragraph and review the replacement before creating a copy.";
 }catch(e){ui.status.textContent=e.message;inspect.disabled=false}},true);ui.body.append(inspect);
}
window.FoxPDFIntegrity={open:type=>type==="redact"?redact():type==="paragraph"?paragraph():edit(),sameSource:same};
const bar=document.querySelector(".fxie-barleft");if(bar){bar.append(button("Paragraph edit",paragraph),button("Precise text",edit),button("Redact & sanitize",redact))}
const selectedBox=document.getElementById("fxieReplaceBox");if(selectedBox)selectedBox.append(button("Precise original-text editor",edit));
if(selectedBox)selectedBox.append(button("Reflow whole paragraph",paragraph));
});
})();
