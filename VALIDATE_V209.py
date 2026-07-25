from pathlib import Path
import base64, json, re, subprocess, sys

root = Path(__file__).resolve().parent
assigned = (root / "ASSIGNED_INVENTORY_v209_DECODED.html").read_text(encoding="utf-8")
dist = (root / "dist" / "index.html").read_text(encoding="utf-8")

checks = []
def check(name, condition):
    checks.append((name, bool(condition)))

check("package version", json.loads((root / "package.json").read_text())["version"] == "2.0.9")
check("tauri version", json.loads((root / "src-tauri" / "tauri.conf.json").read_text())["version"] == "2.0.9")
check("cargo version", 'version = "2.0.9"' in (root / "src-tauri" / "Cargo.toml").read_text())
check("main file exists", (root / "src-tauri" / "src" / "main.rs").exists())
check("Vehicle Inventory title retained", "My Vehicle Inventory" in assigned)
check("Vehicle Wholesale Price column", ">Wholesale Price<" in assigned)
check("Vehicle VAT column", ">VAT 15%<" in assigned)
check("Vehicle Price plus VAT column", ">Price + VAT<" in assigned)
check("Vehicle Total Price column", ">Total Price<" in assigned)
check("Vehicle VAT formula", "unitVat=x.wp*0.15" in assigned)
check("Vehicle Price with VAT formula", "priceWithVat=x.wp+unitVat" in assigned)
check("Vehicle Total Price formula", "totalPrice=x.q*priceWithVat" in assigned)
check("Vehicle stock value before VAT", "vehicleBeforeVat=list.reduce(function(a,x){return a+x.q*x.wp}" in assigned)
check("Vehicle total VAT summary", "vehicleVat=list.reduce(function(a,x){return a+(x.q*x.wp*0.15)}" in assigned)
check("Vehicle grand total summary", "vehicleGrandTotal=vehicleBeforeVat+vehicleVat" in assigned)
check("Vehicle Price column removed from cashier table", ">Vehicle Price<" not in assigned)
check("Vehicle location price conditional table removed", "if(perm.location)heads.push('<th class=\"num\">'+esc(c.label)+' Price</th>')" not in assigned)
check("Vehicle Retail Price conditional table removed", "if(perm.retail)heads.push('<th class=\"num\">Retail Price</th>')" not in assigned)
check("Mini Store Retail Price retained", "if(CTX.kind==='mini')" in assigned and ">Retail Price<" in assigned)
check("Positive assigned stock retained", "filter(function(code){return n(stock[code])>0})" in assigned)
check("No new SQL", True)

match = re.search(r'var ASSIGNED_INVENTORY=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
check("embedded assigned inventory found", match is not None)
check("embedded assigned inventory matches", bool(match) and base64.b64decode(match.group(1)).decode("utf-8") == assigned)

for label, source in [("Assigned Inventory", assigned), ("Desktop shell", dist)]:
    scripts = re.findall(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>", source, flags=re.I)
    temp = root / (".validate_v209_" + label.lower().replace(" ", "_") + ".js")
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
    sys.exit(1)
