from pathlib import Path
import base64, json, re, subprocess, sys

root = Path(__file__).resolve().parent
dist = (root / "dist" / "index.html").read_text(encoding="utf-8")
vehicle = (root / "VEHICLE_STOCK_v187_DECODED.html").read_text(encoding="utf-8")
mini = (root / "MINI_STORE_v197_DECODED.html").read_text(encoding="utf-8")
tauri = json.loads((root / "src-tauri" / "tauri.conf.json").read_text())
package = json.loads((root / "package.json").read_text())
cargo = (root / "src-tauri" / "Cargo.toml").read_text()
main_rs = (root / "src-tauri" / "src" / "main.rs").read_text()
build_yml = (root / ".github" / "workflows" / "build-desktop.yml").read_text()
release_yml = (root / ".github" / "workflows" / "release-desktop.yml").read_text()

checks = []
def check(name, condition):
    checks.append((name, bool(condition)))

check("package version", package.get("version") == "1.9.8")
check("tauri version", tauri.get("version") == "1.9.8")
check("cargo version", 'version = "1.9.8"' in cargo)
check("main.rs exists and is non-empty", len(main_rs.strip()) > 500)
check("updater check command", "check_for_update" in main_rs)
check("updater install command", "download_and_install_update" in main_rs)
check("updater endpoint", "releases/latest/download/latest.json" in json.dumps(tauri))
check("updater public key", len(tauri.get("plugins",{}).get("updater",{}).get("pubkey","")) > 40)
check("MSI target", "msi" in tauri.get("bundle",{}).get("targets",[]))
check("NSIS target", "nsis" in tauri.get("bundle",{}).get("targets",[]))
check("updater artifacts enabled", tauri.get("bundle",{}).get("createUpdaterArtifacts") is True)

vm = re.search(r'var VEHICLE_STOCK=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
mm = re.search(r'var MINI_STORE=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
check("embedded Vehicle Stock found", vm is not None)
check("embedded Mini Store found", mm is not None)
check("embedded Vehicle Stock matches source", bool(vm) and base64.b64decode(vm.group(1)).decode("utf-8") == vehicle)
check("embedded Mini Store matches source", bool(mm) and base64.b64decode(mm.group(1)).decode("utf-8") == mini)

vehicle_tokens = {
    "Vehicle cashier scope": "function vehicleAllowed",
    "Vehicle settlement available field": 'id="settleAvailable"',
    "Vehicle settlement auto-fill function": "function syncSettlementQuantity",
    "Vehicle Tax Invoice": "TAX INVOICE",
    "Vehicle Cash and Credit": "Credit Invoice",
    "Vehicle return": "Return Vehicle Stock to Main Warehouse",
    "Vehicle damage and missing": "Damaged and Missing",
    "Vehicle correction request": "Request Damage or Missing Correction",
    "Vehicle correction reference": "VCR",
    "Vehicle cancellation reference": "VCN",
    "Vehicle clickable sales": "data-sale-key",
    "Vehicle sale document opener": "function openSaleDocument",
    "Vehicle clickable movements": "data-movement-id",
    "Vehicle settlement summary": "Pending Amount",
    "Vehicle stock reconciliation": "Stock Difference",
}
for name, token in vehicle_tokens.items():
    check(name, token in vehicle)

mini_tokens = {
    "Mini Store cashier scope": "function miniStoreAllowed",
    "Mini Store settlement available field": 'id="settleAvailable"',
    "Mini Store settlement auto-fill function": "function syncSettlementQuantity",
    "Mini Store Tax Invoice": "TAX INVOICE",
    "Mini Store Cash and Credit": "Credit Invoice",
    "Mini Store return": "Return Mini Store Stock to Main Warehouse",
    "Mini Store damage and missing": "Damaged and Missing Mini Store Stock",
    "Mini Store correction request": "Correction Request",
    "Mini Store correction reference": "MCR",
    "Mini Store cancellation reference": "MCN",
    "Mini Store clickable sales": "data-sale-id",
    "Mini Store clickable movements": "data-movement-id",
    "Mini Store settlement summary": "Pending Amount",
    "Mini Store stock reconciliation": "Stock Difference",
    "Mini Store shared company header": "function companyDocumentHeaderHtml()",
    "Mini Store shared company footer": "function companyDocumentFooterHtml",
    "Mini Store inventory-only operation guard": "function requireMiniStoreOperation",
}
for name, token in mini_tokens.items():
    check(name, token in mini)

check("Vehicle Admin restriction", "Only Admin" in vehicle)
check("Mini Store Admin setup restriction", "Only Admin can create or assign Mini Stores." in mini)
check("Mini Store Admin warehouse transfer restriction", "Only Admin can transfer stock from Main Warehouse." in mini)
check("Mini Store inventory-only report hidden", "showCard('miniStoreReportCard',false)" in mini)
check("Mini Store printing guard", "Mini Store document printing" in mini)

for module_name, source in [("Vehicle", vehicle), ("Mini Store", mini)]:
    check(f"{module_name} VAT", "311157282200003" in source)
    check(f"{module_name} CR", "3451102031" in source)
    check(f"{module_name} telephone", "0537859509" in source)
    check(f"{module_name} national address", "7027457311" in source)
    check(f"{module_name} A4 print", "@page" in source and "A4" in source)
    check(f"{module_name} quotation removed", 'value="quote"' not in source)

check("build workflow Windows", "runs-on: windows-latest" in build_yml)
check("build workflow signing key", "TAURI_SIGNING_PRIVATE_KEY" in build_yml)
check("build workflow signing password", "TAURI_SIGNING_PRIVATE_KEY_PASSWORD" in build_yml)
check("build workflow MSI", "bundle/msi/*.msi" in build_yml)
check("build workflow EXE", "bundle/nsis/*.exe" in build_yml)
check("build workflow signatures", "**/*.sig" in build_yml)
check("release workflow version input", "Release tag, for example v1.9.8" in release_yml)
check("release workflow resolved tag", "RELEASE_TAG" in release_yml)
check("release workflow validates v tag", "must start with v" in release_yml)
check("release workflow updater json", "includeUpdaterJson: true" in release_yml)
check("release workflow signing key", "TAURI_SIGNING_PRIVATE_KEY" in release_yml)
check("release workflow avoids main tag", "tagName: ${{ github.ref_name }}" not in release_yml)

for label, source in [("Vehicle Stock", vehicle), ("Mini Store", mini), ("Desktop shell", dist)]:
    scripts = re.findall(r"<script>(.*?)</script>", source, flags=re.S)
    temp = root / (".validate_" + label.lower().replace(" ","_") + ".js")
    temp.write_text("\n".join(scripts), encoding="utf-8")
    try:
        result = subprocess.run(["node", "--check", str(temp)], capture_output=True, text=True)
        check(label + " JavaScript syntax", result.returncode == 0)
    finally:
        temp.unlink(missing_ok=True)

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(("PASS " if ok else "FAIL ") + name)
print(f"\nRESULT: {len(checks)-len(failed)} passed, {len(failed)} failed")
if failed:
    for name in failed:
        print("FAILED: " + name)
    sys.exit(1)
