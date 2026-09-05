from pathlib import Path
import base64, json, re, subprocess, tempfile

root = Path(__file__).resolve().parent
mini = (root / 'MINI_STORE_v193_DECODED.html').read_text(encoding='utf-8')
dist = (root / 'dist' / 'index.html').read_text(encoding='utf-8')

checks = []
def check(label, condition):
    checks.append((label, bool(condition)))

package_version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
tauri_version = json.loads((root / 'src-tauri' / 'tauri.conf.json').read_text(encoding='utf-8'))['version']
cargo = (root / 'src-tauri' / 'Cargo.toml').read_text(encoding='utf-8')
cargo_match = re.search(r'(?m)^version = "([^"]+)"$', cargo)
cargo_version = cargo_match.group(1) if cargo_match else ''

check('Version consistency', package_version == tauri_version == cargo_version == '1.9.3')
check('Tauri main file', (root / 'src-tauri' / 'src' / 'main.rs').is_file())
check('Damage and missing card', 'id="miniStoreSettlementCard"' in mini and 'Damaged and Missing Mini Store Stock' in mini)
check('Available quantity field', 'id="settleAvailable"' in mini)
check('Adjustment type field', 'id="settleType"' in mini)
check('Adjustment quantity field', 'id="settleQty"' in mini)
check('Reason field', 'id="settleReason"' in mini)
check('Remarks field', 'id="settleNote"' in mini)
check('Evidence photo field', 'id="settleEvidence"' in mini)
check('Evidence preview', 'id="settleEvidencePreview"' in mini)
check('Evidence compression function', 'function loadSettlementEvidence(file)' in mini)
check('Evidence clear function', 'function clearSettlementEvidence()' in mini)
check('Evidence stored in movement', 'evidence_data_url:settlementEvidenceData' in mini)
check('Evidence shown in PDF', 'Evidence Photo / صورة الإثبات' in mini and 'class="evidence-photo"' in mini)
check('Quantity auto-fill', 'function syncSettlementQuantity()' in mini and "Available in Mini Store:" in mini)
check('Partial adjustment maximum', 'input.max=String(available)' in mini)
check('Products filtered to positive stock', 'function renderSettlementProducts()' in mini and 'n(rows[c])>0' in mini)
check('Cashier assignment guard', "if(vid&&!miniStoreAllowed(vid))" in mini)
check('Excess quantity blocked', "Mini Store has only '+money(available)+' available." in mini)
check('Mini Store quantity decreases', 'all[vid][c]=available-q' in mini)
check('Warehouse remains unchanged', 'warehouse_effect:0' in mini and 'Main Warehouse unchanged.' in mini)
check('Damage MDM reference', "type==='damage'?'MDM'" in mini)
check('Missing MMS reference', "type==='missing'?'MMS'" in mini)
check('Reason stored', 'reason:reason' in mini)
check('Before and after balances stored', 'miniStore_before:storeBefore' in mini and 'miniStore_after:storeAfter' in mini)
check('Company movement PDF', 'function movementDocumentHtml(r)' in mini and 'NABD AL-GHARB TRADING EST.' in mini)
check('Movement document opens after save', 'openMovementDocument(id)' in mini)
check('Existing return feature remains', 'id="miniStoreReturnCard"' in mini and "nextMovementReference('return'" in mini)
check('Existing Tax Invoice remains', 'function miniStoreBillData(saveDocument)' in mini and 'ZATCA VAT QR' in mini)
check('Existing cashier scope remains', 'function allowedMiniStores()' in mini and "showCard('miniStoreSetupCard',false)" in mini)
check('Existing Vehicle Stock source remains', (root / 'VEHICLE_STOCK_v187_DECODED.html').is_file())

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
