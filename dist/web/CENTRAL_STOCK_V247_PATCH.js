(function (global) {
  'use strict';

  function addPdfStyle() {
    if (document.getElementById('nag-central-stock-v247-style')) return;
    var style = document.createElement('style');
    style.id = 'nag-central-stock-v247-style';
    style.textContent = [
      '#centralV247PdfHost{font-family:Arial,sans-serif}',
      '#centralV247PdfHost .central-v247-paper{width:190mm!important;max-width:none!important;margin:0!important;padding:5.5mm!important;border:0!important}',
      '#centralV247PdfHost .central-v247-paper .company-head{display:grid!important;grid-template-columns:1fr 92px 1fr!important;gap:8px!important;align-items:start!important;padding-bottom:7px!important}',
      '#centralV247PdfHost .central-v247-paper .company-head>div:first-child{font-size:8px!important;line-height:1.28!important;text-align:left!important}',
      '#centralV247PdfHost .central-v247-paper .company-head>div:nth-child(2){text-align:center!important}',
      '#centralV247PdfHost .central-v247-paper .company-head>div:last-child{font-size:8px!important;line-height:1.35!important;text-align:right!important}',
      '#centralV247PdfHost .central-v247-paper .company-head b{font-size:10.5px!important}',
      '#centralV247PdfHost .central-v247-paper .company-head img{max-width:76px!important;max-height:58px!important}',
      '#centralV247PdfHost .central-v247-paper .doc-title{margin:7px 0 6px!important}',
      '#centralV247PdfHost .central-v247-paper .doc-title .en{font-size:16px!important}',
      '#centralV247PdfHost .central-v247-paper .doc-title .ar{font-size:11px!important;margin-top:2px!important}',
      '#centralV247PdfHost .central-v247-paper .info-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:5px!important;margin-bottom:7px!important}',
      '#centralV247PdfHost .central-v247-paper .info-grid[style]{margin-top:7px!important}',
      '#centralV247PdfHost .central-v247-paper .info-box{padding:5px!important;border-radius:5px!important;font-size:8.5px!important;line-height:1.28!important}',
      '#centralV247PdfHost .central-v247-paper .doc-table{font-size:8.3px!important}',
      '#centralV247PdfHost .central-v247-paper .doc-table th{padding:5px!important}',
      '#centralV247PdfHost .central-v247-paper .doc-table td{padding:5px!important}',
      '#centralV247PdfHost .central-v247-paper .doc-table[style]{margin-top:7px!important}',
      '#centralV247PdfHost .central-v247-paper .totals{width:270px!important;margin-top:5px!important;font-size:8.8px!important}',
      '#centralV247PdfHost .central-v247-paper .totals td{padding:3px 5px!important}',
      '#centralV247PdfHost .central-v247-paper .totals .grand td{font-size:11px!important}',
      '#centralV247PdfHost .central-v247-paper .signature-row{margin-top:23px!important;font-size:8.5px!important}',
      '#centralV247PdfHost .central-v247-paper .signature{padding-top:4px!important}',
      '#centralV247PdfHost .central-v247-paper .company-footer{margin-top:9px!important;padding-top:5px!important;font-size:7.5px!important}',
      '#centralV247PdfHost .central-v247-paper .evidence{max-width:250px!important;max-height:120px!important}',
      '#centralV247PdfHost .central-v247-report .report-summary{display:grid!important;grid-template-columns:repeat(5,1fr)!important;gap:4px!important;margin-bottom:7px!important}',
      '#centralV247PdfHost .central-v247-report .report-summary .box{padding:4px!important;font-size:7.4px!important}',
      '#centralV247PdfHost .central-v247-report .report-summary .box b{font-size:10px!important;margin-top:1px!important}',
      '#centralV247PdfHost .central-v247-report .doc-table{font-size:7.4px!important}',
      '#centralV247PdfHost .central-v247-report .doc-table th,#centralV247PdfHost .central-v247-report .doc-table td{padding:4px!important}'
    ].join('');
    document.head.appendChild(style);
  }

  global.nagCentralStockV247Install = function (api) {
    if (!api || !api.oldMovementInfo || !api.oldMovementHtml) return null;
    addPdfStyle();

    function number(v) {
      var x = Number(v);
      return isFinite(x) ? x : 0;
    }

    function read(key, fallback) {
      try {
        if (api.j) return api.j(key, fallback);
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    }

    function array(key) {
      var value = read(key, []);
      return Array.isArray(value) ? value : [];
    }

    function object(key) {
      var value = read(key, {});
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function has(row, key) {
      return !!row && Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== '';
    }

    function productFor(code) {
      var products = array('nag_products_v1');
      for (var i = 0; i < products.length; i++) {
        if (String(products[i].code || products[i].product_code || '') === String(code || '')) return products[i];
      }
      return {};
    }

    function mappedPrice(map, locationId, code) {
      if (!map || typeof map !== 'object') return 0;
      var direct = number(map[code]);
      if (direct) return direct;
      var location = map[locationId];
      if (location && typeof location === 'object') {
        var nested = number(location[code]);
        if (nested) return nested;
      }
      return 0;
    }

    function priceFor(row, locType, locationId, code) {
      var explicit = locType === 'vehicle'
        ? number(row.vehicle_price || row.vehiclePrice || row.price || row.unit_price)
        : number(row.miniStore_price || row.mini_store_price || row.retail_price || row.price || row.unit_price);
      if (explicit) return explicit;
      var product = productFor(code);
      if (locType === 'vehicle') {
        return mappedPrice(object('nag_vehicle_prices_v1'), locationId, code) ||
          number(product.vehicle_price || product.vehiclePrice || product.wholesalePrice || product.wholesale_price || product.wholesale || product.price);
      }
      return mappedPrice(object('nag_mini_store_prices_v1'), locationId, code) ||
        number(product.miniStore_price || product.mini_store_price || product.retailPrice || product.retail_price || product.sale_price || product.price);
    }

    function rowCode(row) {
      return String(row && (row.corrected_code || row.code || row.product_code || row.item_code) || '');
    }

    function rowLocation(row, locType) {
      if (!row) return '';
      return locType === 'vehicle'
        ? String(row.vehicle_id || row.location_id || row.destination || row.source || '')
        : String(row.miniStore_id || row.mini_store_id || row.location_id || row.destination || row.source || '');
    }

    function rowQty(row) {
      return number(row && (row.corrected_qty != null ? row.corrected_qty : (row.qty != null ? row.qty : row.quantity)));
    }

    function effectiveType(row) {
      var type = String(row && row.type || '').toLowerCase();
      if (type === 'correction' && row.corrected_type) type = String(row.corrected_type).toLowerCase();
      return type;
    }

    function locationEffect(row) {
      var type = effectiveType(row);
      var qty = rowQty(row);
      if (type === 'issue' || type === 'customer_sale_return' || type === 'sale_return' || type === 'return_from_customer') return qty;
      if (type === 'return' || type === 'vehicle_sale' || type === 'mini_store_sale' || type === 'sale' || type === 'damage' || type === 'missing') return -qty;
      return 0;
    }

    function warehouseEffect(row) {
      var type = effectiveType(row);
      var qty = rowQty(row);
      if (type === 'issue') return -qty;
      if (type === 'return') return qty;
      return 0;
    }

    function rowTime(row) {
      var value = String(row && (row.ts || row.created_at || row.date || row.updated_at) || '');
      var parsed = Date.parse(value);
      return isFinite(parsed) ? parsed : 0;
    }

    function sameRecord(a, b) {
      if (a === b) return true;
      var aid = String(a && a.id || '');
      var bid = String(b && b.id || '');
      if (aid && bid && aid === bid) return true;
      var ar = String(a && (a.reference_no || a.reference || a.ref) || '');
      var br = String(b && (b.reference_no || b.reference || b.ref) || '');
      return !!ar && ar === br && rowCode(a) === rowCode(b);
    }

    function currentLocationBalance(locType, locationId, code) {
      var inventory = object(locType === 'vehicle' ? 'nag_location_inventory_v1' : 'nag_mini_store_inventory_v1');
      var bucket = inventory[locationId];
      if (bucket && typeof bucket === 'object') return number(bucket[code]);
      return number(inventory[code]);
    }

    function allTransfers(locType) {
      return array(locType === 'vehicle' ? 'nag_stock_transfers_v1' : 'nag_mini_store_transfers_v1');
    }

    function laterLocationEffect(row, locType, locationId, code) {
      var rows = allTransfers(locType);
      var targetTime = rowTime(row);
      var seenTarget = false;
      var total = 0;
      for (var i = 0; i < rows.length; i++) {
        var item = rows[i];
        if (sameRecord(item, row)) {
          seenTarget = true;
          continue;
        }
        if (rowCode(item) !== code || rowLocation(item, locType) !== locationId) continue;
        if ((targetTime && rowTime(item) > targetTime) || (!targetTime && seenTarget)) total += locationEffect(item);
      }
      return total;
    }

    function laterWarehouseEffect(row, code) {
      var rows = allTransfers('vehicle').concat(allTransfers('mini'));
      var targetTime = rowTime(row);
      var total = 0;
      for (var i = 0; i < rows.length; i++) {
        var item = rows[i];
        if (sameRecord(item, row) || rowCode(item) !== code) continue;
        if (targetTime && rowTime(item) > targetTime) total += warehouseEffect(item);
      }
      return total;
    }

    function movementInfo(row, locType, maps) {
      var data = api.oldMovementInfo(row, locType, maps);
      var price = priceFor(row, locType, data.location_id, data.code);
      if (!price) price = number(data.price);
      data.price = price;
      data.amount = number(row.amount) || (number(data.qty) * price);

      var beforeKey = locType === 'vehicle' ? 'vehicle_before' : 'miniStore_before';
      var afterKey = locType === 'vehicle' ? 'vehicle_after' : 'miniStore_after';
      var hasBefore = has(row, beforeKey) || has(row, 'store_before');
      var hasAfter = has(row, afterKey) || has(row, 'store_after');
      if (!hasBefore || !hasAfter) {
        var after = currentLocationBalance(locType, data.location_id, data.code) - laterLocationEffect(row, locType, data.location_id, data.code);
        var before = after - locationEffect(row);
        if (!hasBefore) data.before = before;
        if (!hasAfter) data.after = after;
      }

      var hasWarehouseBefore = has(row, 'warehouse_before');
      var hasWarehouseAfter = has(row, 'warehouse_after');
      if (!hasWarehouseBefore || !hasWarehouseAfter) {
        var product = productFor(data.code);
        var warehouseAfter = number(product.qty != null ? product.qty : product.quantity) - laterWarehouseEffect(row, data.code);
        var warehouseBefore = warehouseAfter - warehouseEffect(row);
        if (!hasWarehouseBefore) data.warehouse_before = warehouseBefore;
        if (!hasWarehouseAfter) data.warehouse_after = warehouseAfter;
      }
      return data;
    }

    function productTable(data) {
      var amount = number(data.amount);
      var vat = amount * 0.15;
      var total = amount + vat;
      return '<table class="doc-table gold central-v247-product"><thead><tr>' +
        '<th>Product / المنتج</th><th style="text-align:right">Quantity</th><th style="text-align:right">Unit Price</th>' +
        '<th style="text-align:right">Amount Before VAT</th><th style="text-align:right">VAT 15%</th><th style="text-align:right">Total With VAT</th>' +
        '</tr></thead><tbody><tr><td><b>' + api.esc(data.code) + '</b><br>' + api.esc(data.product_name) +
        (data.product_name_ar ? '<div dir="rtl" class="small">' + api.esc(data.product_name_ar) + '</div>' : '') +
        '</td><td style="text-align:right">' + api.qty(data.qty) + '</td><td style="text-align:right">' + api.money(data.price) + ' SAR</td>' +
        '<td style="text-align:right">' + api.money(amount) + ' SAR</td><td style="text-align:right">' + api.money(vat) + ' SAR</td>' +
        '<td style="text-align:right"><b>' + api.money(total) + ' SAR</b></td></tr></tbody></table>';
    }

    function markPaper(html, type) {
      var extra = 'central-v247-paper central-v247-' + type;
      return String(html || '').replace(/class=(["'])([^"']*\bcompany-paper\b[^"']*)\1/, function (whole, quote, names) {
        if (names.indexOf('central-v247-paper') < 0) names += ' ' + extra;
        else if (names.indexOf('central-v247-' + type) < 0) names += ' central-v247-' + type;
        return 'class=' + quote + names + quote;
      });
    }

    function reportHtml() {
      return markPaper(api.oldReportHtml ? api.oldReportHtml() : '', 'report');
    }

    function invoiceHtml(data) {
      return markPaper(api.oldInvoiceHtml ? api.oldInvoiceHtml(data) : '', 'invoice');
    }

    function movementHtml(data) {
      var html = api.oldMovementHtml(data);
      html = markPaper(html, 'movement');
      html = html.replace(/<table class=["']doc-table gold["'][^>]*>[\s\S]*?<\/table>/, productTable(data));
      return html;
    }

    function createMovementPdf(action) {
      var html = api.documentHtml ? api.documentHtml() : '';
      if (html.indexOf('central-v247-paper') < 0) {
        return action === 'print' ? api.oldPrintDocument() : api.oldSaveDocumentPdf();
      }
      var filename = api.documentFileName ? api.documentFileName() : 'Central_Stock_Control_Document.pdf';
      var host = document.createElement('div');
      host.id = 'centralV247PdfHost';
      host.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;background:#fff;z-index:-1;opacity:1;pointer-events:none;overflow:visible';
      host.innerHTML = html;
      document.body.appendChild(host);
      var multiPage = false;
      api.status(action === 'print' ? 'Creating print PDF...' : 'Creating PDF...', 'ok');
      var ready = global.nagV164EnsurePdfLibs ? global.nagV164EnsurePdfLibs() : Promise.resolve(!!(global.jspdf && global.jspdf.jsPDF && global.html2canvas));
      return ready.then(function (ok) {
        if (!ok) throw new Error('PDF engine not loaded');
        var target = host.querySelector('.central-v247-paper') || host.firstElementChild || host;
        multiPage = target.classList && target.classList.contains('central-v247-report');
        var height = Math.max(target.scrollHeight || 0, 1200);
        var renderScale = multiPage ? Math.max(0.72, Math.min(1.5, 28000 / height)) : 2;
        return global.html2canvas(target, {
          scale: renderScale,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1120,
          windowHeight: Math.max(target.scrollHeight || 0, 1200)
        });
      }).then(function (canvas) {
        if (!canvas || canvas.width < 40 || canvas.height < 40) throw new Error('blank PDF canvas');
        var pdf = new global.jspdf.jsPDF({unit: 'pt', format: 'a4'});
        var pageWidth = pdf.internal.pageSize.getWidth();
        var pageHeight = pdf.internal.pageSize.getHeight();
        var margin = 18;
        var imageWidth = pageWidth - (margin * 2);
        if (multiPage) {
          var printableHeight = pageHeight - (margin * 2);
          var scaleToPdf = imageWidth / canvas.width;
          var sliceHeight = Math.max(1, Math.floor(printableHeight / scaleToPdf));
          var top = 0;
          var page = 0;
          while (top < canvas.height) {
            var currentHeight = Math.min(sliceHeight, canvas.height - top);
            var slice = document.createElement('canvas');
            slice.width = canvas.width;
            slice.height = currentHeight;
            var context = slice.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, slice.width, slice.height);
            context.drawImage(canvas, 0, top, canvas.width, currentHeight, 0, 0, canvas.width, currentHeight);
            if (page > 0) pdf.addPage();
            pdf.addImage(slice.toDataURL('image/jpeg', 0.94), 'JPEG', margin, margin, imageWidth, currentHeight * scaleToPdf);
            top += currentHeight;
            page += 1;
          }
        } else {
          var imageHeight = canvas.height * imageWidth / canvas.width;
          if (imageHeight > pageHeight - (margin * 2)) {
            imageHeight = pageHeight - (margin * 2);
            imageWidth = canvas.width * imageHeight / canvas.height;
          }
          var x = (pageWidth - imageWidth) / 2;
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', x, margin, imageWidth, imageHeight);
        }
        host.remove();
        if (action === 'print') {
          if (global.nagV164PrintPdf) global.nagV164PrintPdf(pdf, filename, 'Print request sent.');
          else if (global.openPdfForPrint) global.openPdfForPrint(pdf, filename);
          else global.open(pdf.output('bloburl'), '_blank');
          api.status('Print request sent.', 'ok');
        } else {
          if (global.nagSaveAndAutoOpenPdfV151) global.nagSaveAndAutoOpenPdfV151(pdf, filename, 'PDF saved and opened.');
          else if (global.nagV164SaveOpenPdf) global.nagV164SaveOpenPdf(pdf, filename, 'PDF saved and opened.');
          else global.open(pdf.output('bloburl'), '_blank');
          api.status('PDF saved and opened.', 'ok');
        }
        return true;
      }).catch(function (error) {
        try { host.remove(); } catch (e) {}
        api.status('Could not create PDF: ' + (error && error.message ? error.message : error), 'err');
        return false;
      });
    }

    var patch = {
      movementInfo: movementInfo,
      reportHtml: reportHtml,
      invoiceHtml: invoiceHtml,
      movementHtml: movementHtml,
      saveDocumentPdf: function () { return createMovementPdf('open'); },
      printDocument: function () { return createMovementPdf('print'); }
    };
    global.NAG_CENTRAL_STOCK_V247 = patch;
    return patch;
  };
})(window);
