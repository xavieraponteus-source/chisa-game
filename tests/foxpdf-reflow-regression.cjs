const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/foxpdf/interactive-editor-v6.js'),'utf8');
function harness(){
 const original={name:'test.pdf',bytes:Uint8Array.of(1,2),count:1};
 let current=original,writes=0,undos=0,requests=0,message='',beforeResponse=()=>{},failWrite=false,outputPages=1;
 const paragraphs=[{index:0,preview:'Original paragraph',mixed_styles:false}];
 const fields={fxieReplacement:{value:'Updated paragraph'},fxieReplaceBox:{hidden:false}};
 const context={FormData,File,Uint8Array,inspectCache:null,selected:{text:'Original paragraph',page:1,source:original},fxieMutationChain:Promise.resolve(),$:id=>fields[id],closeInline(){},say:m=>message=m,equalBytes:(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((v,i)=>v===b[i]),app:{readCurrent:()=>current,replace:async b=>{if(failWrite)throw Error('write failed');writes++;current={...current,bytes:b}}},fxieRememberUndo(){undos++},PDFLib:{PDFDocument:{load:async()=>({getPageCount:()=>outputPages})}},fetch:async(url,options)=>{requests++;if(url.endsWith('inspect'))return {ok:true,json:async()=>({pages:[{page:1,paragraphs}]})};await beforeResponse(options);return {ok:true,arrayBuffer:async()=>Uint8Array.of(3,4).buffer}}};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function norm('),source.indexOf('function samplePixels(')),context);
 vm.runInContext(source.slice(source.indexOf('async function inspectRemote('),source.indexOf('$("fxieCloudReflow").onclick=')),context);
 return {run:()=>context.applyRemoteReflow(),inspect:s=>context.inspectRemote(s),match:(p,t)=>context.reflowParagraph(p,t),setCurrent:v=>current=v,setHook:f=>beforeResponse=f,setFail:()=>failWrite=true,setPageCount:n=>outputPages=n,paragraphs,original,get writes(){return writes},get undos(){return undos},get requests(){return requests},get message(){return message}};
}
test('successful remote reflow writes one result and one undo snapshot',async()=>{const h=harness();await h.run();assert.equal(h.writes,1);assert.equal(h.undos,1);});
test('same-length PDF changed before reflow is never uploaded',async()=>{const h=harness();h.setCurrent({...h.original,bytes:Uint8Array.of(8,9)});await h.run();assert.equal(h.requests,0);assert.equal(h.writes,0);});
test('switching document during server processing keeps the newer document',async()=>{const h=harness();h.setHook(()=>h.setCurrent({name:'other.pdf',bytes:Uint8Array.of(8,9),count:1}));await h.run();assert.equal(h.writes,0);assert.equal(h.undos,0);assert.match(h.message,/newer edits were kept/);});
test('changing bytes of the same-name document during processing is detected',async()=>{const h=harness();h.setHook(()=>h.setCurrent({...h.original,bytes:Uint8Array.of(8,9)}));await h.run();assert.equal(h.writes,0);assert.equal(h.undos,0);});
test('failed commit never adds an undo snapshot',async()=>{const h=harness();h.setFail();await h.run();assert.equal(h.undos,0);assert.match(h.message,/write failed/);});
test('unexpected output page count is rejected',async()=>{const h=harness();h.setPageCount(2);await h.run();assert.equal(h.writes,0);assert.match(h.message,/different page count/);});
test('inspection cache distinguishes same-name same-length PDFs',async()=>{const h=harness();await h.inspect(h.original);await h.inspect(h.original);assert.equal(h.requests,1);await h.inspect({...h.original,bytes:Uint8Array.of(8,9)});assert.equal(h.requests,2);});
test('ambiguous and unrelated paragraphs are rejected',()=>{const h=harness();assert.throws(()=>h.match([{preview:'Repeated text'},{preview:'Repeated text'}],'Repeated text'),/Several paragraphs/);assert.throws(()=>h.match([{preview:'Something unrelated'}],'Original paragraph'),/could not be matched/);});
test('mixed fonts remain guarded',()=>{const h=harness();assert.throws(()=>h.match([{preview:'Original paragraph',mixed_styles:true}],'Original paragraph'),/Mixed-font/);});
test('a selected line cannot replace a longer paragraph',()=>{const h=harness();assert.throws(()=>h.match([{preview:'Original paragraph has two lines'}],'Original paragraph'),/complete paragraph/);});
