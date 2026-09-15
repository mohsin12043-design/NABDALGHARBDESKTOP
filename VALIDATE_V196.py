from pathlib import Path
import json, re, base64, subprocess, sys

root = Path(__file__).resolve().parent
module = (root / "MINI_STORE_v196_DECODED.html").read_text(encoding="utf-8")
dist = (root / "dist" / "index.html").read_text(encoding="utf-8")

checks = []

def check(name, condition):
    checks.append((name, bool(condition)))

check("package version", json.loads((root / "package.json").read_text())["version"] == "1.9.6")
check("tauri version", json.loads((root / "src-tauri" / "tauri.conf.json").read_text())["version"] == "1.9.6")
check("cargo version", 'version = "1.9.6"' in (root / "src-tauri" / "Cargo.toml").read_text())
check("tauri main file", (root / "src-tauri" / "src" / "main.rs").exists())
check("preview button", 'id="previewMiniStoreSettlementReport"' in module)
check("report status column", '<th>Status</th>' in module)
check("current report state", "currentMiniStoreSettlementReport" in module)
check("settlement html function", "function miniStoreSettlementReportHtml" in module)
check("settlement open function", "function openMiniStoreSettlementReportDocument" in module)
check("report renderer", "function renderReport()" in module)
check("cash sales summary", "Cash Sales" in module and "cash_sales" in module)
check("credit sales summary", "Credit Sales" in module and "credit_sales" in module)
check("paid summary", "Paid Amount" in module and "paid_amount" in module)
check("pending summary", "Pending Amount" in module and "pending_amount" in module)
check("correction count", "Correction Entries" in module and "correction_count" in module)
check("corrected quantity", "Corrected Quantity" in module and "corrected_qty" in module)
check("current remaining", "Current Remaining" in module and "current_stock" in module)
check("expected stock", "expectedStock=issued-soldQty-returned-damaged-missing" in module)
check("stock difference", "stockDifference=currentStock-expectedStock" in module)
check("stock reconciliation PDF", "Stock Reconciliation / مطابقة المخزون" in module)
check("company VAT", "311157282200003" in module)
check("company CR", "3451102031" in module)
check("company national address", "7027457311" in module)
check("assigned store report guard", "if(!vid||!miniStoreAllowed(vid))" in module)
check("render guard", "if(vid&&!miniStoreAllowed(vid))" in module)
check("invoice clickable", "data-sale-id" in module)
check("movement clickable", "data-movement-id" in module)
check("inventory-only report hidden", "showCard('miniStoreReportCard',false)" in module)
check("admin report visible", "'miniStoreReportCard'" in module)
check("button event", "$('previewMiniStoreSettlementReport').onclick=openMiniStoreSettlementReportDocument" in module)
check("no quotation in Mini Store bill", "Quotation is not included" in module)
check("return feature retained", "Return Mini Store Stock to Main Warehouse" in module)
check("damage feature retained", "Damaged and Missing Mini Store Stock" in module)
check("correction feature retained", "Correction Request" in module)
check("updater endpoint retained", "releases/latest/download/latest.json" in (root / "src-tauri" / "tauri.conf.json").read_text())

m = re.search(r'var MINI_STORE=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
check("embedded module found", m is not None)
if m:
    decoded = base64.b64decode(m.group(1)).decode("utf-8")
    check("embedded module matches decoded source", decoded == module)
else:
    check("embedded module matches decoded source", False)

scripts = re.findall(r"<script>(.*?)</script>", module, flags=re.S)
js_path = root / ".validate_v196_module.js"
js_path.write_text("\n".join(scripts), encoding="utf-8")
try:
    result = subprocess.run(["node", "--check", str(js_path)], capture_output=True, text=True)
    check("Mini Store JavaScript syntax", result.returncode == 0)
finally:
    js_path.unlink(missing_ok=True)

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(("PASS " if ok else "FAIL ") + name)
print(f"\nRESULT: {len(checks)-len(failed)} passed, {len(failed)} failed")
if failed:
    sys.exit(1)
