(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NagInvoiceLinks=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  function text(v){return String(v==null?'':v).trim();}
  function name(v){return text(v).toLowerCase().replace(/\s+/g,' ');}
  function number(r){return text(r&&(r.no||r.invoiceNo||r.invoice_no));}
  function customerName(r){return text(r&&(r.c_name||r.customer_name||r.customerName));}
  function cents(v){return Math.round((Number(v)||0)*100);}
  function fingerprint(r){return JSON.stringify([number(r),name(customerName(r)),text(r&&r.date),cents(r&&(r.grand!=null?r.grand:r.grand_total))]);}
  function token(r){return text(r&&r.invoice_uid)||'legacy:'+fingerprint(r);}
  function uid(){return 'invoice_'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));}
  function time(r){return Date.parse(r&&(r.updated_at||r.savedAt)||'')||0;}
  function mergeHistory(a,b){
    var out=[];
    [a,b].forEach(function(list){(Array.isArray(list)?list:[]).forEach(function(r){
      var i=out.findIndex(function(x){
        if(r.legacy_invoice_token===token(x)||x.legacy_invoice_token===token(r)||(x.legacy_invoice_token&&x.legacy_invoice_token===r.legacy_invoice_token))return true;
        return (x.invoice_uid&&r.invoice_uid)?x.invoice_uid===r.invoice_uid:fingerprint(x)===fingerprint(r);
      });
      if(i<0)out.push(r);else out[i]=Object.assign({},time(r)>=time(out[i])?out[i]:r,time(r)>=time(out[i])?r:out[i]);
    });});
    return out;
  }
  function resolve(history,value){
    try{value=decodeURIComponent(value);}catch(e){}
    var exact=history.filter(function(r){return token(r)===value;});
    if(exact.length===1)return exact[0];
    var matches=history.filter(function(r){return number(r)===value;});
    return matches.length===1?matches[0]:null;
  }
  function sameLegacyEntry(e,r){
    return number(e)===number(r)&&text(e.date)===text(r.date)&&cents(e.bill)===cents(r.grand!=null?r.grand:r.grand_total);
  }
  function entryRecord(e,history){
    if(e.invoice_link_token){var linked=resolve(history,e.invoice_link_token);if(linked)return linked;}
    if(e.invoice_uid){var exact=history.filter(function(r){return r.invoice_uid===e.invoice_uid;});return exact.length===1?exact[0]:null;}
    var matches=history.filter(function(r){return sameLegacyEntry(e,r);});
    return matches.length===1?matches[0]:null;
  }
  function targetCustomer(d,r){
    var matches=d.customers.filter(function(c){return !c.deleted_at&&((r.customer_id&&c.id===r.customer_id)||name(c.name)===name(customerName(r)));});
    return matches.length===1?matches[0]:null;
  }
  function rowKey(e){return JSON.stringify([e.id||'',number(e),e.date||'',e.time||'',cents(e.bill),cents(e.recv)]);}
  function moves(d){return d.settings&&d.settings.invoice_link_moves_v225||[];}
  function mergeMoves(a,b){
    var out=[];[a,b].forEach(function(list){(list||[]).forEach(function(m){var i=out.findIndex(function(x){return x.id===m.id;});if(i<0)out.push(m);else if(time(m)>time(out[i]))out[i]=m;});});return out;
  }
  function reconcile(d,history){
    if(!d||!Array.isArray(d.customers)||!d.entries)return d;
    history=Array.isArray(history)?history:[];
    Object.keys(d.entries).forEach(function(cid){
      var kept=[];
      (d.entries[cid]||[]).forEach(function(e){
        if(!number(e)||Number(e.bill)<=0||e.receiptNo){kept.push(e);return;}
        var currentCustomer=d.customers.find(function(c){return c.id===cid;});
        var correction=moves(d).find(function(m){return (m.from===cid||(m.from_name&&currentCustomer&&name(m.from_name)===name(currentCustomer.name)))&&m.snapshot===rowKey(e);});
        var rec=entryRecord(e,history),target=correction?d.customers.find(function(c){return !c.deleted_at&&(c.id===correction.to||(correction.to_name&&name(c.name)===name(correction.to_name)));}):rec&&targetCustomer(d,rec);
        if(!correction&&!e.invoice_uid&&(!e.customer_name||!rec||name(e.customer_name)!==name(customerName(rec)))){kept.push(e);return;}
        if(!target){kept.push(e);return;}
        if(correction&&correction.mode==='unlink_duplicate'){
          var existing=d.entries[target.id]||(d.entries[target.id]=[]);
          if(!existing.some(function(x){return rowKey(x)===rowKey(correction.target_entry)||(x.invoice_uid&&x.invoice_uid===correction.target_entry.invoice_uid);})){
            if(target.id===cid)kept.push(Object.assign({},correction.target_entry));else existing.push(Object.assign({},correction.target_entry));
          }
          return;
        }
        if(target.id===cid){kept.push(e);return;}
        var moved=Object.assign({},e,{customer_id:target.id,customer_name:target.name,invoice_link_verified:true});
        if(correction)moved.invoice_link_token=correction.invoice_token;
        if(rec&&rec.invoice_uid)moved.invoice_uid=rec.invoice_uid;
        var dest=d.entries[target.id]||(d.entries[target.id]=[]);
        var same=dest.find(function(x){return rowKey(x)===rowKey(e)||((moved.invoice_uid&&x.invoice_uid===moved.invoice_uid||moved.invoice_link_token&&x.invoice_link_token===moved.invoice_link_token)&&cents(x.bill)===cents(e.bill)&&cents(x.recv)===cents(e.recv));});
        if(!same)dest.push(moved);
      });
      d.entries[cid]=kept;
    });
    return d;
  }
  function mergeLedger(out,a,b,history){
    out.settings=out.settings||{};out.settings.invoice_link_moves_v225=mergeMoves(moves(a||{}),moves(b||{}));
    return reconcile(out,history);
  }
  function candidates(e,history){return history.filter(function(r){return number(r)===number(e);});}
  function conflicts(d,cid,history){
    return (d.entries[cid]||[]).filter(function(e){
      if(!number(e)||Number(e.bill)<=0||e.receiptNo)return false;
      var exact=entryRecord(e,history),list=exact?[exact]:candidates(e,history);
      return list.some(function(r){var c=targetCustomer(d,r);return c&&c.id!==cid;});
    });
  }
  function correct(d,from,e,to,rec){
    var target=d.customers.find(function(c){return c.id===to&&!c.deleted_at;});
    if(!target)throw Error('The invoice customer is not available in Customer Ledger.');
    d.settings=d.settings||{};
    var duplicate=duplicateTarget(d,to,rec);
    var source=d.customers.find(function(c){return c.id===from;});
    var m={id:from+'|'+rowKey(e),from:from,from_name:source?source.name:'',to:to,to_name:target.name,snapshot:rowKey(e),invoice_token:token(rec),original_entry:Object.assign({},e),mode:duplicate?'unlink_duplicate':'move',target_entry:duplicate?Object.assign({},duplicate):null,updated_at:new Date().toISOString()};
    d.settings.invoice_link_moves_v225=mergeMoves(moves(d),[m]);
    return reconcile(d,[]);
  }
  function duplicateTarget(d,to,rec){return (d.entries[to]||[]).find(function(e){return Number(e.bill)>0&&entryRecord(e,[rec]);})||null;}
  function nextNumber(counter,history,d){
    var max=1000+(parseInt(counter,10)||0);
    function visit(v){var m=/^INV-(\d+)$/.exec(text(v));if(m)max=Math.max(max,Number(m[1]));}
    (history||[]).forEach(function(r){visit(number(r));});
    Object.keys(d&&d.entries||{}).forEach(function(k){(d.entries[k]||[]).forEach(function(e){visit(number(e));});});
    return Math.max(1,max-1000+1);
  }
  function read(storage,key,fallback){try{return JSON.parse(storage.getItem(key)||'null')||fallback;}catch(e){return fallback;}}
  function backup(storage,ledger){if(!storage.getItem('nag_invoice_link_backup_v225'))storage.setItem('nag_invoice_link_backup_v225',JSON.stringify({savedAt:new Date().toISOString(),ledger:ledger}));}
  function actionToken(r){return encodeURIComponent(token(r)).replace(/'/g,'%27');}
  function canOpenInvoice(session,users,record){
    if(!session||!record)return false;if(session.role==='admin')return true;
    var user=(users||[]).find(function(u){return u.u===session.u;});
    if(!user||!Array.isArray(user.perms)||user.perms.indexOf('pickInvoice')<0)return false;
    var owner=text(record.owner_u||record.cashier_u||record.created_by_user||record.created_by||record.user_u||record.cashier);
    return !!(owner===text(session.u)||(text(record.cashier_name)&&text(record.cashier_name)===text(session.n)));
  }
  return {text:text,name:name,number:number,customerName:customerName,cents:cents,token:token,actionToken:actionToken,uid:uid,mergeHistory:mergeHistory,resolve:resolve,entryRecord:entryRecord,targetCustomer:targetCustomer,reconcile:reconcile,mergeLedger:mergeLedger,candidates:candidates,conflicts:conflicts,correct:correct,duplicateTarget:duplicateTarget,nextNumber:nextNumber,read:read,backup:backup,canOpenInvoice:canOpenInvoice};
});
