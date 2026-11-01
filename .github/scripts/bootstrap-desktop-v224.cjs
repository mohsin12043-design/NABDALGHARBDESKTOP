const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'dist/index.html');
let html=fs.readFileSync(file,'utf8');
function once(a,b){if(!html.includes(a))throw Error('Desktop base patch target missing: '+a.slice(0,80));html=html.replace(a,b);}
if(!html.includes('function nagApplyCustomerLedgerEditDeleteV224(')){
  once('  function openTool(doc,label){',fs.readFileSync(path.join(__dirname,'fragments/ledger-customer-management-v224.js'),'utf8')+'  function openTool(doc,label){');
  once("doc=nagApplyLedgerRecoveryV256(doc,label);document.getElementById('frame')","doc=nagApplyLedgerRecoveryV256(doc,label);doc=nagApplyCustomerLedgerEditDeleteV224(doc,label);document.getElementById('frame')");
  once("    patch=patch.replace('<\\\\/script>'",'    patch=patch.replace("if(!c){c={id:\'cloud_c_\'","if(c&&c.deleted_at)return null;if(!c){c={id:\'cloud_c_\'");\n'+"    patch=patch.replace('<\\\\/script>'");
  once('out.customers.forEach(function(c){if(!out.entries[c.id])out.entries[c.id]=[];});return out;}','out.customers.forEach(function(c){if(c.deleted_at)out.entries[c.id]=[];else if(!out.entries[c.id])out.entries[c.id]=[];});return out;}');
  fs.writeFileSync(file,html,'utf8');
}
for(const name of ['package.json','src-tauri/tauri.conf.json']){const f=path.join(root,name),d=JSON.parse(fs.readFileSync(f,'utf8'));d.version='2.2.5';fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n','utf8');}
const cargo=path.join(root,'src-tauri/Cargo.toml');fs.writeFileSync(cargo,fs.readFileSync(cargo,'utf8').replace(/^version = "[^"]+"/m,'version = "2.2.5"'),'utf8');
console.log('Preserved desktop v224 fixes and set version 2.2.5.');
