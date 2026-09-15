from pathlib import Path
import re, json, base64, subprocess, sys
root=Path(__file__).resolve().parent
files={
 'INV':(root/'INV_v210_DECODED.html').read_text(),
 'VEHICLE_STOCK':(root/'VEHICLE_STOCK_v210_DECODED.html').read_text(),
 'MINI_STORE':(root/'MINI_STORE_v210_DECODED.html').read_text(),
 'STOCK_CONTROL':(root/'STOCK_CONTROL_v210_DECODED.html').read_text(),
}
dist=(root/'dist/index.html').read_text()
checks=[]
def ck(n,v): checks.append((n,bool(v)))
ck('package version',json.loads((root/'package.json').read_text())['version']=='2.1.0')
ck('tauri version',json.loads((root/'src-tauri/tauri.conf.json').read_text())['version']=='2.1.0')
ck('cargo version','version = "2.1.0"' in (root/'src-tauri/Cargo.toml').read_text())
ck('main.rs exists',(root/'src-tauri/src/main.rs').exists())
inv=files['INV'];veh=files['VEHICLE_STOCK'];mini=files['MINI_STORE'];stock=files['STOCK_CONTROL']
ck('invoice sale lines helper','function invoiceSaleLines(t)' in inv)
ck('invoice sale metadata','function invoiceSaleMetadata(t,kind,id,name)' in inv)
ck('vehicle ledger invoice type','meta.vehicle_id=vid' in inv and 'invoice_type:itype' in inv)
ck('mini ledger invoice type','meta.miniStore_id=mid' in inv and 'payment_status:payment' in inv)
ck('new sale deduct only once','var isNew=idx<0' in inv and 'if(isNew){lines.forEach' in inv)
ck('payment status ledger sync','updateSaleLedgerPayment(no,hist[idx].paymentStatus)' in inv)
ck('void sale ledger reversal','reverseSaleLedger(rec)' in inv)
ck('void original location restore','restoreLocationStockForInvoice(rec)' in inv)
ck('vehicle legacy rows repaired','Array.isArray(s.rows)' in veh and 'nag_invoice_history_v1' in veh)
ck('vehicle report excludes void','!r.reversed&&!r.voided' in veh)
ck('vehicle renderer supports rows','Array.isArray(s.rows)?s.rows' in veh)
ck('mini legacy rows repaired','Array.isArray(s.rows)' in mini and 'nag_invoice_history_v1' in mini)
ck('mini report excludes void','!r.reversed&&!r.voided' in mini)
ck('mini normalizer supports rows','Array.isArray(s.rows)?s.rows' in mini)
ck('central report supports rows','Array.isArray(s&&s.rows)?s.rows' in stock)
ck('central invoice history classification',"rawArray('nag_invoice_history_v1').find" in stock)
ck('central excludes void',stock.count('!s.reversed&&!s.voided')>=2)
for name,src in files.items():
 m=re.search(r'(?<![A-Za-z0-9_])'+name+r'=b64utf8\("([A-Za-z0-9+/=]+)"\)',dist)
 ck(name+' embedded',m is not None)
 ck(name+' embedded matches',bool(m) and base64.b64decode(m.group(1)).decode()==src)
 scripts=re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',src,re.I)
 temp=root/('.check_'+name+'.js');temp.write_text('\n'.join(scripts))
 try:
  r=subprocess.run(['node','--check',str(temp)],capture_output=True,text=True)
  ck(name+' JavaScript syntax',r.returncode==0)
 finally: temp.unlink(missing_ok=True)
# Desktop shell syntax
scripts=re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',dist,re.I)
temp=root/'.check_shell.js';temp.write_text('\n'.join(scripts))
try:
 r=subprocess.run(['node','--check',str(temp)],capture_output=True,text=True)
 ck('desktop shell JavaScript syntax',r.returncode==0)
finally: temp.unlink(missing_ok=True)
failed=[n for n,v in checks if not v]
for n,v in checks: print(('PASS ' if v else 'FAIL ')+n)
print(f'\nRESULT: {len(checks)-len(failed)} passed, {len(failed)} failed')
if failed: sys.exit(1)
