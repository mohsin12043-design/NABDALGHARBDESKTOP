Nabd Al-Gharb Desktop v1.8.2
Vehicle Stock Return - Module 5

Completed:
1. Added a dedicated Return Vehicle Stock to Main Warehouse section.
2. Vehicle and product selectors are limited by the signed-in user's assigned vehicle access.
3. Available Vehicle Quantity loads automatically after product selection.
4. Return Quantity defaults to the full available balance and remains editable for partial returns.
5. Added return reasons and optional remarks.
6. Return submission reduces Vehicle Stock and increases Main Warehouse stock.
7. Supabase stock increment message is sent through the existing stock RPC bridge.
8. Every return receives a VRT reference number with user and timestamp.
9. Vehicle and Main Warehouse before and after balances are stored in movement history.
10. The company movement document opens automatically after a successful return.
11. Return references remain clickable in Vehicle History and Settlement Report for Print or Save PDF.
12. Inventory-only cashier mode cannot access the return section.
13. No new Supabase SQL is required.

Next module:
Vehicle Damaged and Missing Stock entry with clear actions and optional evidence attachment.
