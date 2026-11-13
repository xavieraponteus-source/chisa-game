/* FoxPDF interactive editing workspace v6.1 — PDF.js canvas & guarded text editing */
(function(){"use strict";
const ready=fn=>document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();
ready(function(){
const app=window.FoxPDFBridge,main=document.querySelector(".workspace .main");
if(!app||!main){console.warn("Interactive PDF editor: PDF engine missing");return}
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=text;return a};
const view=el("div","fxie-root");view.id="fxInteractiveEditor";
view.innerHTML=[
'<header class="fxie-topbar"><div class="fxie-tabs"><strong class="fxie-pdf">PDF</strong><button id="fxieHome">⌂ Home</button><button id="fxieTools">Tools</button><button class="selected">Edit</button><button id="fxieOrganize">Organize</button><button id="fxieConvert">Convert</button><button id="fxieSign">E-Sign</button></div><div class="fxie-filename" id="fxieFilename">PDF Editor</div><div class="fxie-topright"><button id="fxiePrint" title="Print">⎙</button><button id="fxieShare">Share</button><button id="fxieSave" class="fxie-primary">⇩ Save PDF</button></div></header>',
'<div class="fxie-layout"><aside class="fxie-left"><div class="fxie-lefthead"><h2>Edit</h2><div><button id="fxiePanelDone" class="fxie-paneldone" type="button">Done</button><button id="fxieInfo" title="About editing">⚙</button></div></div>',
'<p class="fxie-label">EDIT CONTENT</p><button class="fxie-tool selected" data-mode="select"><i>↖</i> Select text</button><button class="fxie-tool" data-mode="edit"><i>✎</i> Edit existing text</button>',
'<p class="fxie-label">ADD CONTENT</p><button class="fxie-tool" data-mode="text"><i>T</i> Text</button><button class="fxie-tool" data-mode="image"><i>▧</i> Image</button><button class="fxie-tool" data-mode="highlight"><i>▰</i> Highlight</button><button class="fxie-tool" id="fxieComments"><i>☏</i> Comments & annotations</button>',
'<p class="fxie-label">TEXT FORMAT</p><div class="fxie-controls"><label>Font<select id="fxieFont"><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times New Roman</option><option value="Courier">Courier</option></select></label><div class="fxie-two"><label>Size<input type="number" id="fxieSize" min="5" max="80" value="14"></label><label>Color<input type="color" id="fxieColor" value="#172846"></label></div></div>',
'<div class="fxie-editbox" id="fxieReplaceBox" hidden><p class="fxie-label">SELECTED PARAGRAPH</p><label>Paragraph<select id="fxieParagraph"></select></label><label>Replacement text<textarea id="fxieReplacement" rows="5"></textarea></label><p class="fxie-caution">Local visual editing stays on your device. It covers the original text visually, but the old text may remain recoverable or searchable. Do not use this for sensitive information; use Permanent Redaction instead.</p><button id="fxieApply" class="fxie-primary">Apply local text edit</button><button id="fxieCloudReflow" class="fxie-advanced-reflow" type="button">Advanced reflow (server upload optional)</button></div>',
'<div class="fxie-editbox" id="fxieInsertBox" hidden><label>Text to insert<textarea id="fxieInsertText" rows="4">New text</textarea></label><p class="fxie-hint">Click on the PDF page to place your text.</p></div>',
'<div class="fxie-bottom"><button id="fxieAdvanced">Advanced tools</button><button id="fxieChisa">Ask Chisa for help</button><p>For privacy-sensitive text, use Permanent Redaction instead of covering content.</p></div></aside>',
'<section class="fxie-stage"><div class="fxie-editorbar"><div class="fxie-barleft"><button id="fxieUndo" title="Undo">↶</button><button id="fxieRedo" title="Redo">↷</button><span class="fxie-div"></span><button id="fxieSelect" class="selected" title="Select">↖</button><button id="fxieText" title="Add text">T</button><button id="fxieImage" title="Add image">▧</button><button id="fxieHighlight" title="Highlight">▰</button></div><div class="fxie-barright"><button id="fxiePrev" title="Previous page">‹</button><strong id="fxieCount">0 / 0</strong><button id="fxieNext" title="Next page">›</button><span class="fxie-div"></span><button id="fxieMinus">−</button><select id="fxieZoom" aria-label="Zoom"><option value="fit">Fit width</option><option value=".75">75%</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option></select><button id="fxiePlus">+</button></div></div>',
'<div class="fxie-scroll" id="fxieScroll"><div class="fxie-sheetwrap" id="fxieSheetWrap"><p class="fxie-start">Open a PDF to start editing</p></div></div><div class="fxie-status" id="fxieStatus" aria-live="polite">Ready to edit</div></section>',
'<nav class="fxie-right" aria-label="Page actions"><button id="fxiePages" title="Page thumbnails">▤</button><button id="fxieRotate" title="Rotate page">↻</button><button id="fxieAddPage" title="Insert page">⊕</button><button id="fxieDelete" title="Delete page">⌫</button><hr><button id="fxieSearch" title="Search PDF">⌕</button><button id="fxieProperties" title="Document properties">▣</button><button id="fxieMarkup" title="Mark up PDF">✎</button></nav></div>',
'<input id="fxieImageFile" type="file" accept="image/png,image/jpeg" hidden>'
].join("");
main.append(view);
let mode="select",zoom="fit",renderVersion=0,rendered=null,selected=null,inspectCache=null,consentKey="",undo=[],redo=[],historyName="",pendingImage=null,drawing=null,lastPdf=null;
const say=(message,bad=false)=>{const s=$("fxieStatus");s.textContent=message;s.dataset.bad=bad?"1":"0"};
function check(){const d=app.current();if(!d){app.say("Please open a PDF first.");app.open();return null}return d}
function setMode(m){mode=m;view.classList.remove("fxie-drawer-closed");view.dataset.mode=m;selected=null;$("fxieReplaceBox").hidden=true;$("fxieInsertBox").hidden=m!=="text";for(const b of view.querySelectorAll("[data-mode]"))b.classList.toggle("selected",b.dataset.mode===m);for(const [id,key] of [["fxieSelect","select"],["fxieText","text"],["fxieImage","image"],["fxieHighlight","highlight"]])$(id).classList.toggle("selected",m===key);
say(({select:"Select a text region on the page.",edit:"Click existing text to edit its paragraph.",text:"Enter text on the left, then click the page.",image:"Choose a picture, then click where it should go.",highlight:"Drag across a region on the page."})[m]);if(m==="image"&&!pendingImage)$("fxieImageFile").click()}
async function getJs(){if(window.pdfjsLib)return window.pdfjsLib;if(!window.fxieJS)window.fxieJS=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";script.onload=()=>{if(!window.pdfjsLib)return reject(Error("PDF renderer not found"));pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";resolve(pdfjsLib)};script.onerror=()=>reject(Error("PDF renderer could not load"));document.head.append(script)});return window.fxieJS}
function point(e){if(!rendered)return null;const r=rendered.canvas.getBoundingClientRect();if(!r.width||!r.height)return null;return{x:(e.clientX-r.left)/r.width*rendered.w,y:(e.clientY-r.top)/r.height*rendered.h}}
async function draw(){
if(!document.body.classList.contains("fx-mode-editor"))return;
const d=app.current();if(!d)return;
const token=++renderVersion;$("fxieFilename").textContent=d.name;$("fxieCount").textContent=d.page+" / "+d.pages;say("Rendering page "+d.page+"…");
try{
 const pdfjs=await getJs(),reader=await pdfjs.getDocument({data:app.bytes().slice(0)}).promise;
 if(token!==renderVersion){reader.destroy();return}
 const page=await reader.getPage(d.page),base=page.getViewport({scale:1}),container=$("fxieScroll");
 const scale=zoom==="fit"?Math.min(2.5,Math.max(.55,(Math.max(380,container.clientWidth)-70)/base.width)):Number(zoom),vp=page.getViewport({scale});
 const sheet=el("div","fxie-sheet"),canvas=el("canvas","fxie-paper"),layer=el("div","fxie-textlayer"),overlay=el("div","fxie-drawing");
 sheet.style.width=vp.width+"px";sheet.style.height=vp.height+"px";
 canvas.width=Math.ceil(vp.width*devicePixelRatio);canvas.height=Math.ceil(vp.height*devicePixelRatio);canvas.style.width=vp.width+"px";canvas.style.height=vp.height+"px";
 layer.style.width=overlay.style.width=vp.width+"px";layer.style.height=overlay.style.height=vp.height+"px";sheet.append(canvas,layer,overlay);
 const ctx=canvas.getContext("2d");ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
 await page.render({canvasContext:ctx,viewport:vp}).promise;
 const data=await page.getTextContent();
 if(token!==renderVersion){reader.destroy();return}
 let count=0;
 for(const item of data.items){if(!item.str?.trim())continue;const mat=pdfjs.Util.transform(vp.transform,item.transform),sz=Math.max(8,Math.hypot(mat[2],mat[3]));if(!Number.isFinite(mat[4]+mat[5]+sz))continue;
 const b=el("button","fxie-textregion");b.type="button";b.title="Edit: "+item.str.slice(0,110);b.setAttribute("aria-label","Select text "+item.str);
 Object.assign(b.style,{left:mat[4]+"px",top:(mat[5]-sz)+"px",width:Math.max(9,Math.abs(item.width)*scale)+"px",height:sz+"px"});
 b.addEventListener("click",e=>{e.stopPropagation();if(mode==="highlight"||mode==="text"||mode==="image")return;chooseText(item.str,b,d.page,{x:mat[4],top:mat[5]-sz,width:Math.max(9,Math.abs(item.width)*scale),height:sz,baseline:mat[5],scale,fontFamily:data.styles?.[item.fontName]?.fontFamily||"",fontName:item.fontName||""})});layer.append(b);count++}
 sheet.addEventListener("click",e=>{if(e.target?.closest(".fxie-textregion"))return;if(mode==="text")placeText(point(e));else if(mode==="image")placeImage(point(e))});
 overlay.addEventListener("pointerdown",e=>{if(mode!=="highlight")return;drawing={start:point(e),end:point(e)};overlay.setPointerCapture(e.pointerId)});
 overlay.addEventListener("pointermove",e=>{if(!drawing)return;drawing.end=point(e);drawHighlightPreview(overlay)});
 overlay.addEventListener("pointerup",e=>{if(!drawing)return;drawing.end=point(e);const drag=drawing;drawing=null;overlay.replaceChildren();applyHighlight(drag)});
 $("fxieSheetWrap").replaceChildren(sheet);
 if(lastPdf&&lastPdf!==reader)lastPdf.destroy?.();lastPdf=reader;
 rendered={scale,canvas,overlay,w:vp.width,h:vp.height,page:page,originalWidth:base.width,originalHeight:base.height};
 say("Page "+d.page+" · "+count+" selectable text regions");
}catch(e){$("fxieSheetWrap").replaceChildren(el("p","fxie-error","Unable to show page: "+e.message));say("PDF rendering failed: "+e.message,true)}
}
async function mutate(fn,description){const original=app.readCurrent();if(!original)return;if(!window.PDFLib)return say("Editing engine is unavailable.",true);
try{const pdf=await PDFLib.PDFDocument.load(original.bytes.slice(0));await fn(pdf);const result=new Uint8Array(await pdf.save({useObjectStreams:true}));if(original.bytes.length<8*1024*1024){undo.push(original.bytes);if(undo.length>7)undo.shift();redo=[]}await app.replace(result);say(description);return true}catch(e){say("Edit failed: "+e.message,true);return false}}
function color(){const s=$("fxieColor").value.slice(1);return PDFLib.rgb(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255)}
async function placeText(p){if(!p||!check())return;const text=$("fxieInsertText").value.trim();if(!text)return say("Type some text first.",true);const size=Number($("fxieSize").value);if(size<5||size>80)return say("Font size must be between 5 and 80.",true);
await mutate(async pdf=>{const pg=pdf.getPage(app.current().page-1),font=await pdf.embedFont(PDFLib.StandardFonts[$("fxieFont").value]);const x=p.x/rendered.scale,y=pg.getHeight()-p.y/rendered.scale-size;pg.drawText(text,{x,y,font,size,color:color(),maxWidth:pg.getWidth()-x-8,lineHeight:size*1.32})},"Text added to page "+app.current().page+".")}
$("fxieImageFile").onchange=async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;if(!["image/png","image/jpeg"].includes(f.type)||f.size>8*1024*1024)return say("Select a PNG/JPEG smaller than 8 MB.",true);pendingImage={bytes:new Uint8Array(await f.arrayBuffer()),type:f.type};say("Image ready. Click the PDF to place it.")};
async function placeImage(p){if(!p||!check())return;if(!pendingImage)return $("fxieImageFile").click();await mutate(async pdf=>{const pg=pdf.getPage(app.current().page-1),img=pendingImage.type==="image/png"?await pdf.embedPng(pendingImage.bytes):await pdf.embedJpg(pendingImage.bytes),w=Math.min(200,img.width,pg.getWidth()*.45),h=w*img.height/img.width;pg.drawImage(img,{x:Math.max(0,Math.min(pg.getWidth()-w,p.x/rendered.scale)),y:Math.max(0,Math.min(pg.getHeight()-h,pg.getHeight()-p.y/rendered.scale-h)),width:w,height:h})},"Image inserted in PDF.")}
function drawHighlightPreview(overlay){overlay.replaceChildren();const a=drawing.start,b=drawing.end;if(!a||!b)return;const square=el("div","fxie-highlight-box");Object.assign(square.style,{left:Math.min(a.x,b.x)+"px",top:Math.min(a.y,b.y)+"px",width:Math.abs(a.x-b.x)+"px",height:Math.abs(a.y-b.y)+"px"});overlay.append(square)}
async function applyHighlight(t){if(!t.start||!t.end)return;const a=t.start,b=t.end,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);if(w<4||h<4)return;await mutate(async pdf=>{pdf.getPage(app.current().page-1).drawRectangle({x:x/rendered.scale,y:(rendered.h-y-h)/rendered.scale,width:w/rendered.scale,height:h/rendered.scale,color:PDFLib.rgb(1,.77,.22),opacity:.24})},"Highlighted region. For privacy use Permanent Redaction.")}

