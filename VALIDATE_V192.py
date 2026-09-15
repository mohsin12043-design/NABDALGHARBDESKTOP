from pathlib import Path
import base64, json, re, subprocess, tempfile

root = Path(__file__).resolve().parent
mini = (root / 'MINI_STORE_v192_DECODED.html').read_text(encoding='utf-8')
dist = (root / 'dist' / 'index.html').read_text(encoding='utf-8')

checks = []
def check(label, condition):
    checks.append((label, bool(condition)))

package_version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
tauri_version = json.loads((root / 'src-tauri' / 'tauri.conf.json').read_text(encoding='utf-8'))['version']
cargo = (root / 'src-tauri' / 'Cargo.toml').read_text(encoding='utf-8')
cargo_match = re.search(r'(?m)^version = "([^"]+)"$', cargo)
cargo_version = cargo_match.group(1) if cargo_match else ''

check('Version consistency', package_version == tauri_version == cargo_version == '1.9.2')
check('Tauri main file', (root / 'src-tauri' / 'src' / 'main.rs').is_file())
check('Dedicated return card', 'id="miniStoreReturnCard"' in mini)
check('Return Mini Store selector', 'id="returnMiniStore"' in mini)
check('Return product selector', 'id="returnProduct"' in mini)
check('Available quantity field', 'id="returnAvailable"' in mini)
check('Return quantity field', 'id="returnQty"' in mini)
check('Return reason field', 'id="returnReason"' in mini)
check('Return remarks field', 'id="returnNote"' in mini)
check('Return quantity auto-fill', 'function syncReturnQuantity()' in mini)
check('Return products filtered by stock', 'function renderReturnProducts()' in mini and "n(rows[c])>0" in mini)
check('Partial return maximum', "qtyInput.max=String(available)" in mini)
check('Return permission guard', "if(!miniStoreAllowed(vid))" in mini)
check('Return prevents excess quantity', "Mini Store has only '+money(available)+' available." in mini)
check('Return requires warehouse product', 'This product does not exist in Main Warehouse Inventory.' in mini)
check('Mini Store stock decreases', 'all[vid][c]=available-q' in mini)
check('Warehouse stock increases', 'warehouseAfter=warehouseBefore+q' in mini)
check('Supabase increment message', "action:'increment'" in mini)
check('MRT reference generation', "nextMovementReference('return'" in mini)
check('Before and after balances stored', 'miniStore_before:available' in mini and 'warehouse_after:warehouseAfter' in mini)
check('Return PDF opens', 'openMovementDocument(recordId)' in mini)
check('Inventory-only hides return', "showCard('miniStoreReturnCard',false)" in mini)
check('Full cashier mode shows return', "showCard('miniStoreReturnCard',true)" in mini)
check('Damage and missing separated', '<option value="return">Return to Main Warehouse</option>' not in mini and "type!=='damage'&&type!=='missing'" in mini)
check('Damage and missing warehouse unchanged', 'warehouse_effect:0' in mini)
check('Company movement document layout', 'function movementDocumentHtml(r)' in mini and 'NABD AL-GHARB TRADING EST.' in mini)
check('Existing Mini Store Tax Invoice', 'function miniStoreBillData(saveDocument)' in mini and 'ZATCA VAT QR' in mini)
check('Existing cashier scope', 'function allowedMiniStores()' in mini and 'cashier_u' in mini)

embedded = re.search(r'var MINI_STORE=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
embedded_ok = False
if embedded:
    embedded_ok = base64.b64decode(embedded.group(1)).decode('utf-8') == mini
check('Embedded Mini Store matches decoded source', embedded_ok)

scripts = re.findall(r'<script>(.*?)</script>', mini, re.S)
js_ok = False
if scripts:
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as handle:
        handle.write(scripts[-1])
        temp_name = handle.name
    proc = subprocess.run(['node', '--check', temp_name], capture_output=True, text=True)
    js_ok = proc.returncode == 0
check('Mini Store JavaScript syntax', js_ok)

failed = [label for label, passed in checks if not passed]
for label, passed in checks:
    print(('PASS ' if passed else 'FAIL ') + label)
print(f'\nResult: {len(checks)-len(failed)} passed, {len(failed)} failed')
if failed:
    raise SystemExit(1)
