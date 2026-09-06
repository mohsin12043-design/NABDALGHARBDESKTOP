NABD AL-GHARB DESKTOP INVENTORY UPDATE

Inventory Add Product form

1. Purchase Rate Before VAT remains the stored base purchase rate.
2. Purchase Unit Price (+15% VAT) is shown as a separate automatic field.
3. The VAT-inclusive value updates immediately while the purchase rate is entered.
4. Example: Purchase Rate 100.00 displays Purchase Unit Price 115.00.
5. Editing an existing product also loads and calculates its VAT-inclusive unit price.

Validation

The updated Inventory payload is embedded in dist/index.html.
The 100.00 to 115.00 calculation passed a live browser test.
Existing final source checks passed: 58 passed, 0 warnings, 0 failures.
No SQL or database structure change is required.
