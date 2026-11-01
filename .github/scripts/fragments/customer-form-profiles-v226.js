  /* NAG_CUSTOMER_FORM_PROFILES_V226 */
  var nagProfileFormState={key:null};
  var nagProfileAPI=window.parent.NagCustomerProfiles;
  function nagProfileFill(force){
    var invoice=!!$('c_name'),nameField=invoice?$('c_name'):$('cname'),customer=findLedgerCustomerByName(nameField.value);
    var mapping=invoice?{mobile:'c_mobile',vat:'c_vat',address:'c_addr',nationalAddress:'c_natl'}:{mobile:'cmobile'};
    var fields={};Object.keys(mapping).forEach(function(k){var e=$(mapping[k]);fields[k]=e?e.value:'';});
    var next=nagProfileAPI.fill(nagProfileFormState,nameField.value,customer,fields,!!force);
    Object.keys(mapping).forEach(function(k){var e=$(mapping[k]);if(e)e.value=next[k];});
    return customer;
  }
  if(typeof openHistoryInvoice==='function'){
    var nagProfileOldOpenInvoice=openHistoryInvoice;
    openHistoryInvoice=function(value){var ok=nagProfileOldOpenInvoice(value);if(ok!==false)nagProfileFormState.key=nagProfileAPI.norm($('c_name').value);return ok;};
    var nagProfileOldAssignInvoice=assignNewInv;
    assignNewInv=function(){nagProfileOldAssignInvoice();nagProfileFill(true);};
  }
  if(typeof openHistoryReceipt==='function'){
    var nagProfileOldOpenReceipt=openHistoryReceipt;
    openHistoryReceipt=function(value){var result=nagProfileOldOpenReceipt(value);nagProfileFormState.key=nagProfileAPI.norm($('cname').value);return result;};
  }
  /* END_NAG_CUSTOMER_FORM_PROFILES_V226 */