/* Browser-local direct text appearance editing. Never automatically uploads documents. */
let inlineEditor=null,localRevision=0;
function closeInline(){
 if(inlineEditor?.isConnected)inlineEditor.remove();
 inlineEditor=null;
}
function norm(s){return String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim()}
function score(a,b){a=norm(a);b=norm(b);if(a===b)return 100;if(a.includes(b)||b.includes(a))return 85;return a.split(" ").filter(w=>w.length>2&&b.includes(w)).length}
function samplePixels(box){
 const c=rendered?.canvas;
 if(!c||!rendered)return{background:[255,255,255],ink:null,uniform:true};
 const ctx=c.getContext("2d",{willReadFrequently:true});
 const ratio=c.width/rendered.w,ratioY=c.height/rendered.h;
 const read=(x,y)=>{
  const cx=Math.max(0,Math.min(c.width-1,Math.round(x*ratio)));
  const cy=Math.max(0,Math.min(c.height-1,Math.round(y*ratioY)));
  return Array.from(ctx.getImageData(cx,cy,1,1).data).slice(0,3);
 };
 const s=[];
 for(const t of [.1,.3,.5,.7,.9]){
  s.push(read(box.x+t*box.width,box.top-5));
  s.push(read(box.x+t*box.width,box.top+box.height+5));
 }
 for(const t of [.2,.5,.8]){
  s.push(read(box.x-6,box.top+t*box.height));
  s.push(read(box.x+box.width+6,box.top+t*box.height));
 }
 const median=v=>v.slice().sort((a,b)=>a-b)[Math.floor(v.length/2)];
 const bg=[0,1,2].map(ch=>median(s.map(rgb=>rgb[ch])));
 const deviation=s.reduce((total,rgb)=>total+Math.hypot(rgb[0]-bg[0],rgb[1]-bg[1],rgb[2]-bg[2]),0)/s.length;
 const dark=[];
 for(let xx=.07;xx<.96;xx+=.08)for(let yy=.12;yy<.93;yy+=.18){
  const pixel=read(box.x+box.width*xx,box.top+box.height*yy),difference=Math.hypot(pixel[0]-bg[0],pixel[1]-bg[1],pixel[2]-bg[2]);
  if(difference>55)dark.push({rgb:pixel,difference});
 }
 dark.sort((a,b)=>b.difference-a.difference);
 const selectedPixels=dark.slice(0,Math.min(18,dark.length));
 const ink=selectedPixels.length>=4?[0,1,2].map(k=>Math.round(selectedPixels.reduce((sum,r)=>sum+r.rgb[k],0)/selectedPixels.length)):null;
 return{background:bg,ink,uniform:deviation<48};
}
function cssColor(parts){return "#"+parts.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("")}
function showInline(){
 closeInline();
 if(!selected?.box||!rendered)return;
 const box=selected.box,sheet=$("fxieSheetWrap").querySelector(".fxie-sheet");
 if(!sheet)return;
 const editor=el("div","fxie-inline-editor");editor.setAttribute("role","group");editor.setAttribute("aria-label","Edit selected PDF text directly");
 const field=el("textarea","fxie-inline-input");field.value=selected.text;field.rows=1;field.setAttribute("aria-label","Edit selected text");
 field.style.fontSize=Math.max(12,box.height)+"px";
 field.style.fontFamily=box.fontFamily||"Arial, sans-serif";
 const bar=el("div","fxie-inline-buttons");
 const apply=el("button","fxie-inline-apply","✓ Apply");apply.type="button";
 const cancel=el("button","fxie-inline-cancel","✕ Cancel");cancel.type="button";
 bar.append(apply,cancel);editor.append(field,bar);
 const width=Math.max(195,Math.min(rendered.w-box.x-6,Math.max(box.width+70,220)));
 Object.assign(editor.style,{left:Math.max(1,Math.min(box.x-5,rendered.w-width-1))+"px",top:Math.max(2,box.top-6)+"px",width:width+"px"});
 editor.addEventListener("click",e=>e.stopPropagation());
 field.addEventListener("input",()=>{$("fxieReplacement").value=field.value});
 field.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeInline()}if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();applyLocal()}});
 apply.onclick=()=>applyLocal();cancel.onclick=()=>{closeInline();$("fxieReplaceBox").hidden=true;selected=null;say("Text edit canceled; your document is unchanged.")};
 sheet.append(editor);inlineEditor=editor;
 field.focus({preventScroll:true});field.setSelectionRange(field.value.length,field.value.length);
}
async function chooseText(text,button,pageNum,box){
 closeInline();view.querySelectorAll(".fxie-textregion").forEach(a=>a.classList.remove("selected"));button.classList.add("selected");
 selected={text,page:pageNum,box,button,revision:++localRevision};
 $("fxieReplaceBox").hidden=false;$("fxieInsertBox").hidden=true;
 $("fxieParagraph").replaceChildren(new Option("Selected text segment · local editing","local"));
 $("fxieReplacement").value=text;
 const font=(box.fontFamily||"").toLowerCase();const guess=font.includes("courier")||font.includes("mono")?"Courier":font.includes("times")||font.includes("serif")?"TimesRoman":"Helvetica";
 $("fxieFont").value=guess;$("fxieSize").value=String(Math.max(5,Math.min(80,Math.round(box.height/box.scale))));
 const pixel=samplePixels(box);if(pixel.ink)$("fxieColor").value=cssColor(pixel.ink);
 showInline();
 say(pixel.uniform?"Editing locally—no upload or permission popup. Press Ctrl+Enter or Apply to save.":"Editing locally. This area has a complex background; check the appearance after applying.");
}
$("fxieParagraph").onchange=()=>{if(selected)$("fxieReplacement").value=selected.text};
$("fxieReplacement").oninput=()=>{const textarea=inlineEditor?.querySelector("textarea");if(textarea&&textarea.value!==$("fxieReplacement").value)textarea.value=$("fxieReplacement").value};
async function applyLocal(){
 const state=selected;
 if(!state?.box)return say("Click the text you want to edit first.",true);
 const value=(inlineEditor?.querySelector("textarea")?.value??$("fxieReplacement").value).replace(/\r/g,"");
 if(value===state.text){closeInline();$("fxieReplaceBox").hidden=true;selected=null;return say("No changes made.")}
 if(value.length>800)return say("For long text blocks, use Advanced reflow. Local editing allows 800 characters.",true);
 if(!rendered)return say("Page preview isn't ready.",true);
 if(state.page!==app.current()?.page)return say("The selected page changed. Select the text again.",true);
 const box=state.box,colors=samplePixels(box),scale=box.scale;
 const chosenFont=$("fxieFont").value,size=Number($("fxieSize").value);
 if(!Number.isFinite(size)||size<5||size>80)return say("Choose a font size between 5 and 80.",true);
 if(!colors.uniform)say("Complex background detected: a local replacement may look imperfect. Review before sharing.",true);
 const applied=await mutate(async doc=>{
  const pg=doc.getPage(state.page-1);
  if(pg.getRotation().angle%360!==0)throw Error("This rotated page cannot be edited locally yet. Use Advanced reflow.");
  const pdfSize=pg.getSize(),x=Math.max(0,box.x/scale),h=Math.max(2,box.height/scale),w=Math.max(2,box.width/scale);
  const baseline=pdfSize.height-box.baseline/scale,coverY=Math.max(0,baseline-2.1),coverHeight=Math.min(pdfSize.height-coverY,h+5);
  if(x+w>pdfSize.width+5||coverY+coverHeight>pdfSize.height+1)throw Error("Text region outside page; use Advanced reflow.");
  const bg=PDFLib.rgb(...colors.background.map(v=>v/255));
  // Appearance-only edit, not content removal or redaction. The old text may remain in streams.
  pg.drawRectangle({x:Math.max(0,x-1.3),y:coverY,width:Math.min(w+3.5,pdfSize.width-x+1.3),height:coverHeight,color:bg});
  if(value.trim()){
   const font=await doc.embedFont(PDFLib.StandardFonts[chosenFont]||PDFLib.StandardFonts.Helvetica);
   const colorValue=color(),lineHeight=size*1.16;
   const maxWidth=Math.max(18,Math.min(pdfSize.width-x-10,Math.max(w*1.3,font.widthOfTextAtSize(state.text,size)+20)));
   // Existing PDF embedded fonts may not be available for drawing, so use the closest supported standard font.
   pg.drawText(value,{x,y:Math.max(0,baseline),font,size,color:colorValue,maxWidth,lineHeight});
  }
 },colors.uniform?"Local text edit applied. Download your PDF when ready.":"Local edit applied. Check the background and nearby layout before saving.");
 if(applied){closeInline();$("fxieReplaceBox").hidden=true;selected=null;}
}
$("fxieApply").onclick=()=>applyLocal();
/* Advanced reflow stays explicit and opt-in; ordinary clicks never send PDFs to a server. */
async function inspectRemote(){
 const d=app.current(),bytes=app.bytes(),key=d.name+":"+bytes.length+":"+d.page;
 if(inspectCache?.key===key)return inspectCache.value;
 const data=new FormData();data.append("file",new File([bytes],d.name,{type:"application/pdf"}));
 const response=await fetch("/api/advanced/inspect",{method:"POST",body:data,credentials:"omit"});
 if(!response.ok){let m="Inspection failed";try{m=(await response.json()).detail||m}catch{}throw Error(m)}
 const value=await response.json();inspectCache={key,value};return value;
}
$("fxieCloudReflow").onclick=async()=>{
 if(!selected)return say("Select the paragraph you want to edit first.",true);
 const text=$("fxieReplacement").value.trim();
 if(!text)return say("Enter the replacement text.",true);
 if(!confirm("Advanced reflow will temporarily upload this PDF to the FoxPDF processing server. Continue?"))return;
 const state=selected;closeInline();
 try{
  say("Finding the original paragraph for advanced reflow…");
  const data=await inspectRemote(),all=(data.pages||[]).find(p=>Number(p.page)===state.page)?.paragraphs||[];
  if(!all.length)throw Error("No safely editable paragraphs found on this page");
  const ranked=all.slice().sort((a,b)=>score(state.text,b.text||b.preview)-score(state.text,a.text||a.preview));
  const chosen=ranked[0];
  if(chosen.mixed_styles)throw Error("Mixed-font paragraph cannot safely reflow");
  const current=app.readCurrent(),form=new FormData();
  form.append("file",new File([current.bytes],current.name,{type:"application/pdf"}));
  form.append("operation","reflow");
  form.append("params",JSON.stringify({page:state.page,index:chosen.index,text,preserve_font:true}));
  const response=await fetch("/api/advanced/process",{method:"POST",body:form,credentials:"omit"});
  if(!response.ok){let err="Reflow rejected";try{err=(await response.json()).detail||err}catch{}throw Error(err)}
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(current.bytes.length<8*1024*1024){undo.push(current.bytes);if(undo.length>7)undo.shift();redo=[]}
  await app.replace(bytes);selected=null;inspectCache=null;$("fxieReplaceBox").hidden=true;
  say("Advanced paragraph reflow completed. Check the PDF layout and save.");
 }catch(e){say("Advanced reflow could not finish: "+e.message,true)}
};

