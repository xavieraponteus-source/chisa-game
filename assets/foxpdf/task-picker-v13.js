/* FoxPDF Studio Task Picker v13 — explicit document selection before tools.
   All local file choices remain in-browser; no account, no upload unless tool explicitly processes remotely. */
(function(){"use strict";
const ready=fn=>document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();
ready(()=>{
const app=window.FoxPDFBridge;
if(!app)return;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const tasks={
 edit:["Edit PDF","Choose the document you want to edit.","Edit selected PDF"],
 organize:["Organize Pages","Select the PDF whose pages you want to rearrange.","Organize selected PDF"],
 merge:["Merge PDFs","Select two or more PDFs, in the order shown. Only selected files will be merged.","Merge selected PDFs"],
 split:["Split / Extract","Select the PDF you want to split.","Choose pages to extract"],
 ocr:["OCR — recognize scanned text","Choose a scanned PDF for text recognition.","Continue to OCR"],
 convert:["Convert PDF","Choose the PDF to export to another file format.","Continue to conversion"],
 redact:["Permanent redaction","Select a PDF to securely redact. Removing content is different from drawing a black rectangle.","Continue to redaction"],
 protect:["Password protection","Choose the PDF you want to encrypt.","Continue to protection"],
 compress:["Compress PDF","Choose a PDF to reduce its file size.","Continue to compression"],
 form:["Fill & Sign","Choose the form or PDF you want to complete.","Open form tools"],
 draw:["Draw on PDF","Choose a PDF to draw or write on using a mouse, finger, or stylus.","Start drawing"],
 sign:["Sign PDF","Choose the document to sign. Draw a visible signature or use a digital certificate.","Choose signing method"],
 certificate:["Certificate digital signature","Choose a PDF to sign using your own .p12 or .pfx certificate.","Continue to digital signing"],
 review:["Share PDF for review","Choose which document to share. Creating a review link uploads the file to secure storage.","Continue to sharing"],
 watermark:["Watermark PDF","Choose the PDF to mark.","Continue to watermark"],
 numbers:["Page numbers","Choose a document to number.","Continue to page numbering"],
 image:["Add image","Choose a PDF in which to place an image.","Continue to image tools"],
 batch:["Batch PDF tools","Choose the PDF to work with. Other documents remain available in your workspace.","Continue to batch tools"],
 compare:["Compare PDFs","Select a PDF, then choose the second document in Compare.","Continue to comparison"]
};
let overlay=null,selected=new Set(),activeTool="",loading=false,waiting=false;
const safe=s=>String(s??"");
function close(){
 if(overlay){overlay.remove();overlay=null}
 selected.clear();waiting=false;document.body.classList.remove("fx-choice-open");
}
function error(e){const msg=e?.message||String(e);const n=overlay?.querySelector(".fx-choice-status");if(n){n.textContent=msg;n.dataset.error="true"}else app.say(msg)}
function showStatus(message,isError=false){const n=overlay?.querySelector(".fx-choice-status");if(n){n.textContent=message;n.dataset.error=isError?"true":"false"}}
function shell(title,note){
 close();
 overlay=el("div","fx-choice-backdrop");
 const pane=el("section","fx-choice-modal");pane.setAttribute("role","dialog");pane.setAttribute("aria-modal","true");pane.setAttribute("aria-label",title);
 const header=el("header","fx-choice-header");
 const headings=el("div","fx-choice-headings");
 headings.append(el("small","","FOXPDF STUDIO · CHOOSE YOUR DOCUMENT"),el("h2","",title),el("p","",note));
 const x=el("button","fx-choice-close","✕");x.type="button";x.title="Close without choosing a PDF";x.setAttribute("aria-label","Close document chooser");x.onclick=close;
 header.append(headings,x);
 const content=el("div","fx-choice-content");
 const status=el("p","fx-choice-status","Your PDFs are kept on your device for local tools.");status.setAttribute("role","status");
 pane.append(header,content,status);overlay.append(pane);document.body.append(overlay);
 document.body.classList.add("fx-choice-open");
 overlay.addEventListener("pointerdown",event=>{if(event.target===overlay)close()});
 return content
}
function isMulti(type){return type==="merge"}
function orderedDocs(){return app.documents().map(d=>({...d}));}
function renderChoice(){
 if(!overlay||!activeTool)return;
 const [title,info,label]=tasks[activeTool],mult=isMulti(activeTool);
 const body=overlay.querySelector(".fx-choice-content");body.replaceChildren();
 const files=orderedDocs();const currentChoice=el("div","fx-choice-section");
 currentChoice.append(el("h3","",files.length?"Choose from your open PDFs":"No PDFs open yet"));
 const rows=el("div","fx-choice-files");
 if(!files.length){rows.append(el("p","fx-choice-empty","Choose a PDF from your device or iCloud Files below."))}
 files.forEach(d=>{
  const row=el("label","fx-choice-row");
  const input=el("input");input.type=mult?"checkbox":"radio";input.name="foxpdf-choice";input.value=String(d.index);
  input.checked=selected.has(d.index);
  input.onchange=()=>{
   if(!mult)selected.clear();
   if(input.checked)selected.add(d.index);else selected.delete(d.index);
   renderChoice();
  };
  const icon=el("span","fx-choice-file-icon","PDF");
  const details=el("span","fx-choice-file-name");details.append(el("strong","",d.name),el("small","",d.pages+" page"+(d.pages===1?"":"s")));
  row.append(input,icon,details);rows.append(row);
 });
 currentChoice.append(rows);
 const upload=el("div","fx-choice-upload");
 const uploadTitle=el("strong","","Or choose files from your device");
 const uploadDescription=el("p","",mult?"Choose two or more PDFs. You can also combine them with PDFs already open.":"Choose one PDF. You'll go straight to "+title+" after it opens.");
 const filePicker=el("input");filePicker.type="file";filePicker.accept=".pdf,application/pdf";filePicker.multiple=mult;
 filePicker.className="fx-choice-native-file";filePicker.hidden=true;
 const browse=el("button","fx-choice-browse","＋ "+(mult?"Add PDF files":"Choose or upload PDF"));
 browse.type="button";browse.onclick=()=>filePicker.click();
 const uploadHint=el("small","","No account needed · PDFs stay local unless you intentionally run a server tool.");
 upload.append(uploadTitle,uploadDescription,browse,uploadHint,filePicker);
 const onFiles=async list=>{
  if(loading)return;
  const chosen=Array.from(list||[]);if(!chosen.length)return;
  if(chosen.length>14||chosen.some(f=>f.size>40*1024*1024))return showStatus("Select up to 14 PDFs, each smaller than 40 MB.",true);
  loading=true;showStatus("Opening your PDF"+(chosen.length>1?"s":"")+" locally…");
  try{
   if(typeof app.importFiles!=="function")throw Error("The file loader is updating. Refresh FoxPDF and try again.");
   const added=await app.importFiles(chosen);
   if(!overlay)return;
   const indices=added.map(d=>d.index);
   if(!indices.length)throw Error("No readable PDF was opened. Check the file format and password.");
   if(!mult){selected=new Set([indices[0]]);loading=false;await advance();}
   else{for(const idx of indices)selected.add(idx);renderChoice();showStatus("Added "+indices.length+" PDF"+(indices.length>1?"s":"")+". Select at least two, then Merge selected PDFs.")}
  }catch(e){error(e)}
  finally{loading=false;filePicker.value=""}
 };
 filePicker.addEventListener("change",event=>onFiles(event.target.files));
 upload.addEventListener("dragover",e=>{e.preventDefault();upload.classList.add("fx-choice-over")});
 upload.addEventListener("dragleave",()=>upload.classList.remove("fx-choice-over"));
 upload.addEventListener("drop",e=>{e.preventDefault();upload.classList.remove("fx-choice-over");onFiles(e.dataTransfer?.files)});
 const footer=el("div","fx-choice-footer");
 const back=el("button","fx-choice-cancel","Cancel");back.type="button";back.onclick=close;
 const go=el("button","fx-choice-continue",label);go.type="button";
 go.disabled=mult?selected.size<2:selected.size!==1;
 go.onclick=advance;footer.append(back,go);
 body.append(currentChoice,upload,footer);
}
function launch(type){
 const choice=tasks[type]?type:"edit";activeTool=choice;selected=new Set();
 const [title,note]=tasks[choice];shell(title,note);renderChoice();
 overlay?.querySelector(".fx-choice-close")?.focus();
}
function editor(mode){
 const home=window.FoxPDFHomeNav;
 if(home?.showEditor)home.showEditor();
 else document.body.classList.add("fx-mode-editor");
 const edit=window.FoxPDFInteractiveEditor;
 if(mode==="organize")setTimeout(()=>edit?.openPages?.(),0);
 else if(mode==="draw")setTimeout(()=>edit?.setMode?.("draw"),0);
 else if(mode==="edit")setTimeout(()=>edit?.setMode?.("edit"),0);
}
function readyPanel(type,callback,note,buttonLabel){
 const title=tasks[type]?.[0]||"PDF tool";
 const body=shell(title,note||"Your document is selected. Choose when to start.");
 const d=app.current();
 const target=el("div","fx-choice-ready");target.append(el("strong","",d?.name||"Selected PDF"),el("small","",(d?.pages||0)+" pages"));
 body.append(target);
 const actions=el("div","fx-choice-footer");
 const cancel=el("button","fx-choice-cancel","Change PDF");cancel.type="button";cancel.onclick=()=>launch(type);
 const go=el("button","fx-choice-continue",buttonLabel||"Start "+title);go.type="button";
 go.onclick=async()=>{close();try{await callback()}catch(e){app.say("Could not run "+title+": "+(e.message||e))}};
 actions.append(cancel,go);body.append(actions);
}
async function mergeSelected(indices){
 if(indices.length<2)return showStatus("Choose at least two PDFs to merge.",true);
 if(!window.PDFLib)throw Error("PDF processing library is unavailable. Refresh the page.");
 const output=await PDFLib.PDFDocument.create();
 let count=0;
 for(const index of indices){
  const source=app.read(index);if(!source)throw Error("An open PDF could not be found.");
  const document=await PDFLib.PDFDocument.load(source.bytes.slice());
  const pages=await output.copyPages(document,document.getPageIndices());
  pages.forEach(page=>output.addPage(page));count+=pages.length;
 }
 const name="Merged-FoxPDF.pdf",bytes=new Uint8Array(await output.save({useObjectStreams:true}));
 const newIdx=await app.addDocument(name,bytes);
 app.select(newIdx);
 close();editor("organize");app.say("Merged "+indices.length+" chosen PDFs ("+count+" pages). Save PDF when finished.");
}
function splitPanel(){
 const body=shell("Split / Extract PDF","Choose the exact page numbers to extract. This runs locally in your browser.");
 const current=app.current();
 body.append(el("p","fx-choice-ready","Selected: "+(current?.name||"")+" · "+(current?.pages||0)+" pages"));
 const label=el("label","fx-choice-input-label","Pages to extract");
 const input=el("input");input.type="text";input.value="1";input.placeholder="For example: 1-3,5,8";label.append(input);body.append(label);
 const actions=el("div","fx-choice-footer");
 const cancel=el("button","fx-choice-cancel","Choose another PDF");cancel.type="button";cancel.onclick=()=>launch("split");
 const go=el("button","fx-choice-continue","Extract pages");go.type="button";
 go.onclick=async()=>{
  try{
   const src=app.readCurrent();if(!src)throw Error("No PDF selected");
   const pages=[];
   for(const part of input.value.split(",")){
    const p=part.trim();if(!p)continue;
    const m=p.match(/^(\d+)\s*-\s*(\d+)$/);
    if(m){let start=Number(m[1]),end=Number(m[2]);if(end<start)throw Error("Invalid page range: "+p);for(let n=start;n<=end;n++)pages.push(n-1)}
    else if(/^\d+$/.test(p))pages.push(Number(p)-1);
    else throw Error("Use page numbers and ranges such as 1-3,5");
   }
   if(!pages.length||pages.length>400||pages.some(n=>n<0||n>=src.count))throw Error("Page numbers are outside this PDF.");
   const original=await PDFLib.PDFDocument.load(src.bytes.slice()),out=await PDFLib.PDFDocument.create();
   const copied=await out.copyPages(original,pages);copied.forEach(page=>out.addPage(page));
   const idx=await app.addDocument(src.name.replace(/\.pdf$/i,"")+"-extracted.pdf",new Uint8Array(await out.save()));
   app.select(idx);close();editor("organize");
   app.say("Extracted "+pages.length+" pages locally. Choose Save PDF to download.");
  }catch(e){showStatus(e.message,true)}
 };
 actions.append(cancel,go);body.append(actions);
}
function signPanel(){
 const body=shell("Sign this PDF","Choose the type of signature you need.");
 body.append(el("p","fx-choice-ready","Selected: "+(app.current()?.name||"PDF")));
 const options=el("div","fx-choice-sign-options");
 const visual=el("button","fx-choice-sign-card");visual.type="button";
 visual.append(el("strong","","✍ Draw a signature"),el("small","","Use a finger, mouse or stylus. Adds a visible handwritten signature; it is not certificate-verified."));
 visual.onclick=()=>{close();window.FoxPDFPro?.open("sign")};
 const digital=el("button","fx-choice-sign-card");digital.type="button";
 digital.append(el("strong","","✦ Digital certificate signature"),el("small","","Apply a cryptographic signature with your .p12 or .pfx certificate. Uses FoxPDF's signing server."));
 digital.onclick=()=>{close();window.FoxPDFReviews?.sign()};
 options.append(visual,digital);body.append(options);
 const back=el("button","fx-choice-cancel","Choose a different PDF");back.type="button";back.onclick=()=>launch("sign");body.append(back);
}
function actOnSelected(type){
 switch(type){
  case "edit":editor("edit");return;
  case "organize":editor("organize");return;
  case "draw":editor("draw");return;
  case "sign":signPanel();return;
  case "certificate":readyPanel(type,()=>window.FoxPDFReviews?.sign(),"Certificate signing uses your .p12/.pfx certificate and FoxPDF's signing server; no file is uploaded until you continue.","Open certificate signer");return;
  case "split":splitPanel();return;
  case "ocr":readyPanel(type,()=>app.advanced("ocr"),"OCR requires FoxPDF's Railway processing service. The selected PDF is uploaded only after you choose Run OCR.","Run OCR");return;
  case "convert":readyPanel(type,()=>app.advanced("convert"),"Export uses FoxPDF's Railway processor. Choose the export format after continuing.","Choose export format");return;
  case "redact":readyPanel(type,()=>app.advanced("redact"),"Permanent redaction is processed by Railway. Enter the exact text to remove when prompted.","Start permanent redaction");return;
  case "protect":readyPanel(type,()=>app.advanced("encrypt"),"Password encryption uses FoxPDF's Railway processor. You'll choose a password next.","Set password");return;
  case "compress":readyPanel(type,()=>app.advanced("compress"),"Compression runs on FoxPDF's Railway processor and requires a temporary upload.","Compress PDF");return;
  case "form":readyPanel(type,()=>app.click("fillPdf"),"Fill the form in the selected PDF. Form changes are applied to your working copy.","Open fill tools");return;
  case "image":editor("edit");window.FoxPDFInteractiveEditor?.setMode("image");return;
  case "watermark":readyPanel(type,()=>app.click("watermark"),"Add a visible watermark to the selected PDF.","Add watermark");return;
  case "numbers":readyPanel(type,()=>app.click("numbers"),"Insert page numbers into the selected PDF.","Add page numbers");return;
  case "review":readyPanel(type,()=>window.FoxPDFReviews?.share(),"Creating a review link uploads your chosen PDF to private review storage.","Create review link");return;
  case "batch":readyPanel(type,()=>window.FoxPDFPro?.open("batch"),"Choose a batch operation; no changes happen until you confirm the tool.","Open batch tools");return;
  case "compare":readyPanel(type,()=>window.FoxPDFPro?.open("compare"),"The comparison screen lets you choose its other PDF.","Choose comparison PDF");return;
  default:editor("edit");
 }
}
async function advance(){
 if(waiting||loading)return;
 const type=activeTool;
 const ids=Array.from(selected).filter(i=>app.documents().some(d=>d.index===i));
 if((isMulti(type)&&ids.length<2)||(!isMulti(type)&&ids.length!==1))return showStatus(isMulti(type)?"Choose at least two PDFs.":"Choose the PDF you want to use.",true);
 waiting=true;
 try{
  if(type==="merge"){await mergeSelected(ids);return}
  app.select(ids[0]);close();actOnSelected(type);
 }catch(e){error(e)}
 finally{waiting=false}
}
window.FoxPDFTaskPicker={launch,isOpen:()=>!!overlay,close};
});
})();