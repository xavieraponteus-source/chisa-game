
(()=>{"use strict";
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
 const msg=(d.messages||[]);rows("messagesTable",msg,x=>'<tr><td>'+h(date(x.at))+'</td><td>'+h(x.source||"Website")+'</td><td>'+h(x.name||"Visitor")+'</td><td><div class="msg-body"><strong>'+h(x.subject||"Support request")+'</strong><p>'+h(x.body||"")+'</p></div></td><td><span class="tag '+(x.status==="resolved"?"success":"warn")+'">'+h(x.status||"Received")+'</span></td><td>'+ (x.email?'<div class="msg-actions"><a href="mailto:'+encodeURIComponent(x.email).replace(/%40/gi,"@")+'?subject='+encodeURIComponent("Re: "+(x.subject||"Your message"))+'">Reply by email</a></div>':'<span class="muted">No email</span>')+'</td></tr>',"No support messages available yet.");
 set("messageCount",num(msg.length));
 const per=(d.sections||[]);bars("sectionBars",per,8);makeTable("sectionsTable",per);
 if(d.notice){set("dataNotice",d.notice);$("dataNotice").classList.remove("hidden")}else $("dataNotice").classList.add("hidden");
}
async function refresh(){const b=$("refresh");if(b)b.disabled=true;try{const r=await fetch("/admin/data?days="+windowDays,{credentials:"same-origin",cache:"no-store"});if(r.status===401){location.href="/admin";return}if(!r.ok)throw Error("Server returned "+r.status);draw(await r.json());set("refreshError","")}catch(err){set("refreshError","Data could not be loaded: "+err.message)}finally{if(b)b.disabled=false}}
function tab(name){activePage=name;$$("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===name));$$("[data-nav]").forEach(x=>{const yes=x.dataset.nav===name;x.classList.toggle("active",yes);x.setAttribute("aria-current",yes?"page":"false")});const side=$("sidebar");if(side)side.classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})}
document.addEventListener("click",e=>{const nav=e.target.closest("[data-nav]");if(nav){tab(nav.dataset.nav);return}const period=e.target.closest("[data-days]");if(period){windowDays=Math.max(1,Math.min(90,Number(period.dataset.days)||30));$$("[data-days]").forEach(el=>el.classList.toggle("active",Number(el.dataset.days)===windowDays));refresh()}});
$("refresh")?.addEventListener("click",refresh);$("mobileMenu")?.addEventListener("click",()=>$("sidebar")?.classList.toggle("open"));$("export")?.addEventListener("click",()=>{location.href="/admin/export.csv?days="+windowDays});
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("sidebar")?.classList.remove("open")});
refresh();
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
})();
