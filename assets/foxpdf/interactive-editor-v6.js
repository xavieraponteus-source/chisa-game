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
'<header class="fxie-topbar"><div class="fxie-tabs"><strong class="fxie-pdf">PDF</strong><button id="fxieHome">⌂ Home</button><button id="fxieTools">Tools</button><button class="selected">Edit</button><button id="fxieOrganize">Organize</button><button id="fxieConvert">Convert</button><button id="fxieSign">E-Sign</button></div><div class="fxie-filename" id="fxieFilename">PDF Editor</div><div class="fxie-topright"><button id="fxiePrint" title="Print">⎙</button><button id="fxieDrawSignature" title="Handwrite a visible signature">✍ Draw Signature</button><button id="fxieDigitalSign" class="fxie-sign-primary" title="Cryptographically sign a PDF with a certificate">✦ Digital Signature</button><button id="fxieShare">Share</button><button id="fxieSave" class="fxie-primary">⇩ Save PDF</button></div></header>',
'<div class="fxie-layout"><aside class="fxie-left"><div class="fxie-lefthead"><h2>Edit</h2><div><button id="fxiePanelDone" class="fxie-paneldone" type="button">Done</button><button id="fxieInfo" title="About editing">⚙</button></div></div>',
'<p class="fxie-label">EDIT CONTENT</p><button class="fxie-tool selected" data-mode="select"><i>↖</i> Select text</button><button class="fxie-tool" data-mode="edit"><i>✎</i> Edit existing text</button>',
'<p class="fxie-label">ADD CONTENT</p><button class="fxie-tool" data-mode="text"><i>T</i> Text</button><button class="fxie-tool" data-mode="image"><i>▧</i> Image</button><button class="fxie-tool" data-mode="highlight"><i>▰</i> Highlight</button><button class="fxie-tool" data-mode="draw"><i>✍</i> Draw / Handwrite</button><div class="fxie-ink-options"><label>Pen thickness <input id="fxiePenWidth" type="range" min="0.75" max="8" step="0.25" value="2.5"></label><span id="fxiePenLabel">2.5 pt</span></div><button class="fxie-tool" id="fxieComments"><i>☏</i> Comments & annotations</button>',
'<p class="fxie-label">TEXT FORMAT</p><div class="fxie-controls"><label>Font style<select id="fxieFont"><option value="Helvetica">Helvetica</option><option value="HelveticaBold">Helvetica Bold</option><option value="HelveticaOblique">Helvetica Italic</option><option value="HelveticaBoldOblique">Helvetica Bold Italic</option><option value="TimesRoman">Times Roman</option><option value="TimesRomanBold">Times Bold</option><option value="TimesRomanItalic">Times Italic</option><option value="TimesRomanBoldItalic">Times Bold Italic</option><option value="Courier">Courier</option><option value="CourierBold">Courier Bold</option><option value="CourierOblique">Courier Oblique</option><option value="CourierBoldOblique">Courier Bold Italic</option><option value="Symbol">Symbol</option><option value="ZapfDingbats">Zapf Dingbats</option></select></label><div class="fxie-font-advanced"><button type="button" id="fxieFontScan" class="fxie-tool">Find installed fonts</button><button type="button" id="fxieFontUpload" class="fxie-tool">Import TTF/OTF</button><input type="file" id="fxieFontFile" accept=".ttf,.otf,font/ttf,font/otf" hidden></div><small id="fxieFontHelp">Core font styles are ready. Import an installed font file to embed it into the PDF.</small><div class="fxie-two"><label>Size<input type="number" id="fxieSize" min="5" max="80" value="14"></label><label>Color<input type="color" id="fxieColor" value="#172846"></label></div></div>',
'<div class="fxie-editbox" id="fxieReplaceBox" hidden><p class="fxie-label">SELECTED PARAGRAPH</p><label>Paragraph<select id="fxieParagraph"></select></label><label>Replacement text<textarea id="fxieReplacement" rows="5"></textarea></label><p class="fxie-caution">Local visual editing stays on your device; the original text may still be recoverable or searchable. Advanced reflow uses a temporary PDF upload over HTTPS to FoxPDF Railway without additional popups. Review the result before saving. For sensitive information use Permanent Redaction.</p><button id="fxieApply" class="fxie-primary">Apply local text edit</button><button id="fxieCloudReflow" class="fxie-advanced-reflow" type="button">Advanced reflow · uses Railway</button></div>',
'<div class="fxie-editbox" id="fxieInsertBox" hidden><label>Text to insert<textarea id="fxieInsertText" rows="4">New text</textarea></label><p class="fxie-hint">Click on the PDF page to place your text.</p></div>',
'<div class="fxie-bottom"><button id="fxieAdvanced">Advanced tools</button><button id="fxieChisa">Ask Chisa for help</button><p>For privacy-sensitive text, use Permanent Redaction instead of covering content.</p></div></aside>',
'<section class="fxie-stage"><div class="fxie-editorbar"><div class="fxie-barleft"><button id="fxieUndo" title="Undo">↶</button><button id="fxieRedo" title="Redo">↷</button><span class="fxie-div"></span><button id="fxieSelect" class="selected" title="Select">↖</button><button id="fxieText" title="Add text">T</button><button id="fxieImage" title="Add image">▧</button><button id="fxieHighlight" title="Highlight">▰</button><button id="fxieDraw" title="Draw with mouse, touch, or stylus">✍ Draw</button></div><div class="fxie-barright"><button id="fxiePrev" title="Previous page">‹</button><strong id="fxieCount">0 / 0</strong><button id="fxieNext" title="Next page">›</button><span class="fxie-div"></span><button id="fxieMinus">−</button><select id="fxieZoom" aria-label="Zoom"><option value="fit">Fit width</option><option value=".75">75%</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option></select><button id="fxiePlus">+</button></div></div>',
'<div class="fxie-scroll" id="fxieScroll"><div class="fxie-sheetwrap" id="fxieSheetWrap"><p class="fxie-start">Open a PDF to start editing</p></div></div><div class="fxie-status" id="fxieStatus" aria-live="polite">Ready to edit</div></section>',
'<nav class="fxie-right" aria-label="Page actions"><button id="fxiePages" title="Page thumbnails">▤</button><button id="fxieRotate" title="Rotate page">↻</button><button id="fxieAddPage" title="Insert page">⊕</button><button id="fxieDelete" title="Delete page">⌫</button><hr><button id="fxieSearch" title="Search PDF">⌕</button><button id="fxieProperties" title="Document properties">▣</button><button id="fxieMarkup" title="Mark up PDF">✎</button></nav></div>',
'<input id="fxieImageFile" type="file" accept="image/png,image/jpeg" hidden>'
].join("");
main.append(view);
const fxieSplitEditStyle=document.createElement("style");
fxieSplitEditStyle.textContent=`.fxie-split-head{flex-wrap:wrap}.fxie-split-edit-actions{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;width:100%;order:3}.fxie-split-edit-action{border:1px solid #a58d46;border-radius:7px;background:#24202b;color:#f8e4ad;padding:6px 8px;font-size:12px;min-height:34px;touch-action:manipulation}.fxie-split-edit-action:focus-visible,.fxie-split-edit-action:hover{outline:2px solid #c7a94b}.fxie-split-canvas:focus-visible{outline:3px solid #e7c56e;outline-offset:3px}@media(max-width:700px){.fxie-split-edit-action{min-height:42px;padding:9px}}`;
document.head.append(fxieSplitEditStyle);
let mode="select",zoom="fit",renderVersion=0,rendered=null,selected=null,inspectCache=null,consentKey="",undo=[],redo=[],historyName="",pendingImage=null,drawing=null,lastPdf=null,inkStroke=null;
let moveSession=null,dragTextHandle=null; // Last locally applied text remains repositionable.
let inkSession=null; // Most recently drawn stroke, movable and resizable.
const say=(message,bad=false)=>{const s=$("fxieStatus");s.textContent=message;s.dataset.bad=bad?"1":"0"};
function check(){const d=app.current();if(!d){app.say("Please open a PDF first.");app.open();return null}return d}
function setMode(m){mode=m;view.classList.remove("fxie-drawer-closed");view.dataset.mode=m;selected=null;closeInline();const sheet=$("fxieSheetWrap").querySelector(".fxie-sheet");if(sheet){showMovableText(sheet);showMovableInk(sheet);fxieShowImageControls();}$("fxieReplaceBox").hidden=true;$("fxieInsertBox").hidden=m!=="text";for(const b of view.querySelectorAll("[data-mode]"))b.classList.toggle("selected",b.dataset.mode===m);for(const [id,key] of [["fxieSelect","select"],["fxieText","text"],["fxieImage","image"],["fxieHighlight","highlight"],["fxieDraw","draw"]])$(id).classList.toggle("selected",m===key);
say(({select:"Select a text region on the page.",edit:"Click existing text to edit its paragraph.",text:"Enter text on the left, then click the page.",image:"Choose a picture, then click where it should go.",highlight:"Drag across a region on the page.",draw:"Draw on the PDF using your finger, mouse, or stylus. Tap Save PDF afterward."})[m]);if(m==="image"&&!pendingImage)$("fxieImageFile").click()}
async function getJs(){if(window.pdfjsLib)return window.pdfjsLib;if(!window.fxieJS)window.fxieJS=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";script.onload=()=>{if(!window.pdfjsLib)return reject(Error("PDF renderer not found"));pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";resolve(pdfjsLib)};script.onerror=()=>reject(Error("PDF renderer could not load"));document.head.append(script)});return window.fxieJS}
function point(e){if(!rendered)return null;const r=rendered.canvas.getBoundingClientRect();if(!r.width||!r.height)return null;return{x:(e.clientX-r.left)/r.width*rendered.w,y:(e.clientY-r.top)/r.height*rendered.h}}

/* Both PDF canvases use the same scale and equal-width, equal-height preview frames.
   Different original page aspect ratios are centered, never stretched or cropped. */
async function spreadMetrics(reader,leftPage,rightPage){
 const container=$("fxieScroll");
 const left=(await reader.getPage(leftPage)).getViewport({scale:1});
 const right=(await reader.getPage(rightPage)).getViewport({scale:1});
 const mobile=window.matchMedia("(max-width:650px)").matches;
 const width=Math.max(190,mobile?container.clientWidth-30:(container.clientWidth-68)/2);
 const maxWidth=Math.max(left.width,right.width),maxHeight=Math.max(left.height,right.height);
 const scale=zoom==="fit"?Math.max(.20,Math.min(2.5,(width-30)/maxWidth)):Number(zoom);
 return{scale,frameWidth:width,frameHeight:Math.ceil(maxHeight*scale+28),left,right};
}

async function draw(){
if(!document.body.classList.contains("fx-mode-editor"))return;
const d=app.current();if(!d)return;
const token=++renderVersion;$("fxieFilename").textContent=d.name;$("fxieCount").textContent=d.page+" / "+d.pages;say("Rendering page "+d.page+"…");
try{
 const pdfjs=await getJs(),reader=await pdfjs.getDocument({data:app.bytes().slice(0)}).promise;
 if(token!==renderVersion){reader.destroy();return}
 const page=await reader.getPage(d.page),base=page.getViewport({scale:1}),container=$("fxieScroll");
 const spread=splitPage?await spreadMetrics(reader,d.page,Math.min(splitPage,reader.numPages)):null;
 if(token!==renderVersion){reader.destroy();return}
 const effectiveWidth=Math.max(330,container.clientWidth);
 const scale=spread?spread.scale:(zoom==="fit"?Math.min(2.5,Math.max(.45,(effectiveWidth-55)/base.width)):Number(zoom));
 const vp=page.getViewport({scale});
 if(spread)container.style.setProperty("--fxie-spread-frame-height",spread.frameHeight+"px");
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
 overlay.addEventListener("pointerdown",startInk);
 overlay.addEventListener("pointermove",moveInk);
 overlay.addEventListener("pointerup",finishInk);
 overlay.addEventListener("pointercancel",cancelInk);

 const pageFrame=$("fxieSheetWrap");
 if(splitPage){
  const caption=el("div","fxie-left-spread-head","Page "+d.page+" · current");
  pageFrame.replaceChildren(caption,sheet);
 }else pageFrame.replaceChildren(sheet);
 if(lastPdf&&lastPdf!==reader)lastPdf.destroy?.();lastPdf=reader;
 rendered={scale,canvas,overlay,w:vp.width,h:vp.height,page:page,originalWidth:base.width,originalHeight:base.height};
 showMovableText(sheet);showMovableInk(sheet);fxieShowImageControls();findRefreshVisible();
 say("Page "+d.page+" · "+count+" selectable text regions");
}catch(e){$("fxieSheetWrap").replaceChildren(el("p","fxie-error","Unable to show page: "+e.message));say("PDF rendering failed: "+e.message,true)}
}
/* Serialize all local edits across both panes so rapid pen strokes, text and images
   cannot overwrite one another's PDF bytes. Keep a bounded, unified undo history. */
let fxieMutationChain=Promise.resolve(),fxieHistoryBytes=0;
function fxieRememberUndo(bytes){
 const snap=bytes.slice();undo.push(snap);fxieHistoryBytes+=snap.byteLength;redo=[];
 while(undo.length>12||fxieHistoryBytes>48*1024*1024){
  const removed=undo.shift();if(removed)fxieHistoryBytes-=removed.byteLength;
 }
}
async function mutate(fn,description){
 const job=async()=>{
  const original=app.readCurrent();if(!original)return false;
  if(!window.PDFLib){say("Editing engine is unavailable.",true);return false}
  try{
   const pdf=await PDFLib.PDFDocument.load(original.bytes.slice());
   await fn(pdf);
   const result=new Uint8Array(await pdf.save({useObjectStreams:true}));
   const live=app.readCurrent();
   if(!live||live.name!==original.name){say("Document changed during editing. Your original file is safe.",true);return false}
   fxieRememberUndo(original.bytes);
   await app.replace(result);
   say(description);
   return true;
  }catch(err){say("Edit failed: "+String(err?.message||err),true);return false}
 };
 const run=fxieMutationChain.then(job,job);
 fxieMutationChain=run.then(()=>{},()=>{});
 return run;
}

