const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'dist/index.html');
let html=fs.readFileSync(file,'utf8');
function once(s,a,b){if(!s.includes(a))throw Error('Customer profile patch target missing: '+a.slice(0,100));return s.replace(a,b);}
function between(s,start,end,replacement){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Missing function boundary '+start);return s.slice(0,a)+replacement+'\n'+s.slice(b);}
function moduleDoc(key,patch){const re=new RegExp('\\b'+key+'=b64utf8\\("([^\"]+)"\\)'),m=html.match(re);if(!m)throw Error('Missing '+key);const doc=patch(Buffer.from(m[1],'base64').toString('utf8')).replace(/\s*$/,'\n');html=html.replace(re,key+'=b64utf8("'+Buffer.from(doc).toString('base64')+'")');}
function fragment(doc,name,startup){
  const fileName=name==='NAG_CUSTOMER_FORM_PROFILES_V226'?'customer-form-profiles-v226.js':'ledger-profile-save-v226.js';
  const code=fs.readFileSync(path.join(__dirname,'fragments',fileName),'utf8');
  const start=doc.indexOf('  /* '+name+' */');
  if(start>=0){const end=doc.indexOf('  /* END_'+name+' */',start);if(end<0)throw Error('Missing fragment end '+name);return doc.slice(0,start)+code+doc.slice(end+('  /* END_'+name+' */').length);}
  return once(doc,startup,code+'\n'+startup);
}
for(const key of ['INV','RECV'])moduleDoc(key,function(doc){
  if(!doc.includes('NAG_PROFILE_LOOKUP_V226')){
    doc=between(doc,'  function findLedgerCustomerByName(name){','  function findOrCreateLedgerCustomer(',"  /* NAG_PROFILE_LOOKUP_V226 */\n  function findLedgerCustomerByName(name){return window.parent.NagCustomerProfiles.find(loadLedgerData().customers,name);}");
    const signature=key==='INV'?'name,mobile,vat,address,nationalAddress':'name,mobile';
    const fields=key==='INV'?"vat:vat||'',address:address||'',nationalAddress:nationalAddress||'',":"vat:'',address:'',nationalAddress:'',";
    doc=between(doc,'  function findOrCreateLedgerCustomer(','  function ledgerCustomerOutstanding(',"  function findOrCreateLedgerCustomer("+signature+"){\n    var p=window.parent.NagCustomerProfiles,d=loadLedgerData(),n=String(name||'').trim();if(!n)return null;\n    var existing=p.find(d.customers,n);if(existing)return existing;\n    if(d.customers.some(function(c){return !c.deleted_at&&p.norm(c.name)===p.norm(n);}))throw Error('Multiple customers share this name. Select the correct Customer Ledger record first.');\n    var c=nagBridgeMark({id:'c_'+Date.now()+'_'+Math.random().toString(36).slice(2),name:n,mobile:mobile||'',"+fields+"creditLimit:0});p.stamp(c);d.customers.push(c);persistLedgerData(d);return c;\n  }");
    const autofill=key==='INV'?"  function autofillCustomerFromLedger(){nagProfileFill(false);checkCreditLimit();}":"  function autofillCustomerFromLedger(){var c=nagProfileFill(false),out=c?ledgerCustomerOutstanding(c.id):0;$('prevbal').value=out>0?out.toFixed(2):'0.00';calc();render();}";
    doc=between(doc,'  function autofillCustomerFromLedger(){',key==='INV'?'  function checkCreditLimit(){':'  function setStatus(',autofill);
  }
  const anchor=key==='INV'?"  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();":null;
  if(anchor)return fragment(doc,'NAG_CUSTOMER_FORM_PROFILES_V226',anchor);
  const matches=[...doc.matchAll(/  if\(document.readyState==='loading'\)[^\n]+/g)];if(matches.length!==1)throw Error('Receipt startup not unique');
  return fragment(doc,'NAG_CUSTOMER_FORM_PROFILES_V226',matches[0][0]);
});
moduleDoc('LEDGER',function(doc){
  if(!doc.includes('obj.customers.forEach(window.parent.NagCustomerProfiles.apply)'))doc=once(doc,'if(!Array.isArray(obj.customers))obj.customers=[];','if(!Array.isArray(obj.customers))obj.customers=[];obj.customers.forEach(window.parent.NagCustomerProfiles.apply);');
  const matches=[...doc.matchAll(/  if\(document.readyState==='loading'\)[^\n]+/g)];if(matches.length!==1)throw Error('Ledger startup not unique');
  return fragment(doc,'NAG_LEDGER_PROFILE_SAVE_V226',matches[0][0]);
});
if(!html.includes('id="nag-customer-profiles-v226"'))html=once(html,'<script id="nag-invoice-customer-links-v225"','<script id="nag-customer-profiles-v226" src="customer-profiles.js"></script>\n<script id="nag-invoice-customer-links-v225"');
if(!html.includes('function nagCloudCustomerMatch(list,c){return window.NagCustomerProfiles.match')){
  html=between(html,'  function nagCloudCustomerMatch(list,c){','  function nagCloudEntryId(', '  function nagCloudCustomerMatch(list,c){return window.NagCustomerProfiles.match(list,c);}');
  html=once(html,'var c=nagCloudMergeRecord({},rawC),found=nagCloudCustomerMatch(out.customers,c);','var c=window.NagCustomerProfiles.merge({},rawC,nagCloudMergeRecord),found=nagCloudCustomerMatch(out.customers,c);');
  html=once(html,"if(!found){if(!c.id)c.id='cloud_c_'+Math.random().toString(36).slice(2);out.customers.push(c);","if(!found){c.id=window.NagCustomerProfiles.uniqueId(out.customers,c);out.customers.push(c);");
  html=once(html,'mergedCustomer=nagCloudMergeRecord(found,c)','mergedCustomer=window.NagCustomerProfiles.merge(found,c,nagCloudMergeRecord)');
}
const oldEnrichment="else{if(mob&&!c.mobile)c.mobile=mob;if(!c.vat)c.vat=s(rec.c_vat||rec.customer_vat||rec.vat);if(!c.address)c.address=s(rec.c_addr||rec.customer_address||rec.address);if(!c.nationalAddress)c.nationalAddress=s(rec.c_natl||rec.customer_national||rec.national_address)}";
html=html.replace(oldEnrichment,'');
fs.writeFileSync(file,html,'utf8');
for(const name of ['package.json','src-tauri/tauri.conf.json']){const f=path.join(root,name),data=JSON.parse(fs.readFileSync(f,'utf8'));data.version='2.2.6';fs.writeFileSync(f,JSON.stringify(data,null,2)+'\n','utf8');}
const cargo=path.join(root,'src-tauri/Cargo.toml');fs.writeFileSync(cargo,fs.readFileSync(cargo,'utf8').replace(/^version = "[^"]+"/m,'version = "2.2.6"'),'utf8');
console.log('Applied isolated customer profiles for desktop v2.2.6.');
