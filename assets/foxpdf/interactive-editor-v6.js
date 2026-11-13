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
'<div class="fxie-layout"><aside class="fxie-left"><div class="fxie-lefthead"><h2>Edit</h2><button id="fxieInfo" title="About editing">⚙</button></div>',
'<p class="fxie-label">EDIT CONTENT</p><button class="fxie-tool selected" data-mode="select"><i>↖</i> Select text</button><button class="fxie-tool" data-mode="edit"><i>✎</i> Edit existing text</button>',
'<p class="fxie-label">ADD CONTENT</p><button class="fxie-tool" data-mode="text"><i>T</i> Text</button><button class="fxie-tool" data-mode="image"><i>▧</i> Image</button><button class="fxie-tool" data-mode="highlight"><i>▰</i> Highlight</button><button class="fxie-tool" id="fxieComments"><i>☏</i> Comments & annotations</button>',
'<p class="fxie-label">TEXT FORMAT</p><div class="fxie-controls"><label>Font<select id="fxieFont"><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times New Roman</option><option value="Courier">Courier</option></select></label><div class="fxie-two"><label>Size<input type="number" id="fxieSize" min="5" max="80" value="14"></label><label>Color<input type="color" id="fxieColor" value="#172846"></label></div></div>',
'<div class="fxie-editbox" id="fxieReplaceBox" hidden><p class="fxie-label">SELECTED PARAGRAPH</p><label>Paragraph<select id="fxieParagraph"></select></label><label>Replacement text<textarea id="fxieReplacement" rows="5"></textarea></label><p class="fxie-caution">Original text edits use guarded reflow on our server. Font-perfect preservation is not guaranteed, and complex text may be rejected.</p><button id="fxieApply" class="fxie-primary">Apply text edit</button></div>',
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
function setMode(m){mode=m;view.dataset.mode=m;selected=null;$("fxieReplaceBox").hidden=true;$("fxieInsertBox").hidden=m!=="text";for(const b of view.querySelectorAll("[data-mode]"))b.classList.toggle("selected",b.dataset.mode===m);for(const [id,key] of [["fxieSelect","select"],["fxieText","text"],["fxieImage","image"],["fxieHighlight","highlight"]])$(id).classList.toggle("selected",m===key);
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
 b.addEventListener("click",e=>{e.stopPropagation();if(mode==="highlight")return;chooseText(item.str,b,d.page)});layer.append(b);count++}
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
try{const pdf=await PDFLib.PDFDocument.load(original.bytes.slice(0));await fn(pdf);const result=new Uint8Array(await pdf.save({useObjectStreams:true}));if(original.bytes.length<8*1024*1024){undo.push(original.bytes);if(undo.length>7)undo.shift();redo=[]}await app.replace(result);say(description)}catch(e){say("Edit failed: "+e.message,true)}}
function color(){const s=$("fxieColor").value.slice(1);return PDFLib.rgb(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255)}
async function placeText(p){if(!p||!check())return;const text=$("fxieInsertText").value.trim();if(!text)return say("Type some text first.",true);const size=Number($("fxieSize").value);if(size<5||size>80)return say("Font size must be between 5 and 80.",true);
await mutate(async pdf=>{const pg=pdf.getPage(app.current().page-1),font=await pdf.embedFont(PDFLib.StandardFonts[$("fxieFont").value]);const x=p.x/rendered.scale,y=pg.getHeight()-p.y/rendered.scale-size;pg.drawText(text,{x,y,font,size,color:color(),maxWidth:pg.getWidth()-x-8,lineHeight:size*1.32})},"Text added to page "+app.current().page+".")}
$("fxieImageFile").onchange=async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;if(!["image/png","image/jpeg"].includes(f.type)||f.size>8*1024*1024)return say("Select a PNG/JPEG smaller than 8 MB.",true);pendingImage={bytes:new Uint8Array(await f.arrayBuffer()),type:f.type};say("Image ready. Click the PDF to place it.")};
async function placeImage(p){if(!p||!check())return;if(!pendingImage)return $("fxieImageFile").click();await mutate(async pdf=>{const pg=pdf.getPage(app.current().page-1),img=pendingImage.type==="image/png"?await pdf.embedPng(pendingImage.bytes):await pdf.embedJpg(pendingImage.bytes),w=Math.min(200,img.width,pg.getWidth()*.45),h=w*img.height/img.width;pg.drawImage(img,{x:Math.max(0,Math.min(pg.getWidth()-w,p.x/rendered.scale)),y:Math.max(0,Math.min(pg.getHeight()-h,pg.getHeight()-p.y/rendered.scale-h)),width:w,height:h})},"Image inserted in PDF.")}
function drawHighlightPreview(overlay){overlay.replaceChildren();const a=drawing.start,b=drawing.end;if(!a||!b)return;const square=el("div","fxie-highlight-box");Object.assign(square.style,{left:Math.min(a.x,b.x)+"px",top:Math.min(a.y,b.y)+"px",width:Math.abs(a.x-b.x)+"px",height:Math.abs(a.y-b.y)+"px"});overlay.append(square)}
async function applyHighlight(t){if(!t.start||!t.end)return;const a=t.start,b=t.end,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);if(w<4||h<4)return;await mutate(async pdf=>{pdf.getPage(app.current().page-1).drawRectangle({x:x/rendered.scale,y:(rendered.h-y-h)/rendered.scale,width:w/rendered.scale,height:h/rendered.scale,color:PDFLib.rgb(1,.77,.22),opacity:.24})},"Highlighted region. For privacy use Permanent Redaction.")}
function norm(s){return String(s||"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim()}
function score(a,b){a=norm(a);b=norm(b);if(a===b)return 100;if(a.includes(b)||b.includes(a))return 85;return a.split(" ").filter(w=>w.length>2&&b.includes(w)).length}
async function inspect(){
const d=app.current(),bytes=app.bytes(),key=d.name+":"+bytes.length+":"+d.page;
if(inspectCache?.key===key)return inspectCache.value;
if(consentKey!==d.name+":"+bytes.length){if(!confirm("To edit an existing paragraph, upload a temporary copy of this PDF to FoxPDF's processing server?"))return null;consentKey=d.name+":"+bytes.length}
const form=new FormData();form.append("file",new File([bytes],d.name,{type:"application/pdf"}));
const resp=await fetch("/api/advanced/inspect",{method:"POST",body:form,credentials:"omit"});if(!resp.ok){let message="Inspection was rejected";try{message=(await resp.json()).detail||message}catch{}throw Error(message)}
const val=await resp.json();inspectCache={key,value:val};return val}
async function chooseText(text,button,pageNum){
view.querySelectorAll(".fxie-textregion").forEach(a=>a.classList.remove("selected"));button.classList.add("selected");
selected={text,page:pageNum};$("fxieReplaceBox").hidden=false;$("fxieInsertBox").hidden=true;$("fxieReplacement").value=text;
$("fxieParagraph").replaceChildren(new Option("Loading available paragraphs…",""));
try{const info=await inspect();if(!info)return;const paras=(info.pages||[]).find(p=>Number(p.page)===pageNum)?.paragraphs||[];if(!paras.length)return say("No editable text paragraphs found. For scans, run OCR first.",true);
paras.sort((a,b)=>score(text,b.text||b.preview)-score(text,a.text||a.preview));
const select=$("fxieParagraph");select.replaceChildren();for(const p of paras.slice(0,65))select.add(new Option((p.mixed_styles?"⚠ ":"")+(p.index+1)+" · "+(p.preview||p.text||"").slice(0,85),String(p.index)));
selected.paras=paras;selected.index=paras[0].index;$("fxieReplacement").value=paras[0].text||paras[0].preview||text;say("Select and edit the text on the left. Mixed-style paragraphs may be blocked.");
}catch(e){say("Text inspection failed: "+e.message,true)}}
$("fxieParagraph").onchange=e=>{if(!selected?.paras)return;const p=selected.paras.find(x=>String(x.index)===e.target.value);if(p)$("fxieReplacement").value=p.text||p.preview||selected.text};
$("fxieApply").onclick=async()=>{if(!selected?.paras)return say("Choose a paragraph first.",true);const p=selected.paras.find(x=>String(x.index)===$("fxieParagraph").value);if(!p)return;if(p.mixed_styles)return say("This paragraph mixes fonts and cannot be safely reflowed.",true);const text=$("fxieReplacement").value.trim();if(!text)return say("Replacement cannot be empty. Use Redaction to remove text.",true);
if(!confirm("Apply guarded paragraph reflow? Complex formatting may change."))return;
const d=app.readCurrent(),form=new FormData();form.append("file",new File([d.bytes],d.name,{type:"application/pdf"}));form.append("operation","reflow");form.append("params",JSON.stringify({page:selected.page,index:p.index,text,preserve_font:true}));
try{say("Editing paragraph…");const response=await fetch("/api/advanced/process",{method:"POST",body:form,credentials:"omit"});if(!response.ok){let m="Reflow rejected";try{m=(await response.json()).detail||m}catch{}throw Error(m)}
const data=new Uint8Array(await response.arrayBuffer());if(d.bytes.length<8*1024*1024){undo.push(d.bytes);if(undo.length>7)undo.shift();redo=[]}await app.replace(data);selected=null;inspectCache=null;$("fxieReplaceBox").hidden=true;say("Paragraph updated. Inspect it visually and Save PDF.");}catch(e){say("Editing could not finish: "+e.message,true)}};
for(const b of view.querySelectorAll("[data-mode]"))b.onclick=()=>setMode(b.dataset.mode);
const bind=(id,fn)=>{$(id).onclick=fn};
bind("fxieSelect",()=>setMode("select"));bind("fxieText",()=>setMode("text"));bind("fxieImage",()=>setMode("image"));bind("fxieHighlight",()=>setMode("highlight"));
bind("fxieHome",()=>$("fxTopHome")?.click());bind("fxieTools",()=>window.FoxPDFPro?.open("tools"));bind("fxieOrganize",()=>app.click("reorder"));bind("fxieConvert",()=>app.advanced("convert"));bind("fxieSign",()=>window.FoxPDFReviews?.sign());
bind("fxieSave",()=>app.save());bind("fxieShare",()=>window.FoxPDFReviews?.share());bind("fxiePrint",()=>window.FoxPDFPro?.open("print"));
bind("fxieAdvanced",()=>{app.click("advancedToggle");say("Advanced tools are below the editor in your document workspace.")});bind("fxieChisa",()=>{$("chat").hidden=false});bind("fxieComments",()=>window.FoxPDFPro?.open("annotate"));
bind("fxieSearch",()=>window.FoxPDFPro?.open("search"));bind("fxieProperties",()=>window.FoxPDFPro?.open("metadata"));bind("fxieMarkup",()=>window.FoxPDFPro?.open("annotate"));
bind("fxiePages",()=>document.body.classList.toggle("fxie-show-thumbnails"));bind("fxieRotate",()=>app.click("rotate"));bind("fxieAddPage",()=>app.click("blankPage"));bind("fxieDelete",()=>app.click("delete"));
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
if(app.current()){$("fxieFilename").textContent=app.current().name}
});
})();