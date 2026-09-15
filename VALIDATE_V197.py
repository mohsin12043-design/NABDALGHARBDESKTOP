from pathlib import Path
import base64, json, re, subprocess, sys

root = Path(__file__).resolve().parent
module = (root / "MINI_STORE_v197_DECODED.html").read_text(encoding="utf-8")
dist = (root / "dist" / "index.html").read_text(encoding="utf-8")

checks = []

def check(name, condition):
    checks.append((name, bool(condition)))

check("package version", json.loads((root / "package.json").read_text())["version"] == "1.9.7")
check("tauri version", json.loads((root / "src-tauri" / "tauri.conf.json").read_text())["version"] == "1.9.7")
check("cargo version", 'version = "1.9.7"' in (root / "src-tauri" / "Cargo.toml").read_text())
check("tauri main file", (root / "src-tauri" / "src" / "main.rs").exists())
check("shared company header helper", "function companyDocumentHeaderHtml()" in module)
check("shared company footer helper", "function companyDocumentFooterHtml(className)" in module)
check("standard A4 settlement paper", 'class="movementpaper settlementpaper"' in module)
check("settlement uses shared header", "companyDocumentHeaderHtml()+'<div style=\"text-align:center" in module)
check("invoice uses company footer", "companyDocumentFooterHtml('company-document-footer')" in module)
check("movement documents use shared footer", module.count("companyDocumentFooterHtml('document-footer')") >= 3)
check("company VAT", "311157282200003" in module)
check("company CR", "3451102031" in module)
check("company national address", "7027457311" in module)
check("company telephone", "0537859509" in module)
check("A4 print page", "@page{size:A4" in module)
check("print table headings repeat", ".movementpaper table thead{display:table-header-group}" in module)
check("rows avoid page split", "page-break-inside:avoid" in module)
check("inventory-only operation helper", "function miniStoreOperationAllowed()" in module)
check("inventory-only blocking helper", "function requireMiniStoreOperation(action)" in module)
check("movement document guard", "requireMiniStoreOperation('Mini Store movement documents')" in module)
check("settlement report guard", "requireMiniStoreOperation('Mini Store settlement reports')" in module)
check("invoice guard", "requireMiniStoreOperation('Mini Store invoices')" in module)
check("billing guard", "requireMiniStoreOperation('Mini Store billing')" in module)
check("return guard", "requireMiniStoreOperation('Mini Store returns')" in module)
check("damage missing guard", "requireMiniStoreOperation('Damage and missing adjustments')" in module)
check("print guard", "requireMiniStoreOperation('Mini Store document printing')" in module)
check("cashier assigned store filter", "function allowedMiniStores()" in module)
check("assigned store permission", "function miniStoreAllowed(vid)" in module)
check("admin setup guard", "Only Admin can create or assign Mini Stores." in module)
check("admin transfer guard", "Only Admin can transfer stock from Main Warehouse." in module)
check("admin price guard", "Only Admin can change price permissions." in module)
check("inventory-only cards hidden", "showCard('miniStoreReportCard',false)" in module)
check("return feature retained", "Return Mini Store Stock to Main Warehouse" in module)
check("damage missing retained", "Damaged and Missing Mini Store Stock" in module)
check("correction retained", "Correction Request" in module)
check("clickable invoices retained", "data-sale-id" in module)
check("clickable movements retained", "data-movement-id" in module)
check("settlement summary retained", "Pending Amount" in module and "Stock Difference" in module)
check("quotation absent", 'value="quote"' not in module[module.find('id="miniStoreBillCard"'):module.find('id="miniStoreBillPrint"')])

match = re.search(r'var MINI_STORE=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
check("embedded Mini Store found", match is not None)
if match:
    decoded = base64.b64decode(match.group(1)).decode("utf-8")
    check("embedded module matches source", decoded == module)
else:
    check("embedded module matches source", False)

scripts = re.findall(r"<script>(.*?)</script>", module, flags=re.S)
temp = root / ".validate_v197.js"
temp.write_text("\n".join(scripts), encoding="utf-8")
try:
    result = subprocess.run(["node", "--check", str(temp)], capture_output=True, text=True)
    check("Mini Store JavaScript syntax", result.returncode == 0)
finally:
    temp.unlink(missing_ok=True)

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(("PASS " if ok else "FAIL ") + name)
print(f"\nRESULT: {len(checks)-len(failed)} passed, {len(failed)} failed")
if failed:
    sys.exit(1)