const fxieFontBytes = new Map();
let fxieFontKitPromise = null;
async function fxieFontKit(){
 if(window.fontkit) return window.fontkit;
 if(!fxieFontKitPromise) fxieFontKitPromise = new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js";
  script.async=true;script.onload=()=>window.fontkit?resolve(window.fontkit):reject(Error("Font extension did not load"));
  script.onerror=()=>reject(Error("Font extension is unavailable; check your connection"));
  document.head.appendChild(script);
 });
 return fxieFontKitPromise;
}
async function fxieEmbedSelectedFont(pdf, name){
 const choice=name||$("fxieFont").value;
 if(fxieFontBytes.has(choice)){
  pdf.registerFontkit(await fxieFontKit());
  return pdf.embedFont(fxieFontBytes.get(choice),{subset:true});
 }
 return pdf.embedFont(PDFLib.StandardFonts[choice]||PDFLib.StandardFonts.Helvetica);
}
function fxieAddFontOption(label,bytes,style){
 const key="custom:"+label+":"+fxieFontBytes.size;
 fxieFontBytes.set(key,new Uint8Array(bytes));
 const option=new Option(label,key);option.style.fontFamily=label.split(" — ")[0];
 $("fxieFont").add(option);$("fxieFont").value=key;
 $("fxieFontHelp").textContent=label+" — ready to embed with your PDF.";
}
$("fxieFontUpload").onclick=()=>$("fxieFontFile").click();
$("fxieFontFile").onchange=async e=>{
 const file=e.target.files?.[0];e.target.value="";
 if(!file)return;
 if(!/\.(ttf|otf)$/i.test(file.name)||file.size>12*1024*1024){
  say("Choose a TTF or OTF font file smaller than 12 MB.",true);return;
 }
 try { fxieAddFontOption(file.name.replace(/\.(ttf|otf)$/i,""),await file.arrayBuffer()); }
 catch(err){ say("Font could not be loaded: "+err.message,true); }
};
$("fxieFontScan").onclick=async ()=>{
 if(!("queryLocalFonts" in window)){say("This browser cannot list installed fonts. Use Import TTF/OTF instead.",true);return;}
 try{
  const fonts=await window.queryLocalFonts();
  if(!fonts.length){say("No locally installed fonts were authorized.",true);return;}
  const already=new Set([...$("fxieFont").options].map(x=>x.textContent));
  for(const font of fonts.slice(0,600)){
   const label=font.family+" — "+font.style;
   if(already.has(label))continue;
   const key="device:"+font.postscriptName;
   if(fxieFontBytes.has(key))continue;
   try {
    const blob=await font.blob(),data=await blob.arrayBuffer();
    if(data.byteLength>12*1024*1024)continue;
    fxieFontBytes.set(key,new Uint8Array(data));
    const option=new Option(label,key);option.style.fontFamily=font.family;
    $("fxieFont").add(option);already.add(label);
   }catch{}
  }
  $("fxieFontHelp").textContent="Available device fonts are listed. Selected fonts will be embedded in exported PDFs.";
 }catch(err){say("Font access denied or unsupported. Import TTF/OTF instead.",true);}
};


function color(){return textInk($("fxieColor").value)}
function textInk(hex){const v=String(hex||"#172846").replace("#","");return PDFLib.rgb(parseInt(v.slice(0,2),16)/255,parseInt(v.slice(2,4),16)/255,parseInt(v.slice(4,6),16)/255)}
/* FXIE_MOVABLE_TEXT_V14 — local visual text can be dragged, resized in the textarea,
   repositioned after Apply, and saved into PDF content without a cloud upload.
   Each drag recomposes the most recently edited text from its pre-edit PDF,
   preventing overlapping duplicates from repeated moves. */
async function paintMovableText(doc,session){
 const pg=doc.getPage(session.page-1),dimensions=pg.getSize();
 if(pg.getRotation().angle%360!==0)throw Error("This rotated page cannot be edited locally yet. Use Advanced reflow.");
 if(session.cover){
  const b=session.cover.box,sc=b.scale;
  const x=Math.max(0,b.x/sc),height=Math.max(2,b.height/sc),width=Math.max(2,b.width/sc);
  const baseline=dimensions.height-b.baseline/sc,coverY=Math.max(0,baseline-2.1);
  const coverHeight=Math.min(dimensions.height-coverY,height+5);
  if(x+width>dimensions.width+5||coverY+coverHeight>dimensions.height+1)throw Error("Original text region outside page.");
  pg.drawRectangle({x:Math.max(0,x-1.3),y:coverY,width:Math.min(width+3.5,dimensions.width-x+1.3),height:coverHeight,color:PDFLib.rgb(...session.cover.background.map(v=>v/255))});
 }
 if(!session.text.trim())return;
 const font=await fxieEmbedSelectedFont(doc,session.fontName),size=session.size;
 const destX=Math.max(0,Math.min(dimensions.width-6,session.x));
 const destY=Math.max(0,Math.min(dimensions.height-size*.25,session.y));
 const width=Math.max(12,Math.min(dimensions.width-destX-3,session.width));
 pg.drawText(session.text,{x:destX,y:destY,font,size,color:textInk(session.hex),maxWidth:width,lineHeight:size*1.16});
}
function currentBytes(){return app.readCurrent()?.bytes||null}
function equalBytes(a,b){
 if(!a||!b||a.length!==b.length)return false;
 if(a===b)return true;
 // Check the whole byte sequence before rewriting a PDF, to avoid overwriting later edits.
 for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
 return true;
}
function rememberMovable(session,description){
 if(!session)return;
 const bytes=currentBytes();
 if(!bytes)return;
 session.latestBytes=bytes.slice();
 moveSession=session;
 requestAnimationFrame(()=>{
  const sheet=$("fxieSheetWrap").querySelector(".fxie-sheet");
  if(sheet&&rendered&&app.current()?.page===session.page)showMovableText(sheet);
 });
 say(description||"Text applied. Drag the blue outline to move it; Save PDF keeps its position.");
}
async function placeText(p){
 if(!p||!check())return;
 const value=$("fxieInsertText").value;
 if(!value.trim())return say("Type some text first.",true);
 const size=Number($("fxieSize").value);
 if(size<5||size>80)return say("Font size must be between 5 and 80.",true);
 const d=app.current(),orig=app.readCurrent(),scale=rendered.scale;
 const fontName=$("fxieFont").value,hex=$("fxieColor").value;
 const x=p.x/scale,y=rendered.originalHeight-p.y/scale-size;
 const session={page:d.page,name:d.name,baseBytes:orig.bytes.slice(),text:value,size,fontName,hex,
  fontFamily:$("fxieFont").selectedOptions[0]?.textContent||"Arial",x,y,
  width:Math.max(18,rendered.originalWidth-x-8),cover:null};
 const success=await mutate(async pdf=>paintMovableText(pdf,session),"Text inserted. Drag its blue border to reposition it.");
 if(success){setMode("select");rememberMovable(session);}
}
/* Fast image placement: preview, drag, free/ratio resizing and apply without
   re-encoding a PDF until the user finishes. Both page panes share this engine.
   Existing PDF images are not claimed as individually selectable objects. */
let fxieImageSession=null,fxieImageObjectUrl=null;
function fxiePreviewURL(asset){
 if(fxieImageObjectUrl)URL.revokeObjectURL(fxieImageObjectUrl);
 fxieImageObjectUrl=URL.createObjectURL(new Blob([asset.bytes],{type:asset.type}));
 return fxieImageObjectUrl;
}
function fxiePrepareImage(asset){
 return new Promise((resolve,reject)=>{
  const url=fxiePreviewURL(asset),img=new Image();
  img.onload=()=>resolve({url,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight});
  img.onerror=()=>reject(Error("Cannot preview this image"));img.src=url;
 });
}
function fxieImageBounds(box,w,h){
 const width=Math.max(24,Math.min(w,box.width)),height=Math.max(24,Math.min(h,box.height));
 return {x:Math.max(0,Math.min(w-width,box.x)),y:Math.max(0,Math.min(h-height,box.y)),width,height};
}
function fxieImageSurface(){
 const state=fxieImageSession;if(!state)return null;
 const left=app.current();
 if(left?.page===state.page)return {sheet:$("fxieSheetWrap").querySelector(".fxie-sheet"),scale:rendered?.scale||1};
 if(splitPage===state.page){const sheet=splitPane?.querySelector(".fxie-right-edit-sheet");return {sheet,scale:Number(sheet?.dataset.imageScale)||1}}
 return null;
}
function fxieImageStage(asset,page,p,scale){
 const doc=app.readCurrent();if(!doc)return;
 if(fxieImageSession?.latestBytes&&!equalBytes(doc.bytes,fxieImageSession.latestBytes))fxieImageSession=null;
 const img=asset.preview;if(!img)return say("Image preview is still loading.",true);
 const width=Math.min(190,Math.max(65,img.naturalWidth*scale*.65));
 const height=width*img.naturalHeight/img.naturalWidth;
 const bounds=(app.current()?.page===page?$("fxieSheetWrap").querySelector(".fxie-sheet"):splitPane?.querySelector(".fxie-right-edit-sheet"));
 const box=fxieImageBounds({x:p.x,y:p.y,width,height},bounds?.clientWidth||Math.max(p.x+width,400),bounds?.clientHeight||Math.max(p.y+height,550));
 fxieImageSession={name:doc.name,page,asset,box,scale,baseBytes:doc.bytes.slice(),latestBytes:null,busy:false};
 if(!fxieImageObjectUrl||img.url!==fxieImageObjectUrl)fxiePreviewURL(asset);
 fxieShowImageControls();
 say("Image placed. Drag to move; drag a corner to resize; tap Apply when ready.");
}
async function fxieImageCommit(state){
 if(state.busy)return;
 state.busy=true;
 const job=async()=>{
  const current=app.readCurrent();
  if(!current||current.name!==state.name||!equalBytes(current.bytes,state.latestBytes||state.baseBytes))throw Error("The document changed. Reinsert the image to avoid overwriting other edits.");
  const pdf=await PDFLib.PDFDocument.load(state.baseBytes.slice());
  const pg=pdf.getPage(state.page-1),w=pg.getWidth(),h=pg.getHeight();
  const view=fxieImageSurface();
  const scale=view?.scale||state.scale||1;
  const x=Math.max(0,Math.min(w-2,state.box.x/scale)),width=Math.min(w-x,state.box.width/scale);
  const height=Math.min(h,state.box.height/scale),y=Math.max(0,Math.min(h-height,h-(state.box.y+state.box.height)/scale));
  const bytes=state.asset.bytes,type=state.asset.type;
  const img=type==="image/png"?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
  pg.drawImage(img,{x,y,width,height});
  const output=new Uint8Array(await pdf.save({useObjectStreams:true}));
  fxieRememberUndo(current.bytes);
  state.latestBytes=output.slice();state.scale=scale;
  try{await app.replace(output)}catch(err){state.latestBytes=null;throw err}
  state.busy=false;
  say("Image applied. Select it to move or resize again, then Apply.");
  fxieShowImageControls();
  return true;
 };
 const run=fxieMutationChain.then(job,job);
 fxieMutationChain=run.catch(()=>{});
 try{return await run}catch(err){state.busy=false;say("Image edit not applied: "+String(err?.message||err),true);return false}
}
function fxieShowImageControls(){
 const state=fxieImageSession;
 document.querySelectorAll(".fxie-image-selection").forEach(x=>x.remove());
 if(!state)return;
 const current=app.readCurrent();
 if(!current||current.name!==state.name||!equalBytes(current.bytes,state.latestBytes||state.baseBytes)){fxieImageSession=null;return}
 const surface=fxieImageSurface();
 if(!surface?.sheet)return;
 const sheet=surface.sheet,scale=surface.scale;
 state.scale=scale;
 const frame=el("div","fxie-image-selection");
 const fit=()=>{const b=fxieImageBounds(state.box,sheet.clientWidth,sheet.clientHeight);Object.assign(state.box,b);Object.assign(frame.style,{left:b.x+"px",top:b.y+"px",width:b.width+"px",height:b.height+"px"})};
 frame.setAttribute("role","group");frame.setAttribute("aria-label","Selected image. Drag to move or use resizing handles.");
 const preview=el("img","fxie-image-preview");preview.draggable=false;preview.alt="Inserted image, selectable and resizable";
 preview.src=state.asset.preview.url;frame.append(preview);
 const toolbar=el("div","fxie-image-toolbar");
 const button=(caption,action,title)=>{const b=el("button","fxie-image-action",caption);b.type="button";b.title=title;b.setAttribute("aria-label",title);b.onclick=e=>{e.stopPropagation();action()};toolbar.append(b);return b};
 button("✓ Apply",()=>fxieImageCommit(state),"Apply image to PDF");
 button("−",()=>{state.box.width*=.85;state.box.height*=.85;fit()},"Make image smaller");
 button("+",()=>{state.box.width*=1.15;state.box.height*=1.15;fit()},"Make image bigger");
 button("⌫",async()=>{if(state.latestBytes){const current=app.readCurrent();if(!current||!equalBytes(current.bytes,state.latestBytes))return;fxieRememberUndo(current.bytes);await app.replace(state.baseBytes.slice())}fxieImageSession=null;frame.remove();say("Image removed.");},"Remove selected image");
 button("Done",()=>{frame.remove();say("Image controls closed. Select Image to add another.")},"Finish selecting image");
 frame.append(toolbar);
 const grip=el("button","fxie-image-resize","⤡");grip.type="button";grip.title="Drag to resize image";
 frame.append(grip);
 const widthGrip=el("button","fxie-image-resize fxie-image-width","↔");widthGrip.type="button";widthGrip.title="Resize image width";frame.append(widthGrip);
 const heightGrip=el("button","fxie-image-resize fxie-image-height","↕");heightGrip.type="button";heightGrip.title="Resize image height";frame.append(heightGrip);
 let pointer=null;
 frame.addEventListener("pointerdown",e=>{
  if(e.target.closest(".fxie-image-toolbar"))return;
  e.stopPropagation();e.preventDefault();
  const resizing=e.target.closest(".fxie-image-resize");
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,box:{...state.box},resize:resizing?.classList.contains("fxie-image-width")?"width":resizing?.classList.contains("fxie-image-height")?"height":resizing?"both":"move"};
  frame.setPointerCapture(e.pointerId);
 });
 frame.addEventListener("pointermove",e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const rect=sheet.getBoundingClientRect(),dx=(e.clientX-pointer.x)*sheet.clientWidth/Math.max(1,rect.width),dy=(e.clientY-pointer.y)*sheet.clientHeight/Math.max(1,rect.height);
  const start=pointer.box;
  const next={...start};
  if(pointer.resize==="move"){next.x+=dx;next.y+=dy}
  else{if(pointer.resize!=="height")next.width=Math.max(24,start.width+dx);if(pointer.resize!=="width")next.height=Math.max(24,start.height+dy)}
  state.box=fxieImageBounds(next,sheet.clientWidth,sheet.clientHeight);fit();
 });
 frame.addEventListener("pointerup",e=>{if(pointer?.id===e.pointerId){pointer=null;say("Image adjusted. Tap Apply to save its position.")}});
 frame.addEventListener("pointercancel",()=>{pointer=null});
 fit();sheet.append(frame);
}
$("fxieImageFile").onchange=async e=>{
 const f=e.target.files?.[0];e.target.value="";if(!f)return;
 if(!["image/png","image/jpeg"].includes(f.type)||f.size>12*1024*1024)return say("Select a PNG/JPEG under 12 MB.",true);
 try{
  const bytes=new Uint8Array(await f.arrayBuffer()),asset={bytes,type:f.type};
  asset.preview=await fxiePrepareImage(asset);pendingImage=asset;
  say("Image ready. Tap either PDF page to place, move, and resize it.");
 }catch(e){say("Unable to load image: "+e.message,true)}
};
function placeImage(p){
 const doc=check();if(!p||!doc)return;
 if(!pendingImage){$("fxieImageFile").click();return}
 fxieImageStage(pendingImage,doc.page,p,rendered.scale);
}
function drawHighlightPreview(overlay){overlay.replaceChildren();const a=drawing.start,b=drawing.end;if(!a||!b)return;const square=el("div","fxie-highlight-box");Object.assign(square.style,{left:Math.min(a.x,b.x)+"px",top:Math.min(a.y,b.y)+"px",width:Math.abs(a.x-b.x)+"px",height:Math.abs(a.y-b.y)+"px"});overlay.append(square)}
async function applyHighlight(t){if(!t.start||!t.end)return;const a=t.start,b=t.end,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);if(w<4||h<4)return;await mutate(async pdf=>{pdf.getPage(app.current().page-1).drawRectangle({x:x/rendered.scale,y:(rendered.h-y-h)/rendered.scale,width:w/rendered.scale,height:h/rendered.scale,color:PDFLib.rgb(1,.77,.22),opacity:.24})},"Highlighted region. For privacy use Permanent Redaction.")}


