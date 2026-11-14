const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/foxpdf/interactive-editor-v6.js'),'utf8');
function harness(){
 const fields=Object.fromEntries(['fxFindWord','fxFindWith','fxFindWhole','fxFindCase','fxFindCount','fxieFont'].map(id=>[id,{value:id==='fxFindWord'?'fox':id==='fxFindWith'?'wolf':'Helvetica',checked:id==='fxFindWhole'}]));
 let current={name:'sample.pdf',bytes:Uint8Array.of(1)},writes=0,counts=0,message='',queued;
 const state={hits:[],index:0,serial:0};
 const reader={numPages:1,destroy(){},async getPage(){return {async getOperatorList(){},commonObjs:{get(){}},getViewport(){return {width:100,height:100,transform:[]}},async getTextContent(){return {items:[{str:'fox',width:30,transform:[]}]}}}}};
 const context={fxieFind:state,findTextMetrics:()=>index=>index/3,findEl:id=>fields[id],findCount(){counts++},findRefreshVisible(){},app:{readCurrent:()=>current},say:m=>{message=m},equalBytes:(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((v,i)=>v===b[i]),getJs:async()=>({getDocument:()=>({promise:Promise.resolve(reader)}),Util:{transform:()=>[1,0,0,10,5,20]}}),findOccurrences:()=>[[0,3]],confirm:()=>true,fxieEmbedSelectedFont:async()=>({}),color(){},PDFLib:{rgb(){}},mutate:async fn=>{queued=fn;return false}};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('async function findScan(){'),source.indexOf('bind("fxieSearch",')),context);
 return {fields,state,reader,scan:()=>context.findScan(),replace:()=>context.findReplace(true),setCurrent:v=>current=v,runQueued:()=>queued({getPageCount:()=>1,getPage:()=>({getRotation:()=>({angle:0}),getHeight:()=>100,getWidth:()=>100,drawRectangle(){writes++},drawText(){writes++}})}),get writes(){return writes},get message(){return message},get counts(){return counts},get queued(){return queued}};
}
test('successful search publishes matches from its exact document version',async()=>{const h=harness();await h.scan();assert.equal(h.state.hits.length,1);assert.deepEqual([...h.state.documentBytes],[1]);});
test('editing a same-name PDF after search blocks replacement',async()=>{const h=harness();await h.scan();h.setCurrent({name:'sample.pdf',bytes:Uint8Array.of(2)});await h.replace();assert.equal(h.queued,undefined);assert.match(h.message,/changed since/);});
test('a queued replacement rechecks the version before drawing',async()=>{const h=harness();await h.scan();await h.replace();h.setCurrent({name:'sample.pdf',bytes:Uint8Array.of(2)});await assert.rejects(h.runQueued(),/changed before replacement/);assert.equal(h.writes,0);});
test('clearing the query clears matches and refreshes disabled actions',async()=>{const h=harness();await h.scan();h.fields.fxFindWord.value='';await h.scan();assert.equal(h.state.hits.length,0);assert.equal(h.state.documentBytes,null);assert.ok(h.counts>=3);await h.replace();assert.equal(h.queued,undefined);});
test('document edits during a scan cannot publish old positions',async()=>{const h=harness();const original=h.reader.getPage;h.reader.getPage=async()=>{h.setCurrent({name:'sample.pdf',bytes:Uint8Array.of(3)});return original()};await h.scan();assert.equal(h.state.hits.length,0);assert.equal(h.state.documentBytes,null);assert.match(h.fields.fxFindCount.textContent,/changed during search/);});
