NABD AL-GHARB DESKTOP v2.0.6

MINI STORE RETAIL PRICE FIX

Completed:
1. Selecting a Main Warehouse product now auto-fills Mini Store Price.
2. Existing saved Mini Store Price is used first.
3. When no Mini Store Price exists, Retail Price is used automatically.
4. When Retail Price is unavailable, Wholesale Price is used as the final fallback.
5. Transfer submission cannot save price 0 when a valid Retail Price exists.
6. The transferred price is saved in nag_mini_store_prices_v1.
7. Mohsin's My Mini Store Inventory now reads all supported Retail Price field names.
8. Older Mini Store stock with a missing or zero location price now displays Retail Price instead of 0.
9. Mini Store Stock Inventory uses the same fallback.
10. Mini Store Tax Invoice uses the same non-zero price fallback.
11. The missing syncPrice function was restored, removing the product-selection JavaScript error.

No new Supabase SQL is required.
Windows installer was not built.