/* Draw strokes into the actual PDF page. Pointer capture enables pens, fingers and mice. */
function inkThickness(){return Math.max(.75,Math.min(8,Number($("fxiePenWidth")?.value)||2.5))}
function startInk(event){
 if(mode!=="draw"||!rendered||inkStroke)return;
 if(event.pointerType==="mouse"&&event.button!==0)return;
 const p=point(event);if(!p)return;
 event.preventDefault();
 try{event.currentTarget.setPointerCapture(event.pointerId)}catch(_){}
 const overlay=event.currentTarget,canvas=el("canvas","fxie-ink-preview");
 canvas.width=Math.max(1,Math.round(rendered.w*devicePixelRatio));
 canvas.height=Math.max(1,Math.round(rendered.h*devicePixelRatio));
 canvas.style.width=rendered.w+"px";canvas.style.height=rendered.h+"px";
 canvas.style.pointerEvents="none";overlay.append(canvas);
 const ctx=canvas.getContext("2d");
 ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
 ctx.lineJoin="round";ctx.lineCap="round";
 ctx.strokeStyle=$("fxieColor").value;ctx.fillStyle=$("fxieColor").value;
 ctx.lineWidth=inkThickness()*rendered.scale;
 ctx.beginPath();ctx.moveTo(p.x,p.y);
 ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.8,ctx.lineWidth/2),0,Math.PI*2);ctx.fill();
 inkStroke={pointerId:event.pointerId,page:app.current().page,scale:rendered.scale,points:[p],overlay,canvas,ctx,thickness:inkThickness(),color:$("fxieColor").value};
}
function moveInk(event){
 const state=inkStroke;if(!state||state.pointerId!==event.pointerId||mode!=="draw")return;
 event.preventDefault();
 const raw=typeof event.getCoalescedEvents==="function"?event.getCoalescedEvents():[event];
 for(const one of raw){
  const p=point(one);if(!p)continue;
  const last=state.points[state.points.length-1];
  if(Math.hypot(p.x-last.x,p.y-last.y)<.7)continue;
  if(state.points.length>=1800)break;
  state.ctx.beginPath();state.ctx.moveTo(last.x,last.y);state.ctx.lineTo(p.x,p.y);state.ctx.stroke();
  state.points.push(p);
 }
}
function cancelInk(event){
 if(!inkStroke||inkStroke.pointerId!==event.pointerId)return;
 const stroke=inkStroke;inkStroke=null;stroke.canvas.remove();
}

/* FXIE_RESIZABLE_INK_V15 — select, drag, resize drawn strokes directly on PDF.
   Recompose from the pre-stroke PDF so repeated moves never duplicate ink. */
function inkRect(points,thickness,w,h){
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),pad=Math.max(4,thickness*.5+4);
 const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);
 const x=Math.max(0,Math.min(w-4,loX-pad)),y=Math.max(0,Math.min(h-4,loY-pad));
 return {x,y,width:Math.max(10,Math.min(w-x,Math.max(28,hiX-loX+pad*2))),
  height:Math.max(10,Math.min(h-y,Math.max(26,hiY-loY+pad*2)))};
}
function inkConstrain(b,w,h){
 const width=Math.max(12,Math.min(w,b.width)),height=Math.max(12,Math.min(h,b.height));
 return {x:Math.max(0,Math.min(w-width,b.x)),y:Math.max(0,Math.min(h-height,b.y)),width,height};
}
function paintInkSession(doc,state){
 const page=doc.getPage(state.page-1);
 if(page.getRotation().angle%360!==0)throw Error("Drawing edits on rotated pages are not supported yet.");
 const from=state.original,to=state.box,ink=textInk(state.hex);
 const mapped=state.points.map(p=>({x:to.x+(p.x-from.x)*to.width/Math.max(1,from.width),
  y:to.y+(p.y-from.y)*to.height/Math.max(1,from.height)}));
 const weight=Math.max(.35,Math.min(30,state.thickness*Math.sqrt(to.width/from.width*to.height/from.height)));
 if(mapped.length===1){page.drawCircle({x:mapped[0].x,y:mapped[0].y,size:Math.max(.4,weight/2),color:ink});return}
 for(let k=1;k<mapped.length;k++)page.drawLine({start:mapped[k-1],end:mapped[k],thickness:weight,color:ink});
}
async function finishInk(e){
 const state=inkStroke;if(!state||state.pointerId!==e.pointerId)return;
 moveInk(e);inkStroke=null;state.canvas.remove();
 if(!state.points.length||state.page!==app.current()?.page||!rendered)return;
 const previous=app.readCurrent();if(!previous)return;
 const w=rendered.originalWidth,h=rendered.originalHeight;
 const coords=state.points.map(p=>({x:Math.max(0,Math.min(w,p.x/state.scale)),y:Math.max(0,Math.min(h,h-p.y/state.scale))}));
 const original=inkRect(coords,state.thickness,w,h);
 const session={name:previous.name,page:state.page,baseBytes:previous.bytes.slice(),
  latestBytes:null,original,box:{...original},points:coords,thickness:state.thickness,hex:state.color,busy:false,pageWidth:w,pageHeight:h};
 const ok=await mutate(async pdf=>paintInkSession(pdf,session),
   "Drawing added. Drag the blue selection to move it or resize using its handles.");
 if(!ok)return;
 moveSession=null;inkSession=session;
 session.latestBytes=app.readCurrent()?.bytes.slice()||null;
 setMode("select");
 const sheet=$("fxieSheetWrap").querySelector(".fxie-sheet");if(sheet)showMovableInk(sheet);
}
$("fxiePenWidth").oninput=event=>{$("fxiePenLabel").textContent=Number(event.target.value).toFixed(1)+" pt"};

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
 const editor=el("div","fxie-inline-editor");editor.setAttribute("role","group");editor.setAttribute("aria-label","Edit text and drag to reposition");
 const grip=el("button","fxie-inline-grip","↕ Drag to move text");grip.type="button";grip.title="Move the edited text on the PDF with a finger or mouse";grip.setAttribute("aria-label","Drag edited text to another position");
 const field=el("textarea","fxie-inline-input");field.value=selected.text;field.rows=1;field.setAttribute("aria-label","Edit selected text");
 field.style.fontSize=Math.max(12,box.height)+"px";field.style.fontFamily=box.fontFamily||"Arial, sans-serif";
 const bar=el("div","fxie-inline-buttons");
 const apply=el("button","fxie-inline-apply","✓ Apply & move");apply.type="button";
 const cancel=el("button","fxie-inline-cancel","✕ Cancel");cancel.type="button";
 bar.append(apply,cancel);editor.append(grip,field,bar);
 const width=Math.max(195,Math.min(rendered.w-box.x-6,Math.max(box.width+70,220)));
 const left=Math.max(1,Math.min(box.x-5,rendered.w-width-1)),top=Math.max(2,box.top-6);
 Object.assign(editor.style,{left:left+"px",top:top+"px",width:width+"px"});
 selected.moveDelta={x:0,y:0};
 editor.addEventListener("click",e=>e.stopPropagation());
 field.addEventListener("input",()=>{$("fxieReplacement").value=field.value});
 field.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeInline()}if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();applyLocal()}});
 let drag=null;
 grip.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:parseFloat(editor.style.left)||0,top:parseFloat(editor.style.top)||0};
  try{grip.setPointerCapture(e.pointerId)}catch(_){}
  editor.classList.add("fxie-inline-dragging");
 });
 grip.addEventListener("pointermove",e=>{
  if(!drag||e.pointerId!==drag.id)return;
  e.preventDefault();e.stopPropagation();
  const left=Math.max(0,Math.min(Math.max(0,rendered.w-editor.offsetWidth),drag.left+e.clientX-drag.x));
  const top=Math.max(0,Math.min(Math.max(0,rendered.h-50),drag.top+e.clientY-drag.y));
  editor.style.left=left+"px";editor.style.top=top+"px";
  if(selected)selected.moveDelta={x:left-(Math.max(1,Math.min(box.x-5,rendered.w-width-1))),y:top-(Math.max(2,box.top-6))};
 });
 const finish=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;editor.classList.remove("fxie-inline-dragging");say("New position selected. Press Apply & move to save it in the PDF.")};
 grip.addEventListener("pointerup",finish);grip.addEventListener("pointercancel",finish);
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
 const delta=state.moveDelta||{x:0,y:0};
 const moved=Math.abs(delta.x)>1||Math.abs(delta.y)>1;
 if(value===state.text&&!moved){closeInline();$("fxieReplaceBox").hidden=true;selected=null;return say("No changes made.")}
 if(value.length>800)return say("For long text blocks, use Advanced reflow. Local editing allows 800 characters.",true);
 if(!rendered)return say("Page preview isn't ready.",true);
 if(state.page!==app.current()?.page)return say("The selected page changed. Select the text again.",true);
 const box=state.box,colors=samplePixels(box),scale=box.scale;
 const fontName=$("fxieFont").value,size=Number($("fxieSize").value),hex=$("fxieColor").value;
 if(!Number.isFinite(size)||size<5||size>80)return say("Choose a font size between 5 and 80.",true);
 if(!colors.uniform)say("Complex background detected: a local visual edit may look imperfect. Review before sharing.",true);
 const source=app.readCurrent();
 if(!source)return say("Please reopen your PDF.",true);
 const sourceX=Math.max(0,box.x/scale),sourceY=rendered.originalHeight-box.baseline/scale;
 const x=Math.max(0,Math.min(rendered.originalWidth-6,sourceX+delta.x/scale));
 const y=Math.max(0,Math.min(rendered.originalHeight-size*.25,sourceY-delta.y/scale));
 const width=Math.max(18,Math.min(rendered.originalWidth-x-6,Math.max(box.width/scale*1.3,Math.max(value.length,state.text.length)*size*.6+20)));
 const session={page:state.page,name:source.name,baseBytes:source.bytes.slice(),text:value,size,fontName,hex,
  fontFamily:box.fontFamily||"Arial",x,y,width,
  cover:{box:{...box},background:colors.background.slice()}};
 const applied=await mutate(async doc=>paintMovableText(doc,session),
  colors.uniform?"Text updated. Drag its outline to move it, then Save PDF.":"Text updated. Review the background and use the blue outline to move it.");
 if(applied){closeInline();$("fxieReplaceBox").hidden=true;selected=null;rememberMovable(session)}
}
$("fxieApply").onclick=()=>applyLocal();

