/* FoxPDF Studio Pro Workspace v5 — browser-backed PDF tools */
(function(){
"use strict";
function onReady(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
onReady(()=>{
const bridge=window.FoxPDFBridge;
if(!bridge){console.warn("FoxPDF Pro tools: existing PDF engine unavailable");return}
const lib=()=>window.PDFLib;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const docList=()=>bridge.documents();
const cur=()=>bridge.current();
const need=()=>{if(!cur()){bridge.say("Open a PDF first and I can help with that. 🌸");bridge.open();return false}return true};
const error=e=>{const t=e?.message||String(e);bridge.say("I couldn't safely complete that operation: "+t);console.error("FoxPDF tool error",e)};
const hold=async(fn)=>{try{await fn()}catch(e){error(e)}};
let overlay=null;
function close(){overlay?.remove();overlay=null;document.body.classList.remove("fxp-dialog-open")}
function modal(title,subtitle,body,buttons=[]){
close();overlay=document.createElement("div");overlay.className="fxp-backdrop";overlay.innerHTML='<section role="dialog" aria-modal="true" aria-label="'+esc(title)+'" class="fxp-modal"><header class="fxp-head"><div><small>FOXPDF STUDIO · PRO TOOLS</small><h2>'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div><button type="button" class="fxp-close" aria-label="Close dialog">✕</button></header><div class="fxp-body">'+body+'</div><footer class="fxp-foot"><span>Changes affect your open workspace copy. Download to save.</span><div class="fxp-actions"></div></footer></section>';
document.body.appendChild(overlay);document.body.classList.add("fxp-dialog-open");
overlay.querySelector(".fxp-close").onclick=close;
overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)close()});
let actions=overlay.querySelector(".fxp-actions");
buttons.forEach(({label,act,primary})=>{const b=document.createElement("button");b.type="button";b.className=primary?"fxp-primary":"";b.textContent=label;b.onclick=()=>hold(async()=>{b.disabled=true;try{await act()}finally{if(b.isConnected)b.disabled=false}});actions.appendChild(b)});
overlay.querySelector("input,select,button.fxp-primary,button")?.focus();
return overlay}
function field(id){return overlay?.querySelector("#"+id)}
function say(text){bridge.say(text)}
async function pdf(){if(!need())throw Error("No PDF selected");if(!lib())throw Error("PDF editor library is still loading");return lib().PDFDocument.load(bridge.bytes())}
async function commit(p,name){const bytes=new Uint8Array(await p.save({useObjectStreams:true}));await bridge.replace(bytes,name);say("Done! Your updated PDF is ready. Review it, then choose Save PDF to download.");close()}
function getPage(p,n){const i=Number(n)-1;if(!Number.isInteger(i)||i<0||i>=p.getPageCount())throw Error("Page is outside this document");return p.getPage(i)}
function pageOptions(){return (cur()?.pages||1)}
function choosePage(value){return '<label>Page <input id="'+value+'" type="number" min="1" max="'+pageOptions()+'" value="'+(cur()?.page||1)+'"></label>'}
function notify(type){if(type==="compare")return compare();if(type==="batch")return batch();if(type==="annotate")return annotate();if(type==="sign")return sign();if(type==="forms")return forms();if(type==="metadata")return metadata();if(type==="attach")return attach();if(type==="search")return search();if(type==="flatten")return flatten();if(type==="tools")return tools();if(type==="print")return print();return bridge.say("That tool is not available in this browser edition yet.")}
window.FoxPDFPro={open:notify,available:["compare","batch","annotate","sign","forms","metadata","attach","search","flatten","print"]};
function tools(){
modal("More PDF tools","Choose an operation to open a guided workspace.",'<div class="fxp-feature-grid">'+[
["annotate","✎","Markup & notes","Highlight, underline, strike through, draw shapes or add a note"],
["compare","◫","Compare PDFs","Compare the extracted text of two open documents"],
["batch","▤","Batch processor","Rotate, number, watermark, optimize, or flatten several PDFs"],
["forms","☑","Create form fields","Add actual fillable text boxes and checkboxes"],
["sign","✍","Draw signature","Handwrite and place a visual signature on your PDF"],
["metadata","▧","Document properties","Update title, author, subject and keywords"],
["attach","⌁","Attach a file","Embed a file as a PDF attachment"],
["search","⌕","Search document","Find text and jump to matching pages"],
["flatten","▣","Flatten forms","Turn existing form fields into fixed page content"],
["print","⎙","Print PDF","Open your current document for printing"]
].map(([key,ico,name,desc])=>'<button type="button" data-fxp="'+key+'"><b>'+ico+' '+name+'</b><span>'+desc+'</span></button>').join("")+'</div>');
overlay.querySelectorAll("[data-fxp]").forEach(b=>b.onclick=()=>notify(b.dataset.fxp))}
async function ensurePdfJs(){
if(window.pdfjsLib)return window.pdfjsLib;
if(!window._foxPdfJsPromise)window._foxPdfJsPromise=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";s.onload=()=>{const p=window.pdfjsLib;if(!p){reject(Error("PDF text engine unavailable"));return}p.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";resolve(p)};s.onerror=()=>reject(Error("Could not load PDF text engine"));document.head.appendChild(s)});
return window._foxPdfJsPromise}
async function textPages(data){
const pdfjs=await ensurePdfJs();
const reader=await pdfjs.getDocument({data:new Uint8Array(data)}).promise;
const all=[];
try{for(let i=1;i<=reader.numPages;i++){
 const pg=await reader.getPage(i),content=await pg.getTextContent(),line=[];
 for(const item of content.items){if(item.str)line.push(item.str);if(item.hasEOL)line.push("\n")}
 all.push(line.join(" ").replace(/ *\n */g,"\n").replace(/[ \t]{2,}/g," ").trim());
}}finally{reader.destroy?.()}
return all}
function excerpt(t){return t.length>420?t.slice(0,420)+"…":t}
async function compare(){
const docs=docList();if(docs.length<2){bridge.say("Please open at least two PDFs to compare. I can open the file picker.");bridge.open();return}
const choices=docs.map((d,i)=>'<option value="'+i+'">'+esc(d.name)+'</option>').join("");
modal("Compare PDF documents","See page-by-page text changes in two PDFs. Visual or image-only changes may not be detected.",'<div class="fxp-two"><label>Original PDF<select id="fxpA">'+choices+'</select></label><label>Revised PDF<select id="fxpB">'+choices+'</select></label></div><div id="fxpCompare" class="fxp-results">Choose two files and select Compare.</div>',[{label:"Compare documents",primary:true,act:async()=>{
const ai=Number(field("fxpA").value),bi=Number(field("fxpB").value);if(ai===bi)throw Error("Choose two different PDFs");
const [aa,bb]=[bridge.read(ai),bridge.read(bi)];if(!aa||!bb)throw Error("File not found");
field("fxpCompare").textContent="Analyzing text on both documents…";
const [a,b]=await Promise.all([textPages(aa.bytes),textPages(bb.bytes)]);
const count=Math.max(a.length,b.length),diff=[];
for(let i=0;i<count;i++){let old=a[i]||"",newer=b[i]||"";if(old.replace(/\s+/g," ").trim()===newer.replace(/\s+/g," ").trim())continue;diff.push({page:i+1,before:old,after:newer})}
const el=field("fxpCompare");el.replaceChildren();
const summary=document.createElement("p");summary.className="fxp-summary";summary.textContent=diff.length+" of "+count+" pages have different extracted text.";el.append(summary);
if(!diff.length){const same=document.createElement("p");same.textContent="No text differences detected. This does not guarantee identical formatting or images.";el.append(same)}
diff.slice(0,80).forEach(x=>{const box=document.createElement("div");box.className="fxp-diff";const title=document.createElement("strong");title.textContent="Page "+x.page;box.append(title);
for(const [label,textValue] of [["Original:",x.before],["Revised:",x.after]]){const part=document.createElement("p");part.textContent=label+" "+(excerpt(textValue)||"(no text)");box.append(part)}el.append(box)});
const exportButton=document.createElement("button");exportButton.textContent="Download text comparison";exportButton.className="fxp-export";exportButton.onclick=()=>{const textReport="FoxPDF comparison: "+aa.name+" vs "+bb.name+"\nPages with text differences: "+diff.length+"\n\n"+diff.map(d=>"PAGE "+d.page+"\nOLD:\n"+d.before+"\nNEW:\n"+d.after).join("\n\n");download(new TextEncoder().encode(textReport),"FoxPDF-comparison.txt","text/plain")};el.prepend(exportButton);
}}]);field("fxpB").value=String(Math.min(1,docs.length-1))}
function download(bytes,name,mime){const blob=new Blob([bytes],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000)}
async function jszip(){
if(window.JSZip)return window.JSZip;
if(!window._foxZipPromise)window._foxZipPromise=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";s.onload=()=>window.JSZip?resolve(window.JSZip):reject(Error("Batch ZIP library missing"));s.onerror=()=>reject(Error("Could not load ZIP library"));document.head.appendChild(s)});
return window._foxZipPromise}
async function batch(){
const docs=docList();if(!docs.length){bridge.open();bridge.say("Open the PDFs you want to batch process.");return}
modal("Batch PDF processor","Select files and an operation. The output is one ZIP download; originals stay unchanged.",
'<div class="fxp-checklist">'+docs.map((d,i)=>'<label><input type="checkbox" data-fxp-doc="'+i+'" checked><span>'+esc(d.name)+'</span><small>'+d.pages+' pages</small></label>').join("")+'</div><div class="fxp-two"><label>Operation<select id="fxpBatchAction"><option value="rotate">Rotate all pages 90° clockwise</option><option value="number">Add page numbers</option><option value="watermark">Add watermark</option><option value="optimize">Optimize PDF structure (lossless)</option><option value="flatten">Flatten fillable form fields</option></select></label><label>Watermark text<input id="fxpBatchMark" value="CONFIDENTIAL" maxlength="60"></label></div><p id="fxpBatchProgress" class="fxp-muted">Select Process to create your ZIP.</p>',
[{label:"Process selected PDFs",primary:true,act:async()=>{
const indexes=[...overlay.querySelectorAll("[data-fxp-doc]:checked")].map(i=>Number(i.dataset.fxpDoc));if(!indexes.length)throw Error("Select at least one PDF");
const action=field("fxpBatchAction").value,watermark=field("fxpBatchMark").value||"DRAFT",ZIP=await jszip(),zip=new ZIP();
for(let i=0;i<indexes.length;i++){const f=bridge.read(indexes[i]);if(!f)continue;field("fxpBatchProgress").textContent="Processing "+(i+1)+" of "+indexes.length+": "+f.name;
const p=await lib().PDFDocument.load(f.bytes);
for(const [n,pg] of p.getPages().entries()){
if(action==="rotate")pg.setRotation(lib().degrees((pg.getRotation().angle+90)%360));
if(action==="number")pg.drawText((n+1)+" / "+p.getPageCount(),{x:25,y:22,size:9,color:lib().rgb(.28,.24,.2)});
if(action==="watermark")pg.drawText(watermark.slice(0,60),{x:pg.getWidth()*.16,y:pg.getHeight()*.48,size:Math.max(16,Math.min(53,pg.getWidth()*.07)),opacity:.2,color:lib().rgb(.5,.37,.16),rotate:lib().degrees(28)});
}
if(action==="flatten"){try{p.getForm().flatten()}catch(_){}}
const bytes=await p.save({useObjectStreams:true});zip.file((f.name.replace(/\.pdf$/i,"").replace(/[<>:"|?*\\/]/g,"_").slice(0,75)||"document")+"-"+(i+1)+".pdf",bytes)}
field("fxpBatchProgress").textContent="Packing files…";
const zipped=await zip.generateAsync({type:"uint8array",compression:"DEFLATE"});
download(zipped,"FoxPDF-batch-"+action+".zip","application/zip");
bridge.say("Batch complete! Downloaded "+indexes.length+" processed PDF(s) inside a ZIP. Originals were not changed.");
close()
}}])}
async function forms(){
if(!need())return;
modal("Create fillable form field","Creates a real interactive AcroForm field, not just text drawn on the page.",'<div class="fxp-two"><label>Field name<input id="fxpFieldName" maxlength="80" value="Full name" required></label><label>Field type<select id="fxpFieldType"><option value="text">Text box</option><option value="checkbox">Checkbox</option><option value="dropdown">Dropdown</option></select></label>'+choosePage("fxpFieldPage")+'<label>Dropdown choices (comma-separated)<input id="fxpFieldChoices" placeholder="Yes, No, Maybe"></label><label>Horizontal position (PDF points)<input type="number" id="fxpFieldX" value="44" min="0" max="2000"></label><label>Distance from top (PDF points)<input type="number" id="fxpFieldY" value="140" min="25" max="2000"></label></div>',
[{label:"Create field",primary:true,act:async()=>{
const name=field("fxpFieldName").value.trim(),type=field("fxpFieldType").value;if(!name)throw Error("Enter a field name");
const p=await pdf(),pg=getPage(p,field("fxpFieldPage").value),form=p.getForm();
const safeName=name.replace(/[\u0000-\u001f]/g,"").slice(0,75),x=Number(field("fxpFieldX").value),top=Number(field("fxpFieldY").value),width=type==="checkbox"?20:Math.min(240,pg.getWidth()-x-15),height=type==="checkbox"?20:28;
if(!Number.isFinite(x)||!Number.isFinite(top)||x<0||top<0||x+width>pg.getWidth()||top+height>pg.getHeight())throw Error("Field position falls outside page bounds");
let f;if(type==="text"){f=form.createTextField(safeName);f.addToPage(pg,{x,y:pg.getHeight()-top-height,width,height,borderColor:lib().rgb(.70,.53,.21),borderWidth:1})}
else if(type==="checkbox"){f=form.createCheckBox(safeName);f.addToPage(pg,{x,y:pg.getHeight()-top-height,width,height})}
else{f=form.createDropdown(safeName);const options=field("fxpFieldChoices").value.split(",").map(x=>x.trim()).filter(Boolean);if(!options.length)throw Error("Add dropdown choices");f.addOptions(options);f.addToPage(pg,{x,y:pg.getHeight()-top-height,width,height})}
await commit(p)
}}])}
async function metadata(){
if(!need())return;const p=await pdf();
modal("Document properties","Edit the file's actual PDF metadata.",'<div class="fxp-properties"><label>Title<input id="fxpTitle" value="'+esc(p.getTitle()||"")+'"></label><label>Author<input id="fxpAuthor" value="'+esc(p.getAuthor()||"")+'"></label><label>Subject<input id="fxpSubject" value="'+esc(p.getSubject()||"")+'"></label><label>Keywords<input id="fxpKeywords" placeholder="tag1, tag2" value="'+esc((p.getKeywords()||"").replace(/^\[|\]$/g,""))+'"></label></div>',
[{label:"Save properties",primary:true,act:async()=>{const pdfDoc=await pdf();pdfDoc.setTitle(field("fxpTitle").value.slice(0,255));pdfDoc.setAuthor(field("fxpAuthor").value.slice(0,255));pdfDoc.setSubject(field("fxpSubject").value.slice(0,255));pdfDoc.setKeywords(field("fxpKeywords").value.split(",").map(x=>x.trim()).filter(Boolean));await commit(pdfDoc)}}])}
async function attach(){
if(!need())return;
modal("Attach file to PDF","Embed a supplementary file inside your PDF. Some viewers hide attachments.",
'<label class="fxp-upload">Select file<input id="fxpAttach" type="file"></label><label>Attachment description<input id="fxpAttachDescription" placeholder="Supporting document" maxlength="180"></label>',
[{label:"Attach to PDF",primary:true,act:async()=>{const file=field("fxpAttach").files?.[0];if(!file)throw Error("Choose a file");if(file.size>12*1024*1024)throw Error("Attachments are limited to 12 MB");const p=await pdf();await p.attach(new Uint8Array(await file.arrayBuffer()),file.name,{mimeType:file.type||"application/octet-stream",description:field("fxpAttachDescription").value||"Attached from FoxPDF Studio",creationDate:new Date()});await commit(p)}}])}
async function flatten(){
if(!need())return;
if(!confirm("Flatten all PDF form fields into fixed page content? Create a saved copy before doing this."))return;
return hold(async()=>{const p=await pdf();const fields=p.getForm().getFields();if(!fields.length){bridge.say("This PDF has no fillable form fields to flatten.");return}p.getForm().flatten();await commit(p)})}
async function search(){
if(!need())return;
modal("Search PDF","Find text in all pages of the current PDF. Results do not include image-only text until OCR is applied.",'<label>Find text<input id="fxpFind" type="search" placeholder="Enter a word or phrase"></label><div id="fxpFindResults" class="fxp-results">Search results will appear here.</div>',
[{label:"Find matches",primary:true,act:async()=>{const term=field("fxpFind").value.trim();if(!term)throw Error("Enter a search term");const pages=await textPages(bridge.bytes()),matched=[];pages.forEach((text,i)=>{const at=text.toLowerCase().indexOf(term.toLowerCase());if(at>=0)matched.push({page:i+1,excerpt:text.slice(Math.max(0,at-65),at+term.length+125)})});const target=field("fxpFindResults");target.replaceChildren();const h=document.createElement("p");h.textContent=matched.length+" matching page(s).";target.append(h);matched.forEach(m=>{const b=document.createElement("button");b.className="fxp-searchhit";b.textContent="Page "+m.page+" — "+m.excerpt;b.onclick=()=>{bridge.setPage(m.page);close();bridge.say("Jumped to page "+m.page)};target.append(b)})}}])}
async function sign(){
if(!need())return;
modal("Draw your signature","Your handwritten image will be embedded visibly into the chosen page. This is not a certified digital signature.",
'<div class="fxp-sigpad"><canvas id="fxpSig" width="840" height="260" aria-label="Draw signature with finger, mouse, or stylus"></canvas></div><div class="fxp-two">'+choosePage("fxpSignPage")+'<label>Signature width (points)<input id="fxpSigWidth" type="number" value="190" min="50" max="350"></label></div><p class="fxp-muted">Draw inside the box. Place the signature near the bottom-left of the selected page.</p>',
[{label:"Clear",act:async()=>{const c=field("fxpSig");const context=c.getContext("2d");context.clearRect(0,0,c.width,c.height)}},
{label:"Place signature",primary:true,act:async()=>{if(!hasInk)throw Error("Draw a signature first");const p=await pdf(),pg=getPage(p,field("fxpSignPage").value),img=await p.embedPng(await (await fetch(field("fxpSig").toDataURL("image/png"))).arrayBuffer()),w=Number(field("fxpSigWidth").value),height=w*img.height/img.width;if(w<50||w>350||height>pg.getHeight()-30)throw Error("Invalid signature size");pg.drawImage(img,{x:34,y:55,width:Math.min(w,pg.getWidth()-68),height});await commit(p)}}]);
const canvas=field("fxpSig"),ctx=canvas.getContext("2d");let drawing=false,hasInk=false;ctx.strokeStyle="#18120a";ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=4;
const position=e=>{const rect=canvas.getBoundingClientRect();return [(e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height]};
canvas.onpointerdown=e=>{drawing=true;hasInk=true;canvas.setPointerCapture(e.pointerId);const [x,y]=position(e);ctx.beginPath();ctx.moveTo(x,y)};
canvas.onpointermove=e=>{if(!drawing)return;const [x,y]=position(e);ctx.lineTo(x,y);ctx.stroke()};
canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false}
}
async function print(){if(!need())return;const f=bridge.readCurrent();if(!f)return;const blob=new Blob([f.bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob);const w=window.open(url,"_blank","noopener,noreferrer");if(!w)bridge.say("Your browser blocked the print window. Please allow pop-ups or download the PDF first.");setTimeout(()=>URL.revokeObjectURL(url),90000)}
async function annotate(){
if(!need())return;
modal("Mark up PDF","Use your mouse, finger, or Apple Pencil to highlight, underline, strike through, or draw a box.",
'<div class="fxp-two">'+choosePage("fxpAnnoPage")+'<label>Markup tool<select id="fxpAnnoType"><option value="highlight">Highlight region</option><option value="underline">Underline</option><option value="strike">Strike through</option><option value="box">Outline rectangle</option><option value="note">Add note</option></select></label></div><label>Note text<input id="fxpAnnoNote" maxlength="160" placeholder="Only for Add note"></label><div class="fxp-canvas-wrap"><canvas id="fxpAnnoCanvas"></canvas><div id="fxpAnnoMask" aria-label="Drag to mark a region" role="application"></div></div><p class="fxp-muted">Drag over a region. For notes, tap where you want the note. Markup is drawn into the PDF page.</p>',
[{label:"Apply markup",primary:true,act:async()=>{
if(!selected)throw Error("Drag to select the region first");const p=await pdf(),pg=getPage(p,field("fxpAnnoPage").value),type=field("fxpAnnoType").value,r=selected;const x=Math.min(r[0],r[2])*pg.getWidth(),top=Math.min(r[1],r[3])*pg.getHeight(),w=Math.max(2,Math.abs(r[2]-r[0])*pg.getWidth()),h=Math.max(2,Math.abs(r[3]-r[1])*pg.getHeight()),bottom=pg.getHeight()-top-h;const gold=lib().rgb(.95,.73,.19);
if(type==="highlight")pg.drawRectangle({x,y:bottom,width:w,height:h,color:gold,opacity:.26});
else if(type==="box")pg.drawRectangle({x,y:bottom,width:w,height:h,borderColor:gold,borderWidth:2,opacity:0});
else if(type==="underline"||type==="strike")pg.drawLine({start:{x,y:type==="underline"?bottom:bottom+h/2},end:{x:x+w,y:type==="underline"?bottom:bottom+h/2},color:gold,thickness:2});
else{const note=field("fxpAnnoNote").value.trim();if(!note)throw Error("Enter note text");if(/[^\x20-\x7e]/.test(note))throw Error("Visual notes currently support basic Latin characters; other scripts need font embedding");pg.drawRectangle({x,y:Math.max(12,bottom-20),width:Math.min(pg.getWidth()-x-10,235),height:58,color:lib().rgb(1,.93,.65),borderColor:gold,borderWidth:1});pg.drawText(note.slice(0,55),{x:x+7,y:Math.max(20,bottom+9),size:10,color:lib().rgb(.16,.12,.08),maxWidth:220})}
await commit(p)}}]);
const canvas=field("fxpAnnoCanvas"),mask=field("fxpAnnoMask");let selected=null,start=null;
async function render(){const pdfjs=await ensurePdfJs(),r=await pdfjs.getDocument({data:bridge.bytes()}).promise,pg=await r.getPage(Number(field("fxpAnnoPage").value)),view=pg.getViewport({scale:1.4});canvas.width=view.width;canvas.height=view.height;mask.style.aspectRatio=view.width+"/"+view.height;await pg.render({canvasContext:canvas.getContext("2d"),viewport:view}).promise;r.destroy?.();selected=null;mask.style.background="transparent"}
await render();
field("fxpAnnoPage").onchange=()=>hold(render);
const norm=e=>{const b=mask.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))]};
mask.onpointerdown=e=>{start=norm(e);selected=null;mask.setPointerCapture(e.pointerId)};
mask.onpointerup=e=>{if(!start)return;const end=norm(e);selected=[start[0],start[1],end[0],end[1]];mask.style.background="linear-gradient(110deg,#ffde7341,#fbc44b31)";start=null}
}
const extras=document.createElement("div");extras.className="fxp-workspace-actions";extras.innerHTML='<button data-fxp="annotate">✎ Mark up</button><button data-fxp="sign">✍ Draw signature</button><button data-fxp="forms">☑ Create form field</button><button data-fxp="compare">◫ Compare</button><button data-fxp="batch">▤ Batch</button><button data-fxp="search">⌕ Find</button><button data-fxp="tools">More tools</button>';
const editor=document.querySelector(".fx-edit-tools");
if(editor){editor.after(extras);extras.querySelectorAll("button").forEach(b=>b.onclick=()=>notify(b.dataset.fxp))}
const shortcut=document.createElement("div");shortcut.className="fxp-mini-actions";shortcut.innerHTML='<button data-fxp="annotate">✎ Mark up</button><button data-fxp="compare">◫ Compare</button><button data-fxp="batch">▤ Batch</button><button data-fxp="tools">More tools</button>';
document.querySelector(".fx-recent-head")?.append(shortcut);shortcut.querySelectorAll("button").forEach(b=>b.onclick=()=>notify(b.dataset.fxp));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay)close()});
});
})();