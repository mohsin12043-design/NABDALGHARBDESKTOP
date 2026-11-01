const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const A=require('../../dist/invoice-customer-links.js');
const root=path.resolve(__dirname,'../..');
let count=0;
function test(label,fn){fn();console.log('PASS '+label);count++;}
function ledger(){return {customers:[{id:'nasir',name:'Nasir Bagali'},{id:'company',name:'Nabd Al Gharb'}],entries:{nasir:[{id:'e1031',invoiceNo:'INV-1031',date:'2026-10-20',time:'8:00 AM',bill:38381.25,recv:0},{id:'payment',receiptNo:'CR-0059',bill:0,recv:1000}],company:[]},settings:{}};}
const invoice={no:'INV-1031',c_name:'Nabd Al Gharb',date:'2026-11-01',grand:38381.25,rows:[{code:'SW',qty:5,price:10}]};
test('The screenshot date mismatch is flagged without moving money automatically',()=>{const d=ledger();A.reconcile(d,[invoice]);assert.equal(d.entries.nasir.length,2);assert.equal(A.conflicts(d,'nasir',[invoice]).length,1);});
test('Unidentified legacy rows require review even if amount and date match',()=>{const d=ledger(),r={...invoice,date:'2026-10-20'};A.reconcile(d,[r]);assert.equal(d.entries.nasir.length,2);});
test('An explicit correction moves only the chosen invoice and preserves the payment',()=>{const d=ledger();A.correct(d,'nasir',d.entries.nasir[0],'company',invoice);assert.equal(d.entries.nasir.length,1);assert.equal(d.entries.nasir[0].receiptNo,'CR-0059');assert.equal(d.entries.company[0].bill,38381.25);assert.equal(d.entries.company[0].date,'2026-10-20');assert.equal(d.entries.company[0].recv,0);});
test('An old cloud snapshot cannot restore a corrected entry or double its amount',()=>{const old=ledger(),fixed=ledger();A.correct(fixed,'nasir',fixed.entries.nasir[0],'company',invoice);const out=structuredClone(fixed);out.entries.nasir.push(old.entries.nasir[0]);A.mergeLedger(out,old,fixed,[invoice]);A.reconcile(out,[invoice]);assert.equal(out.entries.nasir.length,1);assert.equal(out.entries.company.length,1);});
test('A row with a saved invoice UID follows its actual customer',()=>{const d=ledger();d.entries.nasir[0].invoice_uid='inv-company';A.reconcile(d,[{...invoice,invoice_uid:'inv-company'}]);assert.equal(d.entries.nasir.length,1);assert.equal(d.entries.company.length,1);});
test('Correction does not add a second bill when the proper customer already has this invoice',()=>{const d=ledger();d.entries.company.push({id:'right-entry',invoiceNo:invoice.no,date:invoice.date,bill:invoice.grand,recv:0});A.correct(d,'nasir',d.entries.nasir[0],'company',invoice);assert.equal(d.entries.nasir.length,1);assert.equal(d.entries.company.length,1);assert.equal(d.entries.company[0].id,'right-entry');assert.equal(d.settings.invoice_link_moves_v225[0].original_entry.id,'e1031');});
test('Two customers sharing an old invoice number keep separate history records',()=>{const other={...invoice,c_name:'Nasir Bagali',grand:75};const h=A.mergeHistory([invoice],[other]);assert.equal(h.length,2);assert.equal(A.resolve(h,'INV-1031'),null);assert.equal(A.resolve(h,A.actionToken(other)).c_name,'Nasir Bagali');});
test('New invoice numbers consider the counter, synced history and ledger',()=>{assert.equal(A.nextNumber('1',[{no:'INV-1045'}],ledger()),46);assert.equal(A.nextNumber('70',[invoice],ledger()),71);assert.equal(A.nextNumber(null,[],ledger()),32);});
test('Newer versions of the same invoice UID merge once',()=>{const a={...invoice,invoice_uid:'a',savedAt:'2026-10-01'},b={...a,c_name:'Renamed',savedAt:'2026-11-01'};const h=A.mergeHistory([a],[b]);assert.equal(h.length,1);assert.equal(h[0].c_name,'Renamed');});
test('Opening a ledger invoice respects cashier module and owner permissions',()=>{const session={u:'mohsin',n:'Mohsin',role:'cashier'},users=[{u:'mohsin',perms:['pickLedger']}],r={...invoice,owner_u:'mohsin'};assert.equal(A.canOpenInvoice(session,users,r),false);users[0].perms.push('pickInvoice');assert.equal(A.canOpenInvoice(session,users,r),true);assert.equal(A.canOpenInvoice(session,users,{...r,owner_u:'mushtaq'}),false);});
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
function decoded(key){return Buffer.from(html.match(new RegExp('\\b'+key+'=b64utf8\\("([^\"]+)"\\)'))[1],'base64').toString('utf8');}
test('Host and both decoded modules parse including generated ledger patches',()=>{
  const a=html.indexOf('  function nagApplyLedgerRecoveryV256('),b=html.indexOf('\n  window.nagOpenLinkedInvoice',a);
  const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);
  const docs=[html,decoded('INV'),ctx.nagApplyCustomerLedgerEditDeleteV224(ctx.nagApplyLedgerRecoveryV256(decoded('LEDGER'),'Customer Ledger'),'Customer Ledger')];
  for(const doc of docs)for(const m of doc.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]);
});
test('Repeated real history recovery preserves reviewed corrections without adding a second bill',()=>{
  const a=html.indexOf('  function nagApplyLedgerRecoveryV256('),b=html.indexOf('\n  function nagApplyCustomerLedgerEditDeleteV224',a),shell={};vm.createContext(shell);vm.runInContext(html.slice(a,b),shell);
  for(const alreadyThere of [false,true]){
    const d=ledger();if(alreadyThere)d.entries.company.push({id:'correct',invoiceNo:invoice.no,date:invoice.date,bill:invoice.grand,recv:0});
    A.correct(d,'nasir',d.entries.nasir[0],'company',invoice);
    const values=new Map([['nag_ledger_v1',JSON.stringify(d)],['nag_invoice_history_v1',JSON.stringify([invoice])]]),callbacks=[];
    const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},ctx={localStorage:storage,window:{parent:{NagInvoiceLinks:A}},document:{addEventListener:(event,fn)=>callbacks.push(fn)},setTimeout:fn=>callbacks.push(fn),setInterval:fn=>callbacks.push(fn)};
    const doc=shell.nagApplyLedgerRecoveryV256('<body></body>','Customer Ledger'),code=doc.match(/<script id='NAG_LEDGER_RECOVERY_V256'>([\s\S]*?)<\/script>/)[1];vm.createContext(ctx);vm.runInContext(code,ctx);
    for(let i=0;i<4;i++)callbacks.forEach(fn=>fn());
    const result=JSON.parse(values.get('nag_ledger_v1'));assert.equal(result.entries.company.length,1);assert.equal(result.entries.nasir.length,1);assert.equal(result.entries.company[0].date,alreadyThere?invoice.date:'2026-10-20');
  }
});
function invoiceHarness(){
  const store=new Map([['nag_ledger_v1',JSON.stringify(ledger())],['nag_invoice_history_v1',JSON.stringify([invoice])]]);
  const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const fields={};for(const [k,v] of Object.entries({inv_no:'INV-1032',inv_date:'2026-11-01',inv_due:'',c_name:'Nabd Al Gharb',c_vat:'123',c_mobile:'',c_addr:'Company address',c_natl:'',staffName:'Admin',receivedBy:'',global_disc:0,saleSource:'main'}))fields[k]={value:v,options:[{value:'main'}]};
  const ctx={console,Date,Math,Promise,localStorage:storage,window:{parent:{NagInvoiceLinks:A}},document:{readyState:'loading',addEventListener(){},querySelector(){return {value:'credit'};}},$:id=>fields[id],setTimeout(){},setStatus(){},currentCustomerType:()=> 'wholesale',selectedVehicleId:()=>'',selectedVehicle:()=>null,selectedMiniStoreId:()=>'',selectedMiniStore:()=>null,fromH:v=>v,getTimeString:()=> '8:00 AM',getCurrentPaymentStatus:()=> 'pending',discountApprovalEnabled:()=>false,normalizePayStatus:s=>s||'pending',nagBridgeMark:x=>x,buildInvoicePDF:()=>Promise.resolve({}),renderHistory(){},pushLedgerEntry(){throw Error('Legacy writer must not run for a linked save');}};
  ctx.loadLedgerData=()=>JSON.parse(storage.getItem('nag_ledger_v1'));
  ctx.persistLedgerData=d=>storage.setItem('nag_ledger_v1',JSON.stringify(d));
  ctx.loadHistory=()=>JSON.parse(storage.getItem('nag_invoice_history_v1'));
  ctx.persistHistory=h=>storage.setItem('nag_invoice_history_v1',JSON.stringify(h));
  ctx.findOrCreateLedgerCustomer=n=>ctx.loadLedgerData().customers.find(c=>c.name===n);
  ctx.assignNewInv=()=>{fields.inv_no.value='INV-'+(1000+A.nextNumber(0,ctx.loadHistory(),ctx.loadLedgerData()));};
  ctx.openHistoryInvoice=value=>{const r=A.resolve(ctx.loadHistory(),value);fields.inv_no.value=r.no;fields.c_name.value=r.c_name;fields.inv_date.value=r.date;};
  vm.createContext(ctx);
  const inv=decoded('INV'),start=inv.indexOf('  function saveInvoiceHistory(t){'),end=inv.indexOf('  var itypeNames=',start);
  vm.runInContext(inv.slice(start,end),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'fragments/invoice-links-runtime.js'),'utf8'),ctx);
  ctx.t={grandH:50,rows:[{code:'SW',desc:'Switch',qty:5,price:10}]};return {ctx,fields,storage};
}
test('Copying an invoice does not write history, ledger or stock',()=>{const {ctx,storage,fields}=invoiceHarness(),before=[...['nag_ledger_v1','nag_invoice_history_v1'].map(k=>storage.getItem(k))];ctx.nagCopyInvoice(A.actionToken(invoice));assert.equal(fields.inv_no.value,'INV-1032');assert.equal(storage.getItem('nag_ledger_v1'),before[0]);assert.equal(storage.getItem('nag_invoice_history_v1'),before[1]);});
test('Saving a copied invoice twice creates one new history and one ledger bill',()=>{const {ctx,fields}=invoiceHarness();ctx.nagCopyInvoice(A.actionToken(invoice));ctx.saveInvoiceHistory(ctx.t);ctx.saveInvoiceHistory(ctx.t);assert.equal(ctx.loadHistory().length,2);const rows=ctx.loadLedgerData().entries.company;assert.equal(rows.length,1);assert.equal(rows[0].bill,50);assert.equal(rows[0].invoiceNo,'INV-1032');assert.equal(ctx.loadLedgerData().entries.nasir[0].bill,38381.25);});
test('Editing the customer of a linked invoice relocates that bill without touching receipts',()=>{const {ctx,fields}=invoiceHarness();ctx.nagCopyInvoice(A.actionToken(invoice));ctx.saveInvoiceHistory(ctx.t);const saved=ctx.loadHistory().find(r=>r.no==='INV-1032');ctx.openHistoryInvoice(A.actionToken(saved));fields.c_name.value='Nasir Bagali';ctx.saveInvoiceHistory(ctx.t);const d=ctx.loadLedgerData();assert.equal(d.entries.company.length,0);assert.equal(d.entries.nasir.filter(e=>e.invoiceNo==='INV-1032').length,1);assert.equal(d.entries.nasir.filter(e=>e.receiptNo).length,1);assert.equal(ctx.loadHistory().length,2);});
console.log(count+' tests passed.');