function showMovableText(sheet){
 sheet.querySelector(".fxie-move-frame")?.remove();
 if(mode==="draw"||mode==="highlight"||mode==="image")return;
 const session=moveSession,d=app.current();
 if(!session||!d||!rendered||d.page!==session.page||d.name!==session.name||!session.latestBytes)return;
 const liveBytes=currentBytes();
 if(!equalBytes(liveBytes,session.latestBytes)){moveSession=null;return}
 if(!session.text.trim())return;
 const sc=rendered.scale,height=rendered.originalHeight;
 const x=session.x*sc,top=(height-session.y-session.size*.93)*sc;
 const width=Math.max(55,Math.min(rendered.w-x-3,Math.max(session.size*sc*2.3,Math.min(session.width*sc,Math.max(92,session.text.length*session.size*sc*.53)))));
 const frame=el("div","fxie-move-frame");
 frame.setAttribute("role","group");frame.setAttribute("aria-label","Move last edited text");
 frame.title="Drag to move edited text with your mouse, finger, or stylus. The new position is saved into the PDF.";
 frame.style.left=Math.max(0,Math.min(rendered.w-width,x))+"px";
 frame.style.top=Math.max(0,Math.min(rendered.h-32,top))+"px";
 frame.style.width=width+"px";
 frame.style.minHeight=Math.max(24,session.size*sc*1.2)+"px";
 const grip=el("button","fxie-move-label","⠿ Move text");grip.type="button";grip.title="Drag to move text";
 const ghost=el("span","fxie-move-preview");ghost.textContent=session.text;
 ghost.style.fontFamily=session.fontFamily||"Arial, sans-serif";
 ghost.style.fontSize=(session.size*sc)+"px";ghost.style.color=session.hex;
 const done=el("button","fxie-move-done","✓ Done");done.type="button";done.title="Finish moving text";
 done.onclick=e=>{e.stopPropagation();frame.remove();say("Text position saved in the PDF. Tap Save PDF to download.")};
 frame.append(grip,ghost,done);
 let drag=null;
 const start=e=>{
  if(e.target.closest(".fxie-move-done"))return;
  if(e.pointerType==="mouse"&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:parseFloat(frame.style.left)||0,top:parseFloat(frame.style.top)||0};
  try{frame.setPointerCapture(e.pointerId)}catch(_){}
  frame.classList.add("fxie-moving");
 };
 frame.addEventListener("pointerdown",start);
 frame.addEventListener("pointermove",e=>{
  if(!drag||e.pointerId!==drag.id)return;
  e.preventDefault();e.stopPropagation();
  const x=Math.max(0,Math.min(rendered.w-frame.offsetWidth,drag.left+e.clientX-drag.startX));
  const y=Math.max(0,Math.min(rendered.h-Math.min(frame.offsetHeight,60),drag.top+e.clientY-drag.startY));
  frame.style.left=x+"px";frame.style.top=y+"px";
 });
 const stop=async(e,canceled=false)=>{
  if(!drag||e.pointerId!==drag.id)return;
  e.preventDefault();e.stopPropagation();
  const prev=drag;drag=null;frame.classList.remove("fxie-moving");
  if(canceled){frame.style.left=prev.left+"px";frame.style.top=prev.top+"px";return}
  const dx=(parseFloat(frame.style.left)||0)-prev.left,dy=(parseFloat(frame.style.top)||0)-prev.top;
  if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
  if(!equalBytes(currentBytes(),session.latestBytes)){frame.remove();moveSession=null;say("The PDF changed. Select the text again before moving it.",true);return}
  const oldX=session.x,oldY=session.y;
  session.x=Math.max(0,Math.min(rendered.originalWidth-5,session.x+dx/sc));
  session.y=Math.max(session.size*.25,Math.min(rendered.originalHeight-session.size*.25,session.y-dy/sc));
  frame.classList.add("fxie-move-busy");
  const current=app.readCurrent(),previous=current?.bytes?.slice();
  try{
   const pdf=await PDFLib.PDFDocument.load(session.baseBytes.slice());
   await paintMovableText(pdf,session);
   const updated=new Uint8Array(await pdf.save({useObjectStreams:true}));
   if(!equalBytes(currentBytes(),session.latestBytes))throw Error("PDF changed during the move");
   if(previous?.length<8*1024*1024){undo.push(previous);if(undo.length>7)undo.shift();redo=[]}
   session.latestBytes=updated.slice();
   await app.replace(updated);
   say("Text moved and PDF updated. Drag it again or choose Save PDF.");
   requestAnimationFrame(()=>{const currentSheet=$("fxieSheetWrap").querySelector(".fxie-sheet");if(currentSheet&&rendered)showMovableText(currentSheet)});
  }catch(err){
   session.x=oldX;session.y=oldY;
   frame.style.left=prev.left+"px";frame.style.top=prev.top+"px";
   say("Could not move text: "+err.message,true);
  }finally{frame.classList.remove("fxie-move-busy")}
 };
 frame.addEventListener("pointerup",e=>stop(e,false));
 frame.addEventListener("pointercancel",e=>stop(e,true));
 frame.addEventListener("lostpointercapture",e=>{if(drag&&e.pointerId===drag.id)stop(e,true)});
 sheet.append(frame);
}


