(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NagCustomerProfiles=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  var keys=['name','mobile','vat','address','nationalAddress','creditLimit'];
  function text(v){return String(v==null?'':v).trim();}
  function norm(v){return text(v).toLowerCase().replace(/\s+/g,' ');}
  function own(o,k){return Object.prototype.hasOwnProperty.call(o||{},k);}
  function value(c,k){
    if(own(c,k))return k==='creditLimit'?(Number(c[k])||0):text(c[k]);
    if(k==='vat')return text(c.vatNumber);
    if(k==='nationalAddress')return text(c.national_address||c.natl);
    return k==='creditLimit'?0:'';
  }
  function snapshot(c){
    var p=c&&c.profile_v226;if(!p||!p.updated_at||!p.name)return null;
    return norm(c.name)===norm(p.name)||(p.aliases||[]).some(function(n){return norm(n)===norm(c.name);})?p:null;
  }
  function apply(c){
    if(!c||typeof c!=='object')return c;var p=snapshot(c);
    if(p)keys.forEach(function(k){c[k]=value(p,k);});
    // Canonical blanks are intentional, never fall back to obsolete aliases.
    if(own(c,'vat'))c.vatNumber=text(c.vat);
    if(own(c,'nationalAddress')){c.national_address=text(c.nationalAddress);c.natl=text(c.nationalAddress);}
    return c;
  }
  function stamp(c,previousName,now){
    var aliases=(c.profile_v226&&c.profile_v226.aliases||[]).slice();
    if(previousName&&norm(previousName)!==norm(c.name)&&!aliases.some(function(n){return norm(n)===norm(previousName);}))aliases.push(text(previousName));
    var p={updated_at:now||new Date().toISOString(),revision:Date.now().toString(36)+'_'+Math.random().toString(36).slice(2),aliases:aliases};
    keys.forEach(function(k){p[k]=value(c,k);});c.profile_v226=p;c.updated_at=p.updated_at;return apply(c);
  }
  function related(a,b){
    if(norm(a.name)&&norm(a.name)===norm(b.name))return true;
    var ap=snapshot(a),bp=snapshot(b);
    return !!((ap&&(ap.aliases||[]).some(function(n){return norm(n)===norm(b.name);}))||(bp&&(bp.aliases||[]).some(function(n){return norm(n)===norm(a.name);})));
  }
  function match(list,c){
    var byId=(list||[]).filter(function(x){return text(c.id)&&text(x.id)===text(c.id)&&related(x,c);});
    if(byId.length===1)return byId[0];if(byId.length>1)return null;
    var byName=(list||[]).filter(function(x){return norm(c.name)&&norm(x.name)===norm(c.name)&&(!text(c.mobile)||!text(x.mobile)||text(c.mobile)===text(x.mobile));});
    return byName.length===1?byName[0]:null;
  }
  function merge(a,b,mergeRecord){
    a=a||{};b=b||{};
    if(a.name&&b.name&&!related(a,b))throw Error('Refusing to merge details from different customers.');
    var out=mergeRecord(a,b),ap=snapshot(a),bp=snapshot(b),chosen=ap||bp;
    if(ap&&bp){var at=Date.parse(ap.updated_at)||0,bt=Date.parse(bp.updated_at)||0;chosen=bt>at||(bt===at&&text(bp.revision)>text(ap.revision))?bp:ap;}
    if(chosen){out.profile_v226=Object.assign({},chosen);out.name=chosen.name;return apply(out);}
    var newer=(Date.parse(b.updated_at||b.savedAt||'')||0)>=(Date.parse(a.updated_at||a.savedAt||'')||0)?b:a;
    keys.forEach(function(k){if(own(newer,k))out[k]=value(newer,k);});return apply(out);
  }
  function uniqueId(list,c){
    var id=text(c.id)||'customer_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
    if(!(list||[]).some(function(x){return text(x.id)===id;}))return id;
    var str=id+'|'+norm(c.name)+'|'+text(c.mobile),h=2166136261;
    for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
    var base=id+'_separate_'+(h>>>0).toString(36),candidate=base,n=1;
    while(list.some(function(x){return text(x.id)===candidate;}))candidate=base+'_'+n++;
    return candidate;
  }
  function find(list,name){var matches=(list||[]).filter(function(c){return !c.deleted_at&&norm(c.name)===norm(name);});return matches.length===1?apply(matches[0]):null;}
  function fill(state,name,c,current,force){
    var key=norm(name),out=Object.assign({},current);
    if(force||state.key!==key){keys.filter(function(k){return k!=='name'&&k!=='creditLimit';}).forEach(function(k){out[k]=c?value(apply(c),k):'';});state.key=key;}
    return out;
  }
  return {norm:norm,text:text,value:value,apply:apply,stamp:stamp,match:match,merge:merge,uniqueId:uniqueId,find:find,fill:fill};
});
