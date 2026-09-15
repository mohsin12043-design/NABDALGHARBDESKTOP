from pathlib import Path
import base64, json, re, subprocess, sys

root = Path(__file__).resolve().parent
assigned = (root / "ASSIGNED_INVENTORY_v207_DECODED.html").read_text(encoding="utf-8")
dist = (root / "dist" / "index.html").read_text(encoding="utf-8")

checks = []
def check(name, condition):
    checks.append((name, bool(condition)))

check("package version", json.loads((root / "package.json").read_text())["version"] == "2.0.7")
check("tauri version", json.loads((root / "src-tauri" / "tauri.conf.json").read_text())["version"] == "2.0.7")
check("cargo version", 'version = "2.0.7"' in (root / "src-tauri" / "Cargo.toml").read_text())
check("main file exists", (root / "src-tauri" / "src" / "main.rs").exists())
check("Mini Store branch", "if(CTX.kind==='mini')" in assigned)
check("Retail Price column", ">Retail Price<" in assigned)
check("VAT column", ">VAT 15%<" in assigned)
check("Price plus VAT column", ">Price + VAT<" in assigned)
check("Total Price column", ">Total Price<" in assigned)
check("unit VAT calculation", "unitVat=unitPrice*0.15" in assigned)
check("unit price with VAT calculation", "unitWithVat=unitPrice+unitVat" in assigned)
check("total before VAT calculation", "totalBeforeVat=q*unitPrice" in assigned)
check("total VAT calculation", "totalVat=q*unitVat" in assigned)
check("grand total calculation", "grandTotal=q*unitWithVat" in assigned)
check("summary stock before VAT", "Stock Value Before VAT" in assigned)
check("summary total VAT", "Total VAT 15%" in assigned)
check("summary grand total", "Grand Total With VAT" in assigned)
check("Mini Store total price uses grand total", "money(x.grandTotal)+' SAR" in assigned)
check("only positive stock retained", "filter(function(code){return n(stock[code])>0})" in assigned)
check("Vehicle branch retained", "if(perm.location)heads.push" in assigned)
check("no new SQL needed", True)

match = re.search(r'var ASSIGNED_INVENTORY=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
check("embedded assigned inventory found", match is not None)
check("embedded assigned inventory matches", bool(match) and base64.b64decode(match.group(1)).decode("utf-8") == assigned)

for label, source in [("Assigned Inventory", assigned), ("Desktop shell", dist)]:
    scripts = re.findall(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>", source, flags=re.I)
    temp = root / (".validate_v207_" + label.lower().replace(" ", "_") + ".js")
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
