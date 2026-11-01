const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const file=path.join(root,'dist/index.html');
let html=fs.readFileSync(file,'utf8');
const navigation="window.nagOpenLinkedInvoice=function(token,copy){var links=window.NagInvoiceLinks,rec=links.resolve(links.read(localStorage,'nag_invoice_history_v1',[]),token);if(!links.canOpenInvoice(window.nagSession,links.read(localStorage,'nag_users',[]),rec)){alert('This invoice is unavailable or your account does not have permission to open it.');return false;}window.__nagLinkedInvoiceRequest={token:token,copy:!!copy};openTool(INV,'Tax Invoice');return true;};";
function once(text,from,to){
  const first=text.indexOf(from);
  if(first<0)throw Error('Patch target not found: '+from.slice(0,100));
  if(text.indexOf(from,first+from.length)>=0)throw Error('Patch target is ambiguous: '+from.slice(0,100));
  return text.slice(0,first)+to+text.slice(first+from.length);
}
function moduleDoc(key,patch){
  const re=new RegExp('\\b'+key+'=b64utf8\\("([^\"]+)"\\)');
  const match=html.match(re);if(!match)throw Error('Missing module '+key);
  const before=Buffer.from(match[1],'base64').toString('utf8');
  const after=patch(before).replace(/\s*$/, '\n');
  html=html.replace(re,key+'=b64utf8("'+Buffer.from(after,'utf8').toString('base64')+'")');
}
if(html.includes('id="nag-invoice-customer-links-v225"')){
  for(const key of ['INV','LEDGER'])moduleDoc(key,function(doc){
    const marker=key==='INV'?'NAG_INVOICE_LINKS_V225':'NAG_LEDGER_LINKS_V225';
    const start=doc.indexOf('  /* '+marker+' */');
    const end=doc.indexOf(key==='INV'?"  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();":"  if(document.readyState==='loading')",start);
    if(start<0||end<0)throw Error('Missing runtime markers '+key);
    const fragment=fs.readFileSync(path.join(__dirname,'fragments/'+(key==='INV'?'invoice':'ledger')+'-links-runtime.js'),'utf8');
    doc=doc.slice(0,start)+fragment+'\n'+doc.slice(end);
    if(key==='INV')doc=doc.replace("nextNumber(localStorage.getItem(IKEY),loadHistory(),loadLedgerData())","nextNumber(localStorage.getItem(IKEY),window.parent.NagInvoiceLinks.read(localStorage,'nag_invoice_history_v1',[]),loadLedgerData())");
    if(key==='INV'&&!doc.includes('rec.legacy_invoice_token='))doc=doc.replace('rec.invoice_uid=nagDraftInvoiceUID;',"rec.invoice_uid=nagDraftInvoiceUID;rec.legacy_invoice_token=nagEditingInvoice?(nagEditingInvoice.legacy_invoice_token||(!nagEditingInvoice.invoice_uid?nagLinks.token(nagEditingInvoice):'')):'';");
    return doc;
  });
  const oldNav="window.nagOpenLinkedInvoice=function(token,copy){window.__nagLinkedInvoiceRequest={token:token,copy:!!copy};openTool(INV,'Tax Invoice');};";
  html=html.replace(oldNav,navigation);
  fs.writeFileSync(file,html,'utf8');
  console.log('Refreshed desktop invoice/customer link runtime v225.');
}else{
  moduleDoc('INV',function(doc){
    doc=once(doc,"function nextInvNumber(){var n=1;try{var r=localStorage.getItem(IKEY);if(r)n=parseInt(r,10)+1;}catch(e){}return n;}","function nextInvNumber(){return window.parent.NagInvoiceLinks.nextNumber(localStorage.getItem(IKEY),window.parent.NagInvoiceLinks.read(localStorage,'nag_invoice_history_v1',[]),loadLedgerData());}");
    doc=once(doc,"var hist=loadHistory();var rec=hist.find(function(h){return h.no===no;});","var hist=loadHistory();var rec=window.parent.NagInvoiceLinks.resolve(hist,no);");
    // The original helpers use invoice number as the database key. Resolve action tokens first.
    doc=doc.replaceAll("hist.findIndex(function(h){return h.no===no;})","hist.findIndex(function(h){return h===window.parent.NagInvoiceLinks.resolve(hist,no);})");
    const saveStart=doc.indexOf('  function saveInvoiceHistory(t){');
    const saveEnd=doc.indexOf('  var itypeNames=',saveStart);
    if(saveStart<0||saveEnd<0)throw Error('Missing saveInvoiceHistory block');
    let save=doc.slice(saveStart,saveEnd);
    save=once(save,"    var hist=loadHistory();\n    var idx=hist.findIndex(function(h){return h.no===rec.no;});","    var linkedCustomer=findOrCreateLedgerCustomer(rec.c_name,rec.c_mobile,rec.c_vat,rec.c_addr,rec.c_natl);\n    rec.invoice_uid=nagDraftInvoiceUID;rec.customer_id=linkedCustomer?linkedCustomer.id:'';rec.updated_at=rec.savedAt;nagSavingInvoice=rec;\n    var hist=loadHistory();\n    var idx=hist.findIndex(function(h){return h.invoice_uid===rec.invoice_uid||(nagEditingInvoice&&nagLinks.token(h)===nagLinks.token(nagEditingInvoice));});");
    doc=doc.slice(0,saveStart)+save+doc.slice(saveEnd);
    for(const field of ['open','pdf','wa','pay','void']){
      doc=doc.replaceAll('data-'+field+'="\'+(h.no||\'\')+\'"','data-'+field+'="\'+window.parent.NagInvoiceLinks.actionToken(h)+\'"');
    }
    const fragment=fs.readFileSync(path.join(__dirname,'fragments/invoice-links-runtime.js'),'utf8');
    doc=once(doc,"  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();",fragment+"\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();");
    return doc;
  });
  moduleDoc('LEDGER',function(doc){
    const fragment=fs.readFileSync(path.join(__dirname,'fragments/ledger-links-runtime.js'),'utf8');
    const matches=[...doc.matchAll(/  if\(document.readyState==='loading'\)[^\n]+/g)];
    if(matches.length!==1)throw Error('Ledger startup anchor not unique');
    return once(doc,matches[0][0],fragment+'\n'+matches[0][0]);
  });
  html=once(html,'<div id="screen"><iframe id="frame"></iframe></div>','<div id="screen"><iframe id="frame"></iframe></div>\n<script id="nag-invoice-customer-links-v225" src="invoice-customer-links.js"></script>');
  html=once(html,"  function nagCloudMergeArray(key,localArr,cloudArr){","  function nagCloudMergeArray(key,localArr,cloudArr){if(key==='nag_invoice_history_v1')return window.NagInvoiceLinks.mergeHistory(localArr,cloudArr);");
  html=once(html,"else if(!out.entries[c.id])out.entries[c.id]=[];});return out;}","else if(!out.entries[c.id])out.entries[c.id]=[];});return window.NagInvoiceLinks.mergeLedger(out,local,cloud,window.NagInvoiceLinks.read(localStorage,'nag_invoice_history_v1',[]));}");
  html=once(html,'  function openTool(doc,label){','  '+navigation+'\n  function openTool(doc,label){');
  html=once(html,"    patch=patch.replace(\"if(!c){c={id:'cloud_c_'\"", "    patch=patch.replace(\"id:'tax_recover_'+s(r.no)\",\"id:'tax_recover_'+s(r.invoice_uid||r.no),invoice_uid:r.invoice_uid||'',customer_id:c&&c.id,customer_name:c&&c.name\");\n    patch=patch.replace(\"k=sig(e),old=rows.find(function(x){return sig(x)===k});\",\"k=sig(e),old=rows.find(function(x){return x.invoice_uid&&e.invoice_uid?x.invoice_uid===e.invoice_uid:sig(x)===k&&String(x.date||'')===String(e.date||'')&&Number(x.bill||0)===Number(e.bill||0)});\");\n    patch=patch.replace(\"if(d.customers.length&&JSON.stringify(d)!==raw)\",\"d=window.parent.NagInvoiceLinks.reconcile(d,arr(localStorage.getItem('nag_invoice_history_v1')));if(d.customers.length&&JSON.stringify(d)!==raw)\");\n    patch=patch.replace(\"if(!c){c={id:'cloud_c_'\"");
  fs.writeFileSync(file,html,'utf8');
  console.log('Applied desktop invoice/customer link patch v225.');
}
// Refresh generated host hooks as well as the decoded module fragments.
moduleDoc('INV',function(doc){return doc.includes('rec.legacy_invoice_token=')?doc:doc.replace('rec.invoice_uid=nagDraftInvoiceUID;',"rec.invoice_uid=nagDraftInvoiceUID;rec.legacy_invoice_token=nagEditingInvoice?(nagEditingInvoice.legacy_invoice_token||(!nagEditingInvoice.invoice_uid?nagLinks.token(nagEditingInvoice):'')):'';");});
html=html.replace("invoice_uid:r.invoice_uid||'',customer_id:c&&c.id","invoice_uid:r.invoice_uid||'',invoice_link_token:window.parent.NagInvoiceLinks.token(r),customer_id:c&&c.id");
html=html.replace('return x.invoice_uid&&e.invoice_uid?x.invoice_uid===e.invoice_uid:sig(x)===k','return x.invoice_link_token&&e.invoice_link_token?x.invoice_link_token===e.invoice_link_token:x.invoice_uid&&e.invoice_uid?x.invoice_uid===e.invoice_uid:sig(x)===k');
html=html.replace('});return window.NagInvoiceLinks.mergeLedger(out,local,cloud',"});window.NagInvoiceLinks.backup(localStorage,local);return window.NagInvoiceLinks.mergeLedger(out,local,cloud");
html=html.replace('"d=window.parent.NagInvoiceLinks.reconcile(d,arr(', '"window.parent.NagInvoiceLinks.backup(localStorage,d);d=window.parent.NagInvoiceLinks.reconcile(d,arr(');
html=html.replace("function nagCloudEntryId(e,index){e=e||{};var inv=","function nagCloudEntryId(e,index){e=e||{};if(e.invoice_uid)return 'invoice_uid|'+e.invoice_uid;var inv=");
if(!html.includes('patch=patch.replace("if(old)Object.keys(e)"'))html=html.replace("    patch=patch.replace(\"if(!c){c={id:'cloud_c_'\"",'    patch=patch.replace("if(old)Object.keys(e)","if(old&&old.invoice_link_verified)return;if(old)Object.keys(e)");\n'+"    patch=patch.replace(\"if(!c){c={id:'cloud_c_'\"");
fs.writeFileSync(file,html,'utf8');
