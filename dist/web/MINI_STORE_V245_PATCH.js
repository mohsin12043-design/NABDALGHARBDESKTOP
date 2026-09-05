(function (global) {
  'use strict';

  global.nagMiniStoreV245Install = function (api) {
    if (!api || !api.$ || !api.oldRenderReport) return null;

    var BASELINE_KEY = 'nag_mini_store_settlement_baseline_v1';
    var OWNER_KEY = 'nag_sales_return_owners_v1';
    var RETURN_CACHE_KEY = 'nag_mini_store_sales_returns_cache_v245';
    var CLOUD_KEYS = [
      'nag_mini_stores_v1',
      'nag_mini_store_inventory_v1',
      'nag_mini_store_transfers_v1',
      'nag_mini_store_sales_v1',
      'nag_mini_store_bill_counter_v1',
      'nag_mini_store_bill_history_v1',
      'nag_mini_store_prices_v1',
      OWNER_KEY,
      BASELINE_KEY
    ];
    var cloudReady = false;
    var cloudFailed = false;
    var cloudLoading = false;
    var cloudPromise = null;
    var salesReturns = [];

    function deep(value, fallback) {
      var out = value;
      for (var i = 0; i < 3 && typeof out === 'string'; i += 1) {
        try { out = JSON.parse(out); } catch (e) { break; }
      }
      return out == null ? fallback : out;
    }

    function arrayValue(value) {
      value = deep(value, []);
      return Array.isArray(value) ? value : [];
    }

    salesReturns = arrayValue(localStorage.getItem(RETURN_CACHE_KEY));

    function cloudClient() {
      try {
        if (global.parent && global.parent !== global && global.parent.sb) return global.parent.sb;
      } catch (e) {}
      try { return global.sb || null; } catch (e2) { return null; }
    }

    function applyCloudValue(key, value) {
      if (value == null) return;
      var raw = typeof value === 'string' ? value : JSON.stringify(value);
      if (localStorage.getItem(key) !== raw) localStorage.setItem(key, raw);
    }

    function waitForClient(attempt) {
      var client = cloudClient();
      if (client) return Promise.resolve(client);
      if (attempt >= 20) return Promise.reject(new Error('Cloud connection is not ready'));
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(waitForClient(attempt + 1)); }, 150);
      });
    }

    function hydrate(force) {
      if (cloudLoading) return cloudPromise;
      if (cloudReady && !force) return Promise.resolve(true);
      cloudLoading = true;
      cloudFailed = false;
      cloudPromise = waitForClient(0).then(function (client) {
        return Promise.all([
          client.from('app_data').select('key,value').in('key', CLOUD_KEYS),
          client.from('sales_returns').select('*')
        ]);
      }).then(function (results) {
        var appResult = results[0] || {};
        var returnResult = results[1] || {};
        if (appResult.error) throw appResult.error;
        if (returnResult.error) throw returnResult.error;
        (appResult.data || []).forEach(function (row) {
          if (row && row.key) applyCloudValue(String(row.key), row.value);
        });
        salesReturns = Array.isArray(returnResult.data) ? returnResult.data : [];
        localStorage.setItem(RETURN_CACHE_KEY, JSON.stringify(salesReturns));
        cloudReady = true;
        cloudFailed = false;
        return true;
      }).catch(function () {
        cloudReady = false;
        cloudFailed = true;
        return false;
      }).then(function (ok) {
        cloudLoading = false;
        setTimeout(function () { try { api.render(); } catch (e) {} }, 0);
        return ok;
      });
      return cloudPromise;
    }

    function reportLabel(type) {
      if (type === 'customer_return') return 'Customer Sale Return';
      if (type === 'mini_store_sale') return 'Mini Store Sale';
      return api.oldReportTypeLabel(type);
    }

    function renderReport() {
      var summaryEl = api.$('reportSummary');
      var rowsEl = api.$('reportRows');
      if (!cloudReady && !cloudFailed) {
        if (summaryEl) summaryEl.innerHTML = '<div class="metric warnmetric" style="grid-column:1/-1">Cloud Reconciliation<b style="font-size:14px">Syncing complete Mini Store history...</b></div>';
        if (rowsEl) rowsEl.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#777;padding:24px">Loading Mini Store movements, retail sales and customer returns from cloud.</td></tr>';
        hydrate(false);
        return;
      }

      var storeId = api.$('reportMiniStore').value;
      if (!storeId) {
        api.oldRenderReport();
        return;
      }
      if (!api.miniStoreAllowed(storeId)) {
        api.status('This Mini Store is not assigned to your account.', 'err');
        return;
      }

      var storeMap = {};
      api.miniStores().forEach(function (store) { storeMap[String(store.id)] = store; });
      var selectedStore = storeMap[String(storeId)] || {};
      var users = deep(localStorage.getItem('nag_users'), []);
      if (!Array.isArray(users)) users = [];
      var cashier = users.find(function (user) {
        return String(user.u || '') === String(selectedStore.cashier_u || '');
      }) || {};
      var productMap = {};
      api.products().forEach(function (product) {
        productMap[api.productCode(product)] = api.productName(product);
      });

      var sales = api.miniStoreSales().filter(function (record) {
        var state = String(record.payment_status || record.status || '').toLowerCase();
        return !record.reversed && !record.voided && state !== 'voided' &&
          String(record.miniStore_id || record.mini_store_id || record.source_id || record.stock_source_id || '') === String(storeId);
      });
      var moves = api.ensureMovementReferences().filter(function (record) {
        return api.movementMiniStoreId(record) === String(storeId);
      });
      var saleRefs = {};
      var soldQty = 0;
      var salesTotal = 0;
      var cashSales = 0;
      var creditSales = 0;
      var paidAmount = 0;
      var pendingAmount = 0;
      var rows = [];
      var financialGroups = {};

      sales.forEach(function (sale, saleIndex) {
        var normalized = api.normalizeMiniStoreSale(sale);
        var invoiceRef = String((normalized && normalized.no) || sale.invoice_no || sale.no || sale.reference_no || sale.id || ('sale_' + saleIndex));
        var saleKey = api.miniStoreSaleKey(sale) || invoiceRef;
        var invoiceType = normalized && normalized.invoice_type === 'cash' ? 'cash' : 'credit';
        var paymentStatus = normalized && normalized.payment_status === 'paid' ? 'paid' : 'pending';
        var group = financialGroups[invoiceRef];
        saleRefs[invoiceRef] = true;
        if (!group) {
          group = financialGroups[invoiceRef] = { invoice_type: invoiceType, payment_status: paymentStatus, total: 0, has_invoice_total: false };
        }
        var hasInvoiceTotal = sale.grand_total != null || sale.grandTotal != null || sale.invoice_total != null || sale.total_amount != null;
        if (hasInvoiceTotal) {
          var explicit = api.n(sale.grand_total != null ? sale.grand_total : (sale.grandTotal != null ? sale.grandTotal : (sale.invoice_total != null ? sale.invoice_total : sale.total_amount)));
          if (!group.has_invoice_total || explicit > group.total) group.total = explicit;
          group.has_invoice_total = true;
        } else if (!group.has_invoice_total) {
          group.total += api.n(normalized && normalized.total);
        }
        if (invoiceType === 'cash') group.invoice_type = 'cash';
        if (paymentStatus === 'paid') group.payment_status = 'paid';
        var lines = normalized && Array.isArray(normalized.lines) ? normalized.lines : [];
        if (lines.length) {
          lines.forEach(function (line) {
            var quantity = api.n(line.qty);
            var code = line.code || '';
            soldQty += quantity;
            rows.push({
              ts: normalized.ts || normalized.date,
              ref: invoiceRef,
              sale_id: saleKey,
              code: code,
              product_name: productMap[code] || line.name || '',
              qty: quantity,
              type: invoiceType === 'cash' ? 'cash_sale' : 'credit_sale',
              status: paymentStatus,
              amount: api.n(line.total)
            });
          });
        } else {
          var quantity = api.n(sale.qty || sale.quantity);
          var code = sale.code || sale.product_code || '';
          soldQty += quantity;
          rows.push({
            ts: sale.ts || sale.created_at || sale.date,
            ref: invoiceRef,
            sale_id: saleKey,
            code: code,
            product_name: productMap[code] || sale.product_name || '',
            qty: quantity,
            type: invoiceType === 'cash' ? 'cash_sale' : 'credit_sale',
            status: paymentStatus,
            amount: api.n(sale.total || sale.amount)
          });
        }
      });

      Object.keys(financialGroups).forEach(function (key) {
        var group = financialGroups[key];
        var amount = api.n(group.total);
        salesTotal += amount;
        if (group.invoice_type === 'cash') cashSales += amount;
        else creditSales += amount;
        if (group.payment_status === 'paid') paidAmount += amount;
        else pendingAmount += amount;
      });

      var issued = 0;
      var returnedToWarehouse = 0;
      var damaged = 0;
      var missing = 0;
      var correctionCount = 0;
      var correctedQty = 0;
      moves.forEach(function (movement) {
        var quantity = api.n(movement.qty);
        var state = api.movementStatus(movement);
        var invoiceRef = String(movement.invoice_no || movement.sale_invoice_no || movement.bill_no || '');
        if (movement.type === 'mini_store_sale') {
          if (!saleRefs[invoiceRef]) {
            soldQty += quantity;
            rows.push({
              ts: movement.ts,
              ref: invoiceRef || movement.reference_no || movement.id || '',
              movement_id: movement.id || '',
              code: api.movementProductCode(movement),
              product_name: productMap[api.movementProductCode(movement)] || '',
              qty: quantity,
              type: 'mini_store_sale',
              status: state,
              amount: quantity * api.n(movement.unit_price || movement.price || movement.miniStore_price)
            });
          }
          return;
        }
        if (movement.type === 'damage' || movement.type === 'missing') {
          if (state === 'active') {
            if (movement.type === 'damage') damaged += quantity;
            else missing += quantity;
          }
        } else if (movement.type === 'correction' && state === 'active') {
          var effectiveType = movement.corrected_type || 'correction';
          var effectiveQty = api.n(movement.corrected_qty);
          correctionCount += 1;
          correctedQty += Math.abs(api.n(movement.original_qty) - effectiveQty);
          if (effectiveType === 'damage') damaged += effectiveQty;
          if (effectiveType === 'missing') missing += effectiveQty;
        } else if (movement.type === 'cancellation' && state === 'active') {
          correctionCount += 1;
          correctedQty += api.n(movement.original_qty || movement.qty);
        } else {
          if (movement.type === 'issue') issued += quantity;
          if (movement.type === 'return') returnedToWarehouse += quantity;
        }
        rows.push({
          ts: movement.ts,
          ref: movement.reference_no || movement.id || '',
          movement_id: movement.id || '',
          code: api.movementProductCode(movement),
          product_name: productMap[api.movementProductCode(movement)] || '',
          qty: api.adjustmentDisplayQty(movement),
          type: movement.type || 'movement',
          status: state,
          amount: 0
        });
      });

      var owners = deep(localStorage.getItem(OWNER_KEY), {});
      if (!owners || typeof owners !== 'object' || Array.isArray(owners)) owners = {};
      var customerReturnQty = 0;
      salesReturns.forEach(function (saleReturn) {
        var returnNo = String(saleReturn.return_no || saleReturn.reference_no || saleReturn.id || '');
        var owner = owners[returnNo] || {};
        var destinationKind = String(owner.destination_kind || saleReturn.destination_kind || saleReturn.destination_type || '').toLowerCase();
        var destinationId = String(owner.destination_id || saleReturn.destination_id || saleReturn.mini_store_id || '');
        if ((destinationKind !== 'mini' && destinationKind !== 'mini_store') || destinationId !== String(storeId)) return;
        var items = arrayValue(saleReturn.items || saleReturn.lines || saleReturn.rows || []);
        items.forEach(function (item) {
          var condition = String(item.condition || 'saleable').toLowerCase();
          if (condition && condition !== 'saleable') return;
          var quantity = api.n(item.qty != null ? item.qty : item.quantity);
          var code = item.code || item.product_code || item.sku || '';
          var price = api.n(item.unit_price != null ? item.unit_price : item.price);
          customerReturnQty += quantity;
          rows.push({
            ts: saleReturn.created_at || saleReturn.return_date || saleReturn.date,
            ref: returnNo,
            code: code,
            product_name: productMap[code] || item.desc || item.name || item.product_name || '',
            qty: quantity,
            type: 'customer_return',
            status: 'saleable',
            amount: quantity * price
          });
        });
      });

      var stock = api.inv()[storeId] || {};
      var currentStock = Object.keys(stock).reduce(function (total, code) {
        return total + api.n(stock[code]);
      }, 0);
      var knownNet = issued + customerReturnQty - soldQty - returnedToWarehouse - damaged - missing;
      var baselines = deep(localStorage.getItem(BASELINE_KEY), {});
      if (!baselines || typeof baselines !== 'object' || Array.isArray(baselines)) baselines = {};
      var baseline = baselines[storeId];
      if (!baseline && cloudReady) {
        baseline = {
          opening_qty: currentStock - knownNet,
          captured_at: new Date().toISOString(),
          current_at_capture: currentStock,
          known_net_at_capture: knownNet,
          source: 'complete_cloud_reconciliation_v245'
        };
        baselines[storeId] = baseline;
        api.save(BASELINE_KEY, baselines);
      }
      var openingQty = baseline ? api.n(baseline.opening_qty) : 0;
      var expectedStock = openingQty + knownNet;
      var stockDifference = currentStock - expectedStock;
      var differenceClass = Math.abs(stockDifference) < 0.005 ? 'good' : 'bad';
      rows.sort(function (a, b) { return String(b.ts || '').localeCompare(String(a.ts || '')); });

      var cloudCard = cloudReady
        ? '<div class="metric good" style="grid-column:1/-1">Cloud Reconciliation<b style="font-size:14px">Complete Mini Store movements, retail sales and customer returns synced</b></div>'
        : '<div class="metric warnmetric" style="grid-column:1/-1">Cloud Reconciliation<b style="font-size:14px">Offline data only. Refresh when internet is available.</b></div>';
      summaryEl.innerHTML = cloudCard +
        '<div class="metric">Opening Baseline<b>' + api.money(openingQty) + '</b></div>' +
        '<div class="metric">Transferred In<b>' + api.money(issued) + '</b></div>' +
        '<div class="metric">Sold<b>' + api.money(soldQty) + '</b></div>' +
        '<div class="metric good">Customer Sale Returns<b>' + api.money(customerReturnQty) + '</b></div>' +
        '<div class="metric">Returned to Warehouse<b>' + api.money(returnedToWarehouse) + '</b></div>' +
        '<div class="metric">Damaged<b>' + api.money(damaged) + '</b></div>' +
        '<div class="metric">Missing<b>' + api.money(missing) + '</b></div>' +
        '<div class="metric">Correction Entries<b>' + api.money(correctionCount) + '</b></div>' +
        '<div class="metric">Corrected Quantity<b>' + api.money(correctedQty) + '</b></div>' +
        '<div class="metric">Current Remaining<b>' + api.money(currentStock) + '</b></div>' +
        '<div class="metric money">Sales Total<b>' + api.money(salesTotal) + ' SAR</b></div>' +
        '<div class="metric money good">Cash Sales<b>' + api.money(cashSales) + ' SAR</b></div>' +
        '<div class="metric money">Credit Sales<b>' + api.money(creditSales) + ' SAR</b></div>' +
        '<div class="metric money good">Paid Amount<b>' + api.money(paidAmount) + ' SAR</b></div>' +
        '<div class="metric money warnmetric">Pending Amount<b>' + api.money(pendingAmount) + ' SAR</b></div>' +
        '<div class="metric ' + differenceClass + '">Stock Difference<b>' + api.money(stockDifference) + '</b></div>';

      rowsEl.innerHTML = rows.length ? rows.slice(0, 400).map(function (row) {
        var refHtml = row.sale_id
          ? '<button class="refbtn" data-sale-id="' + api.esc(row.sale_id) + '">' + api.esc(row.ref) + '</button>'
          : (row.movement_id
            ? '<button class="refbtn" data-movement-id="' + api.esc(row.movement_id) + '">' + api.esc(row.ref) + '</button>'
            : api.esc(row.ref));
        return '<tr><td>' + api.esc(row.ts ? new Date(row.ts).toLocaleString() : '') + '</td><td>' + refHtml + '</td><td>' +
          api.esc((row.code || '') + (row.product_name ? ' - ' + row.product_name : '')) + '</td><td class="num">' + api.money(row.qty) +
          '</td><td><span class="pill">' + api.esc(reportLabel(row.type)) + '</span></td><td><span class="small">' +
          api.esc(String(row.status || 'active')) + '</span></td><td class="num">' + api.money(row.amount) + '</td></tr>';
      }).join('') : '<tr><td colspan="7" style="text-align:center;color:#888;padding:24px">No Mini Store activity recorded.</td></tr>';

      var activeSession = api.session() || {};
      api.setCurrentSettlementReport({
        mini_store_id: storeId,
        mini_store_name: selectedStore.name || '',
        cashier_name: cashier.n || selectedStore.cashier_u || '',
        generated_at: new Date().toISOString(),
        generated_by: activeSession.n || activeSession.u || 'Admin',
        summary: {
          opening_qty: openingQty,
          issued: issued,
          sold_qty: soldQty,
          customer_return_qty: customerReturnQty,
          returned: returnedToWarehouse,
          damaged: damaged,
          missing: missing,
          correction_count: correctionCount,
          corrected_qty: correctedQty,
          current_stock: currentStock,
          expected_stock: expectedStock,
          stock_difference: stockDifference,
          sales_total: salesTotal,
          cash_sales: cashSales,
          credit_sales: creditSales,
          paid_amount: paidAmount,
          pending_amount: pendingAmount
        },
        rows: rows.slice(0, 400)
      });
    }

    function movementDocumentHtml(record) {
      var html = api.oldMovementDocumentHtml(record);
      if (!record || record.type === 'correction' || record.type === 'cancellation' || record.type === 'correction_request') return html;
      var product = api.products().find(function (item) { return api.productCode(item) === String(record.code || ''); }) || {};
      var price = api.n(record.unit_price != null ? record.unit_price : (record.price != null ? record.price : (record.miniStore_price != null ? record.miniStore_price : (api.vprices()[record.code] || api.miniStorePriceFor(product, record.code)))));
      var amount = record.amount != null ? api.n(record.amount) : api.n(record.qty) * price;
      var vat = amount * 0.15;
      var total = amount + vat;
      var table = '<table style="width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed"><thead><tr style="background:#9E7415;color:#fff">' +
        '<th style="padding:7px;text-align:left">Product</th><th style="padding:7px;text-align:right">Qty</th><th style="padding:7px;text-align:right">Unit Price</th>' +
        '<th style="padding:7px;text-align:right">Amount Before VAT</th><th style="padding:7px;text-align:right">VAT 15%</th><th style="padding:7px;text-align:right">Total With VAT</th>' +
        '</tr></thead><tbody><tr><td style="padding:8px;border-bottom:1px solid #ddd"><b>' + api.esc(record.code || '') + '</b><br>' + api.esc(api.productName(product)) + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">' + api.money(record.qty) + '</td>' +
        '<td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">' + api.money(price) + ' SAR</td>' +
        '<td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">' + api.money(amount) + ' SAR</td>' +
        '<td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">' + api.money(vat) + ' SAR</td>' +
        '<td style="padding:8px;border-bottom:1px solid #ddd;text-align:right"><b>' + api.money(total) + ' SAR</b></td></tr></tbody></table>';
      return html.replace(/<table style="width:100%;border-collapse:collapse;font-size:12px"><thead>[\s\S]*?<\/table>/, table);
    }

    function billHtml(data) {
      var html = api.oldBillHtml(data);
      var rows = (data.lines || []).map(function (line, index) {
        var amount = line.total != null ? api.n(line.total) : api.n(line.qty) * api.n(line.price);
        var vat = amount * 0.15;
        var total = amount + vat;
        return '<tr><td class="c">' + (index + 1) + '</td><td><b>' + api.esc(line.code) + '</b></td><td>' + api.esc(line.name) +
          (line.name_ar ? '<span class="desc-ar">' + api.esc(line.name_ar) + '</span>' : '') + '</td><td class="c">' + api.money(line.qty) +
          '</td><td class="r">' + api.money(line.price) + '</td><td class="r">' + api.money(amount) + '</td><td class="r">' + api.money(vat) +
          '</td><td class="r"><b>' + api.money(total) + '</b></td></tr>';
      }).join('');
      var table = '<table class="lines" style="font-size:9px"><thead><tr><th>SN</th><th>Code</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount Before VAT</th><th>VAT 15%</th><th>Total With VAT</th></tr></thead><tbody>' + rows + '</tbody></table>';
      return html.replace(/<table class="lines">[\s\S]*?<\/table>/, table);
    }

    function settlementReportHtml(data) {
      var html = api.oldSettlementReportHtml(data);
      var summary = data.summary || {};
      html = html.replace(/(<div style="background:#f5f6fa;padding:10px;border-radius:7px">Transferred[\s\S]*?<\/div>)/, function (card) {
        return card + '<div style="background:#f5f6fa;padding:10px;border-radius:7px">Opening Baseline<b style="display:block;font-size:17px;color:#1a2b6b">' + api.money(summary.opening_qty) + '</b></div>';
      });
      html = html.replace(/(<div style="background:#f5f6fa;padding:10px;border-radius:7px">Sold[\s\S]*?<\/div>)/, function (card) {
        return card + '<div style="background:#e7f5ea;padding:10px;border-radius:7px">Customer Sale Returns<b style="display:block;font-size:17px;color:#1f7a3d">' + api.money(summary.customer_return_qty) + '</b></div>';
      });
      html = html.replace('>Returned<b', '>Returned to Warehouse<b');
      return html;
    }

    var patch = {
      renderReport: renderReport,
      movementDocumentHtml: movementDocumentHtml,
      billHtml: billHtml,
      settlementReportHtml: settlementReportHtml,
      reportTypeLabel: reportLabel,
      hydrate: hydrate,
      state: function () {
        return { cloudReady: cloudReady, cloudFailed: cloudFailed, cloudLoading: cloudLoading, salesReturns: salesReturns.length };
      }
    };
    global.NAG_MINI_STORE_V245 = patch;
    setTimeout(function () {
      var refresh = api.$('refreshBtn');
      if (refresh) refresh.onclick = function () {
        var summary = api.$('reportSummary');
        if (summary) summary.innerHTML = '<div class="metric warnmetric" style="grid-column:1/-1">Cloud Reconciliation<b style="font-size:14px">Refreshing complete Mini Store history...</b></div>';
        hydrate(true);
      };
    }, 0);
    return patch;
  };
})(window);
