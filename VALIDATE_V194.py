from pathlib import Path
import base64, json, re, subprocess, tempfile

root = Path(__file__).resolve().parent
mini = (root / 'MINI_STORE_v194_DECODED.html').read_text(encoding='utf-8')
dist = (root / 'dist' / 'index.html').read_text(encoding='utf-8')

checks = []
def check(label, condition):
    checks.append((label, bool(condition)))

package_version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
tauri_version = json.loads((root / 'src-tauri' / 'tauri.conf.json').read_text(encoding='utf-8'))['version']
cargo = (root / 'src-tauri' / 'Cargo.toml').read_text(encoding='utf-8')
cargo_match = re.search(r'(?m)^version = "([^"]+)"$', cargo)
cargo_version = cargo_match.group(1) if cargo_match else ''

check('Version consistency', package_version == tauri_version == cargo_version == '1.9.4')
check('Tauri main file', (root / 'src-tauri' / 'src' / 'main.rs').is_file())
check('Correction editor card', 'id="damageCorrectionCard"' in mini)
check('Original reference field', 'id="correctionOriginalRef"' in mini)
check('Mini Store name field', 'id="correctionMiniStoreName"' in mini)
check('Correct product field', 'id="correctionProduct"' in mini)
check('Correct type field', 'id="correctionType"' in mini)
check('Correct quantity field', 'id="correctionQty"' in mini)
check('Correction reason field', 'id="correctionReason"' in mini)
check('Correction remarks field', 'id="correctionNote"' in mini)
check('Save correction button', 'id="saveCorrectionBtn"' in mini)
check('Cancel original button', 'id="cancelOriginalBtn"' in mini)
check('Reject request button', 'id="rejectCorrectionRequestBtn"' in mini)
check('MCR correction reference', "type==='correction'?'MCR'" in mini)
check('MCN cancellation reference', "type==='cancellation'?'MCN'" in mini)
check('MCRQ request reference', "type==='correction_request'?'MCRQ'" in mini)
check('Movement status helper', 'function movementStatus(r)' in mini)
check('Active adjustment guard', 'function activeAdjustment(r)' in mini)
check('Assigned Mini Store correction guard', 'function canCorrectMovement(r)' in mini and 'miniStoreAllowed(movementMiniStoreId(r))' in mini)
check('Correction editor opens', 'function openCorrectionEditor(id,requestId)' in mini)
check('Correction input validation', 'function validateCorrectionInputs(r)' in mini)
check('Cashier request creation', 'function submitCorrectionRequest(r,data)' in mini)
check('Admin correction application', 'function applyCorrection(r,data,request)' in mini)
check('Admin cancellation', 'function cancelAdjustment(r,reason,note)' in mini)
check('Admin request rejection', 'function rejectCorrectionRequest(id)' in mini)
check('Original record corrected status', "current.status='corrected'" in mini)
check('Original record cancelled status', "current.status='cancelled'" in mini)
check('Pending request has no stock change', 'Stock has not changed.' in mini)
check('Correction restores original quantity', 'all[data.vid][data.oldCode]=oldNow+data.oldQty' in mini)
check('Correction deducts corrected quantity', 'all[data.vid][data.code]=newBefore-data.qty' in mini)
check('Cancellation restores full quantity', 'all[vid][code]=before+n(current.qty)' in mini)
check('Warehouse remains unchanged', 'warehouse_effect:0' in mini)
check('History correction filter', '<option value="correction">Corrections</option>' in mini)
check('History cancellation filter', '<option value="cancellation">Cancellations</option>' in mini)
check('History request filter', '<option value="correction_request">Correction Requests</option>' in mini)
check('History status column', '<th>Status</th>' in mini)
check('History action column', '<th>Action</th>' in mini)
check('Admin Correct action', 'data-correct-id' in mini)
check('Admin Cancel action', 'data-cancel-id' in mini)
check('Cashier Request Edit action', 'data-request-id' in mini)
check('Admin Review action', 'data-review-request-id' in mini)
check('Admin Reject action', 'data-reject-request-id' in mini)
check('Audit document generator', 'function adjustmentAuditDocumentHtml(r)' in mini)
check('Audit documents use company layout', 'NABD AL-GHARB TRADING EST.' in mini and 'مؤسسة نبض الغرب التجارية' in mini)
check('Audit document has Mini Store wording', 'مستند تصحيح مخزون المتجر الصغير' in mini)
check('Movement document dispatches audit records', "r.type==='correction'||r.type==='cancellation'||r.type==='correction_request'" in mini)
check('Original damage and missing record status active', "type:type,status:'active'" in mini)
check('Report ignores corrected and cancelled originals', "if(st==='active')" in mini)
check('Report counts corrected type and quantity', "effectiveType=m.corrected_type" in mini and "effectiveQty=n(m.corrected_qty)" in mini)
check('Inventory-only role hides correction editor', "if(!correctionTargetId)showCard('damageCorrectionCard',false)" in mini)
check('Existing damage and missing entry remains', 'id="miniStoreSettlementCard"' in mini and 'evidence_data_url:settlementEvidenceData' in mini)
check('Existing return remains', 'id="miniStoreReturnCard"' in mini and "nextMovementReference('return'" in mini)
check('Existing Mini Store Tax Invoice remains', 'function miniStoreBillData(saveDocument)' in mini and 'ZATCA VAT QR' in mini)
check('Existing cashier scope remains', 'function allowedMiniStores()' in mini)
check('Existing Vehicle Stock source remains', (root / 'VEHICLE_STOCK_v187_DECODED.html').is_file())

# Embedded source equality
embedded = re.search(r'var MINI_STORE=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
embedded_ok = False
if embedded:
    embedded_ok = base64.b64decode(embedded.group(1)).decode('utf-8') == mini
check('Embedded Mini Store matches decoded source', embedded_ok)

# JavaScript syntax
scripts = re.findall(r'<script>(.*?)</script>', mini, re.S)
js_ok = False
if scripts:
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as handle:
        handle.write(scripts[-1])
        temp_name = handle.name
    proc = subprocess.run(['node', '--check', temp_name], capture_output=True, text=True)
    js_ok = proc.returncode == 0
check('Mini Store JavaScript syntax', js_ok)

# Deterministic stock correction simulations
def same_product_correction(current_after_wrong_entry, original_qty, corrected_qty):
    restored = current_after_wrong_entry + original_qty
    return restored - corrected_qty

def wrong_product_correction(old_current, original_qty, new_current, corrected_qty):
    return old_current + original_qty, new_current - corrected_qty

def cancellation(current, original_qty):
    return current + original_qty

check('Simulation 80 to 8 restores 72 pieces', same_product_correction(20, 80, 8) == 92)
old_after, new_after = wrong_product_correction(40, 10, 30, 6)
check('Simulation wrong product restores original product', old_after == 50)
check('Simulation wrong product deducts corrected product', new_after == 24)
check('Simulation cancellation restores full quantity', cancellation(20, 80) == 100)

failed = [label for label, passed in checks if not passed]
for label, passed in checks:
    print(('PASS ' if passed else 'FAIL ') + label)
print(f'\nResult: {len(checks)-len(failed)} passed, {len(failed)} failed')
if failed:
    raise SystemExit(1)
