  /* NAG_LEDGER_PROFILE_SAVE_V226 */
  var nagProfileOldSaveCustomer=saveCustomer;
  saveCustomer=function(){
    var profiles=window.parent.NagCustomerProfiles,newName=$('nc_name').value.trim(),editId=editingCustId;
    if(!newName)return nagProfileOldSaveCustomer();
    var duplicate=data.customers.some(function(c){return !c.deleted_at&&c.id!==editId&&profiles.norm(c.name)===profiles.norm(newName);});
    if(duplicate){setStatus('A customer with this name already exists. Open that customer to edit their details.','err');return;}
    var old=editId&&data.customers.find(function(c){return c.id===editId;}),oldName=old&&old.name;
    nagProfileOldSaveCustomer();
    var id=editId||currentCustId,customer=data.customers.find(function(c){return c.id===id;});
    if(customer){profiles.stamp(customer,oldName);persist();if(currentCustId===id)selectCustomer(id);}
  };
  /* END_NAG_LEDGER_PROFILE_SAVE_V226 */
