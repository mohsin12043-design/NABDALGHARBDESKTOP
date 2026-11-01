  /* NAG_LEDGER_LINKS_V225 */
  var nagLinks=window.parent.NagInvoiceLinks;
  function nagLinkHistory(){return nagLinks.read(localStorage,'nag_invoice_history_v1',[]);}
  function nagReviewLedgerInvoice(entryId){
    var e=(data.entries[currentCustId]||[]).find(function(r){return String(r.id)===String(entryId);});if(!e)return;
    var history=nagLinkHistory(),rec=nagLinks.entryRecord(e,history),choices=rec?[rec]:nagLinks.candidates(e,history);
    if(!choices.length){setStatus('The complete saved invoice is not available on this device. Sync before opening it.','err');return;}
    var modal=document.createElement('dialog');modal.style.cssText='width:min(720px,94vw);max-height:85vh;overflow:auto;margin:auto;padding:24px;border:1px solid #ddd;border-radius:14px;background:white;color:#172452';
    var title=document.createElement('h3');title.textContent='Invoice '+e.invoiceNo;modal.appendChild(title);
    var detail=document.createElement('p');detail.textContent='Ledger entry: '+e.date+', billed '+money(e.bill)+' SAR, received '+money(e.recv)+' SAR. Amounts remain unchanged when correcting its customer.';detail.style.margin='14px 0';modal.appendChild(detail);
    choices.forEach(function(r){
      var box=document.createElement('div');box.style.cssText='border-top:1px solid #ddd;padding:14px 0;';
      var p=document.createElement('p');p.textContent='Saved invoice customer: '+nagLinks.customerName(r)+' | '+r.date+' | '+money(r.grand)+' SAR';box.appendChild(p);
      if(nagLinks.cents(e.bill)!==nagLinks.cents(r.grand)||e.date!==r.date){var warning=document.createElement('p');warning.textContent='Date or amount differs. Verify this invoice before correcting the customer.';warning.style.color='#a42b1f';box.appendChild(warning);}
      function button(label,handler){var b=document.createElement('button');b.type='button';b.className='btn btn-ghost btn-sm';b.textContent=label;b.onclick=handler;b.style.margin='8px 8px 0 0';box.appendChild(b);}
      button('Open saved invoice',function(){window.parent.nagOpenLinkedInvoice(nagLinks.actionToken(r),false);modal.close();modal.remove();});
      button('Copy as New Invoice',function(){window.parent.nagOpenLinkedInvoice(nagLinks.actionToken(r),true);modal.close();modal.remove();});
      var target=nagLinks.targetCustomer(data,r);
      if(target&&target.id!==currentCustId&&window.parent.nagSession&&window.parent.nagSession.role==='admin'){button('Correct customer link',function(){
        var duplicate=nagLinks.duplicateTarget(data,target.id,r);
        var message=duplicate?'This invoice already exists under '+target.name+'. Remove its duplicate link from the current customer? The destination bill will remain '+money(duplicate.bill)+' SAR on '+duplicate.date+'.':'Move '+e.invoiceNo+' from the current customer to '+target.name+'? The entry amounts will stay unchanged.';
        if(!confirm(message+'\nCurrent ledger date: '+e.date+'\nBilled: '+money(e.bill)+' SAR\nReceived: '+money(e.recv)+' SAR'))return;
        var full=nagLinks.read(localStorage,LKEY,{customers:[],entries:{},settings:{}});nagLinks.backup(localStorage,full);
        nagLinks.correct(full,currentCustId,e,target.id,r);localStorage.setItem(LKEY,JSON.stringify(full));
        load();renderLedger();setStatus('Invoice entry moved to '+target.name+'. Both customer balances have been recalculated.','ok');modal.close();modal.remove();
      });}
      modal.appendChild(box);
    });
    var close=document.createElement('button');close.type='button';close.className='btn btn-ghost btn-sm';close.textContent='Close';close.onclick=function(){modal.close();modal.remove();};modal.appendChild(close);document.body.appendChild(modal);modal.showModal();
  }
  var nagOriginalRenderLedger=renderLedger;
  renderLedger=function(){
    nagOriginalRenderLedger();
    var rows=custEntries(currentCustId);
    Array.prototype.forEach.call($('ledgerRows').children,function(tr,i){
      var e=rows[i];if(!e||!e.invoiceNo)return;
      var cell=tr.children[1];cell.textContent='';var b=document.createElement('button');b.type='button';b.className='btn btn-ghost btn-sm';b.textContent=e.invoiceNo;b.onclick=function(){nagReviewLedgerInvoice(e.id);};cell.appendChild(b);
    });
    var old=document.getElementById('invoiceLinkNotice');if(old)old.remove();
    var issues=nagLinks.conflicts(data,currentCustId,nagLinkHistory());
    if(issues.length){var notice=document.createElement('div');notice.id='invoiceLinkNotice';notice.className='card';notice.style.cssText='background:#fff4df;color:#87420d;padding:14px;';notice.textContent=issues.length+' invoice link(s) need review. Click the invoice number to compare its saved customer and correct the link.';$('ledgerRows').closest('table').parentNode.insertBefore(notice,$('ledgerRows').closest('table'));}
  };