function showMovableInk(sheet,pageOverride,scaleOverride,dimensions){
 sheet.querySelector(".fxie-ink-selection")?.remove();
 const state=inkSession,d=app.current(),pageNumber=pageOverride||d?.page;
 if(!state||!d||!rendered||!state.latestBytes||state.name!==d.name||state.page!==pageNumber)return;
 if((!pageOverride&&["draw","highlight","image","text"].includes(mode))||(pageOverride&&["draw","highlight","image","text"].includes(splitEditMode)))return;
 if(!equalBytes(currentBytes(),state.latestBytes)){inkSession=null;return}
 const sc=scaleOverride||rendered.scale,h=dimensions?.height||state.pageHeight||rendered.originalHeight,w=dimensions?.width||state.pageWidth||rendered.originalWidth,b=state.box;
 const frame=el("div","fxie-ink-selection");
 frame.setAttribute("role","group");frame.setAttribute("aria-label","Drawing selected; drag to move or resize");
 const toolbar=el("div","fxie-ink-toolbar");
 const button=(label,cls,title)=>{
  const a=el("button","fxie-ink-control "+cls,label);a.type="button";a.title=title;
  a.setAttribute("aria-label",title);return a;
 };
 const move=button("⠿ Move","fxie-ink-move","Drag here to move drawing");
 const smaller=button("−","fxie-ink-small","Make drawing smaller");
 const bigger=button("+","fxie-ink-big","Make drawing bigger");
 const more=button("✎","fxie-ink-more","Draw another stroke");
 const done=button("✓","fxie-ink-done","Finish adjusting drawing");
 const remove=button("⌫","fxie-ink-delete","Remove the selected drawing");
 const other=button("⇄ Other page","fxie-ink-other","Move this drawing to the other visible page");
 if(!splitPage)other.hidden=true;
 toolbar.append(move,smaller,bigger,other,more,done,remove);
 const width=button("↔","fxie-ink-grip fxie-ink-width","Drag horizontally to resize drawing width");
 const height=button("↕","fxie-ink-grip fxie-ink-height","Drag vertically to resize drawing height");
 const corner=button("⤡","fxie-ink-grip fxie-ink-corner","Drag corner to resize width and height");
 frame.append(toolbar,width,height,corner);
 function updatePosition(){
  const b=state.box;frame.style.left=(b.x*sc)+"px";frame.style.top=((h-b.y-b.height)*sc)+"px";
  frame.style.width=(b.width*sc)+"px";frame.style.height=(b.height*sc)+"px";
 }
 updatePosition();
 let interaction=null;
 frame.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  if(e.target.closest(".fxie-ink-control:not(.fxie-ink-move)"))return;
  const type=e.target.closest(".fxie-ink-corner")?"free":e.target.closest(".fxie-ink-width")?"width":e.target.closest(".fxie-ink-height")?"height":"move";
  e.preventDefault();e.stopPropagation();
  interaction={id:e.pointerId,type,clientX:e.clientX,clientY:e.clientY,rect:{...state.box}};
  try{frame.setPointerCapture(e.pointerId)}catch(_){}
  frame.classList.add("fxie-ink-dragging");
 });
 frame.addEventListener("pointermove",e=>{
  const v=interaction;if(!v||v.id!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();
  const dx=(e.clientX-v.clientX)/sc,dy=(e.clientY-v.clientY)/sc,old=v.rect,rect={...old};
  if(v.type==="move"){rect.x+=dx;rect.y-=dy}
  if(v.type==="width"||v.type==="free")rect.width=Math.max(12,old.width+dx);
  if(v.type==="height"||v.type==="free"){rect.height=Math.max(12,old.height+dy);rect.y=old.y-dy}
  state.box=inkConstrain(rect,w,h);
  updatePosition();
 });
 async function transferInk(targetPage,clientX=null,clientY=null){
  if(state.busy||targetPage===state.page||!equalBytes(currentBytes(),state.latestBytes))return;
  if(targetPage<1||targetPage>app.current().pages)return;
  state.busy=true;
  const oldPage=state.page,oldBox={...state.box},oldLatest=state.latestBytes;
  try{
   const pdf=await PDFLib.PDFDocument.load(state.baseBytes.slice());
   const destination=pdf.getPage(targetPage-1),width=destination.getWidth(),height=destination.getHeight();
   if(destination.getRotation().angle%360!==0)throw Error("Move between rotated pages isn't supported");
   const targetSurface=targetPage===splitPage?splitPane?.querySelector(".fxie-right-edit-sheet"):$("fxieSheetWrap").querySelector(".fxie-sheet");
   const targetScale=targetPage===splitPage?Number(targetSurface?.dataset.imageScale)||sc:rendered.scale;
   let x=oldBox.x,y=height-oldBox.height-oldBox.y;
   if(targetSurface&&clientX!==null&&clientY!==null){
    const rect=targetSurface.getBoundingClientRect();
    const px=(clientX-rect.left)*targetSurface.clientWidth/Math.max(1,rect.width),py=(clientY-rect.top)*targetSurface.clientHeight/Math.max(1,rect.height);
    x=px/targetScale-oldBox.width/2;y=height-py/targetScale-oldBox.height/2;
   }
   state.page=targetPage;state.pageWidth=width;state.pageHeight=height;
   state.box=inkConstrain({x,y,width:oldBox.width,height:oldBox.height},width,height);
   paintInkSession(pdf,state);
   const output=new Uint8Array(await pdf.save({useObjectStreams:true}));
   if(!equalBytes(currentBytes(),oldLatest))throw Error("PDF changed during move");
   const previous=app.readCurrent().bytes;fxieRememberUndo(previous);
   state.latestBytes=output.slice();
   await app.replace(output);
   say("Drawing moved to page "+targetPage+". Drag or resize it again, then save.");
   if(targetPage===splitPage)requestAnimationFrame(()=>{const right=splitPane?.querySelector(".fxie-right-edit-sheet");if(right)showMovableInk(right,targetPage,Number(right.dataset.imageScale)||1,{width,height})});
   else requestAnimationFrame(()=>{const left=$("fxieSheetWrap").querySelector(".fxie-sheet");if(left)showMovableInk(left)});
  }catch(err){
   state.page=oldPage;state.box=oldBox;state.latestBytes=oldLatest;
   say("Unable to transfer drawing: "+String(err?.message||err),true);
  }finally{state.busy=false}
 }
 async function commit(next,previous,description){
  if(state.busy)return;
  if(!equalBytes(currentBytes(),state.latestBytes)){
   frame.remove();inkSession=null;say("PDF changed. Draw again to select a new stroke.",true);return;
  }
  state.busy=true;frame.classList.add("fxie-ink-busy");
  try{
   const doc=await PDFLib.PDFDocument.load(state.baseBytes.slice());
   state.box=inkConstrain(next,doc.getPage(state.page-1).getWidth(),doc.getPage(state.page-1).getHeight());
   paintInkSession(doc,state);
   const updated=new Uint8Array(await doc.save({useObjectStreams:true}));
   if(!equalBytes(currentBytes(),state.latestBytes))throw Error("PDF changed while adjusting drawing");
   const old=app.readCurrent()?.bytes;
   if(old)fxieRememberUndo(old);
   state.latestBytes=updated.slice();
   await app.replace(updated);
   say(description||"Drawing updated. Move or resize it again, then Save PDF.");
   const now=$("fxieSheetWrap").querySelector(".fxie-sheet");if(now)showMovableInk(now);
  }catch(err){
   state.box={...previous};updatePosition();
   say("Couldn't adjust drawing: "+err.message,true);
  }finally{state.busy=false;frame.classList.remove("fxie-ink-busy")}
 }
 frame.addEventListener("pointerup",e=>{
  if(!interaction||interaction.id!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();
  const v=interaction;interaction=null;frame.classList.remove("fxie-ink-dragging");
  const over=document.elementFromPoint(e.clientX,e.clientY);
  const targetRight=over?.closest(".fxie-right-edit-sheet");
  const targetLeft=over?.closest(".fxie-sheet");
  const targetPage=targetRight?splitPage:targetLeft?app.current()?.page:0;
  if(v.type==="move"&&targetPage&&targetPage!==state.page){transferInk(targetPage,e.clientX,e.clientY);return}
  const changed=Object.keys(state.box).some(k=>Math.abs(state.box[k]-v.rect[k])>.3);
  if(changed)commit({...state.box},v.rect,"Drawing position and size saved in PDF.");
 });
 frame.addEventListener("pointercancel",e=>{
  if(interaction?.id!==e.pointerId)return;state.box={...interaction.rect};interaction=null;
  frame.classList.remove("fxie-ink-dragging");updatePosition();
 });
 frame.addEventListener("lostpointercapture",e=>{
  if(interaction?.id!==e.pointerId)return;
  const v=interaction;interaction=null;
  if(Object.keys(state.box).some(k=>Math.abs(state.box[k]-v.rect[k])>.3))commit({...state.box},v.rect,"Drawing adjusted.");
 });
 const stopEvent=e=>{e.preventDefault();e.stopPropagation()};
 for(const a of [smaller,bigger,other,more,done,remove])a.addEventListener("pointerdown",stopEvent);
 other.onclick=e=>{stopEvent(e);if(splitPage&&app.current()?.page&&splitPage!==app.current().page)transferInk(state.page===splitPage?app.current().page:splitPage)};
 bigger.onclick=e=>{stopEvent(e);const prior={...state.box},cx=prior.x+prior.width/2,cy=prior.y+prior.height/2;const next=inkConstrain({x:cx-prior.width*.575,y:cy-prior.height*.575,width:prior.width*1.15,height:prior.height*1.15},w,h);state.box=next;updatePosition();commit(next,prior,"Drawing enlarged and saved.")};
 smaller.onclick=e=>{stopEvent(e);const prior={...state.box},cx=prior.x+prior.width/2,cy=prior.y+prior.height/2;const next=inkConstrain({x:cx-prior.width*.44,y:cy-prior.height*.44,width:prior.width*.88,height:prior.height*.88},w,h);state.box=next;updatePosition();commit(next,prior,"Drawing made smaller and saved.")};
 done.onclick=e=>{stopEvent(e);frame.remove();say("Drawing saved. Download the PDF to keep your changes.")};
 more.onclick=e=>{stopEvent(e);inkSession=null;frame.remove();setMode("draw");say("Draw your next stroke. It will be selected automatically.")};
 remove.onclick=async e=>{
  stopEvent(e);if(state.busy||!equalBytes(currentBytes(),state.latestBytes))return;
  const previous=app.readCurrent()?.bytes.slice();if(!previous)return;
  fxieRememberUndo(previous);
  inkSession=null;frame.remove();await app.replace(state.baseBytes.slice());
  say("Drawing removed. Use Undo if you want it back.");
 };
 sheet.append(frame);
}

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
 // Clicking Advanced reflow initiates the requested server edit directly; disclosure remains visible in the editor.
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
bind("fxieSelect",()=>setMode("select"));bind("fxieText",()=>setMode("text"));bind("fxieImage",()=>setMode("image"));bind("fxieHighlight",()=>setMode("highlight"));bind("fxieDraw",()=>setMode("draw"));
bind("fxieHome",()=>$("fxTopHome")?.click());bind("fxieTools",()=>window.FoxPDFPro?.open("tools"));bind("fxieOrganize",()=>{if(mini.hidden)toggleOrganizer();else mini.scrollIntoView({block:"nearest"});});bind("fxieConvert",()=>app.advanced("convert"));bind("fxieSign",()=>window.FoxPDFTaskPicker?.launch("sign"));
bind("fxieDigitalSign",()=>window.FoxPDFTaskPicker?.launch("certificate"));
bind("fxieDrawSignature",()=>window.FoxPDFTaskPicker?.launch("sign"));
bind("fxieSave",()=>app.save());bind("fxieShare",()=>app.share());bind("fxiePrint",()=>window.FoxPDFPro?.open("print"));
bind("fxieAdvanced",()=>window.FoxPDFPro?window.FoxPDFPro.open("tools"):say("Advanced tools are loading. Please try again.",true));bind("fxieChisa",()=>window.FoxPDFChisaToggle?window.FoxPDFChisaToggle(true,true):$("chat").hidden=false);bind("fxieComments",()=>window.FoxPDFPro?.open("annotate"));

/* FIND ALL / REPLACE ONE / REPLACE ALL — local visual edits, never secure redaction. */
const fxieFind={query:"",hits:[],index:0,serial:0,documentName:""};
const findBox=el("aside","fxie-search-panel");
findBox.hidden=true;
findBox.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between"><strong>Find & Replace</strong><button type="button" id="fxFindClose">✕</button></div><label>Search word or phrase<input id="fxFindWord" type="text" autocomplete="off" placeholder="Enter any word"></label><label>Replace with<input id="fxFindWith" type="text" placeholder="Replacement text"></label><label><input id="fxFindWhole" type="checkbox" checked> Whole word only</label><label><input id="fxFindCase" type="checkbox"> Match case</label><div class="fxie-search-actions"><button id="fxFindRun">Find all</button><button id="fxFindPrevious">‹ Previous</button><button id="fxFindNext">Next ›</button></div><div id="fxFindCount" role="status" aria-live="polite">Enter a word to search.</div><div class="fxie-search-actions"><button id="fxFindOne">Replace this</button><button id="fxFindAll">Replace all</button></div><div id="fxFindList" class="fxie-search-pages"></div><p class="fxie-search-note">Search works on selectable text in your PDF. Image-only pages require OCR first. This local replacement visually covers matched text and adds new text; original content may still exist in the PDF. It is not redaction. Formatting may change.</p>';
view.querySelector(".fxie-stage").append(findBox);
const findEl=id=>document.getElementById(id);
const wordCharacter=c=>!!c&&/[\p{L}\p{N}_]/u.test(c);
function findOccurrences(value,query,whole,caseSensitive){
 const original=String(value||""),a=caseSensitive?original:original.toLocaleLowerCase(),b=caseSensitive?query:query.toLocaleLowerCase();
 if(!b)return [];
 const found=[];let pos=0;
 while(pos<a.length){
  const at=a.indexOf(b,pos);if(at<0)break;
  if(!whole||(!wordCharacter(original[at-1])&&!wordCharacter(original[at+b.length])))found.push([at,at+b.length]);
  pos=at+Math.max(1,b.length);
 }
 return found;
}
function findMarkPage(sheet,page,scale){
 if(!sheet)return;
 sheet.querySelectorAll(".fxie-find-highlight").forEach(x=>x.remove());
 const selection=fxieFind.hits[fxieFind.index];
 for(let i=0;i<fxieFind.hits.length;i++){
  const m=fxieFind.hits[i];if(m.page!==page)continue;
  const hit=el("span","fxie-find-highlight");
  const x=m.x*scale,y=m.top*scale,width=m.width*scale,height=m.height*scale;
  Object.assign(hit.style,{left:x+"px",top:y+"px",width:Math.max(5,width)+"px",height:Math.max(7,height)+"px",background:i===fxieFind.index?"#ff9825a6":"#fce85677",borderColor:i===fxieFind.index?"#fb6815":"#d69e2d"});
  sheet.append(hit);
 }
}
function findRefreshVisible(){
 const current=app.current();
 if(!current)return;
 findMarkPage($("fxieSheetWrap").querySelector(".fxie-sheet"),current.page,rendered?.scale||1);
 if(splitPage){const right=splitPane?.querySelector(".fxie-right-edit-sheet");if(right)findMarkPage(right,splitPage,Number(right.dataset.imageScale)||1)}
}
function findCount(){
 const count=fxieFind.hits.length,i=fxieFind.index;
 findEl("fxFindCount").textContent=count?(count+" match"+(count===1?"":"es")+" · Selected "+(i+1)+" of "+count):"No selectable text matches found.";
 for(const id of ["fxFindOne","fxFindAll","fxFindPrevious","fxFindNext"])findEl(id).disabled=!count;
 const list=findEl("fxFindList");list.replaceChildren();
 const byPage=new Map();for(const hit of fxieFind.hits)byPage.set(hit.page,(byPage.get(hit.page)||0)+1);
 for(const [page,total] of byPage){const b=el("button","", "Page "+page+" ("+total+")");b.type="button";b.onclick=()=>{const at=fxieFind.hits.findIndex(h=>h.page===page);if(at>=0)findSelect(at)};list.append(b)}
 findRefreshVisible();
}
function findSelect(i){
 if(!fxieFind.hits.length)return;
 fxieFind.index=(i+fxieFind.hits.length)%fxieFind.hits.length;
 const hit=fxieFind.hits[fxieFind.index],current=app.current();
 if(current?.page!==hit.page&&splitPage!==hit.page)app.setPage(hit.page);
 findCount();
}
async function findScan(){
 const query=findEl("fxFindWord").value.trim();
 fxieFind.query=query;fxieFind.hits=[];fxieFind.index=0;
 const seq=++fxieFind.serial;
 if(!query){findEl("fxFindCount").textContent="Enter a word to search.";findRefreshVisible();return}
 const file=app.readCurrent();if(!file)return say("Open a PDF first.",true);
 fxieFind.documentName=file.name;
 findEl("fxFindCount").textContent="Searching every page…";
 try{
  const lib=await getJs(),reader=await lib.getDocument({data:file.bytes.slice()}).promise;
  const whole=findEl("fxFindWhole").checked,caseSensitive=findEl("fxFindCase").checked;
  for(let page=1;page<=reader.numPages;page++){
   if(seq!==fxieFind.serial){reader.destroy();return}
   const pg=await reader.getPage(page),viewport=pg.getViewport({scale:1}),content=await pg.getTextContent();
   for(const item of content.items){
    if(!item.str||!item.str.trim())continue;
    const transform=lib.Util.transform(viewport.transform,item.transform);
    const fontHeight=Math.max(5,Math.hypot(transform[2],transform[3]));
    const itemWidth=Math.max(1,Math.abs(item.width)||1);
    const matches=findOccurrences(item.str,query,whole,caseSensitive);
    for(const [start,end] of matches){
     const portionStart=start/item.str.length,portionLength=(end-start)/item.str.length;
     fxieFind.hits.push({page,start,end,str:item.str,x:transform[4]+itemWidth*portionStart,top:transform[5]-fontHeight,width:itemWidth*portionLength,height:fontHeight,
      baseline:transform[5],itemX:transform[4],itemWidth,fontHeight,pageWidth:viewport.width,pageHeight:viewport.height});
    }
   }
  }
  reader.destroy();
  if(seq!==fxieFind.serial)return;
  findCount();
 }catch(err){findEl("fxFindCount").textContent="Search unavailable: "+String(err?.message||err);say("Search failed.",true)}
}
async function findReplace(onlyCurrent){
 const replacement=findEl("fxFindWith").value;
 const targets=onlyCurrent?[fxieFind.hits[fxieFind.index]]:fxieFind.hits.slice();
 if(!targets.length)return;
 if(!onlyCurrent&&!confirm("Replace all "+targets.length+" visible text match(es) in this PDF? Complex formatting may change, and this does not securely erase original text."))return;
 const before=app.readCurrent();if(!before||before.name!==fxieFind.documentName)return;
 const replacementFont=String(findEl("fxieFont")?.value||"Helvetica");
 const expected=before.bytes.slice();
 const ok=await mutate(async pdf=>{
  if(pdf.getPageCount()<Math.max(...targets.map(t=>t.page)))throw Error("Pages changed");
  // Batch all matches into one PDF write and one undo step. These edits are visual,
  // not true content-stream replacement or secure removal.
  const font=await fxieEmbedSelectedFont(pdf,replacementFont);
  for(const hit of targets){
   const page=pdf.getPage(hit.page-1);
   if(page.getRotation().angle%360!==0)throw Error("Rotated pages require advanced text editing");
   const x=Math.max(0,hit.x),baseline=page.getHeight()-hit.baseline;
   const size=Math.max(5,Math.min(65,hit.fontHeight));
   const coverWidth=Math.max(hit.width,3);
   page.drawRectangle({x,y:Math.max(0,baseline-2),width:Math.min(coverWidth+2,page.getWidth()-x),height:Math.min(size+5,page.getHeight()-Math.max(0,baseline-2)),color:PDFLib.rgb(1,1,1)});
   if(replacement)page.drawText(replacement,{x,y:Math.max(0,baseline),size,font,color:color(),maxWidth:Math.max(4,page.getWidth()-x-2)});
  }
 },"Replaced "+targets.length+" visible occurrence(s). Review the result and save.");
 if(ok){await findScan();say("Replacements applied. Original text may still be searchable; not secure redaction.")}
}
bind("fxieSearch",()=>{findBox.hidden=!findBox.hidden;if(!findBox.hidden){findEl("fxFindWord").focus();if(fxieFind.query)findScan()}});
findEl("fxFindClose").onclick=()=>{findBox.hidden=true};
findEl("fxFindRun").onclick=findScan;
findEl("fxFindPrevious").onclick=()=>findSelect(fxieFind.index-1);
findEl("fxFindNext").onclick=()=>findSelect(fxieFind.index+1);
findEl("fxFindOne").onclick=()=>findReplace(true);
findEl("fxFindAll").onclick=()=>findReplace(false);
findEl("fxFindWord").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();findScan()}};
for(const id of ["fxFindWhole","fxFindCase"])findEl(id).onchange=()=>{if(fxieFind.query)findScan()};
bind("fxieProperties",()=>window.FoxPDFPro?.open("metadata"));bind("fxieMarkup",()=>window.FoxPDFPro?.open("annotate"));
const mini=el("aside","fxie-mini-pages");mini.id="fxieThumbnails";mini.hidden=true;mini.setAttribute("aria-label","PDF page organizer");
const pageStage=view.querySelector(".fxie-stage");
const pageDimmer=el("button","fxie-organizer-dimmer");pageDimmer.type="button";pageDimmer.hidden=true;
pageDimmer.setAttribute("aria-label","Close page organizer");pageDimmer.onclick=()=>toggleOrganizer(false);
pageStage.append(pageDimmer,mini);
const pagesToolbar=el("button","fxie-page-toggle","▤ Pages");
pagesToolbar.type="button";pagesToolbar.setAttribute("aria-label","Show or hide page thumbnails");
pagesToolbar.setAttribute("aria-controls","fxieThumbnails");
pagesToolbar.onclick=()=>toggleOrganizer();
view.querySelector(".fxie-barleft").prepend(pagesToolbar);

/* Local-first visual page organizer: drag, add, delete, duplicate, move, rotate */
let thumbnailLoad=0,selectedThumb=1,draggedThumb=0,thumbReader=null,thumbObserver=null,thumbRefreshTimer=null,organizerBusy=false,deletePending=false,splitPage=0,organizerExpanded=false;
let thumbRenderedSource=null;
let touchDrag=null,touchDragTimer=null,touchGhost=null,touchDrop=null;
function clearTouchDrag(){
 if(touchDragTimer){clearTimeout(touchDragTimer);touchDragTimer=null}
 if(touchGhost){touchGhost.remove();touchGhost=null}
 mini.querySelectorAll(".fxie-touch-dragging,.fxie-drop-before,.fxie-drop-after").forEach(e=>e.classList.remove("fxie-touch-dragging","fxie-drop-before","fxie-drop-after"));
 touchDrag=null;touchDrop=null;
}
function dragOrder(from,to,after){
 const count=loadedPageCount();
 if(!Number.isInteger(from)||from<1||from>count||!Number.isInteger(to)||to<1||to>count)return null;
 const items=Array.from({length:count},(_,i)=>i+1).filter(n=>n!==from);
 const pos=items.indexOf(to);
 if(pos<0)return null;
 items.splice(pos+(after?1:0),0,from);
 return items.indexOf(from)+1;
}
function touchTarget(x,y){
 if(!touchDrag)return null;
 const hit=document.elementFromPoint(x,y);
 const tile=hit?.closest?.(".fxie-thumb-tile");
 if(!tile||!mini.contains(tile))return null;
 const rect=tile.getBoundingClientRect();
 return{page:Number(tile.dataset.pageIndex),after:y>rect.top+rect.height/2,tile};
}
function moveTouchGhost(x,y){
 if(!touchGhost)return;
 touchGhost.style.transform="translate3d("+(x-34)+"px,"+(y-27)+"px,0)";
 const list=mini.querySelector(".fxie-mini-list");
 if(list){
  const bounds=mini.getBoundingClientRect();
  if(y<bounds.top+65)mini.scrollTop-=Math.min(22,Math.ceil((bounds.top+65-y)/3));
  if(y>bounds.bottom-48)mini.scrollTop+=Math.min(22,Math.ceil((y-bounds.bottom+48)/3));
 }
 const hit=touchTarget(x,y);
 mini.querySelectorAll(".fxie-drop-before,.fxie-drop-after").forEach(e=>e.classList.remove("fxie-drop-before","fxie-drop-after"));
 touchDrop=hit;
 if(hit&&hit.page!==touchDrag.page)hit.tile.classList.add(hit.after?"fxie-drop-after":"fxie-drop-before");
}
function startTouchDrag(tile,handle,event){
 if(!("PointerEvent" in window))return;
 if(event.pointerType!=="touch"&&event.pointerType!=="pen")return;
 if(organizerBusy)return;
 if(touchDrag)clearTouchDrag();
 const page=Number(tile.dataset.pageIndex);
 touchDrag={page,pointerId:event.pointerId,active:false,handle,x:event.clientX,y:event.clientY};
 // Dragging starts immediately on the dedicated handle, while swiping thumbnails scrolls normally.
 event.preventDefault();
 handle.setPointerCapture(event.pointerId);
 handle.classList.add("fxie-touch-pressed");
 const ghost=el("div","fxie-touch-ghost","Page "+page+"   ⋮⋮");
 ghost.setAttribute("aria-hidden","true");
 document.body.append(ghost);touchGhost=ghost;
 tile.classList.add("fxie-touch-dragging");
 touchDrag.active=true;
 moveTouchGhost(event.clientX,event.clientY);
 if(navigator.vibrate)try{navigator.vibrate(12)}catch(_){}
}
function endTouchDrag(event,commit){
 if(!touchDrag||touchDrag.pointerId!==event.pointerId)return;
 const state=touchDrag;
 const target=touchDrop;
 const splitHit=document.elementFromPoint(event.clientX,event.clientY)?.closest?.(".fxie-split-pane");
 const handle=state.handle;
 if(handle?.hasPointerCapture?.(event.pointerId))try{handle.releasePointerCapture(event.pointerId)}catch(_){}
 handle?.classList.remove("fxie-touch-pressed");
 clearTouchDrag();
 if(commit&&splitHit){setSplitView(state.page,true);return}
 if(commit&&target&&target.page!==state.page){
  const destination=dragOrder(state.page,target.page,target.after);
  if(destination!==null&&destination!==state.page)moveThumbnail(state.page,destination);
 }else if(commit){chooseThumbnail(state.page,false)}
}

