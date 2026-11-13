
/* FoxPDF Studio Shared Review and Certificate Signing v1 */
(function(){
"use strict";
const ready=()=>{const bridge=window.FoxPDFBridge;if(!bridge)return;
let overlay=null,reviewToken=null,reviewPass="",revBlob=null;
const $=(q,root=document)=>root.querySelector(q);
const el=(tag,text,cls)=>{const v=document.createElement(tag);if(text!==undefined)v.textContent=text;if(cls)v.className=cls;return v};
function close(){if(revBlob){URL.revokeObjectURL(revBlob);revBlob=null}overlay?.remove();overlay=null;document.body.classList.remove("fx-review-lock")}
function dialog(title,note,markup){close();const o=el("div",undefined,"fx-review-backdrop");o.innerHTML='<section class="fx-review-modal" role="dialog" aria-modal="true"><header class="fx-review-header"><div><small>FOXPDF STUDIO · PRIVATE WORKFLOWS</small><h2></h2><p></p></div><button type="button" class="fx-review-close" aria-label="Close">✕</button></header><main class="fx-review-content"></main></section>';overlay=o;document.body.append(o);document.body.classList.add("fx-review-lock");$(".fx-review-header h2",o).textContent=title;$(".fx-review-header p",o).textContent=note;$(".fx-review-content",o).append(markup);$(".fx-review-close",o).onclick=close;o.addEventListener("pointerdown",e=>{if(e.target===o)close()});return o}
function pane(){return el("div",undefined,"fx-review-pane")}
function field(label,type="text",extra={}){const l=el("label"),s=el("span",label),input=document.createElement("input");input.type=type;for(const [k,v] of Object.entries(extra))input[k]=v;l.append(s,input);return {label:l,input}}
function button(label,callback,gold=false){const b=el("button",label,"fx-review-button"+(gold?" gold":""));b.type="button";b.onclick=async()=>{b.disabled=true;try{await callback()}catch(e){alert("FoxPDF: "+(e.message||e))}finally{if(b.isConnected)b.disabled=false}};return b}
function openDoc(){const c=bridge.current(),bytes=bridge.bytes();if(!c||!bytes){bridge.say("Please open a PDF first before sharing or signing. 🌸");bridge.open();return null}return {filename:c.name,bytes}}
async function api(route,body){const response=await fetch("/api/review/"+route,{method:"POST",body:body instanceof FormData?body:JSON.stringify(body),headers:body instanceof FormData?undefined:{"content-type":"application/json"},credentials:"omit"});if(!response.ok){let message="Request failed ("+response.status+")";try{const j=await response.json();message=j.error||j.detail||message}catch{}throw Error(message)}return response}
function copy(str){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(str);const t=document.createElement("textarea");t.value=str;document.body.append(t);t.select();document.execCommand("copy");t.remove()}
function share(){
const d=openDoc();if(!d)return;if(d.bytes.length>5*1024*1024){bridge.say("Review links currently accept PDFs up to 5 MB. Please save a smaller copy first.");return}
const body=pane(),title=field("Review title","text",{value:d.filename,maxLength:100}),days=field("Days before link expires","number",{value:"3",min:"1",max:"7"}),pass=field("Optional review password (recommended)","password",{placeholder:"Only share privately with people you trust",maxLength:160});
const notice=el("p","Sharing uploads an encrypted copy of your PDF to FoxPDF's private Railway review service. Anyone holding the link (and password, if set) can see the document. Links expire within 1–7 days and may be revoked from this browser. No verified reviewer identities.","fx-review-warning");
body.append(title.label,days.label,pass.label,notice,button("Create secure review link",async()=>{
if(!confirm("Upload this PDF to your private Railway review storage? It will be encrypted at rest and available to link holders until the expiry or revocation."))return;
const data=new FormData();data.append("file",new File([d.bytes],d.filename,{type:"application/pdf"}));data.append("title",title.input.value);data.append("days",days.input.value);data.append("passcode",pass.input.value);
const info=await (await api("create",data)).json();const url=location.origin+location.pathname+"#review="+encodeURIComponent(info.shareToken);
try{const owners=JSON.parse(localStorage.getItem("foxpdf-review-owners")||"{}");owners[info.shareToken]={owner:info.ownerToken,title:info.title,expires:info.expires};localStorage.setItem("foxpdf-review-owners",JSON.stringify(owners))}catch{}
dialog("Review link created","Ready to share. Keep the optional password separate from the link.",(()=>{const area=pane(),link=field("Share this URL","text",{value:url,readOnly:true});area.append(link.label,button("Copy review link",async()=>copy(url),true),el("p","Expires: "+new Date(info.expires).toLocaleString(),"fx-review-muted"),el("p","Only people who have the link (and password, if used) can open the review. The owner can revoke it from this same browser.","fx-review-muted"),button("Revoke this link",async()=>{if(!confirm("Revoke review access now? This deletes the stored file and comments."))return;await api("revoke",{token:info.shareToken,owner:info.ownerToken});close();bridge.say("The review link was revoked and the hosted copy deleted.")}));return area})());
},true));
dialog("Share PDF for review","Create an expiring, optional-password review link with page comments.",body)
}
async function review(token){
if(!token)return;reviewToken=token;const panel=pane(),status=el("p","Opening review…","fx-review-muted");panel.append(status);dialog("Shared PDF review","Read the document, leave page-specific comments, or download your copy.",panel);
async function open(passcode){
reviewPass=passcode;const info=await (await api("info",{token,passcode})).json();
panel.replaceChildren();panel.append(el("h3",info.title),el("p","Expires "+new Date(info.expires).toLocaleString()+" · "+info.comments+" comment(s)","fx-review-muted"));
const response=await api("file",{token,passcode});const bytes=await response.arrayBuffer();revBlob=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
const frame=document.createElement("iframe");frame.title="Shared PDF preview";frame.src=revBlob;frame.className="fx-review-pdf";panel.append(frame);
const downloadLink=el("a","Download review PDF","fx-review-download");downloadLink.href=revBlob;downloadLink.download=info.filename||"review.pdf";panel.append(downloadLink);
const name=field("Your name","text",{placeholder:"First name",maxLength:45}),page=field("Page number","number",{value:"1",min:"1",max:"10000"}),comment=field("Comment","text",{placeholder:"Your feedback",maxLength:1500}),comments=el("div",undefined,"fx-review-comments");
const commentBtn=button("Post page comment",async()=>{const author=name.input.value.trim(),text=comment.input.value.trim();if(!author||!text)throw Error("Enter a name and comment");await api("comment",{token,passcode,author,page:Number(page.input.value),text});comment.input.value="";await loadComments()},true);
panel.append(el("h3","Comments"),name.label,page.label,comment.label,commentBtn,comments);
const owners=JSON.parse(localStorage.getItem("foxpdf-review-owners")||"{}");if(owners[token]?.owner)panel.append(button("Revoke this review link",async()=>{if(!confirm("Permanently revoke this link and delete its comments?"))return;await api("revoke",{token,owner:owners[token].owner});delete owners[token];localStorage.setItem("foxpdf-review-owners",JSON.stringify(owners));close();bridge.say("Review link revoked.")}));
async function loadComments(){const data=await (await api("comments",{token,passcode})).json();comments.replaceChildren();if(!data.comments.length)comments.append(el("p","No comments yet.","fx-review-muted"));for(const row of data.comments){const box=el("article",undefined,"fx-review-comment");box.append(el("b",row.author+" · Page "+row.page),el("p",row.text),el("small",new Date(row.created_at).toLocaleString()));comments.append(box)}}
await loadComments()
}
try{await open("")}catch(e){
panel.replaceChildren();const password=field("Review password","password",{placeholder:"Enter shared password"});panel.append(el("p","This link may require a password, or may have expired. "+(e.message||"")),password.label,button("Open review",async()=>{await open(password.input.value)},true))
}
}
async function sign(){
const doc=openDoc();if(!doc)return;
const body=pane(),cert=field("Your certificate (.p12 or .pfx)","file",{accept:".p12,.pfx,application/x-pkcs12"}),password=field("Certificate password","password",{placeholder:"Used only to unlock the signing certificate"}),reason=field("Reason for signing (optional)","text",{value:"Approved and signed with FoxPDF Studio",maxLength:120}),ack=field("I authorize temporary server-side use of my certificate private key","checkbox",{checked:false});
body.append(cert.label,password.label,reason.label,ack.label,el("p","FoxPDF uses your password-protected PKCS#12 certificate to apply a cryptographic PDF signature. Your private key and password are transmitted to the Railway processor over HTTPS and are not intentionally saved by the application. This is not identity verification or issuance of a trusted certificate. Only certificates from trusted issuers may validate as trusted for recipients.","fx-review-warning"),button("Sign PDF using certificate",async()=>{
const file=cert.input.files?.[0];if(!file)throw Error("Choose a .p12 or .pfx certificate");if(file.size>1024*1024)throw Error("Certificate is larger than 1 MB");if(doc.bytes.length>10*1024*1024)throw Error("PDF is larger than 10 MB");if(!password.input.value)throw Error("Enter the certificate password");if(!ack.input.checked)throw Error("You must explicitly authorize private-key processing.");
if(!confirm("Send this PDF and your certificate/private key to FoxPDF's Railway signing backend over HTTPS to create a cryptographic signature?"))return;
const data=new FormData();data.append("document",new File([doc.bytes],doc.filename,{type:"application/pdf"}));data.append("certificate",file);data.append("password",password.input.value);data.append("reason",reason.input.value);
const response=await fetch("/api/cert/sign",{method:"POST",body:data,credentials:"omit"});if(!response.ok){let err="Certificate signing failed";try{const j=await response.json();err=j.detail||j.error||err}catch{}throw Error(err)}
const bytes=await response.arrayBuffer(),blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download=doc.filename.replace(/\.pdf$/i,"")+"-cert-signed.pdf";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);close();bridge.say("Your PDF has been cryptographically signed and downloaded. Verify the certificate trust and signed document in a trusted PDF validator before relying on it.");
},true));dialog("Sign with your certificate","Apply a true cryptographic PDF signature with your own digital ID.",body)
}
window.FoxPDFReviews={share,sign,open:review};
const buttons=el("div",undefined,"fx-review-actions");buttons.append(button("↗ Share for review",share,true),button("✦ Certificate sign",sign));
const recent=$(".fx-recent-head");if(recent)recent.append(buttons);const toolbar=$(".fx-file-toolbar");if(toolbar){const work=el("div",undefined,"fx-review-actions");work.append(button("↗ Share review",share),button("✦ Sign certificate",sign));toolbar.after(work)}
const q=$("#quick");if(q){const a=el("button","↗ Create a shareable review link");a.dataset.question="Share this PDF for review";a.onclick=e=>{e.preventDefault();share()};const b=el("button","✦ Apply a certificate signature");b.dataset.question="Sign this PDF using a certificate";b.onclick=e=>{e.preventDefault();sign()};q.append(a,b)}
const chat=$("#ask");if(chat)chat.addEventListener("submit",e=>{const query=($("#question")?.value||"").toLowerCase();if(/(share|send).*(review|link|comments)|review link/.test(query)){e.preventDefault();e.stopImmediatePropagation();share()}else if(/(sign|signature|certificat).*(certificate|digital|p12|pfx)|certificate signing/.test(query)){e.preventDefault();e.stopImmediatePropagation();sign()}},true);
const hash=location.hash.replace(/^#/,"");if(hash.startsWith("review=")){const t=decodeURIComponent(hash.slice(7));review(t).catch(e=>bridge.say("Could not open review: "+e.message))}
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});else ready()
})();
