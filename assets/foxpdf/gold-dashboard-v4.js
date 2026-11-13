/* FoxPDF Studio Black & Gold Dashboard v4.0
 * UI layer only. PDF processing and Chisa actions remain in the original app.
 */
(function(){
"use strict";
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn,{once:true});else fn()}
ready(function(){
const app=window.FoxPDFBridge;
if(!app){console.warn("FoxPDF visual UI: PDF bridge unavailable; keeping original layout.");return}
const $=(id)=>document.getElementById(id);
const avatar="https://xavieraponteus-source.github.io/chisa-game/assets/foxpdf/gold-fox-avatar.svg";
const logo='<img class="fx-art-fox-logo" loading="eager" src="https://xavieraponteus-source.github.io/chisa-game/assets/foxpdf/ai-fox-mask-gold-v5.svg" alt="FoxPDF gold fox mask logo" width="69" height="66">';
const oldHeader=document.querySelector("header.site-nav");
const easy=$("easyMode");
if(!oldHeader||!easy){console.warn("FoxPDF visual UI: original controls missing.");return}
oldHeader.classList.add("fx-top");
oldHeader.innerHTML='<a class="fx-brand" href="/" aria-label="All Xavier apps">'+logo+'<span><strong>FoxPDF <em>Studio</em></strong><small>All-in-One PDF Editor</small></span></a><div class="fx-search"><i>⌕</i><input id="fxSearch" type="search" aria-label="Search PDF tools" placeholder="Search tools, features or help…"><kbd>⌘K</kbd></div><nav class="fx-top-nav" aria-label="Top navigation"><button id="fxTopHome" class="active">⌂ Home</button><button id="fxTopFiles">▣ Files</button><button id="fxTopTools">⚒ Tools</button><button id="fxTopConvert">⇄ Convert</button><button id="fxTopProtect">♧ Security</button><button id="fxTopBatch" class="fx-gold-extra">▤ Batch</button><button id="fxTopCloud" class="fx-gold-extra">☁ Cloud</button><button id="fxTopChat">♡ Chisa</button><a class="fx-app-link" href="/">All apps</a></nav>';
oldHeader.querySelector(".fx-top-nav").appendChild(easy);
const rail=document.createElement("aside");
rail.className="fx-rail";rail.setAttribute("aria-label","PDF editor tools");
rail.innerHTML='<div class="fx-rail-title">WORKSPACE</div>'+
[['home','⌂','Home'],['edit','✎','Edit PDF'],['organize','▣','Organize Pages'],['convert','⇄','Convert'],['ocr','⌗','OCR'],['redact','◩','Redact'],['protect','♧','Protect & Sign'],['form','✍','Fill & Sign'],['compress','⇵','Compress'],['batch','▤','Batch Tools'],['compare','◫','Compare PDFs'],['icloud','☁','Cloud & Files'],['more','✧','More Tools']]
.map(([action,icon,label])=>'<button type="button" data-fx="'+action+'"'+(action==="home"?' class="active"':'')+'><i>'+icon+'</i> '+label+'</button>').join("")+
'<div class="fx-rail-landscape" aria-hidden="true"><span>✿ ✿ ✧</span></div>';
oldHeader.after(rail);
const main=document.querySelector("main.shell");
const originalHero=main?.querySelector(":scope > .hero");
const originalShortcuts=main?.querySelector(":scope > .fox-shortcuts");
const workspace=main?.querySelector(":scope > .workspace");
if(!main||!originalHero||!originalShortcuts||!workspace){console.warn("FoxPDF visual UI: page structure incomplete.");return}
const hero=document.createElement("section");
hero.className="fx-home-hero";hero.setAttribute("aria-labelledby","fxHeroTitle");
hero.innerHTML='<div class="fx-hero-content"><div class="fx-eyebrow">✧ FOXPDF STUDIO · ALL-IN-ONE PDF EDITOR</div><h1 id="fxHeroTitle">The Complete<br><em>PDF</em> Solution</h1><p>Edit, Convert, Organize, Secure, and Manage PDFs — All in One Place.</p><div class="fx-hero-buttons"><button id="fxHeroOpen" class="primary">↗ Open PDF</button><button id="fxHeroCreate" class="secondary">＋ New PDF</button></div></div>';
originalHero.replaceWith(hero);
const tools=document.createElement("section");
tools.className="fx-tools-group";tools.setAttribute("aria-labelledby","fxToolsTitle");
const cardData=[
 ['edit','✎','Edit PDF','Text, images, and pages'],
 ['convert','⇄','Convert','PDF to Word, Excel, PPT & more'],
 ['merge','▣','Merge & Split','Combine, extract, reorder'],
 ['ocr','⌗','OCR','Recognize scanned text'],
 ['redact','◩','Redact','Remove private content'],
 ['protect','♧','Protect','Password encryption'],
 ['form','✍','Fill & Sign','Forms and visual signing'],
 ['compress','⇵','Compress','Optimize file sizes'],
 ['batch','▤','Batch Process','Combine multiple files'],
 ['compare','◫','Compare','Coming soon']
];
tools.innerHTML='<div class="fx-tools-heading"><h2 id="fxToolsTitle">✦ Your PDF tools</h2><p>Choose a tool, or ask Chisa what to do.</p></div><div class="fx-tool-grid">'+cardData.map(([action,icon,label,description])=>'<button type="button" data-fx="'+action+'"><i>'+icon+'</i><b>'+label+'</b><small>'+description+'</small></button>').join("")+'</div><div class="fx-power-strip"><strong>✧ More powerful tools</strong><button data-fx="organize">Page management</button><button data-fx="watermark">Watermark</button><button data-fx="image">Add Image</button><button data-fx="numbers">Page numbers</button><button data-fx="icloud">Save to Files</button></div>';
originalShortcuts.replaceWith(tools);
const fxGoldPaths={"edit":"<path d=\"M4 17.7V20h2.3L19 7.3 16.7 5 4 17.7Z\"/>","convert":"<path d=\"M4 7h16m-5-4 5 4-5 4M20 17H4m5 4-5-4 5-4\"/>","merge":"<rect x=\"7\" y=\"4\" width=\"11\" height=\"15\" rx=\"2\"/><path d=\"M5 8H3v13h11v-2\"/>","ocr":"<path d=\"M7 3H4v4M17 3h3v4M4 17v3h3M20 17v3h-3\"/><path d=\"M7 15h7M9 7v8\"/>","redact":"<path d=\"M4 6h16M4 12h16M4 18h16\"/>","protect":"<rect x=\"6\" y=\"10\" width=\"12\" height=\"11\" rx=\"2\"/><path d=\"M9 10V7a3 3 0 0 1 6 0v3M12 15v2\"/>","form":"<path d=\"M5 20c6-8 9-14 10-12 2 4-7 13-5 13 3 0 6-4 7-4 1 0-1 3 2 3\"/>","compress":"<path d=\"M12 3v12m-4-4 4 4 4-4M4 19h16v2H4z\"/>","batch":"<path d=\"M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 18l9 5 9-5\"/>","compare":"<rect x=\"3\" y=\"4\" width=\"8\" height=\"16\" rx=\"1\"/><rect x=\"13\" y=\"4\" width=\"8\" height=\"16\" rx=\"1\"/><path d=\"M7 10v4m10-4v4\"/>"};
tools.querySelectorAll('.fx-tool-grid [data-fx]').forEach(btn=>{const i=btn.querySelector('i'),path=fxGoldPaths[btn.dataset.fx];if(i&&path)i.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="37" height="37" viewBox="0 0 24 24" stroke="#ffd47d" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>'});
const recent=document.createElement("section");
recent.className="fx-recent";
recent.innerHTML='<div class="fx-recent-head"><h2>◷ Recent Files <small>this session</small></h2><button id="fxViewFiles">View workspace →</button></div><div class="fx-recent-row"><div id="fxRecentList" class="fx-recent-list"><div class="fx-empty">No PDFs opened yet. Choose a file to get started.</div></div><div id="fxUploadMount"></div></div>';
workspace.before(recent);
const drop=$("drop");if(drop)$("fxUploadMount").appendChild(drop);
const editorMain=workspace.querySelector(".main");
const editorToolbar=document.createElement("div");
editorToolbar.innerHTML='<div class="fx-file-toolbar"><button id="fxBackHome">⌂ Home</button><strong id="fxFileName">Document workspace</strong><button id="fxMoreFiles">＋ Open PDF</button><button id="fxSaveFile" class="fx-save">⇩ Save PDF</button></div><div class="fx-edit-tools"><button data-fx-native="text">✎ Add text</button><button data-fx-native="imagePdf">▧ Add image</button><button data-fx-native="watermark">◇ Watermark</button><button data-fx-native="rotate">↻ Rotate</button><button data-fx-native="reorder">▣ Reorder</button><button data-fx-native="numbers"># Page numbers</button><button data-fx-native="advancedToggle">✦ Advanced</button></div>';
editorMain.prepend(editorToolbar);
const viewer=$("viewer");
if(viewer){
 const wrapper=document.createElement("div");wrapper.className="fx-pdf-shell";
 const thumbs=document.createElement("aside");thumbs.className="fx-thumbs";thumbs.id="fxThumbs";thumbs.setAttribute("aria-label","Document pages");
 const stage=document.createElement("div");stage.className="fx-pdf-stage";
 viewer.parentNode.insertBefore(wrapper,viewer);
 wrapper.append(thumbs,stage);stage.appendChild(viewer);
}
const chatWidget=document.querySelector(".chat-widget");
const panel=$("chat"),fab=$("chatFab");
if(chatWidget&&panel){
 chatWidget.classList.add("fx-assistant");
 const head=panel.querySelector(".chat-head");
 if(head){
  const photo=head.querySelector("img");if(photo){photo.src=avatar;photo.alt="Chisa assistant"}
  const title=head.querySelector("b");if(title)title.textContent="Chisa ✦";
  const status=head.querySelector("small");if(status)status.textContent="Your PDF Assistant · Ready";
  head.insertAdjacentHTML("afterend",'<div class="fx-chisa-illustration"><strong>Your friendly PDF companion ♡</strong><img src="'+avatar+'" alt="" aria-hidden="true"></div>');
 }
 const bubbles=panel.querySelectorAll(".bubble");if(bubbles.length)bubbles[0].textContent="Hi there! I'm Chisa! I can help you work with your PDFs. Tell me what you'd like done, and I'll use the tools I have. If I can't do something, I'll tell you.";
 const quick=$("quick");if(quick){
  quick.innerHTML=[
   ["Add text to my PDF","✎ Edit a PDF for me"],
   ["Merge multiple PDFs","⇄ Merge multiple PDFs"],
   ["Split this PDF","✂ Split a PDF"],
   ["OCR this scanned document","⌗ Run OCR (Scan to Text)"],
   ["Convert PDF to Word","⇄ Convert this PDF to Word"],
   ["Password protect this PDF","♧ Add a password"],
   ["Organize my PDF pages","▤ Organize my PDF pages"]
  ].map(([q,t])=>'<button data-question="'+q+'" type="button">'+t+'</button>').join("");
  quick.insertAdjacentHTML("beforebegin",'<div class="fx-suggestion-label">TRY ASKING CHISA</div>');
 }
 const info=panel.querySelector(".no-ai");if(info)info.textContent="Chisa runs supported PDF tools. Full document-reading AI isn't connected yet.";
 const fabImage=fab?.querySelector("img");if(fabImage){fabImage.src=avatar;fabImage.alt="Chisa assistant"}
 if(window.innerWidth>1160){panel.hidden=false;fab?.setAttribute("aria-expanded","true")}
}
document.body.classList.add("fx-neon-dashboard");
let mode="home",lastCount=app.documents().length,thumbToken=0;
const thumbs=$("fxThumbs");
function recentRefresh(){
 const box=$("fxRecentList");box.replaceChildren();
 const documents=app.documents();
 if(!documents.length){const msg=document.createElement("div");msg.className="fx-empty";msg.textContent="No PDFs opened yet. Drop a PDF here, or choose Open PDF.";box.appendChild(msg);return}
 for(const f of documents){const b=document.createElement("button");b.type="button";const icon=document.createElement("span");icon.textContent="▤";const name=document.createElement("strong");name.textContent=f.name;const count=document.createElement("small");count.textContent=f.pages+" page"+(f.pages===1?"":"s");b.append(icon,name,count);b.onclick=()=>{app.select(f.index);switchMode("editor")};box.appendChild(b)}
}
function thumbRefresh(){
 if(!thumbs)return;
 thumbs.replaceChildren();const doc=app.current();if(!doc)return;
 const token=++thumbToken;
 for(let i=0;i<Math.min(doc.pages,40);i++){
  const b=document.createElement("button");b.type="button";b.className=doc.page===i+1?"active":"";
  const art=document.createElement("span");art.className="fx-mini";art.textContent=i+1;
  const caption=document.createElement("span");caption.textContent="Page "+(i+1);b.append(art,caption);
  b.onclick=()=>app.setPage(i+1);thumbs.appendChild(b)
 }
 if(window.pdfjsLib){(async()=>{try{
  const bytes=app.bytes();if(!bytes)return;
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(bytes)}).promise;
  for(let i=0;i<Math.min(10,doc.pages);i++){
   if(token!==thumbToken)break;
   const page=await pdf.getPage(i+1),viewport=page.getViewport({scale:.14});
   const canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
   const target=thumbs.children[i]?.querySelector(".fx-mini");
   if(target){target.replaceChildren(canvas);target.style.height="auto";canvas.style.maxWidth="100%"}
  }
 }catch(err){console.warn("PDF thumbnails couldn't render",err)}})()}
}
function switchMode(next){
 if(next==="editor"&&!app.current()){app.open();app.say("Choose a PDF to open your editing workspace. 🌸");return}
 mode=next;document.body.classList.toggle("fx-mode-editor",mode==="editor");
 for(const b of rail.querySelectorAll("[data-fx]"))b.classList.toggle("active",b.dataset.fx===(mode==="home"?"home":"edit"));
 $("fxFileName").textContent=app.current()?.name||"Document workspace";
 if(mode==="editor")thumbRefresh();
 window.scrollTo({top:0,behavior:"smooth"});
}
function act(action){
 switch(action){
 case "home":switchMode("home");break;
 case "edit":case "organize":switchMode("editor");break;
 case "merge":app.click("merge");break;
 case "split":app.click("split");break;
 case "convert":app.advanced("convert");break;
 case "ocr":app.advanced("ocr");break;
 case "redact":app.advanced("redact");break;
 case "protect":app.advanced("encrypt");break;
 case "form":app.click("fillPdf");break;
 case "compress":app.advanced("compress");break;
 case "watermark":app.click("watermark");break;
 case "image":app.click("imagePdf");break;
 case "numbers":app.click("numbers");break;
 case "icloud":app.current()?app.share():app.open();break;
 case "more":if(!app.current()){app.say("Open a PDF first to use advanced tools.");app.open()}else{switchMode("editor");$("advancedPanel")?.scrollIntoView({behavior:"smooth"})}break;
 case "batch":app.say("You can combine multiple PDFs with Merge. Other batch operations aren't available in this web edition yet.");app.open();break;
 case "compare":app.say("Side-by-side PDF comparison isn't available yet. I can't run that task here.");break;
 default:app.say("I couldn't find that tool. You can ask Chisa for help.")
 }
}
document.addEventListener("click",(e)=>{
 const tool=e.target.closest("[data-fx]");if(tool){act(tool.dataset.fx);return}
 const native=e.target.closest("[data-fx-native]");if(native){app.click(native.dataset.fxNative)}
});
$("fxTopHome").onclick=()=>switchMode("home");
$("fxTopFiles").onclick=()=>app.current()?switchMode("editor"):app.open();
$("fxTopTools").onclick=()=>act("more");
$("fxTopConvert").onclick=()=>act("convert");
$("fxTopProtect").onclick=()=>act("protect");
$("fxTopBatch").onclick=()=>act("batch");
$("fxTopCloud").onclick=()=>act("icloud");
$("fxTopChat").onclick=()=>{panel.hidden=false;fab?.setAttribute("aria-expanded","true");$("question")?.focus()};
$("fxHeroOpen").onclick=()=>app.open();
$("fxHeroCreate").onclick=()=>app.create();
$("fxViewFiles").onclick=()=>switchMode("editor");
$("fxBackHome").onclick=()=>switchMode("home");
$("fxMoreFiles").onclick=()=>app.open();
$("fxSaveFile").onclick=()=>app.save();
const search=$("fxSearch");
search.addEventListener("keydown",e=>{
 if(e.key!=="Enter")return;e.preventDefault();
 const q=search.value.toLowerCase();
 const rules=[[/merge|join|combine/,"merge"],[/split|extract/,"split"],[/ocr|scann|recogniz/,"ocr"],[/redact|blackout/,"redact"],[/convert|export|word|excel|powerpoint/,"convert"],[/protect|encrypt|password/,"protect"],[/compress|reduce size/,"compress"],[/watermark/,"watermark"],[/image|photo/,"image"],[/number/,"numbers"],[/form|sign/,"form"],[/organize|edit|page/,"edit"]];
 const matched=rules.find(([regex])=>regex.test(q));
 if(matched)act(matched[1]);else if(/help|chisa/.test(q))$("fxTopChat").click();else app.say("I couldn't find that tool. Try asking Chisa for help.");
 search.blur();
});
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();search.focus()}});
window.addEventListener("foxpdf:change",()=>{
 const count=app.documents().length;if(count>lastCount&&count>0)mode="editor";lastCount=count;
 document.body.classList.toggle("fx-mode-editor",mode==="editor");
 $("fxFileName").textContent=app.current()?.name||"Document workspace";
 recentRefresh();if(mode==="editor")thumbRefresh();
});
window.addEventListener("resize",()=>{
 if(window.innerWidth<=1160&&panel&&!panel.hidden&&document.activeElement!==$("question")){panel.hidden=true;fab?.setAttribute("aria-expanded","false")}
});
recentRefresh();switchMode("home");
if(!window.pdfjsLib){
 const s=document.createElement("script");s.async=true;s.src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
 s.onload=()=>{if(window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";if(mode==="editor")thumbRefresh()}};
 document.head.appendChild(s);
}
});
})();