(function (global) {
  'use strict';

  global.nagCentralStockV244Install = function (api) {
    if (!api || !api.oldMovementHtml) return null;

    function movementHtml(data) {
      var html = api.oldMovementHtml(data);
      var price = api.n(data.unit_price != null ? data.unit_price : data.price);
      var amount = data.amount != null ? api.n(data.amount) : api.n(data.qty) * price;
      var vat = amount * 0.15;
      var total = amount + vat;
      var table = '<table class="doc-table gold" style="font-size:10px;table-layout:fixed"><thead><tr>' +
        '<th>Product / المنتج</th><th style="text-align:right">Quantity</th><th style="text-align:right">Unit Price</th>' +
        '<th style="text-align:right">Amount Before VAT</th><th style="text-align:right">VAT 15%</th><th style="text-align:right">Total With VAT</th>' +
        '</tr></thead><tbody><tr><td><b>' + api.esc(data.code) + '</b><br>' + api.esc(data.product_name) +
        (data.product_name_ar ? '<div dir="rtl" class="small">' + api.esc(data.product_name_ar) + '</div>' : '') +
        '</td><td style="text-align:right">' + api.qty(data.qty) + '</td><td style="text-align:right">' + api.money(price) + ' SAR</td>' +
        '<td style="text-align:right">' + api.money(amount) + ' SAR</td><td style="text-align:right">' + api.money(vat) + ' SAR</td>' +
        '<td style="text-align:right"><b>' + api.money(total) + ' SAR</b></td></tr></tbody></table>';
      return html.replace(/<table class="doc-table gold">[\s\S]*?<\/table>/, table);
    }

    var patch = { movementHtml: movementHtml };
    global.NAG_CENTRAL_STOCK_V244 = patch;
    return patch;
  };
})(window);
