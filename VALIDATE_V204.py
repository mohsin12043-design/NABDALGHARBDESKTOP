from pathlib import Path
import base64, json, re, subprocess, sys

root = Path(__file__).resolve().parent
dist = (root / 'dist' / 'index.html').read_text(encoding='utf-8')
vehicle = (root / 'VEHICLE_STOCK_v204_DECODED.html').read_text(encoding='utf-8')
mini = (root / 'MINI_STORE_v204_DECODED.html').read_text(encoding='utf-8')
checks = []
def check(name, ok): checks.append((name, bool(ok)))

check('package version', json.loads((root/'package.json').read_text())['version']=='2.0.4')
check('tauri version', json.loads((root/'src-tauri/tauri.conf.json').read_text())['version']=='2.0.4')
check('cargo version', 'version = "2.0.4"' in (root/'src-tauri/Cargo.toml').read_text())
check('main file present', (root/'src-tauri/src/main.rs').exists())
check('Mini Store removed from hard CSS hide', 'body.nag-cashier-session #pickMiniStore' not in dist.split('.nag-force-hidden')[0])
check('Vehicle Stock removed from hard CSS hide', 'body.nag-cashier-session #pickVehicleStock' not in dist.split('.nag-force-hidden')[0])
admin_line = re.search(r"var ADMIN_ONLY_MODULES=\[([^\]]*)\]", dist)
check('Mini Store is cashier permission option', bool(admin_line) and 'pickMiniStore' not in admin_line.group(1))
check('Vehicle Stock is cashier permission option', bool(admin_line) and 'pickVehicleStock' not in admin_line.group(1))
check('Mini Store route opens operations', "openMiniStoreMode(s&&s.role!=='admin'?'operations':'full'" in dist)
check('Vehicle route opens operations', "openVehicleStockMode(s&&s.role!=='admin'?'operations':'full'" in dist)
check('Mini Store route checks permission', "nagCanOpenModule('pickMiniStore')" in dist)
check('Vehicle route checks permission', "nagCanOpenModule('pickVehicleStock')" in dist)
check('Read-only assigned inventory retained', "openAssignedInventory('')" in dist and 'ASSIGNED_INVENTORY' in dist)
check('Warehouse read-only permission retained', 'warehouse-readonly' in dist)
check('Mini Store card cashier label', 'My Mini Store Stock' in dist)
check('Vehicle card cashier label', 'My Vehicle Stock' in dist)
check('Mini Store cashier operations mode', "requested==='operations'?'operations':'inventory'" in mini)
check('Vehicle cashier operations mode', "requested==='operations'?'operations':'inventory'" in vehicle)
check('Mini Store assigned filter', 'function allowedMiniStores()' in mini and 'cashier_u' in mini)
check('Vehicle assigned filter', 'function allowedVehicles()' in vehicle and 'cashier_u' in vehicle)
check('Mini Store setup hidden for cashier', "showCard('miniStoreSetupCard',false)" in mini)
check('Mini Store transfer hidden for cashier', "showCard('miniStoreTransferCard',false)" in mini)
check('Mini Store price permissions hidden', "showCard('pricePermissionCard',false)" in mini)
check('Mini Store testing hidden', "showCard('testingSettingsCard',false)" in mini)
check('Mini Store damage and missing retained', 'Damaged and Missing Mini Store Stock' in mini)
check('Mini Store return retained', 'Return Mini Store Stock to Main Warehouse' in mini)
check('Mini Store settlement retained', 'Mini Store Sales & Settlement Report' in mini)
check('Mini Store bill retained', 'One Click Mini Store Bill' in mini)
check('Mini Store cashier request edit retained', 'Request Edit' in mini or 'Correction Request' in mini)
check('Mini Store Admin cancellation protection', 'Only Admin can cancel a posted entry.' in mini)
check('Vehicle setup hidden for cashier', "showCard('vehicleSetupCard',false)" in vehicle)
check('Vehicle transfer hidden for cashier', "showCard('vehicleTransferCard',false)" in vehicle)
check('Vehicle damage and missing retained', 'Damaged and Missing Vehicle Stock' in vehicle)
check('Vehicle return retained', 'Return Vehicle Stock to Main Warehouse' in vehicle)
check('Admin-only modules remain hidden', all(x in dist for x in ['pickEmployees','pickKhurooj','pickSalary','pickAdvance','pickCommercialInvoice']))

for label, src in [('Vehicle Stock', vehicle), ('Mini Store', mini), ('Desktop shell', dist)]:
    scripts = re.findall(r'<script>(.*?)</script>', src, flags=re.S)
    temp = root / ('.check_' + label.lower().replace(' ','_') + '.js')
    temp.write_text('\n'.join(scripts), encoding='utf-8')
    try:
        r = subprocess.run(['node','--check',str(temp)], capture_output=True, text=True)
        check(label + ' JavaScript syntax', r.returncode==0)
    finally:
        temp.unlink(missing_ok=True)

vm = re.search(r'var VEHICLE_STOCK=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
mm = re.search(r'var MINI_STORE=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
check('embedded Vehicle module matches', bool(vm) and base64.b64decode(vm.group(1)).decode('utf-8')==vehicle)
check('embedded Mini Store module matches', bool(mm) and base64.b64decode(mm.group(1)).decode('utf-8')==mini)

failed=[n for n,o in checks if not o]
for n,o in checks: print(('PASS ' if o else 'FAIL ')+n)
print(f'\nRESULT: {len(checks)-len(failed)} passed, {len(failed)} failed')
if failed:
    for n in failed: print('FAILED: '+n)
    sys.exit(1)