const thumbsInput=el("input");thumbsInput.type="file";thumbsInput.accept=".pdf,application/pdf";thumbsInput.multiple=true;thumbsInput.hidden=true;mini.append(thumbsInput);
const organizeState=()=>app.current();
const loadedPageCount=()=>organizeState()?.pages||0;
const updateThumbSelection=()=>{
 const d=organizeState();
 if(!d)return;
 mini.querySelectorAll("[data-page-index]").forEach(button=>{
  const n=Number(button.dataset.pageIndex);
  button.classList.toggle("selected",n===selectedThumb);
  button.setAttribute("aria-current",n===d.page?"page":"false");
 });
 const statusBox=mini.querySelector(".fxie-selection");
 if(statusBox)statusBox.textContent="Selected: page "+selectedThumb+" of "+d.pages;
 const up=mini.querySelector("#fxieMoveUp"),down=mini.querySelector("#fxieMoveDown");
 if(up)up.disabled=selectedThumb<=1;
 if(down)down.disabled=selectedThumb>=d.pages;
 mini.querySelectorAll(".fxie-thumb-tile").forEach(tile=>{
  const n=Number(tile.dataset.pageIndex);
  tile.classList.toggle("selected",n===selectedThumb);
  tile.querySelector(".fxie-thumb-preview")?.classList.toggle("selected",n===selectedThumb);
 });
};
function chooseThumbnail(n,navigate=true){
 const count=loadedPageCount();selectedThumb=Math.max(1,Math.min(count,Number(n)||1));
 deletePending=false;const del=mini.querySelector("#fxieDeleteSelected");if(del)del.textContent="Delete";
 updateThumbSelection();
 if(navigate&&organizeState()?.page!==selectedThumb)app.setPage(selectedThumb);
}
function rememberPages(bytes){
 if(bytes.length<8*1024*1024){undo.push(bytes.slice());if(undo.length>9)undo.shift();redo=[]}
}
async function updatePageDocument(transform,success,newPage){
 if(organizerBusy)return false;
 const source=app.readCurrent();if(!source)return false;
 organizerBusy=true;
 try{
  const pdf=await PDFLib.PDFDocument.load(source.bytes.slice());
  const replacement=await transform(pdf);
  if(!replacement)return false;
  const bytes=new Uint8Array(await replacement.save({useObjectStreams:true}));
  rememberPages(source.bytes);
  await app.replace(bytes);
  const desired=Math.max(1,Math.min(app.current().pages,Number(newPage)||selectedThumb));
  selectedThumb=desired;
  if(app.current().page!==desired)app.setPage(desired);
  say(success);
  return true;
 }catch(err){
  say("Couldn't organize pages: "+String(err?.message||err),true);
  return false;
 }finally{
  organizerBusy=false;
  if(!mini.hidden)queueMicrotask(()=>renderThumbnails().catch(e=>say("Thumbnail error: "+e.message,true)));
 }
}
function retainMetadata(original,copy){
 try{const title=original.getTitle();if(title)copy.setTitle(title)}catch(_){}
 try{const author=original.getAuthor();if(author)copy.setAuthor(author)}catch(_){}
 try{const subject=original.getSubject();if(subject)copy.setSubject(subject)}catch(_){}
 try{const creator=original.getCreator();if(creator)copy.setCreator(creator)}catch(_){}
 try{const producer=original.getProducer();if(producer)copy.setProducer(producer)}catch(_){}
}
async function moveThumbnail(from,to){
 const d=organizeState();if(!d)return;
 from=Number(from);to=Number(to);
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<1||from>d.pages||to>d.pages||from===to)return;
 const order=Array.from({length:d.pages},(_,i)=>i+1);order.splice(from-1,1);order.splice(to-1,0,from);
 await updatePageDocument(async pdf=>{
  if(pdf.getForm().getFields().length)throw Error("Reordering fillable-form PDFs can damage fields. Flatten a copy first.");
  const reformed=await PDFLib.PDFDocument.create();
  const newPages=await reformed.copyPages(pdf,order.map(i=>i-1));
  for(const pg of newPages)reformed.addPage(pg);
  retainMetadata(pdf,reformed);
  return reformed;
 },"Moved page "+from+" to position "+to+". Save PDF to keep the change.",to);
}
async function addBlank(after=selectedThumb){
 const d=organizeState();if(!d)return;
 const insertAfter=Number.isInteger(after)?Math.max(1,Math.min(d.pages,after)):selectedThumb;
 await updatePageDocument(async pdf=>{
  const previous=pdf.getPage(Math.max(0,insertAfter-1)),{width,height}=previous.getSize();
  pdf.insertPage(insertAfter,[width,height]);
  return pdf;
 },"Added a blank page after page "+insertAfter+".",insertAfter+1);
}
async function duplicatePage(){
 const d=organizeState();if(!d)return;
 const n=selectedThumb;
 await updatePageDocument(async pdf=>{
  const [copied]=await pdf.copyPages(pdf,[n-1]);
  pdf.insertPage(n,copied);
  return pdf;
 },"Duplicated page "+n+".",n+1);
}
async function rotateSelected(){
 const n=selectedThumb;
 await updatePageDocument(async pdf=>{
  const page=pdf.getPage(n-1);
  page.setRotation(PDFLib.degrees((page.getRotation().angle+90)%360));
  return pdf;
 },"Rotated page "+n+" clockwise.",n);
}

function clearDeletePrompt(){
 deletePending=false;
 mini.querySelector(".fxie-delete-confirm")?.remove();
}
function askDeletePage(page){
 const count=loadedPageCount();
 if(count<=1){say("At least one page must remain. You can replace it with a blank page.",true);return}
 if(!Number.isInteger(page)||page<1||page>count)return;
 selectedThumb=page;updateThumbSelection();clearDeletePrompt();
 deletePending=true;
 const prompt=el("div","fxie-delete-confirm");
 prompt.setAttribute("role","group");
 prompt.setAttribute("aria-label","Confirm page deletion");
 const label=el("strong","","Remove page "+page+"?");
 const buttons=el("div","fxie-delete-buttons");
 const cancel=el("button","fxie-delete-cancel","Cancel");cancel.type="button";cancel.onclick=clearDeletePrompt;
 const remove=el("button","fxie-delete-final","Delete page");remove.type="button";
 remove.onclick=async()=>{
  clearDeletePrompt();
  await updatePageDocument(async pdf=>{
   if(pdf.getPageCount()<=1)throw Error("Keep at least one page.");
   pdf.removePage(page-1);
   return pdf;
  },"Removed page "+page+". You can undo this change.",Math.min(page,count-1));
 };
 buttons.append(cancel,remove);prompt.append(label,buttons);
 const actions=mini.querySelector(".fxie-organizer-actions");
 actions?.after(prompt);
 prompt.scrollIntoView({behavior:"smooth",block:"nearest"});
 say("Confirm or cancel deleting page "+page+". No PDF was uploaded.");
}
function deleteSelected(){askDeletePage(selectedThumb)}
async function insertFilePages(files){
 const list=Array.from(files||[]);
 if(!list.length)return;
 const after=selectedThumb;let count=0;
 await updatePageDocument(async pdf=>{
  let index=after;
  for(const file of list){
   if(!/\.pdf$/i.test(file.name)&&file.type!=="application/pdf")throw Error("Choose PDF files only");
   if(file.size>40*1024*1024)throw Error("Individual files must be under 40 MB");
   const other=await PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
   if(pdf.getPageCount()+other.getPageCount()>400)throw Error("The page limit for this organizer is 400");
   const copies=await pdf.copyPages(other,other.getPageIndices());
   copies.forEach(p=>pdf.insertPage(index++,p));
   count+=copies.length;
  }
  return pdf;
 },"Inserted "+count+" page(s) after page "+after+".",after+1);
}
thumbsInput.addEventListener("change",async e=>{
 const files=Array.from(e.target.files||[]);e.target.value="";
 await insertFilePages(files);
});
async function renderThumbnails(){
 const d=app.current();if(!d||mini.hidden)return;
 const token=++thumbnailLoad;
 thumbRenderedSource=d.bytes;
 clearTouchDrag();
 if(thumbObserver)thumbObserver.disconnect();
 if(thumbReader){try{thumbReader.destroy()}catch(_){}thumbReader=null}
 selectedThumb=Math.max(1,Math.min(d.pages,selectedThumb||d.page));
 mini.replaceChildren();mini.append(thumbsInput);
 const header=el("div","fxie-organizer-head");
 const heading=el("div","fxie-organizer-title");
 heading.append(el("h3","","Organize Pages"),el("p","","Drag thumbnails to rearrange. Changes stay on your device."));
 const rightHeader=el("div","fxie-organizer-header-actions");
 const expand=el("button","fxie-org-expand",organizerExpanded?"↙ Compact":"⤢ Expand");expand.type="button";
 expand.setAttribute("aria-label",organizerExpanded?"Use compact page thumbnails":"Expand page thumbnail organizer");
 expand.setAttribute("aria-pressed",String(organizerExpanded));
 expand.onclick=()=>{
  organizerExpanded=!organizerExpanded;
  mini.classList.toggle("fxie-organizer-expanded",organizerExpanded);
  expand.textContent=organizerExpanded?"↙ Compact":"⤢ Expand";
  expand.setAttribute("aria-pressed",String(organizerExpanded));
  expand.setAttribute("aria-label",organizerExpanded?"Use compact page thumbnails":"Expand page thumbnail organizer");
 };
 const closeThumbs=el("button","fxie-org-close","✕ Close");closeThumbs.type="button";
 closeThumbs.setAttribute("aria-label","Close page organizer");
 closeThumbs.onclick=()=>toggleOrganizer(false);
 rightHeader.append(expand,closeThumbs);header.append(heading,rightHeader);
 mini.append(header);
 mini.classList.toggle("fxie-organizer-expanded",organizerExpanded);
 header.append(el("p","fxie-touch-tip","Touch: drag ⋮⋮ or use arrows. Mouse: drag the handle. Tap a thumbnail to select."));
 const actions=el("div","fxie-organizer-actions");
 const control=(text,fn,title)=>{
  const b=el("button","fxie-organizer-action",text);b.type="button";b.title=title||text;b.addEventListener("click",fn);actions.append(b);return b
 };
 control("+ Blank",addBlank,"Insert a blank page after selected page");
 control("+ PDF",()=>thumbsInput.click(),"Insert pages from another PDF");
 control("Duplicate",duplicatePage,"Duplicate selected page");
 control("↻ Rotate",rotateSelected,"Rotate the selected page");
 const moveUp=control("↑",()=>moveThumbnail(selectedThumb,Math.max(1,selectedThumb-1)),"Move selected page up");moveUp.id="fxieMoveUp";
 const moveDown=control("↓",()=>moveThumbnail(selectedThumb,Math.min(d.pages,selectedThumb+1)),"Move selected page down");moveDown.id="fxieMoveDown";
 const deleteButton=control("Delete",deleteSelected,"Delete selected page");
 deleteButton.id="fxieDeleteSelected";
 const splitButton=control("⇿ Compare",()=>setSplitView(selectedThumb),"Show selected page beside current page");
 mini.append(actions,el("p","fxie-selection","Selected: page "+selectedThumb+" of "+d.pages));
 const list=el("div","fxie-mini-list");list.setAttribute("role","list");mini.append(list);
 const nodes=[];
 for(let i=1;i<=d.pages;i++){
  const tile=el("div","fxie-thumb-tile");tile.dataset.pageIndex=i;tile.setAttribute("role","listitem");
  const handle=el("span","fxie-thumb-handle","⋮⋮");handle.draggable=true;
  handle.title="Drag to move page "+i;
  const preview=el("button","fxie-thumb-preview");preview.type="button";preview.dataset.pageIndex=i;
  preview.title="Select page "+i;preview.setAttribute("aria-label","Select page "+i);
  const image=el("canvas","fxie-mini-canvas");image.dataset.page=i;
  const placeholder=el("span","fxie-thumb-placeholder","PDF");
  preview.append(image,placeholder);
  const footer=el("div","fxie-thumb-footer");
  footer.append(handle,el("span","fxie-thumb-number","Page "+i));
  const beside=el("button","fxie-thumb-beside","⇿");beside.type="button";beside.title="Open page "+i+" next to current page";beside.setAttribute("aria-label","View page "+i+" beside current page");beside.onclick=()=>setSplitView(i);footer.append(beside);
  const quick=el("div","fxie-thumb-quick");
  const quickButton=(label,title,callback,klass)=>{
   const button=el("button","fxie-thumb-quick-action "+klass,label);
   button.type="button";button.title=title;button.setAttribute("aria-label",title);
   button.onclick=(event)=>{event.stopPropagation();callback()};
   quick.append(button);return button;
  };
  quickButton("+ Add","Insert a blank page after page "+i,async()=>{chooseThumbnail(i,false);await addBlank(i)},"fxie-thumb-add");
  quickButton("Duplicate","Duplicate page "+i,async()=>{chooseThumbnail(i,false);await duplicatePage()},"fxie-thumb-copy");
  const remove=quickButton("Delete","Delete page "+i,()=>askDeletePage(i),"fxie-thumb-delete");
  remove.disabled=d.pages<=1;
  tile.append(preview,footer,quick);list.append(tile);nodes.push({tile,preview,image,placeholder});
  preview.onclick=()=>chooseThumbnail(i,true);
  preview.addEventListener("keydown",e=>{
   if(e.key==="ArrowUp"||e.key==="ArrowDown"){
    e.preventDefault();moveThumbnail(i,Math.max(1,Math.min(d.pages,i+(e.key==="ArrowUp"?-1:1))));
   }
  });
  // iPhone/iPad/Android: dedicated large drag handle keeps normal thumbnail scrolling intact.
  handle.setAttribute("role","button");handle.tabIndex=0;
  handle.setAttribute("aria-label","Drag page "+i+" to reorder");
  handle.addEventListener("pointerdown",e=>startTouchDrag(tile,handle,e));
  handle.addEventListener("pointermove",e=>{
   if(!touchDrag||touchDrag.pointerId!==e.pointerId||!touchDrag.active)return;
   e.preventDefault();moveTouchGhost(e.clientX,e.clientY);
  });
  handle.addEventListener("pointerup",e=>endTouchDrag(e,true));
  handle.addEventListener("pointercancel",e=>endTouchDrag(e,false));
  handle.addEventListener("lostpointercapture",e=>{if(touchDrag?.pointerId===e.pointerId)endTouchDrag(e,false)});
  handle.addEventListener("keydown",e=>{
   if(e.key==="ArrowUp"||e.key==="ArrowDown"){
    e.preventDefault();moveThumbnail(i,Math.max(1,Math.min(d.pages,i+(e.key==="ArrowUp"?-1:1))));
   }
  });
  handle.addEventListener("dragstart",e=>{
   draggedThumb=i;e.dataTransfer.effectAllowed="move";
   e.dataTransfer.setData("text/plain","foxpdf-page:"+i);
   tile.classList.add("fxie-dragging");
  });
  handle.addEventListener("dragend",()=>{draggedThumb=0;list.querySelectorAll(".fxie-drop-before,.fxie-drop-after,.fxie-dragging").forEach(x=>x.classList.remove("fxie-drop-before","fxie-drop-after","fxie-dragging"))});
  tile.addEventListener("dragover",e=>{
   const value=e.dataTransfer.types.includes("text/plain");
   if(!draggedThumb&&!value)return;
   e.preventDefault();e.dataTransfer.dropEffect="move";
   const after=e.clientY>tile.getBoundingClientRect().top+tile.offsetHeight/2;
   list.querySelectorAll(".fxie-drop-before,.fxie-drop-after").forEach(x=>x.classList.remove("fxie-drop-before","fxie-drop-after"));
   tile.classList.add(after?"fxie-drop-after":"fxie-drop-before");
  });
  tile.addEventListener("drop",async e=>{
   e.preventDefault();e.stopPropagation();
   const dragText=e.dataTransfer.getData("text/plain")||"";
   const from=draggedThumb||Number(dragText.match(/^foxpdf-page:(\d+)$/)?.[1]);
   draggedThumb=0;
   list.querySelectorAll(".fxie-drop-before,.fxie-drop-after").forEach(x=>x.classList.remove("fxie-drop-before","fxie-drop-after"));
   if(!from||from===i)return;
   const after=e.clientY>tile.getBoundingClientRect().top+tile.offsetHeight/2;
   const order=Array.from({length:d.pages},(_,j)=>j+1).filter(n=>n!==from);
   let at=order.indexOf(i);if(at<0)return;if(after)at++;
   await moveThumbnail(from,at+1);
  });
 }
 updateThumbSelection();
 const bottom=el("div","fxie-organizer-bottom");
 const savePages=el("button","fxie-organizer-save","↓ Save PDF");savePages.type="button";savePages.onclick=()=>app.save();
 const closePages=el("button","fxie-organizer-done","✓ Done");closePages.type="button";closePages.onclick=()=>toggleOrganizer(false);
 bottom.append(savePages,closePages);mini.append(bottom);
 const js=await getJs(),reader=await js.getDocument({data:app.bytes().slice()}).promise;
 if(token!==thumbnailLoad){reader.destroy();return}
 thumbReader=reader;
 const renderOne=async node=>{
  if(token!==thumbnailLoad||node.image.dataset.done==="1")return;
  node.image.dataset.done="1";
  try{
   const n=Number(node.image.dataset.page),pg=await reader.getPage(n);
   const viewport=pg.getViewport({scale:Math.min(.3,122/pg.getViewport({scale:1}).width)});
   node.image.width=Math.max(1,Math.ceil(viewport.width));
   node.image.height=Math.max(1,Math.ceil(viewport.height));
   await pg.render({canvasContext:node.image.getContext("2d"),viewport}).promise;
   if(token===thumbnailLoad)node.placeholder.remove();
  }catch(e){node.placeholder.textContent="Preview unavailable"}
 };
 if(typeof IntersectionObserver!=="undefined"){
  thumbObserver=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){thumbObserver.unobserve(entry.target);const found=nodes.find(n=>n.image===entry.target);if(found)renderOne(found)}
  },{root:mini,rootMargin:"200px"});
  nodes.forEach(n=>thumbObserver.observe(n.image));
 }else{
  for(const node of nodes.slice(0,Math.min(24,nodes.length)))await renderOne(node);
 }
}

