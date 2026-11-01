  /* NAG_INVOICE_LINKS_V225 */
  var nagLinks=window.parent.NagInvoiceLinks;
  var nagEditingInvoice=null,nagDraftInvoiceUID=nagLinks.uid(),nagSavingInvoice=null,nagLinkNeedsStockSelection=false;
  var nagOriginalAssignNewInv=assignNewInv;
  assignNewInv=function(){
    nagEditingInvoice=null;nagDraftInvoiceUID=nagLinks.uid();
    nagOriginalAssignNewInv();
    var today=new Date();$('inv_date').value=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    if($('inv_due'))$('inv_due').value='';
    window.__currentHistoryPaymentStatus='';
    setStatus('New invoice '+$('inv_no').value+'. Review the details, then generate PDF or print to save.','ok');
  };
  var nagOriginalOpenHistoryInvoice=openHistoryInvoice;
  openHistoryInvoice=function(value){
    var rec=nagLinks.resolve(loadHistory(),value);
    if(!rec){setStatus('Invoice number is missing or belongs to multiple saved invoices. Select the exact invoice in Previous Invoices.','err');return false;}
    nagEditingInvoice=rec;nagDraftInvoiceUID=rec.invoice_uid||nagLinks.uid();
    nagOriginalOpenHistoryInvoice(nagLinks.actionToken(rec));
    var source=$('saleSource');nagLinkNeedsStockSelection=false;
    if(source){var wanted=rec.stockSource==='vehicle'?'vehicle:'+rec.vehicleId:(rec.stockSource==='mini_store'?'mini:'+rec.miniStoreId:'main');
      var exists=Array.prototype.some.call(source.options,function(o){return o.value===wanted;});
      if(exists){source.value=wanted;if(source.onchange)source.onchange();}
      else if(wanted!=='main'){setStatus('The original stock location is unavailable. Select an allowed stock location before saving.','err');source.value='';nagLinkNeedsStockSelection=true;source.addEventListener('change',function(){nagLinkNeedsStockSelection=false;},{once:true});}
    }
    return true;
  };
  function nagCopyInvoice(value){if(openHistoryInvoice(value)){assignNewInv();return true;}return false;}
  var nagOriginalBuildInvoicePDF=buildInvoicePDF;
  buildInvoicePDF=function(){
    if(nagLinkNeedsStockSelection){setStatus('Select an allowed stock location before saving this invoice.','err');return Promise.reject('stock-location-unavailable');}
    var history=loadHistory(),same=history.filter(function(r){return r.no===$('inv_no').value;});
    var editing=nagEditingInvoice&&same.some(function(r){return nagLinks.token(r)===nagLinks.token(nagEditingInvoice);});
    if(!editing&&same.length){assignNewInv();}
    if(editing&&same.length>1){setStatus('This invoice number has conflicting records. Use Copy as New Invoice to save under a new number.','err');return Promise.reject('invoice-number-conflict');}
    return nagOriginalBuildInvoicePDF();
  };
  var nagOriginalPushLedgerEntry=pushLedgerEntry;
  pushLedgerEntry=function(cid,entry){
    if(!nagSavingInvoice)return nagOriginalPushLedgerEntry(cid,entry);
    var d=loadLedgerData(),removed=[];nagLinks.backup(localStorage,d);
    Object.keys(d.entries).forEach(function(id){
      d.entries[id]=(d.entries[id]||[]).filter(function(e){
        if(e.receiptNo||Number(e.bill)<=0)return true;
        if(e.invoice_uid){if(e.invoice_uid===nagSavingInvoice.invoice_uid){removed.push({from:id,entry:e});return false;}return true;}
        var oldCustomer=nagEditingInvoice&&nagLinks.targetCustomer(d,nagEditingInvoice);
        if(oldCustomer&&oldCustomer.id===id&&nagLinks.entryRecord(e,[nagEditingInvoice])){removed.push({from:id,entry:e});return false;}return true;
      });
    });
    persistLedgerData(d);
    entry.invoice_uid=nagSavingInvoice.invoice_uid;entry.customer_id=cid;entry.customer_name=nagSavingInvoice.c_name;
    entry.source='tax_invoice';entry.updated_at=new Date().toISOString();nagBridgeMark(entry);
    var target=d.entries[cid]||(d.entries[cid]=[]);entry.id='e_'+nagSavingInvoice.invoice_uid;entry.seq=target.length;target.push(entry);
    removed.forEach(function(old){if(!old.entry.invoice_uid||old.from!==cid)nagLinks.correct(d,old.from,old.entry,cid,nagSavingInvoice);});persistLedgerData(d);
  };
  var nagOriginalSaveInvoiceHistory=saveInvoiceHistory;
  saveInvoiceHistory=function(t){
    try{nagOriginalSaveInvoiceHistory(t);var found=loadHistory().find(function(r){return r.invoice_uid===nagDraftInvoiceUID;});if(found)nagEditingInvoice=found;}
    finally{nagSavingInvoice=null;}
  };
  var nagOriginalRenderHistory=renderHistory;
  renderHistory=function(filter){
    nagOriginalRenderHistory(filter);
    Array.prototype.forEach.call($('histRows').querySelectorAll('[data-open]'),function(button){
      var value=button.getAttribute('data-open'),cell=button.closest('tr').children[0],rec=nagLinks.resolve(loadHistory(),value);
      if(rec){cell.textContent='';var link=document.createElement('button');link.type='button';link.className='btn btn-ghost btn-sm';link.textContent=rec.no;link.onclick=function(){openHistoryInvoice(value);};cell.appendChild(link);}
      var copy=document.createElement('button');copy.type='button';copy.className='btn btn-ghost btn-sm';copy.textContent='Copy as New Invoice';copy.onclick=function(){nagCopyInvoice(value);};button.parentNode.appendChild(copy);
    });
  };
  function nagConsumeLinkedInvoice(){
    var request=window.parent.__nagLinkedInvoiceRequest;if(!request)return;
    delete window.parent.__nagLinkedInvoiceRequest;
    if(request.copy)nagCopyInvoice(request.token);else openHistoryInvoice(request.token);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(nagConsumeLinkedInvoice,50);});else setTimeout(nagConsumeLinkedInvoice,50);
