const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),fs=require('node:fs');
test('page typing, size buttons, drag, and immediate Save use the latest draft',async()=>{
 const browser=await chromium.launch({headless:true,...(fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{const page=await browser.newPage();await page.setContent('<div class="fxie-layout"><div class="fxie-sheet" style="position:relative;width:500px;height:600px"></div></div><button id="fxieSave">Save PDF</button>');
 await page.evaluate(()=>{
  let current={name:'sample.pdf',bytes:new Uint8Array([1]),count:1};window.writes=[];window.downloads=[];
  window.FoxPDFBridge={readCurrent:()=>({...current,bytes:current.bytes.slice()}),current:()=>({page:1}),say:console.log};
  window.PDFLib={PDFDocument:{load:async()=>({getPageCount:()=>1})}};
  window.FoxPDFInteractiveEditor={pageSurface:()=>({sheet:document.querySelector('.fxie-sheet'),scale:1}),pdfjs:async()=>({getDocument:()=>({promise:Promise.resolve({getPage:async()=>({getViewport:()=>({width:500,height:600}),render:()=>({promise:Promise.resolve()})}),destroy:async()=>{}})})}),commitVerified:async(source,bytes)=>{current={...current,bytes};window.writes.push(JSON.parse(new TextDecoder().decode(bytes)));document.querySelector('.fxie-sheet').replaceWith(Object.assign(document.createElement('div'),{className:'fxie-sheet'}))}};
  document.querySelector('#fxieSave').onclick=()=>window.downloads.push(JSON.parse(new TextDecoder().decode(current.bytes)));
  window.fetch=async(_url,options)=>{const form=options.body,op=form.get('operation');if(!op)return new Response(JSON.stringify({source_sha256:'abc',pages:[{page:1,rotation:0,paragraphs:[{id:'p',text:'Clean words',editable:true,line_count:1,bbox:[40,60,146,90],available_bbox:[40,60,180,200],fonts:['Times'],font_size:24,bold:true,italic:true}]}]}));const params=JSON.parse(form.get('params'));await new Promise(r=>setTimeout(r,60));return new Response(JSON.stringify(params),{headers:{'x-foxpdf-details':'{}'}})};
 });
 await page.addScriptTag({content:fs.readFileSync('assets/foxpdf/integrity-tools-v1.js','utf8')});
 await page.evaluate(()=>window.FoxPDFIntegrity.editSelection({page:1,text:'Clean words'}));
 const direct=page.getByRole('textbox',{name:'Edit paragraph directly on PDF'});await direct.waitFor();const initial=await direct.boundingBox();assert.ok(initial.height<40,'original single-line text must remain one line in the preview');await direct.fill('Live edit');
 assert.equal(await page.locator('.fxi-body textarea').inputValue(),'Live edit');assert.equal(await direct.textContent(),'Live edit');
 await page.getByRole('button',{name:'A+',exact:true}).click();assert.equal(await page.locator('.fxi-live-toolbar span').textContent(),'110%');
 const grip=page.getByRole('button',{name:'Drag paragraph to move it'}),box=await grip.boundingBox();await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(box.x+30,box.y+40);await page.mouse.up();
 await page.getByRole('button',{name:'Save PDF',exact:true}).click();await page.waitForFunction(()=>window.downloads.length===1);
 const result=await page.evaluate(()=>({writes:window.writes,download:window.downloads[0],preview:document.querySelector('.fxi-live-text')?.textContent}));
 assert.equal(result.download.text,'Live edit');assert.equal(result.download.font_scale,1.1);assert.deepEqual(result.download.position,{x:60,y:90});assert.equal(result.preview,'Live edit');
 await page.getByRole('button',{name:'Done editing',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.fxi-live-text'));
 }finally{await browser.close()}
});