for(const b of view.querySelectorAll("[data-mode]"))b.onclick=()=>setMode(b.dataset.mode);
const bind=(id,fn)=>{$(id).onclick=fn};
bind("fxieSelect",()=>setMode("select"));bind("fxieText",()=>setMode("text"));bind("fxieImage",()=>setMode("image"));bind("fxieHighlight",()=>setMode("highlight"));
bind("fxieHome",()=>$("fxTopHome")?.click());bind("fxieTools",()=>window.FoxPDFPro?.open("tools"));bind("fxieOrganize",()=>app.click("reorder"));bind("fxieConvert",()=>app.advanced("convert"));bind("fxieSign",()=>window.FoxPDFReviews?.sign());
bind("fxieSave",()=>app.save());bind("fxieShare",()=>window.FoxPDFReviews?.share());bind("fxiePrint",()=>window.FoxPDFPro?.open("print"));
bind("fxieAdvanced",()=>window.FoxPDFPro?window.FoxPDFPro.open("tools"):say("Advanced tools are loading. Please try again.",true));bind("fxieChisa",()=>{$("chat").hidden=false});bind("fxieComments",()=>window.FoxPDFPro?.open("annotate"));
bind("fxieSearch",()=>window.FoxPDFPro?.open("search"));bind("fxieProperties",()=>window.FoxPDFPro?.open("metadata"));bind("fxieMarkup",()=>window.FoxPDFPro?.open("annotate"));
const mini=el("aside","fxie-mini-pages");mini.id="fxieThumbnails";mini.hidden=true;$("fxieScroll").prepend(mini);
let thumbnailLoad=0;
async function renderThumbnails(){
 const d=app.current();if(!d)return;const token=++thumbnailLoad;
 mini.replaceChildren();mini.append(el("h3","","Pages"));
 const items=el("div","fxie-mini-list");mini.append(items);
 const js=await getJs();const reader=await js.getDocument({data:app.bytes().slice(0)}).promise;
 try{for(let i=0;i<Math.min(d.pages,45);i++){
 if(token!==thumbnailLoad)return;
 const button=el("button","fxie-mini-page");button.type="button";
 if(d.page===i+1)button.classList.add("selected");
 const figure=el("canvas","fxie-mini-canvas"),caption=el("span","",String(i+1));button.append(figure,caption);button.onclick=()=>{app.setPage(i+1);mini.hidden=true};
 items.append(button);
 const page=await reader.getPage(i+1),viewport=page.getViewport({scale:.18});
 figure.width=Math.ceil(viewport.width);figure.height=Math.ceil(viewport.height);
 await page.render({canvasContext:figure.getContext("2d"),viewport}).promise;
 }}finally{reader.destroy?.()}
}
bind("fxiePages",()=>{mini.hidden=!mini.hidden;if(!mini.hidden)renderThumbnails().catch(e=>say("Could not load thumbnails: "+e.message,true))});
bind("fxiePanelDone",()=>view.classList.add("fxie-drawer-closed"));bind("fxieRotate",()=>app.click("rotate"));bind("fxieAddPage",()=>app.click("blankPage"));bind("fxieDelete",()=>app.click("delete"));
bind("fxiePrev",()=>{const d=app.current();if(d)app.setPage(Math.max(1,d.page-1))});bind("fxieNext",()=>{const d=app.current();if(d)app.setPage(Math.min(d.pages,d.page+1))});
$("fxieZoom").onchange=e=>{zoom=e.target.value;draw()};
function currentZoom(){return zoom==="fit"?(rendered?.scale||1):Number(zoom)}
function scaleBy(v){const factor=Math.max(.5,Math.min(2.5,currentZoom()*v));zoom=String(Math.round(factor*100)/100);const z=$("fxieZoom");if(![...z.options].some(o=>o.value===zoom))z.add(new Option(Math.round(factor*100)+"%",zoom));z.value=zoom;draw()}
bind("fxieMinus",()=>scaleBy(.8));bind("fxiePlus",()=>scaleBy(1.25));
bind("fxieUndo",async()=>{if(!undo.length)return say("Nothing to undo.");const d=app.readCurrent();redo.push(d.bytes);await app.replace(undo.pop());say("Last change undone.")});
bind("fxieRedo",async()=>{if(!redo.length)return say("Nothing to redo.");const d=app.readCurrent();undo.push(d.bytes);await app.replace(redo.pop());say("Change restored.")});
bind("fxieInfo",()=>alert("The FoxPDF editor renders pages and selectable text blocks. Original paragraph editing uses guarded server processing and may reject font-complex layouts. Permanent redaction is a separate, secure operation."));
window.addEventListener("foxpdf:change",()=>{const d=app.current();if(d){$("fxieFilename").textContent=d.name;$("fxieCount").textContent=d.page+" / "+d.pages;if(historyName!==d.name){undo=[];redo=[];historyName=d.name}}if(document.body.classList.contains("fx-mode-editor"))requestAnimationFrame(draw)});
let active=false;new MutationObserver(()=>{const now=document.body.classList.contains("fx-mode-editor");if(now!==active){active=now;if(now)requestAnimationFrame(draw)}}).observe(document.body,{attributes:true,attributeFilter:["class"]});
window.FoxPDFInteractiveEditor={
 open:(newMode="select")=>{if(!app.current()){app.open();return;}const button=document.querySelector('.fx-rail [data-fx="edit"]');if(button)button.click();setMode(newMode)},
 setMode,
 refresh:draw
};
if(app.current()){$("fxieFilename").textContent=app.current().name}
});
})();