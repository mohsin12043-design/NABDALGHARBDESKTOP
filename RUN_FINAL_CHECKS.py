#!/usr/bin/env python3
import base64, json, pathlib, re, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parent
errors=[]; warnings=[]; passed=[]

def ok(x): passed.append(x)
def err(x): errors.append(x)
def warn(x): warnings.append(x)

# Version consistency
try:
    pkg=json.loads((ROOT/'package.json').read_text())
    conf=json.loads((ROOT/'src-tauri/tauri.conf.json').read_text())
    cargo=(ROOT/'src-tauri/Cargo.toml').read_text()
    cm=re.search(r'^version\s*=\s*"([^"]+)"',cargo,re.M)
    versions=[pkg.get('version'),conf.get('version'),cm.group(1) if cm else None]
    if len(set(versions))==1: ok('Version consistency: '+versions[0])
    else: err('Version mismatch: '+repr(versions))
except Exception as e: err('Could not validate versions: '+str(e))

# Required files
required=['dist/index.html','src-tauri/src/main.rs','src-tauri/tauri.conf.json','src-tauri/Cargo.toml','vendor/jspdf.umd.min.js','vendor/html2canvas.min.js']
for f in required:
    if not (ROOT/f).exists(): err('Missing required file: '+f)
if not any(x.startswith('Missing required file') for x in errors): ok('Required application files present')

# Updater readiness
try:
    updater=conf['plugins']['updater']
    endpoint=' '.join(updater.get('endpoints',[])); pub=updater.get('pubkey','')
    if 'REPLACE_' in endpoint or 'REPLACE_' in pub:
        warn('Auto updater is not production-configured: GitHub endpoint and/or signing public key are placeholders')
    else: ok('Auto updater production values are configured')
except Exception as e: err('Updater configuration missing or invalid: '+str(e))

# Decode custom modules and JS syntax-check inline scripts
index=(ROOT/'dist/index.html').read_text(encoding='utf-8')
required_modules=['VEHICLE_STOCK','MINI_STORE','STOCK_CONTROL']
found={}
for m in re.finditer(r'var\s+([A-Z][A-Z0-9_]*)=b64utf8\("([A-Za-z0-9+/=]+)"\);',index):
    try: found[m.group(1)]=base64.b64decode(m.group(2)).decode('utf-8')
    except Exception as e: err('Could not decode module '+m.group(1)+': '+str(e))
for name in required_modules:
    if name in found: ok(name+' module embedded')
    else: err(name+' module missing')

script_count=0
for name,html in found.items():
    for i,s in enumerate(re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',html,re.I)):
        if not s.strip(): continue
        script_count += 1
        temp=ROOT/f'.check_{name}_{i}.js'; temp.write_text(s,encoding='utf-8')
        try:
            r=subprocess.run(['node','--check',str(temp)],capture_output=True,text=True)
            if r.returncode: err(f'JavaScript syntax error in {name} script {i}: {r.stderr.strip()}')
        except FileNotFoundError: warn('Node.js not installed; JavaScript syntax checks skipped'); break
        finally:
            try: temp.unlink()
            except: pass
if not any('JavaScript syntax error' in x for x in errors): ok(f'Inline JavaScript syntax passed for {script_count} scripts')

# Important storage/sync keys
keys=['nag_vehicles_v1','nag_vehicle_prices_v1','nag_vehicle_sales_v1','nag_mini_stores_v1','nag_mini_store_inventory_v1','nag_mini_store_sales_v1','nag_mini_store_price_permissions_v1']
for k in keys:
    if k not in index: err('Required data/sync key missing: '+k)
if not any('data/sync key missing' in x for x in errors): ok('Vehicle and Mini Store data/sync keys present')

print('NABD AL-GHARB FINAL SOURCE CHECK')
print('='*38)
for x in passed: print('[PASS]',x)
for x in warnings: print('[WARN]',x)
for x in errors: print('[FAIL]',x)
print(f'\nResult: {len(passed)} passed, {len(warnings)} warnings, {len(errors)} failures')
sys.exit(1 if errors else 0)
