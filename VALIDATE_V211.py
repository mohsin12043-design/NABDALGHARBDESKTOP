from pathlib import Path
import base64,json,re,subprocess,sys
root=Path(__file__).resolve().parent
damage=(root/'DAMAGEDSTOCK_v211_DECODED.html').read_text()
vehicle=(root/'VEHICLE_STOCK_v210_DECODED.html').read_text()
mini=(root/'MINI_STORE_v210_DECODED.html').read_text()
dist=(root/'dist'/'index.html').read_text()
checks=[]
def check(n,c): checks.append((n,bool(c)))
check('package version',json.loads((root/'package.json').read_text())['version']=='2.1.1')
check('tauri version',json.loads((root/'src-tauri'/'tauri.conf.json').read_text())['version']=='2.1.1')
check('cargo version','version = "2.1.1"' in (root/'src-tauri'/'Cargo.toml').read_text())
check('main file exists',(root/'src-tauri'/'src'/'main.rs').exists())
for n,t in [('movement ledger helper','function dsMovementLedgerKey(d)'),('current qty helper','function dsCurrentLocationQty(d,code)'),('write movement helper','function dsWriteDamageMovement(row,d,before,after)'),('cancel movement helper','function dsCancelDamageMovement(row)'),('backfill helper','function dsSyncManualDamageMovements(rows)'),('vehicle ledger','nag_stock_transfers_v1'),('mini ledger','nag_mini_store_transfers_v1'),('central source marker',"source_type:'central_damaged_stock'"),('damage movement',"type:'damage',status:'active'"),('load backfill','dsSyncManualDamageMovements(cloudRows)'),('save movement','dsWriteDamageMovement(row,d,before,after)'),('delete cancel','dsCancelDamageMovement(it)'),('duplicate exclusion',"r.source_type==='central_damaged_stock'||r.central_damage_reference")]: check(n,t in damage)
check('vehicle settlement counts damage',"if(m.type==='damage')damaged+=q" in vehicle)
check('mini settlement counts damage',"if(m.type==='damage')damaged+=q" in mini)
check('vehicle expected stock', 'expectedStock=issued-soldQty-returned-damaged-missing' in vehicle)
check('mini expected stock', 'expectedStock=issued-soldQty-returned-damaged-missing' in mini)
m=re.search(r'DAMAGEDSTOCK=b64utf8\("([A-Za-z0-9+/=]+)"\)',dist)
check('embedded found',m is not None)
check('embedded matches',bool(m) and base64.b64decode(m.group(1)).decode()==damage)
for label,src in [('Damaged Stock',damage),('Desktop shell',dist)]:
 scripts=re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',src,flags=re.I)
 tmp=root/('.validate_v211_'+label.lower().replace(' ','_')+'.js'); tmp.write_text('\n'.join(scripts))
 try:
  r=subprocess.run(['node','--check',str(tmp)],capture_output=True,text=True); check(label+' JavaScript syntax',r.returncode==0)
 finally: tmp.unlink(missing_ok=True)
failed=[n for n,o in checks if not o]
for n,o in checks: print(('PASS ' if o else 'FAIL ')+n)
print(f'\nRESULT: {len(checks)-len(failed)} passed, {len(failed)} failed')
if failed: sys.exit(1)
