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
keys=['nag_vehicles_v1','nag_vehicle_prices_v1','nag_vehicle_sales_v1','nag_mini_stores_v1','nag_mini_store_inventory_v1','nag_mini_store_sales_v1','nag_mini_store_price_permissions_v1','nag_testing_auto_create_items_v1','nag_allow_negative_stock_v1']
for k in keys:
    if k not in index: err('Required data/sync key missing: '+k)
if not any('data/sync key missing' in x for x in errors): ok('Vehicle and Mini Store data/sync keys present')

# Vehicle settlement and Tax Invoice layout v1.8.1
vehicle_html=found.get('VEHICLE_STOCK','')
feature_checks={
    'Settlement auto quantity function':'function syncSettlementQuantity()',
    'Settlement remaining quantity text':'Current remaining vehicle quantity:',
    'Vehicle Tax Invoice title':'TAX INVOICE',
    'Vehicle Cash Invoice option':'<option value="cash">Cash Invoice</option>',
    'Vehicle Credit Invoice option':'<option value="credit" selected>Credit Invoice</option>',
    'Vehicle payment status field':'id="billPaymentStatus"',
    'Vehicle customer VAT field':'id="billCustomerVat"',
    'Vehicle ZATCA QR':'function zatcaB64(d)',
    'Vehicle invoice amount in words':'function amountInWords(value)',
    'Vehicle bill company Tax Invoice CSS':'.billpaper .seller-row',
    'Vehicle bill history persistence':'BILL_HISTORY_KEY',
}
for label,needle in feature_checks.items():
    if needle in vehicle_html: ok(label)
    else: err(label+' missing')
if 'value="quote"' in vehicle_html[vehicle_html.find('id="vehicleBillCard"'):vehicle_html.find('id="vehicleBillPrint"')]:
    err('Quotation option is still present in Vehicle Bill')
else:
    ok('Vehicle Bill has no Quotation option')

# Mini Store settlement auto quantity v1.9.0
mini_html=found.get('MINI_STORE','')
mini_settlement_checks={
    'Mini Store settlement auto quantity function':'function syncSettlementQuantity()',
    'Mini Store available quantity field label':'Available Mini Store Quantity',
    'Mini Store product model label':'Product / Model',
    'Mini Store available quantity help text':'Available in Mini Store:',
    'Mini Store product options show remaining stock':'(Remaining: ',
    'Mini Store quantity maximum follows available stock':"input.max=String(available)",
    'Mini Store partial adjustment guidance':'Change the quantity only for a partial adjustment.',
    'Mini Store product change refreshes quantity':"$('settleProduct').onchange=syncSettlementQuantity",
}
for label,needle in mini_settlement_checks.items():
    if needle in mini_html: ok(label)
    else: err(label+' missing')

# Mini Store Tax Invoice layout v1.9.1
mini_invoice_checks={
    'Mini Store Tax Invoice title':'TAX INVOICE',
    'Mini Store Cash Invoice option':'<option value="cash">Cash Invoice</option>',
    'Mini Store Credit Invoice option':'<option value="credit" selected>Credit Invoice</option>',
    'Mini Store payment status field':'id="billPaymentStatus"',
    'Mini Store customer VAT field':'id="billCustomerVat"',
    'Mini Store ZATCA QR':'function zatcaB64(d)',
    'Mini Store invoice amount in words':'function amountInWords(value)',
    'Mini Store bill company Tax Invoice CSS':'.billpaper .seller-row',
    'Mini Store bill history persistence':'BILL_HISTORY_KEY',
    'Mini Store bill uses assigned cashier':'cashier_name',
    'Mini Store A4 print mode':"printMode('print-mini-store')",
}
for label,needle in mini_invoice_checks.items():
    if needle in mini_html: ok(label)
    else: err(label+' missing')
bill_section=mini_html[mini_html.find('id="miniStoreBillCard"'):mini_html.find('id="miniStoreBillPrint"')]
if 'value="quote"' in bill_section or 'Quotation Invoice' in bill_section:
    err('Quotation option is still present in Mini Store Bill')
else:
    ok('Mini Store Bill has no Quotation option')


# Company PDF layout final consistency v1.8.7
pdf_layout_checks={
    'Movement documents use official A4 paper width':'.movementpaper{width:794px;max-width:794px',
    'Movement documents use official company cream panel':'.movementpaper .company-head',
    'Movement documents use company gold headings':'background:#9E7415;color:#fff',
    'Movement documents include bilingual company footer':'class="document-footer"',
    'Settlement report uses company paper class':'class="movementpaper settlementpaper"',
    'Transfer return damage missing document generator':'function movementDocumentHtml(r)',
    'Correction and cancellation document generator':'function adjustmentAuditDocumentHtml(r)',
    'Settlement PDF generator':'function settlementReportHtml(d)',
    'Official company VAT number':'311157282200003',
    'Official company CR number':'3451102031',
    'Official company national address':'7027457311',
}
for label,needle in pdf_layout_checks.items():
    if needle in vehicle_html: ok(label)
    else: err(label+' missing')

# Existing Tax Invoice vehicle sale stock deduction must remain available.
inv_match=re.search(r'\bINV=b64utf8\("([A-Za-z0-9+/=]+)"\)',index)
if inv_match:
    try:
        tax_html=base64.b64decode(inv_match.group(1)).decode('utf-8')
        for label,needle in {
            'Tax Invoice vehicle source selection':'function selectedVehicleId()',
            'Tax Invoice vehicle stock validation':'function validateLocationStock(t)',
            'Tax Invoice vehicle stock deduction':'function decrementVehicleStockForSale(t)',
            'Tax Invoice vehicle sales history':'nag_vehicle_sales_v1',
            'Tax Invoice Mini Store source selection':'function selectedMiniStoreId()',
            'Tax Invoice Mini Store stock deduction':'function decrementMiniStoreStockForSale(t)',
            'Tax Invoice Mini Store sales history':'nag_mini_store_sales_v1',
        }.items():
            if needle in tax_html: ok(label)
            else: err(label+' missing')
    except Exception as e:
        err('Could not decode Tax Invoice module: '+str(e))
else:
    err('Tax Invoice module missing')

print('NABD AL-GHARB FINAL SOURCE CHECK')
print('='*38)
for x in passed: print('[PASS]',x)
for x in warnings: print('[WARN]',x)
for x in errors: print('[FAIL]',x)
print(f'\nResult: {len(passed)} passed, {len(warnings)} warnings, {len(errors)} failures')
sys.exit(1 if errors else 0)

# Mini Store dedicated warehouse return v1.9.2
mini_return_checks={
    'Mini Store dedicated return card':'id="miniStoreReturnCard"',
    'Mini Store return selector':'id="returnMiniStore"',
    'Mini Store return product selector':'id="returnProduct"',
    'Mini Store return quantity autofill':'function syncReturnQuantity()',
    'Mini Store return product filtering':'function renderReturnProducts()',
    'Mini Store return button':'id="returnBtn"',
    'Mini Store return reason':'id="returnReason"',
    'Mini Store return creates MRT reference':"nextMovementReference('return'",
    'Mini Store return increments warehouse':"action:'increment'",
    'Mini Store inventory-only mode hides return':"showCard('miniStoreReturnCard',false)",
}
for label,needle in mini_return_checks.items():
    if needle in mini_html: ok(label)
    else: err(label+' missing')
