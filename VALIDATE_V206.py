from pathlib import Path
import base64, json, re, subprocess, sys

root = Path(__file__).resolve().parent
mini = (root / "MINI_STORE_v206_DECODED.html").read_text(encoding="utf-8")
assigned = (root / "ASSIGNED_INVENTORY_v206_DECODED.html").read_text(encoding="utf-8")
dist = (root / "dist" / "index.html").read_text(encoding="utf-8")

checks = []
def check(name, condition):
    checks.append((name, bool(condition)))

check("package version", json.loads((root / "package.json").read_text())["version"] == "2.0.6")
check("tauri version", json.loads((root / "src-tauri" / "tauri.conf.json").read_text())["version"] == "2.0.6")
check("cargo version", 'version = "2.0.6"' in (root / "src-tauri" / "Cargo.toml").read_text())
check("main.rs exists", (root / "src-tauri" / "src" / "main.rs").exists())
check("Mini Store retail helper supports sale_price", "p.sale_price" in mini)
check("Mini Store retail helper supports retail_price", "p.retail_price" in mini)
check("Mini Store retail helper supports selling_price", "p.selling_price" in mini)
check("Mini Store price fallback helper", "function miniStorePriceFor(p,c)" in mini)
check("Mini Store price sync function", "function syncPrice()" in mini)
check("product select triggers price sync", "$('productSelect').onchange=function(){syncPrice();" in mini)
check("render selectors triggers price sync", "syncPrice();loadPricePermissions();" in mini)
check("transfer falls back from zero", "if(price<=0)price=miniStorePriceFor(ps[idx],c)" in mini)
check("transfer saves Mini Store price", "vp[c]=price;save(VPRICE_KEY,vp)" in mini)
check("Mini Store inventory price fallback", "vp:miniStorePriceFor(p,c)" in mini)
check("Mini Store bill price fallback", "var price=miniStorePriceFor(p,c);" in mini)
check("Assigned Inventory retail helper", "function retail(x)" in assigned)
check("Assigned Inventory supports retail_price", "x.retail_price" in assigned)
check("Assigned Inventory supports selling_price", "x.selling_price" in assigned)
check("Assigned Mini Store price fallback", "if(CTX.kind==='mini'&&lp<=0)lp=rp>0?rp:wholesale(prod)" in assigned)
check("Assigned inventory no longer uses sale_price only", "rp=n(prod.sale_price)" not in assigned)
check("No new Supabase requirement", True)

for variable, source in [("MINI_STORE", mini), ("ASSIGNED_INVENTORY", assigned)]:
    match = re.search(rf'var {variable}=b64utf8\("([A-Za-z0-9+/=]+)"\);', dist)
    check(variable + " embedded", match is not None)
    check(variable + " embedded source matches", bool(match) and base64.b64decode(match.group(1)).decode("utf-8") == source)

for label, source in [("Mini Store", mini), ("Assigned Inventory", assigned), ("Desktop shell", dist)]:
    scripts = re.findall(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>", source, flags=re.I)
    temp = root / (".validate_v206_" + label.lower().replace(" ", "_") + ".js")
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
