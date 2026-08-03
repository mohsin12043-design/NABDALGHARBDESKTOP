(function (global) {
  'use strict';

  if (global.__nagTaxLedgerV248Loaded) return;
  global.__nagTaxLedgerV248Loaded = true;

  var HISTORY_KEY = 'nag_invoice_history_v1';
  var LEDGER_KEY = 'nag_ledger_v1';
  var running = false;
  var scheduled = 0;

  function parse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch (e) { return fallback; }
  }

  function normal(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function phone(value) {
    return String(value == null ? '' : value).replace(/\D+/g, '');
  }

  function number(value) {
    var result = Number(value);
    return isFinite(result) ? result : 0;
  }

  function hash(value) {
    var h = 2166136261;
    var text = String(value || '');
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function session() {
    try {
      return (global.parent && global.parent.nagSession) ||
        parse((global.parent && global.parent.localStorage ? global.parent.localStorage : global.localStorage).getItem('nag_session'), {}) || {};
    } catch (e) {
      return parse(global.localStorage.getItem('nag_session'), {}) || {};
    }
  }

  function ownerOf(source) {
    source = source || {};
    return String(source.owner_u || source.cashier_u || source.created_by_user || source.created_by || source.user_u || source.cashier || '').trim();
  }

  function markOwner(target, source) {
    target = target || {};
    source = source || {};
    var current = session();
    var owner = ownerOf(source);
    if (!owner && current.role && current.role !== 'admin') owner = String(current.u || '').trim();
    var cashierName = String(source.cashier_name || source.user_name || (owner ? (current.n || current.u || '') : '')).trim();
    if (owner) {
      target.owner_u = owner;
      target.cashier_u = owner;
      if (cashierName) target.cashier_name = cashierName;
    }
    return target;
  }

  function historyRows(raw) {
    var value = raw;
    for (var i = 0; i < 3 && typeof value === 'string'; i++) value = parse(value, []);
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value.history)) return value.history;
    if (Array.isArray(value.invoices)) return value.invoices;
    if (Array.isArray(value.data)) return value.data;
    return [];
  }

  function invoiceNo(record) {
    return String(record && (record.no || record.invoiceNo || record.invoice_no || record.reference_no) || '').trim();
  }

  function invoiceType(record) {
    var type = normal(record && (record.itype || record.invoice_type || record.type));
    if (type.indexOf('credit') >= 0) return 'credit';
    if (type.indexOf('quote') >= 0 || type.indexOf('quotation') >= 0) return 'quote';
    return 'cash';
  }

  function paymentStatus(record) {
    if (record && record.voided) return 'voided';
    var value = normal(record && (record.paymentStatus || record.payment_status || record.status));
    if (value === 'paid' || value === 'complete' || value === 'completed') return 'paid';
    if (value === 'partial' || value === 'partially paid') return 'partial';
    if (value === 'voided' || value === 'cancelled' || value === 'canceled') return 'voided';
    return 'pending';
  }

  function customerFields(record) {
    return {
      name: String(record.c_name || record.cname || record.customer_name || record.customerName || record.customer || '').trim(),
      mobile: String(record.c_mobile || record.cmobile || record.customer_mobile || record.mobile || record.phone || '').trim(),
      vat: String(record.c_vat || record.customer_vat || record.vat || record.vat_no || '').trim(),
      address: String(record.c_addr || record.customer_address || record.address || '').trim(),
      nationalAddress: String(record.c_natl || record.customer_national || record.national_address || record.nationalAddress || '').trim()
    };
  }

  function normalizeLedger(value) {
    value = value && typeof value === 'object' ? value : {};
    if (!Array.isArray(value.customers)) value.customers = [];
    if (!value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)) value.entries = {};
    if (!value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) value.settings = {};
    return value;
  }

  function findCustomer(ledger, record, fields) {
    var wantedId = String(record.ledgerCustomerId || record.ledger_customer_id || record.customer_id || '').trim();
    if (wantedId) {
      var byId = ledger.customers.find(function (customer) { return String(customer.id || '') === wantedId; });
      if (byId) return byId;
    }
    var wantedName = normal(fields.name);
    var wantedMobile = phone(fields.mobile);
    var wantedVat = normal(fields.vat);
    var result = null;
    if (wantedMobile) result = ledger.customers.find(function (customer) { return phone(customer.mobile || customer.phone) === wantedMobile; }) || null;
    if (!result && wantedVat) result = ledger.customers.find(function (customer) { return normal(customer.vat || customer.vatNumber) === wantedVat; }) || null;
    if (!result && wantedName) {
      result = ledger.customers.find(function (customer) {
        if (normal(customer.name || customer.customer_name) !== wantedName) return false;
        var existingMobile = phone(customer.mobile || customer.phone);
        return !wantedMobile || !existingMobile || wantedMobile === existingMobile;
      }) || null;
    }
    return result;
  }

  function setIfMissing(target, key, value) {
    if (value && !String(target[key] == null ? '' : target[key]).trim()) target[key] = value;
  }

  function ensureCustomer(ledger, record) {
    var fields = customerFields(record);
    if (!fields.name) return null;
    var customer = findCustomer(ledger, record, fields);
    if (!customer) {
      customer = {
        id: 'cloud_c_' + hash(normal(fields.name) + '|' + normal(fields.mobile)),
        name: fields.name,
        mobile: fields.mobile,
        vat: fields.vat,
        address: fields.address,
        nationalAddress: fields.nationalAddress,
        creditLimit: 0,
        creditDays: 0
      };
      markOwner(customer, record);
      ledger.customers.push(customer);
      ledger.entries[customer.id] = [];
    } else {
      setIfMissing(customer, 'mobile', fields.mobile);
      setIfMissing(customer, 'vat', fields.vat);
      setIfMissing(customer, 'address', fields.address);
      setIfMissing(customer, 'nationalAddress', fields.nationalAddress);
      markOwner(customer, record);
    }
    if (!ledger.entries[customer.id]) ledger.entries[customer.id] = [];
    return customer;
  }

  function rowInvoiceNo(row) {
    return String(row && (row.invoiceNo || row.invoice_no) || '').trim();
  }

  function taxRow(row, no) {
    if (rowInvoiceNo(row) !== no) return false;
    var source = normal(row && (row.source || row.transaction_type || row.entry_type));
    var description = normal(row && (row.desc || row.description));
    return source === 'tax_invoice' || source === 'credit_invoice' || source === 'tax invoice' ||
      String(row && row.id || '').indexOf('tax_v248_') === 0 || description.indexOf('tax invoice') === 0 ||
      description.indexOf('credit tax invoice') === 0;
  }

  function removeTaxRows(ledger, no) {
    var preserved = null;
    Object.keys(ledger.entries).forEach(function (customerId) {
      var rows = Array.isArray(ledger.entries[customerId]) ? ledger.entries[customerId] : [];
      var kept = [];
      rows.forEach(function (row) {
        if (taxRow(row, no)) {
          if (!preserved) preserved = row;
        } else {
          kept.push(row);
        }
      });
      ledger.entries[customerId] = kept;
    });
    return preserved;
  }

  function creditAmount(record) {
    return number(record.grand != null ? record.grand : (record.grandTotal != null ? record.grandTotal : (record.grand_total != null ? record.grand_total : record.total)));
  }

  function canonicalEntry(record, customer, previous) {
    var no = invoiceNo(record);
    var entry = previous && typeof previous === 'object' ? previous : {};
    entry.id = entry.id || ('tax_v248_' + hash(ownerOf(record) + '|' + no));
    entry.seq = entry.seq == null ? 0 : entry.seq;
    entry.date = String(record.date || record.invoice_date || record.created_at || record.savedAt || '').slice(0, 10);
    entry.time = String(record.time || '').trim();
    entry.invoiceNo = no;
    entry.due = String(record.due || record.dueDate || record.due_date || '').slice(0, 10);
    entry.receiptNo = '';
    entry.desc = 'Credit Tax Invoice (' + no + ')';
    entry.bill = creditAmount(record);
    entry.recv = 0;
    entry.source = 'tax_invoice';
    entry.sourceVersion = 248;
    entry.source_id = no;
    entry.transaction_type = 'credit_invoice';
    entry.paymentStatus = paymentStatus(record);
    entry.ledgerCustomerId = customer.id;
    markOwner(entry, record);
    return entry;
  }

  function entryOrder(a, b) {
    return String(a.date || '').localeCompare(String(b.date || '')) || number(a.seq) - number(b.seq) || rowInvoiceNo(a).localeCompare(rowInvoiceNo(b));
  }

  function applyPaidStatus(rows, historyMap) {
    var groups = {};
    var order = [];
    var unlinked = 0;
    rows.forEach(function (row) {
      var no = rowInvoiceNo(row);
      var received = number(row.recv != null ? row.recv : row.received);
      if (!no) {
        unlinked += received;
        return;
      }
      if (!groups[no]) {
        groups[no] = {no: no, bill: 0, otherReceived: 0, date: row.date || '', seq: row.seq, canonical: null};
        order.push(groups[no]);
      }
      var group = groups[no];
      group.bill += number(row.bill != null ? row.bill : row.debit);
      if (normal(row.source) === 'tax_invoice' && taxRow(row, no)) group.canonical = row;
      else group.otherReceived += received;
      if (!group.date && row.date) group.date = row.date;
    });
    order.sort(entryOrder);
    order.forEach(function (group) {
      var need = Math.max(0, group.bill - group.otherReceived);
      var allocated = Math.min(need, unlinked);
      unlinked -= allocated;
      if (!group.canonical) return;
      var record = historyMap[group.no];
      var status = paymentStatus(record || group.canonical);
      var target = 0;
      if (status === 'paid') target = Math.max(0, group.bill - group.otherReceived - allocated);
      else if (status === 'partial' && record) {
        var paid = number(record.paidAmount != null ? record.paidAmount : (record.paid_amount != null ? record.paid_amount : record.amount_paid));
        target = Math.max(0, Math.min(group.bill, paid) - group.otherReceived - allocated);
      }
      group.canonical.recv = target;
      group.canonical.paymentStatus = status;
    });
  }

  function syncNow() {
    if (running) return false;
    running = true;
    try {
      var rawHistory = global.localStorage.getItem(HISTORY_KEY);
      var history = historyRows(rawHistory);
      if (!history.length) return false;
      var rawLedger = global.localStorage.getItem(LEDGER_KEY);
      var ledger = normalizeLedger(parse(rawLedger, {}));
      var historyMap = {};
      var historyChanged = false;

      history.forEach(function (record) {
        var no = invoiceNo(record);
        if (!no) return;
        historyMap[no] = record;
        var previous = removeTaxRows(ledger, no);
        if (invoiceType(record) !== 'credit' || paymentStatus(record) === 'voided' || !customerFields(record).name) return;
        var customer = ensureCustomer(ledger, record);
        if (!customer) return;
        var rows = ledger.entries[customer.id];
        var entry = canonicalEntry(record, customer, previous);
        entry.seq = previous && previous.seq != null ? previous.seq : rows.length;
        rows.push(entry);
        if (String(record.ledgerCustomerId || '') !== String(customer.id)) {
          record.ledgerCustomerId = customer.id;
          record.ledger_customer_id = customer.id;
          historyChanged = true;
        }
      });

      Object.keys(ledger.entries).forEach(function (customerId) {
        var rows = Array.isArray(ledger.entries[customerId]) ? ledger.entries[customerId] : [];
        applyPaidStatus(rows, historyMap);
      });

      var nextLedger = JSON.stringify(ledger);
      if (nextLedger !== String(rawLedger || '')) global.localStorage.setItem(LEDGER_KEY, nextLedger);
      if (historyChanged) global.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return nextLedger !== String(rawLedger || '') || historyChanged;
    } catch (error) {
      return false;
    } finally {
      running = false;
    }
  }

  function schedule(delay) {
    clearTimeout(scheduled);
    scheduled = setTimeout(syncNow, delay == null ? 80 : delay);
  }

  global.nagTaxLedgerV248SyncNow = syncNow;
  global.NAG_TAX_LEDGER_V248 = {syncNow: syncNow, version: 248};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { schedule(2200); });
  else schedule(2200);
  global.addEventListener('focus', function () { schedule(120); });
  global.addEventListener('storage', function (event) {
    if (!event || event.key === HISTORY_KEY || event.key === LEDGER_KEY) schedule(120);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(120); });
  setInterval(syncNow, 2500);
})(window);
