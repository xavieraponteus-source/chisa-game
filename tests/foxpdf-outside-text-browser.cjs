const {test}=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright'),fs=require('node:fs');
test('outside clicks save and close; another paragraph switches safely across a page redraw',async()=>{
 const browser=await chromium.launch({headless:true,...(fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.setContent('<div class="fxie-layout" style="display:flex;height:760px"><div class="fxie-sheet"></div></div>');
 await page.addStyleTag({content:fs.readFileSync('assets/foxpdf/integrity-tools-v1.css','utf8')});
 await page.evaluate(()=>{
  let current={name:'sample.pdf',bytes:new Uint8Array([1]),count:1};window.words={a:'First words',b:'Second words'};window.writes=[];window.messages=[];
  const model=()=>Object.entries(window.words).map(([id,text],i)=>({id,text,editable:true,line_count:1,bbox:[40,70+i*170,200,100+i*170],available_bbox:[40,70+i*170,200,210+i*170],fonts:['Times'],font_size:18}));
  function sheet(){const el=document.createElement('div');el.className='fxie-sheet';el.style.cssText='position:relative;width:500px;height:700px;flex-shrink:0';
   for(const [i,p] of model().entries()){const b=document.createElement('button');b.className='fxie-textregion';b.textContent=p.text;b.dataset.id=p.id;b.style.cssText='position:absolute;left:40px;top:'+(70+i*170)+'px';b.onclick=()=>window.FoxPDFIntegrity.editSelection({page:1,text:p.text,bbox:p.bbox});el.append(b)}
   const blank=document.createElement('div');blank.id='blank';blank.style.cssText='position:absolute;left:300px;top:450px;width:80px;height:80px';el.append(blank);document.querySelector('.fxie-sheet').replaceWith(el)
  }
  window.FoxPDFBridge={readCurrent:()=>({...current,bytes:current.bytes.slice()}),current:()=>({page:1}),say:m=>window.messages.push(m)};
  window.PDFLib={PDFDocument:{load:async()=>({getPageCount:()=>1})}};
  window.FoxPDFInteractiveEditor={pageSurface:()=>({sheet:document.querySelector('.fxie-sheet'),scale:1}),pdfjs:async()=>({getDocument:()=>({promise:Promise.resolve({getPage:async()=>({getViewport:()=>({width:500,height:700}),render:()=>({promise:Promise.resolve()})}),destroy:async()=>{}})})}),commitVerified:async(source,bytes)=>{const value=JSON.parse(new TextDecoder().decode(bytes));if(!source.bytes.every((n,i)=>n===current.bytes[i]))throw Error('stale write');current={...current,bytes};window.words[value.paragraph_id]=value.text;window.writes.push(value);sheet()}};
  window.fetch=async(_url,options)=>{const form=options.body,op=form.get('operation');if(!op)return new Response(JSON.stringify({source_sha256:'abc',pages:[{page:1,rotation:0,paragraphs:model()}]}));const params=JSON.parse(form.get('params'));await new Promise(r=>setTimeout(r,90));if(params.text==='FAIL')return new Response(JSON.stringify({detail:'Test save failure'}),{status:422});return new Response(JSON.stringify(params),{headers:{'x-foxpdf-details':'{}'}})};
  sheet();
 });
 await page.addScriptTag({content:fs.readFileSync('assets/foxpdf/integrity-tools-v1.js','utf8')});
 const direct=page.getByRole('textbox',{name:'Edit paragraph directly on PDF'});
 await page.locator('[data-id="a"]').click();await direct.waitFor();await direct.fill('First draft');
 // The click captures a button which the pending save replaces before the switch.
 await page.locator('[data-id="b"]').click();await page.waitForFunction(()=>document.querySelector('.fxi-live-text')?.textContent==='Second words');
 assert.equal(await page.evaluate(()=>window.words.a),'First draft');assert.equal(await page.locator('.fxi-panel').count(),1);
 await direct.fill('Second draft');await page.locator('#blank').click();await page.waitForFunction(()=>!document.querySelector('.fxi-panel'));
 assert.deepEqual(await page.evaluate(()=>window.words),{a:'First draft',b:'Second draft'});
 await page.locator('[data-id="a"]').click();await direct.waitFor();await direct.fill('FAIL');await page.locator('#blank').click();
 await page.waitForFunction(()=>document.querySelector('.fxi-status')?.textContent.includes('Not saved:'));
 assert.equal(await direct.textContent(),'FAIL');assert.equal(await page.evaluate(()=>window.words.a),'First draft');
 // Panel controls remain usable; an error does not throw away the draft.
 await page.locator('.fxi-body textarea').fill('Recovered');assert.equal(await direct.textContent(),'Recovered');
 await page.getByRole('button',{name:'A+',exact:true}).click();assert.equal(await page.locator('.fxi-panel').count(),1);
 await page.locator('#blank').click();await page.waitForFunction(()=>!document.querySelector('.fxi-panel'));
 assert.equal(await page.evaluate(()=>window.words.a),'Recovered');assert.equal(await page.evaluate(()=>window.writes.at(-1).font_scale),1.1);
 // Rapid selections keep the last requested paragraph rather than reopening an older one.
 await page.locator('[data-id="a"]').click();await direct.waitFor();await direct.fill('Latest edit');
 await page.evaluate(async()=>{await Promise.all([window.FoxPDFIntegrity.editSelection({page:1,text:'Second draft'}),window.FoxPDFIntegrity.editSelection({page:1,text:'Latest edit'})])});
 await page.waitForFunction(()=>document.querySelector('.fxi-live-text')?.textContent==='Latest edit');assert.equal(await page.locator('.fxi-panel').count(),1);
 }finally{await browser.close()}
});
