/* Keep original-text tools available wherever the main editor is loaded. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),marker='/* FOXPDF_BUNDLED_INTEGRITY_START */';
function build(){
 const editorPath=path.join(root,'assets/foxpdf/interactive-editor-v6.js');
 const core=fs.readFileSync(editorPath,'utf8').split(marker)[0].trimEnd();
 const styles=fs.readFileSync(path.join(root,'assets/foxpdf/integrity-tools-v1.css'),'utf8').replace(/\r\n/g,'\n');
 let moduleSource=fs.readFileSync(path.join(root,'assets/foxpdf/integrity-tools-v1.js'),'utf8').replace(/\r\n/g,'\n');
 const cssLoader=/const css=document\.createElement\("link"\);css\.rel="stylesheet";css\.href="[^"\n]+";document\.head\.append\(css\);/;
 if(!cssLoader.test(moduleSource))throw Error('Original-text style loader changed; update the bundle builder.');
 moduleSource=moduleSource.replace(cssLoader,'const css=document.createElement("style");css.dataset.foxpdfIntegrity="2.2";css.textContent='+JSON.stringify(styles)+';document.head.append(css);');
 return core+'\n\n'+marker+'\n'+moduleSource.trimEnd()+'\n';
}
if(require.main===module)fs.writeFileSync(path.join(root,'assets/foxpdf/interactive-editor-v6.js'),build(),'utf8');
module.exports={build,marker};
