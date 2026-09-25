NABD AL-GHARB DESKTOP UPDATE

Scoped changes

1. Inventory
   Purchase Unit Price now displays Purchase Rate plus 15 percent VAT.
   Example: 100.00 purchase rate displays as 115.00 SAR.
   Inventory screen, PDF report, and total purchase stock value use the same calculation.
   The stored purchase rate remains unchanged.

2. Company Expenses
   Added Edit and Delete buttons to every history row.
   Edit loads the saved date, time, category, description, amount, payment method, and existing receipt.
   Updating without choosing a new receipt keeps the old attachment.
   Delete requires confirmation and refreshes history, totals, and charts after success.

Integrity checks

23 embedded modules were found before and after this update.
Only INVENTORY and EXPENSES embedded payloads changed.
Existing final source checks passed: 58 passed, 0 warnings, 0 failures.
JavaScript syntax checks passed for both changed modules.
