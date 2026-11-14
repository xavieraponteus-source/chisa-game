/* Fox whole-site tracking (no document contents, IP or persistent visitor identifiers). */
(function(){"use strict";
const tag=document.currentScript,section=tag?.dataset?.section||"hub";
const ENDPOINT="https://foxpdf-studio-web-production.up.railway.app/api/site/track";
if(!["hub","pdf"].includes(section))return;
if(navigator.doNotTrack==="1"||navigator.globalPrivacyControl===true)return;
let sid;
try{sid=sessionStorage.getItem("fox_site_sid_v3");if(!sid){sid=crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem("fox_site_sid_v3",sid)}}catch(e){sid="ephemeral-"+Math.random().toString(36).slice(2)}
function source(){try{const host=new URL(document.referrer).hostname;return host.slice(0,90)}catch{return ""}}
function transmit(site,event,page){
const payload={v:3,site,event,page:(page||location.pathname).slice(0,120),sid,ref:source()};
try{const b=new Blob([JSON.stringify(payload)],{type:"text/plain"});if(navigator.sendBeacon?.(ENDPOINT,b))return;fetch(ENDPOINT,{method:"POST",body:b,mode:"cors",credentials:"omit",keepalive:true}).catch(()=>{})}catch(e){}
}
transmit(section,"view");
document.addEventListener("click",function(e){
const a=e.target.closest('a[href]');if(a&&section==="hub"){let p;try{p=new URL(a.href,location.href).pathname}catch{}if(p==="/game"||/chisa-game/.test(a.href))transmit("game","hub_entry","/game")}
if(section!=="pdf")return;
const b=e.target.closest("button");if(!b)return;
const name=(b.dataset.advanced||b.getAttribute("data-mode")||b.id||"").slice(0,40);
if(!/^(merge|split|reorder|rotate|download|save|fxieSave|fxieDrawSignature|signPdf|convert|ocr|redact|encrypt|compress|text|draw|highlight|image|select|edit|numbers|watermark|form|fxie[A-Za-z0-9]+)$/.test(name))return;
transmit("pdf",/save|download/i.test(name)?"download":"tool");
},{passive:true});
})();