/* Same-document dual page viewer. Selecting a thumbnail's ⇿ control opens it beside the current page. */
let splitPane=null,splitReader=null,splitToken=0,splitEditMode='edit';
function closeSplitView(){
 ++splitToken;splitPage=0;
 if(splitReader){try{splitReader.destroy()}catch(_){}splitReader=null}
 splitPane?.remove();splitPane=null;
 $("fxieScroll").classList.remove("fxie-split-active");
 $("fxieScroll").style.removeProperty("--fxie-spread-frame-height");
 say("Returned to single-page view.");
 draw();
}

async function setSplitView(pageNumber,refresh=false){
 const current=app.current();if(!current)return;
 const n=Number(pageNumber);
 if(!Number.isInteger(n)||n<1||n>current.pages){say("Choose a page in this PDF.",true);return}
 if(splitPane&&splitPage===n&&!refresh){closeSplitView();return}
 splitPage=n;const token=++splitToken;
 const scroll=$("fxieScroll");
 if(!splitPane){
  splitPane=el("aside","fxie-split-pane");
  splitPane.setAttribute("aria-label","Right PDF page preview and drop area");
  splitPane.addEventListener("dragover",event=>{
   if(!draggedThumb&&!event.dataTransfer?.types.includes("text/plain"))return;
   event.preventDefault();event.dataTransfer.dropEffect="copy";
   splitPane.classList.add("fxie-split-dropready");
  });
  splitPane.addEventListener("dragleave",event=>{
   if(!splitPane.contains(event.relatedTarget))splitPane.classList.remove("fxie-split-dropready");
  });
  splitPane.addEventListener("drop",event=>{
   event.preventDefault();splitPane.classList.remove("fxie-split-dropready");
   const dragged=Number((event.dataTransfer?.getData("text/plain")||"").match(/^foxpdf-page:(\d+)$/)?.[1])||draggedThumb;
   if(dragged>0){draggedThumb=0;setSplitView(dragged,true)}
  });
  scroll.append(splitPane);
 }
 scroll.classList.add("fxie-split-active");
 if(!refresh)requestAnimationFrame(draw);
 splitPane.replaceChildren();
 const header=el("div","fxie-split-head");
 const title=el("strong","","Page "+n+" · right preview");
 const actions=el("div","fxie-split-controls");
 // Right page is a separate, fully interactive edit surface. Neither page swaps position.
 const rightTools=el("div","fxie-split-edit-actions");
 const rightModes=[["✎ Edit","edit"],["T Text","text"],["✍ Draw","draw"],["▰ Highlight","highlight"],["▧ Image","image"]];
 for(const [caption,tool] of rightModes){
  const button=el("button","fxie-split-edit-action",caption);
  button.type="button";button.dataset.rightTool=tool;
  button.title="Use "+caption+" directly on the right page";
  button.setAttribute("aria-pressed",String(splitEditMode===tool));
  button.classList.toggle("selected",splitEditMode===tool);
  button.addEventListener("click",()=>{
   splitEditMode=tool;
   const ink=splitPane?.querySelector(".fxie-right-ink");if(ink)ink.style.pointerEvents=tool==="edit"?"none":"auto";
   rightTools.querySelectorAll("[data-right-tool]").forEach(b=>{const active=b.dataset.rightTool===tool;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active))});
   say("Right page "+n+": "+tool+" is ready. Tap or drag directly on that page.");
  });
  rightTools.append(button);
 }

 const step=(symbol,next,label)=>{
  const b=el("button","",symbol);b.type="button";b.title=label;b.setAttribute("aria-label",label);
  b.onclick=()=>setSplitView(Math.max(1,Math.min(app.current().pages,next())),true);
  actions.append(b);
 };
 step("‹",()=>splitPage-1,"Previous page in right preview");
 const input=el("input","fxie-split-page-input");
 input.type="number";input.min="1";input.max=String(current.pages);input.value=String(n);
 input.title="Right preview page number";input.setAttribute("aria-label","Right preview page number");
 input.onchange=()=>{const number=Math.max(1,Math.min(app.current()?.pages||1,Number(input.value)||n));setSplitView(number,true)};
 actions.append(input);
 step("›",()=>splitPage+1,"Next page in right preview");
 const close=el("button","fxie-split-close","✕");close.type="button";close.title="Close side-by-side view";close.setAttribute("aria-label","Close right page preview");close.onclick=closeSplitView;
 actions.append(close);header.append(title,rightTools,actions);
 const canvasWrap=el("div","fxie-split-content"),placeholder=el("p","fxie-split-message","Rendering page "+n+"…");
 canvasWrap.append(placeholder);splitPane.append(header,canvasWrap);
 try{
  const lib=await getJs(),reader=await lib.getDocument({data:app.bytes().slice()}).promise;
  if(token!==splitToken){reader.destroy();return}
  if(splitReader){try{splitReader.destroy()}catch(_){}}
  splitReader=reader;
  const pg=await reader.getPage(n);
  const metrics=await spreadMetrics(reader,Math.min(current.page,reader.numPages),n);
  if(token!==splitToken)return;
  scroll.style.setProperty("--fxie-spread-frame-height",metrics.frameHeight+"px");
  const viewport=pg.getViewport({scale:metrics.scale});
  const canvas=el("canvas","fxie-split-canvas");
  canvas.width=Math.ceil(viewport.width*devicePixelRatio);canvas.height=Math.ceil(viewport.height*devicePixelRatio);
  canvas.style.width=viewport.width+"px";canvas.style.height=viewport.height+"px";
  const ctx=canvas.getContext("2d");ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  await pg.render({canvasContext:ctx,viewport}).promise;
  if(token!==splitToken)return;
  // Render an independent text-hit layer and drawing surface for the right PDF page.
  const rightSheet=el("div","fxie-right-edit-sheet");
  Object.assign(rightSheet.style,{position:"relative",width:viewport.width+"px",height:viewport.height+"px",flex:"0 0 auto"});
  canvas.style.display="block";rightSheet.append(canvas);
  const hitLayer=el("div","fxie-right-text-hits");
  Object.assign(hitLayer.style,{position:"absolute",inset:"0",pointerEvents:"none"});
  rightSheet.append(hitLayer);
  const inkLayer=el("div","fxie-right-ink");
  Object.assign(inkLayer.style,{position:"absolute",inset:"0",touchAction:"none",pointerEvents:"auto"});
  inkLayer.style.pointerEvents=splitEditMode==="edit"?"none":"auto";
  rightSheet.dataset.imageScale=String(metrics.scale);
  rightSheet.append(inkLayer);
  canvasWrap.replaceChildren(rightSheet);
  requestAnimationFrame(()=>{fxieShowImageControls();findRefreshVisible();if(inkSession?.page===n)showMovableInk(rightSheet,n,metrics.scale,{width:viewport.width/metrics.scale,height:viewport.height/metrics.scale})});
  const scale=metrics.scale;
  const rightPoint=e=>{
   const rect=rightSheet.getBoundingClientRect();
   return {x:Math.max(0,Math.min(viewport.width,(e.clientX-rect.left)/rect.width*viewport.width)),
    y:Math.max(0,Math.min(viewport.height,(e.clientY-rect.top)/rect.height*viewport.height))};
  };
  // Explicit save and unified history controls stay available on either side.
  const rightActionBar=el("div","fxie-right-session-actions");
  Object.assign(rightActionBar.style,{position:"absolute",bottom:"8px",right:"8px",zIndex:"20",display:"flex",gap:"6px"});
  for(const [caption,id] of [["↶ Undo","fxieUndo"],["↷ Redo","fxieRedo"],["⇩ Save","fxieSave"]]){
   const action=el("button","",caption);action.type="button";action.title=caption;
   Object.assign(action.style,{borderRadius:"6px",border:"1px solid #c5a052",background:"#1e1c25",color:"#f6e6bd",padding:"7px",minHeight:"38px"});
   action.onclick=()=>$(id)?.click();rightActionBar.append(action);
  }
  rightSheet.append(rightActionBar);
  const rightMutate=async(fn,label)=>{
   if(n>app.current()?.pages){say("This page was removed.",true);return}
   await mutate(async pdf=>{if(n<1||n>pdf.getPageCount())throw Error("The target page is no longer available");const target=pdf.getPage(n-1);await fn(pdf,target)},label);
  };
  const imageInput=el("input");imageInput.type="file";imageInput.accept="image/png,image/jpeg";imageInput.hidden=true;
  rightSheet.append(imageInput);
  imageInput.addEventListener("change",async e=>{
   const file=e.target.files?.[0];e.target.value="";if(!file)return;
   if(!["image/png","image/jpeg"].includes(file.type)||file.size>12*1024*1024)return say("Choose a PNG/JPEG under 12 MB.",true);
   try{const asset={type:file.type,bytes:new Uint8Array(await file.arrayBuffer())};asset.preview=await fxiePrepareImage(asset);pendingImage=asset;say("Image ready. Tap the right page to position it.");}
   catch(err){say("Image could not load: "+err.message,true)}
  });
  // Non-blocking, touch-friendly inline text editor inside the right pane.
  const rightTextInput=(initial,at,title)=>new Promise(resolve=>{
   const editor=el("div","fxie-right-inline-editor");
   Object.assign(editor.style,{position:"absolute",left:Math.max(0,Math.min(viewport.width-230,at.x))+"px",top:Math.max(0,Math.min(viewport.height-130,at.y))+"px",zIndex:"25",width:"min(270px,95%)",padding:"10px",borderRadius:"10px",border:"2px solid #d6ab55",background:"#18181e",boxShadow:"0 6px 25px #0009"});
   editor.setAttribute("role","dialog");editor.setAttribute("aria-label",title);
   const heading=el("label","",title),area=el("textarea");
   heading.style.color="#f4ddb5";heading.style.display="block";
   area.value=initial;area.rows=3;area.style.cssText="display:block;width:100%;min-height:64px;max-height:45vh;resize:both;font:16px system-ui;margin:7px 0;color:#1a1a1a;background:#fff;border-radius:5px;padding:6px;";
   heading.append(area);
   const controls=el("div");controls.style.cssText="display:flex;justify-content:flex-end;gap:8px;";
   const cancel=el("button","","Cancel"),apply=el("button","","Apply");
   cancel.type=apply.type="button";
   cancel.style.cssText=apply.style.cssText="min-height:42px;padding:8px 12px;border-radius:7px;border:1px solid #d6ab55;color:#fff;background:#343238";
   let resolved=false;
   const done=value=>{if(resolved)return;resolved=true;document.removeEventListener("pointerdown",outsideEditor,true);editor.remove();resolve(value)};
   const outsideEditor=e=>{if(!editor.contains(e.target))done(area.value.trim()?area.value:null)};
   // A tap outside finishes the edit; Escape cancels it.
   setTimeout(()=>{if(!resolved)document.addEventListener("pointerdown",outsideEditor,true)},0);
   cancel.onclick=()=>done(null);apply.onclick=()=>done(area.value);
   editor.addEventListener("pointerdown",e=>e.stopPropagation());
   editor.addEventListener("click",e=>e.stopPropagation());
   area.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();done(null)}if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){e.preventDefault();done(area.value)}});
   controls.append(cancel,apply);editor.append(heading,controls);rightSheet.append(editor);
   requestAnimationFrame(()=>area.focus());
  });
  const rightTap=async e=>{
   if(splitEditMode==="edit"){say("Tap an existing text region on the right page to edit it.");return}
   const p=rightPoint(e);
   if(splitEditMode==="text"){
    const value=await rightTextInput(($("fxieInsertText")?.value||""),p,"Add text to page "+n);
    if(value===null||!value.trim())return;
    const size=Number($("fxieSize")?.value)||14;
    await rightMutate(async(pdf,pg)=>{
     const font=await fxieEmbedSelectedFont(pdf);
     pg.drawText(value,{x:p.x/scale,y:pg.getHeight()-p.y/scale-size,size,font,color:color(),maxWidth:Math.max(20,pg.getWidth()-p.x/scale-5),lineHeight:size*1.2});
    },"Added text directly to right page "+n+".");
   }else if(splitEditMode==="image"){
    if(!pendingImage){imageInput.click();return}
    fxieImageStage(pendingImage,n,p,scale);
   }
  };
  let gesture=null;
  inkLayer.addEventListener("click",e=>{if(splitEditMode==="text"||splitEditMode==="image"||splitEditMode==="edit")rightTap(e)});
  inkLayer.addEventListener("pointerdown",e=>{
   if(!["draw","highlight"].includes(splitEditMode))return;
   e.preventDefault();e.stopPropagation();
   const p=rightPoint(e);
   gesture={id:e.pointerId,tool:splitEditMode,points:[p],start:p,preview:null};
   inkLayer.setPointerCapture(e.pointerId);
  });
  inkLayer.addEventListener("pointermove",e=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   e.preventDefault();const p=rightPoint(e);gesture.points.push(p);
   if(!gesture.preview){gesture.preview=el("canvas","fxie-right-gesture");gesture.preview.width=Math.ceil(viewport.width*devicePixelRatio);gesture.preview.height=Math.ceil(viewport.height*devicePixelRatio);Object.assign(gesture.preview.style,{position:"absolute",inset:"0",width:"100%",height:"100%",pointerEvents:"none"});inkLayer.append(gesture.preview)}
   const ctx=gesture.preview.getContext("2d");ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.clearRect(0,0,viewport.width,viewport.height);
   ctx.strokeStyle=gesture.tool==="highlight"?"rgba(255,206,35,.55)":($("fxiePenColor")?.value||"#222222");
   ctx.lineWidth=gesture.tool==="highlight"?14:Math.max(1,Number($("fxiePenWidth")?.value)||2.5)*scale;
   ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();
   const pts=gesture.tool==="highlight"?[gesture.start,p]:gesture.points;
   pts.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));ctx.stroke();
  });
  const finishRight=async e=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   const g=gesture;gesture=null;g.preview?.remove();
   if(e.type==="pointercancel"||g.points.length<2)return;
   const strokeBefore=app.readCurrent();
   if(g.tool==="draw"&&strokeBefore){
    const thickness=Math.max(.75,Number($("fxiePenWidth")?.value)||2.5);
    const width=viewport.width/scale,height=viewport.height/scale;
    const points=g.points.map(p=>({x:Math.max(0,Math.min(width,p.x/scale)),y:Math.max(0,Math.min(height,height-p.y/scale))}));
    const original=inkRect(points,thickness,width,height);
    const state={name:strokeBefore.name,page:n,pageWidth:width,pageHeight:height,
     baseBytes:strokeBefore.bytes.slice(),latestBytes:null,points,original,box:{...original},
     thickness,hex:$("#fxieColor")?.value||"#172846",busy:false};
    const ok=await mutate(pdf=>paintInkSession(pdf,state),"Drawing added to right page "+n+". Drag the selection to the other page.");
    if(ok){
     inkSession=state;state.latestBytes=app.readCurrent()?.bytes.slice()||null;
     splitEditMode="edit";
     splitPane?.querySelectorAll("[data-right-tool]").forEach(b=>{const yes=b.dataset.rightTool==="edit";b.classList.toggle("selected",yes);b.setAttribute("aria-pressed",String(yes))});
     const sheet=splitPane?.querySelector(".fxie-right-edit-sheet");
     if(sheet){sheet.querySelector(".fxie-right-ink")?.style.setProperty("pointer-events","none");showMovableInk(sheet,n,scale,{width,height})}
    }
   }else{
    await rightMutate(async(pdf,pg)=>{
     const pts=[g.start,g.points.at(-1)],rgb=PDFLib.rgb(1,.78,.16);
     for(let i=1;i<pts.length;i++)pg.drawLine({start:{x:pts[i-1].x/scale,y:pg.getHeight()-pts[i-1].y/scale},end:{x:pts[i].x/scale,y:pg.getHeight()-pts[i].y/scale},thickness:12,color:rgb,opacity:.38});
    },"Highlighted region on right page "+n+".");
   }
  };
  inkLayer.addEventListener("pointerup",finishRight);inkLayer.addEventListener("pointercancel",finishRight);
  try{
   const textContent=await pg.getTextContent();
   if(token!==splitToken)return;
   for(const item of textContent.items){
    if(!item.str?.trim())continue;
    const mat=lib.Util.transform(viewport.transform,item.transform);
    const size=Math.max(8,Math.hypot(mat[2],mat[3]));
    const button=el("button","fxie-textregion");
    button.type="button";button.textContent="";button.title="Edit: "+item.str.slice(0,100);
    Object.assign(button.style,{position:"absolute",left:mat[4]+"px",top:(mat[5]-size)+"px",width:Math.max(9,Math.abs(item.width)*scale)+"px",height:size+"px",pointerEvents:"auto"});
    button.addEventListener("click",async e=>{
     if(splitEditMode!=="edit")return;
     e.preventDefault();e.stopPropagation();
     const replacement=await rightTextInput(item.str,{x:mat[4],y:mat[5]-size},"Edit text on page "+n);
     if(replacement===null||replacement===item.str)return;
     await rightMutate(async(pdf,pg)=>{
      const font=await fxieEmbedSelectedFont(pdf),sz=Math.max(6,size/scale);
      const px=mat[4]/scale,py=pg.getHeight()-mat[5]/scale;
      pg.drawRectangle({x:Math.max(0,px-1),y:Math.max(0,py-2),width:Math.min(pg.getWidth()-px,Math.max(item.width/1,sz*.8)+4),height:sz+5,color:PDFLib.rgb(1,1,1)});
      if(replacement.trim())pg.drawText(replacement,{x:px,y:py,size:sz,font,color:color(),maxWidth:Math.max(10,pg.getWidth()-px-4)});
     },"Edited right-page text. Review the PDF before saving.");
    });
    hitLayer.append(button);
   }
  }catch(err){console.warn("Right page text layer unavailable",err)}
  if(!refresh) say("Both pages are editable in place. The right page has its own text, drawing, highlight, and image tools.");
 }catch(err){if(token===splitToken)canvasWrap.replaceChildren(el("p","fxie-split-message","Unable to open right preview: "+err.message))}
}

