
(()=>{"use strict";

/* FOX_ADMIN_CLIENT_SHELL — all panels rendered client-side from trusted static markup. */
const nav=[["overview","◈","Overview"],["visitors","♧","Visitors"],["pages","▤","Pages"],["countries","◎","Countries"],["devices","▣","Devices"],["sources","⌁","Sources"],["activity","↗","Activity"],["messages","✉","Messages"],["system","⚙","System"]];
const foxArt="https://raw.githubusercontent.com/xavieraponteus-source/chisa-game/main/assets/foxpdf/golden-fox-fixed-v10.webp";
const table=(id,headers)=>'<div class="tablewrap"><table><thead><tr>'+headers.map(t=>'<th>'+t+'</th>').join("")+'</tr></thead><tbody id="'+id+'"></tbody></table></div>';
const panel=(name,content)=>'<section class="panel"><h3>'+name+'</h3>'+content+'</section>';
const cards=(defs)=>'<div class="metrics">'+defs.map(([id,title,sub])=>'<div class="metric"><small>'+title+'</small><strong id="'+id+'">—</strong><span>'+(sub||"")+'</span></div>').join("")+'</div>';
const page=(name,content,active)=>'<section data-page="'+name+'" class="page '+(active?"active":"")+'">'+content+'</section>';
const hero='<div class="hero"><span class="decor">✦ 🌸</span><h2>Moonlight Control Center</h2><p>Everything across Xavier is Working: Chisa Moonlight Flight!, FoxPDF Studio, visitor trends, countries and support requests—in one private dashboard.</p></div>';
document.body.innerHTML='<div class="shell"><aside class="sidebar" id="sidebar"><a class="brand" href="/"><span class="brand-icon">🦊</span><span><b>Xavier is Working</b><small>ADMIN CONTROL CENTER</small></span></a><nav class="nav" aria-label="Admin navigation">'+nav.map(([id,ico,label],i)=>'<button type="button" data-nav="'+id+'" class="'+(i===0?"active":"")+'"><span class="ico">'+ico+'</span>'+label+'</button>').join("")+'</nav><div class="sidebar-art"><img src="'+foxArt+'" alt="Fox mascot artwork"><p>✦ Moonlight Administration</p></div><div class="side-bottom"><a href="/">Public site</a><a href="/admin/logout">Sign out</a></div></aside><main class="main"><div class="head"><div><button type="button" id="mobileMenu">☰ Menu</button><h1>Full-Site Analytics</h1><p>Home · Chisa Moonlight Flight! · FoxPDF Studio</p></div><div class="actions"><span class="chip"><span class="pulse"></span>Private Admin</span><button id="refresh" class="chip" type="button">↻ Refresh</button><button id="export" class="chip gold" type="button">⇩ Export CSV</button></div></div><div class="toolbar"><div class="seg"><button data-days="7">7 days</button><button data-days="30" class="active">30 days</button><button data-days="90">90 days</button></div><span id="lastRefreshed" class="note">Loading…</span></div><div id="dataNotice" class="banner hidden"></div><p id="refreshError" class="error"></p>'+
page("overview",hero+cards([["metricViews","Total page views","Across tracked sections"],["metricSessions","Anonymous sessions","Not named people"],["metricGame","Chisa game visits","Existing game records"],["metricPdf","FoxPDF visits","Editor views"]])+'<div class="dashgrid">'+panel("Visitor trend",'<div class="chart" id="trafficChart"></div>')+panel("Visitors by country",'<div class="bars" id="countryBars"></div>')+panel("Top pages",'<div class="bars" id="pageBars"></div>')+panel("Devices",'<div class="bars" id="deviceBars"></div>')+panel("Traffic sources",'<div class="bars" id="sourceBars"></div>')+panel("Website sections",'<div class="bars" id="sectionBars"></div>')+'</div>',true)+
page("visitors",panel("Recent anonymous visits",table("visitorsTable",["When","Section","Page","Country","Device","Event"])),false)+
page("pages",panel("Most visited pages",table("pagesTable",["#","Page","Views"])),false)+
page("countries",panel("Visitor locations (when available)",table("countriesTable",["#","Country","Visits"]))+'<p class="note">Unknown means a trusted country signal was not available; this is not GPS tracking.</p>',false)+
page("devices",panel("Mobile, tablet and desktop",table("devicesTable",["#","Device","Visits"])),false)+
page("sources",panel("Traffic sources",table("sourcesTable",["#","Source","Visits"])),false)+
page("activity",panel("Recent actions",table("eventsTable",["When","Section","Action","Page"])),false)+
page("messages",hero+panel('Feedback and support · <span id="messageCount">—</span>',table("messagesTable",["Date","From","Name","Message","Status","Reply"])),false)+
page("system",cards([["metricHub","Home visits","App selection"],["metricTools","PDF tool clicks","Editor events"],["metricCountries","Countries","Known location"],["metricSupport","Support messages","Existing inbox"]])+panel("Tracking coverage",'<p id="coverageText" class="note">Checking Chisa visits table…</p><p class="note">No PDF contents, IP addresses or document filenames are stored by the analytics feature.</p>')+panel("Visits by section",table("sectionsTable",["#","Section","Events"])),false)+
'<footer class="footer"><span>Xavier is Working · Private Admin</span><span>Entire website · Chisa · FoxPDF</span></footer></main></div>';

const $=id=>document.getElementById(id),$$=sel=>Array.from(document.querySelectorAll(sel));
const h=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=n=>Number(n||0).toLocaleString(),date=x=>x?new Date(x).toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"}):"—";
let windowDays=30,report=null,activePage="overview";
const set=(id,txt)=>{const e=$(id);if(e)e.textContent=txt};
function rows(id,items,fn,empty="No records in this period"){const el=$(id);if(!el)return;el.innerHTML=items&&items.length?items.map(fn).join(""):'<tr><td colspan="7"><div class="empty">'+h(empty)+'</div></td></tr>'}
function bars(id,items,max=9){const el=$(id);if(!el)return;const list=(items||[]).slice(0,max),largest=Math.max(1,...list.map(x=>Number(x.count||0)));el.innerHTML=list.length?list.map(x=>'<div class="barrow"><b title="'+h(x.name)+'">'+h(x.name)+'</b><div class="track"><span class="fill" style="width:'+Math.max(1,Math.round(100*(x.count||0)/largest))+'%"></span></div><em>'+num(x.count)+'</em></div>').join(""):'<div class="empty">No data available yet</div>'}
function lineChart(points){const el=$("trafficChart");if(!el)return;const ps=points||[];if(!ps.length){el.innerHTML='<div class="empty">Visit trends will appear as events arrive.</div>';return}const vmax=Math.max(1,...ps.map(p=>Number(p.count||0))),w=640,hg=190,top=15,bot=153,margin=10;
const coords=ps.map((p,i)=>[margin+(w-2*margin)*(ps.length===1?.5:i/(ps.length-1)),bot-(bot-top)*(Number(p.count||0)/vmax)]);
const poly=coords.map(p=>p.map(x=>x.toFixed(1)).join(",")).join(" ");
const area=margin+","+bot+" "+poly+" "+coords[coords.length-1][0]+","+bot;
let lines="";for(let j=0;j<4;j++){const y=bot-(bot-top)*j/3;lines+='<line class="gridline" x1="10" y1="'+y+'" x2="630" y2="'+y+'"/><text x="12" y="'+(y-4)+'">'+Math.round(vmax*j/3)+'</text>'}
const a=ps[0],z=ps[ps.length-1];el.innerHTML='<svg viewBox="0 0 640 190" role="img" aria-label="Site views over time">'+lines+'<polygon points="'+area+'" fill="#a255d3" opacity=".19"/><polyline points="'+poly+'" fill="none" stroke="#f08cdd" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'+coords.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="#fbe7ff" stroke="#c678ed" stroke-width="1.5"/>').join("")+'<text x="10" y="178">'+h(a.day||"")+'</text><text x="510" y="178">'+h(z.day||"")+'</text></svg>'}
function makeTable(id,items){rows(id,items,(x,i)=>'<tr><td>'+num(i+1)+'</td><td>'+h(x.name)+'</td><td><b>'+num(x.count)+'</b></td></tr>')}
function draw(d){
 report=d;
 const t=d.totals||{};set("lastRefreshed","Updated "+new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}));
 set("metricViews",num(t.views));set("metricSessions",num(t.sessions));set("metricGame",num(t.game));set("metricPdf",num(t.pdf));set("metricHub",num(t.hub));set("metricTools",num(t.tools));set("metricCountries",num((d.countries||[]).filter(x=>x.name!=="Unknown").length));set("metricSupport",num((d.messages||[]).length));
 set("periodLabel","Last "+windowDays+" days");
 set("coverageText",d.coverage?.game?"Game activity is connected from the existing visits database.":"Game activity may be incomplete until direct-game tracking is connected.");
 lineChart(d.trend);bars("countryBars",d.countries,8);bars("deviceBars",d.devices,6);bars("sourceBars",d.sources,7);bars("pageBars",d.pages,8);
 makeTable("pagesTable",d.pages);makeTable("countriesTable",d.countries);makeTable("devicesTable",d.devices);makeTable("sourcesTable",d.sources);
 rows("visitorsTable",d.visitors||[],x=>'<tr><td>'+h(date(x.at))+'</td><td>'+h(x.section)+'</td><td>'+h(x.page)+'</td><td>'+h(x.country||"Unknown")+'</td><td>'+h(x.device||"Unknown")+'</td><td><span class="tag">'+h(x.kind||"Visit")+'</span></td></tr>');
 rows("eventsTable",d.events||[],x=>'<tr><td>'+h(date(x.at))+'</td><td>'+h(x.section)+'</td><td>'+h(x.action)+'</td><td>'+h(x.page||"—")+'</td></tr>');
 const msg=(d.messages||[]);rows("messagesTable",msg,x=>'<tr><td>'+h(date(x.at))+'</td><td>'+h(x.source||"Website")+'</td><td>'+h(x.name||"Visitor")+'</td><td><div class="msg-body"><strong>'+h(x.subject||"Support request")+'</strong><p>'+h(x.body||"")+'</p></div></td><td><span class="tag '+(x.status==="resolved"?"success":"warn")+'">'+h(x.status||"Received")+'</span></td><td>'+ (x.ticketId?'<button type="button" class="chip" data-ticket="'+Number(x.ticketId)+'">Open thread / Reply</button>':x.email?'<div class="msg-actions"><a href="mailto:'+encodeURIComponent(x.email).replace(/%40/gi,"@")+'?subject='+encodeURIComponent("Re: "+(x.subject||"Your message"))+'">Reply by email</a></div>':'<span class="muted">No email</span>')+'</td></tr>',"No support messages available yet.");
 set("messageCount",num(msg.length));
 const per=(d.sections||[]);bars("sectionBars",per,8);makeTable("sectionsTable",per);
 if(d.notice){set("dataNotice",d.notice);$("dataNotice").classList.remove("hidden")}else $("dataNotice").classList.add("hidden");
}
async function refresh(){const b=$("refresh");if(b)b.disabled=true;try{const r=await fetch("/admin/data?days="+windowDays,{credentials:"same-origin",cache:"no-store"});if(r.status===401){location.href="/admin";return}if(!r.ok)throw Error("Server returned "+r.status);draw(await r.json());set("refreshError","")}catch(err){set("refreshError","Data could not be loaded: "+err.message)}finally{if(b)b.disabled=false}}
function tab(name){activePage=name;$$("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===name));$$("[data-nav]").forEach(x=>{const yes=x.dataset.nav===name;x.classList.toggle("active",yes);x.setAttribute("aria-current",yes?"page":"false")});const side=$("sidebar");if(side)side.classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})}
document.addEventListener("click",e=>{const nav=e.target.closest("[data-nav]");if(nav){tab(nav.dataset.nav);return}const period=e.target.closest("[data-days]");if(period){windowDays=Math.max(1,Math.min(90,Number(period.dataset.days)||30));$$("[data-days]").forEach(el=>el.classList.toggle("active",Number(el.dataset.days)===windowDays));refresh()}});
$("refresh")?.addEventListener("click",refresh);$("mobileMenu")?.addEventListener("click",()=>$("sidebar")?.classList.toggle("open"));$("export")?.addEventListener("click",()=>{location.href="/admin/export.csv?days="+windowDays});
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("sidebar")?.classList.remove("open")});

/* Support threads: replies are saved to the website's own Chisa support inbox. */
document.addEventListener("click",async function(evt){
 const trigger=evt.target.closest("[data-ticket]");if(!trigger)return;
 const id=Number(trigger.dataset.ticket);if(!Number.isInteger(id)||id<1)return;
 const dialog=document.createElement("dialog");dialog.className="fox-reply-dialog";
 dialog.innerHTML='<div class="reply-top"><h3>Chisa support thread #'+id+'</h3><button type="button" class="chip" id="closeReply">✕ Close</button></div><div class="reply-thread" id="threadMessages"><p class="muted">Loading conversation…</p></div><label for="replyText">Reply to this visitor</label><textarea id="replyText" rows="4" maxlength="3000" placeholder="Write your response…"></textarea><div class="reply-bottom"><p id="replyStatus" class="note">Replies are saved to this website thread. No email is sent automatically.</p><button type="button" class="chip gold" id="sendReply">Save reply</button></div>';
 document.body.appendChild(dialog);dialog.showModal();
 const close=()=>dialog.close();dialog.querySelector("#closeReply").onclick=close;dialog.addEventListener("close",()=>dialog.remove());
 async function loadThread(){
  const r=await fetch("/admin/ticket/"+id,{credentials:"same-origin",cache:"no-store"});
  if(!r.ok)throw Error("Unable to load conversation");
  const data=await r.json();
  const m=dialog.querySelector("#threadMessages");
  m.innerHTML=(data.messages||[]).length?data.messages.map(x=>'<div class="thread-message"><b>'+h(x.author||"Visitor")+'</b><small>'+h(date(x.created_at))+'</small><p>'+h(x.body||"")+'</p></div>').join(""):'<div class="empty">No messages in this ticket yet.</div>';
  m.scrollTop=m.scrollHeight;
 }
 try{await loadThread()}catch(err){dialog.querySelector("#threadMessages").textContent=err.message}
 dialog.querySelector("#sendReply").onclick=async()=>{
  const content=dialog.querySelector("#replyText").value.trim();
  if(!content){dialog.querySelector("#replyStatus").textContent="Write a reply first.";return}
  const button=dialog.querySelector("#sendReply");button.disabled=true;
  try{const r=await fetch("/admin/ticket/"+id+"/reply",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({reply:content})});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||"Reply could not be saved");dialog.querySelector("#replyText").value="";dialog.querySelector("#replyStatus").textContent="Reply saved to the website support thread.";await loadThread()}catch(err){dialog.querySelector("#replyStatus").textContent=err.message}finally{button.disabled=false}
 };
});

refresh();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
})();
