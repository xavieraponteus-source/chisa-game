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
let mode="select",zoom="fit",renderVersion=0,rendered=null,selected=null,inspectCache=null,consentKey="",undo=[],redo=[],historyName="",pendingImage=null,drawing=null,lastPdf=null,inkStroke=null;
const say=(message,bad=false)=>{const s=$("fxieStatus");s.textContent=message;s.dataset.bad=bad?"1":"0"};
function check(){const d=app.current();if(!d){app.say("Please open a PDF first.");app.open();return null}return d}
function setMode(m){mode=m;view.classList.remove("fxie-drawer-closed");view.dataset.mode=m;selected=null;$("fxieReplaceBox").hidden=true;$("fxieInsertBox").hidden=m!=="text";for(const b of view.querySelectorAll("[data-mode]"))b.classList.toggle("selected",b.dataset.mode===m);for(const [id,key] of [["fxieSelect","select"],["fxieText","text"],["fxieImage","image"],["fxieHighlight","highlight"],["fxieDraw","draw"]])$(id).classList.toggle("selected",m===key);
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
 say("Page "+d.page+" · "+count+" selectable text regions");
}catch(e){$("fxieSheetWrap").replaceChildren(el("p","fxie-error","Unable to show page: "+e.message));say("PDF rendering failed: "+e.message,true)}
}
async function mutate(fn,description){const original=app.readCurrent();if(!original)return;if(!window.PDFLib)return say("Editing engine is unavailable.",true);
try{const pdf=await PDFLib.PDFDocument.load(original.bytes.slice(0));await fn(pdf);const result=new Uint8Array(await pdf.save({useObjectStreams:true}));if(original.bytes.length<8*1024*1024){undo.push(original.bytes);if(undo.length>7)undo.shift();redo=[]}await app.replace(result);say(description);return true}catch(e){say("Edit failed: "+e.message,true);return false}}

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

function color(){const s=$("fxieColor").value.slice(1);return PDFLib.rgb(parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255)}
async function placeText(p){if(!p||!check())return;const text=$("fxieInsertText").value.trim();if(!text)return say("Type some text first.",true);const size=Number($("fxieSize").value);if(size<5||size>80)return say("Font size must be between 5 and 80.",true);
await mutate(async pdf=>{const pg=pdf.getPage(app.current().page-1),font=await fxieEmbedSelectedFont(pdf,$("fxieFont").value);const x=p.x/rendered.scale,y=pg.getHeight()-p.y/rendered.scale-size;pg.drawText(text,{x,y,font,size,color:color(),maxWidth:pg.getWidth()-x-8,lineHeight:size*1.32})},"Text added to page "+app.current().page+".")}
$("fxieImageFile").onchange=async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;if(!["image/png","image/jpeg"].includes(f.type)||f.size>8*1024*1024)return say("Select a PNG/JPEG smaller than 8 MB.",true);pendingImage={bytes:new Uint8Array(await f.arrayBuffer()),type:f.type};say("Image ready. Click the PDF to place it.")};
async function placeImage(p){if(!p||!check())return;if(!pendingImage)return $("fxieImageFile").click();await mutate(async pdf=>{const pg=pdf.getPage(app.current().page-1),img=pendingImage.type==="image/png"?await pdf.embedPng(pendingImage.bytes):await pdf.embedJpg(pendingImage.bytes),w=Math.min(200,img.width,pg.getWidth()*.45),h=w*img.height/img.width;pg.drawImage(img,{x:Math.max(0,Math.min(pg.getWidth()-w,p.x/rendered.scale)),y:Math.max(0,Math.min(pg.getHeight()-h,pg.getHeight()-p.y/rendered.scale-h)),width:w,height:h})},"Image inserted in PDF.")}
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
async function finishInk(event){
 const state=inkStroke;if(!state||state.pointerId!==event.pointerId)return;
 moveInk(event);inkStroke=null;
 const pageNumber=state.page,points=state.points.slice(),thickness=state.thickness,paint=state.color;
 state.canvas.remove();
 if(!points.length||pageNumber!==app.current()?.page)return;
 const hex=paint.replace("#",""),ink=PDFLib.rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);
 await mutate(async pdf=>{
  const page=pdf.getPage(pageNumber-1);
  if(page.getRotation().angle%360!==0)throw Error("Drawing directly on rotated PDF pages is not supported yet.");
  const toPdf=p=>({x:p.x/state.scale,y:page.getHeight()-p.y/state.scale});
  if(points.length===1){
   const p=toPdf(points[0]);page.drawCircle({x:p.x,y:p.y,size:Math.max(.3,thickness/2),color:ink});return;
  }
  for(let i=1;i<points.length;i++){
   const a=toPdf(points[i-1]),b=toPdf(points[i]);
   page.drawLine({start:a,end:b,thickness,color:ink});
  }
 },"Drawing added to page "+pageNumber+". Choose Save PDF to download.");
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
   const font=await fxieEmbedSelectedFont(doc,chosenFont);
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
bind("fxieSearch",()=>window.FoxPDFPro?.open("search"));bind("fxieProperties",()=>window.FoxPDFPro?.open("metadata"));bind("fxieMarkup",()=>window.FoxPDFPro?.open("annotate"));
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
let splitPane=null,splitReader=null,splitToken=0;
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
 actions.append(close);header.append(title,actions);
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
  canvasWrap.replaceChildren(canvas);
  if(!refresh) say("Equal-size page previews are open. Drag a thumbnail to the right preview to compare another page.");
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
bind("fxieUndo",async()=>{if(!undo.length)return say("Nothing to undo.");const d=app.readCurrent();redo.push(d.bytes);await app.replace(undo.pop());say("Last change undone.")});
bind("fxieRedo",async()=>{if(!redo.length)return say("Nothing to redo.");const d=app.readCurrent();undo.push(d.bytes);await app.replace(redo.pop());say("Change restored.")});
bind("fxieInfo",()=>alert("The FoxPDF editor renders pages and selectable text blocks. Original paragraph editing uses guarded server processing and may reject font-complex layouts. Permanent redaction is a separate, secure operation."));
window.addEventListener("foxpdf:change",()=>{const d=app.current();if(d){$("fxieFilename").textContent=d.name;$("fxieCount").textContent=d.page+" / "+d.pages;if(historyName!==d.name){undo=[];redo=[];historyName=d.name}}if(!mini.hidden&&d){
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