function toggleOrganizer(force){
 const shouldOpen=typeof force==="boolean"?force:mini.hidden;
 if(!shouldOpen&&!mini.hidden)clearDeletePrompt();
 mini.hidden=!shouldOpen;
 pageDimmer.hidden=!shouldOpen;
 pagesToolbar.classList.toggle("selected",shouldOpen);
 pagesToolbar.setAttribute("aria-expanded",String(shouldOpen));
 $("fxiePages").setAttribute("aria-expanded",String(shouldOpen));
 view.classList.toggle("fxie-organizer-open",shouldOpen);
 if(shouldOpen){selectedThumb=app.current()?.page||1;renderThumbnails().catch(e=>say("Unable to show page organizer: "+e.message,true))}
 else{thumbnailLoad++;clearTouchDrag();thumbObserver?.disconnect();thumbReader?.destroy?.();thumbReader=null}
}
pagesToolbar.setAttribute("aria-expanded","false");
$("fxiePages").setAttribute("aria-expanded","false");
bind("fxiePages",()=>toggleOrganizer());
window.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!mini.hidden){event.preventDefault();toggleOrganizer(false)}
});
window.addEventListener("blur",clearTouchDrag);

bind("fxiePanelDone",()=>view.classList.add("fxie-drawer-closed"));bind("fxieRotate",()=>app.click("rotate"));bind("fxieAddPage",()=>app.click("blankPage"));bind("fxieDelete",()=>app.click("delete"));
bind("fxiePrev",()=>{const d=app.current();if(d)app.setPage(Math.max(1,d.page-1))});bind("fxieNext",()=>{const d=app.current();if(d)app.setPage(Math.min(d.pages,d.page+1))});
$("fxieZoom").onchange=e=>{zoom=e.target.value;draw()};
function currentZoom(){return zoom==="fit"?(rendered?.scale||1):Number(zoom)}
function scaleBy(v){const factor=Math.max(.5,Math.min(2.5,currentZoom()*v));zoom=String(Math.round(factor*100)/100);const z=$("fxieZoom");if(![...z.options].some(o=>o.value===zoom))z.add(new Option(Math.round(factor*100)+"%",zoom));z.value=zoom;draw()}
bind("fxieMinus",()=>scaleBy(.8));bind("fxiePlus",()=>scaleBy(1.25));
bind("fxieUndo",async()=>{await fxieMutationChain;if(!undo.length)return say("Nothing to undo.");const d=app.readCurrent();redo.push(d.bytes.slice());const previous=undo.pop();fxieHistoryBytes-=previous.byteLength;await app.replace(previous);say("Last change undone.")});
bind("fxieRedo",async()=>{await fxieMutationChain;if(!redo.length)return say("Nothing to redo.");const d=app.readCurrent();const next=redo.pop();fxieRememberUndo(d.bytes);await app.replace(next);say("Change restored.")});
bind("fxieInfo",()=>alert("The FoxPDF editor renders pages and selectable text blocks. Original paragraph editing uses guarded server processing and may reject font-complex layouts. Permanent redaction is a separate, secure operation."));
window.addEventListener("foxpdf:change",()=>{const d=app.current();if(d){$("fxieFilename").textContent=d.name;$("fxieCount").textContent=d.page+" / "+d.pages;if(historyName!==d.name){undo=[];redo=[];fxieHistoryBytes=0;historyName=d.name}}if(!mini.hidden&&d){
 if(d.bytes!==thumbRenderedSource){
  clearTimeout(thumbRefreshTimer);
  thumbRefreshTimer=setTimeout(()=>renderThumbnails().catch(e=>say("Could not update page organizer: "+e.message,true)),110);
 }else updateThumbSelection();
}
if(splitPage&&d){
 if(splitPage>d.pages)splitPage=d.pages;
 requestAnimationFrame(()=>setSplitView(splitPage,true));
}
if(document.body.classList.contains("fx-mode-editor"))requestAnimationFrame(draw)});
let active=false;new MutationObserver(()=>{const now=document.body.classList.contains("fx-mode-editor");if(now!==active){active=now;if(now)requestAnimationFrame(draw)}}).observe(document.body,{attributes:true,attributeFilter:["class"]});
let fxieResizeTask=null;
window.addEventListener("resize",()=>{
 clearTimeout(fxieResizeTask);fxieResizeTask=setTimeout(()=>{
  if(!document.body.classList.contains("fx-mode-editor"))return;
  draw();if(splitPage)setSplitView(splitPage,true);
 },140);
},{passive:true});
window.FoxPDFInteractiveEditor={
 open:(newMode="select")=>{if(!app.current()){window.FoxPDFTaskPicker?.launch(newMode==="draw"?"draw":"edit");return;}window.FoxPDFHomeNav?.showEditor();setMode(newMode)},
 openPages:()=>toggleOrganizer(true),
 setMode,
 refresh:draw
};
if(app.current()){$("fxieFilename").textContent=app.current().name}
});
})();