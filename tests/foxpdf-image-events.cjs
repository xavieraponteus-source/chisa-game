const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/foxpdf/interactive-editor-v6.js'),'utf8');
test('a click after dragging an image cannot trigger page image placement',()=>{
 const handlers={};let placements=0;
 const frame={addEventListener:(name,callback)=>handlers[name]=callback};
 const ctx={el:()=>frame};vm.createContext(ctx);
 const start=source.indexOf('const frame=el("div","fxie-image-selection")');
 vm.runInContext(source.slice(start,source.indexOf('const fit=',start)),ctx);
 let stopped=false;handlers.click?.({stopPropagation(){stopped=true}});
 if(!stopped)placements++;
 assert.equal(placements,0);
});
