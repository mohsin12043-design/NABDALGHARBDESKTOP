NABD AL-GHARB DESKTOP v2.0.3

CASHIER ASSIGNED INVENTORY ROUTING FIX

Completed:
1. The cashier Inventory card now opens a dedicated read-only assigned inventory screen.
2. A Mini Store cashier sees only My Mini Store Inventory.
3. A Vehicle cashier sees only My Vehicle Inventory.
4. Full Vehicle Stock and Mini Store Stock modules are Admin-only and are removed from cashier permission choices.
5. Existing old permissions cannot make the full stock modules visible to a cashier.
6. Damage, Missing, Return, Settlement, Billing, History, Setup and Transfer cards cannot appear inside cashier inventory.
7. Only positive quantity products from the cashier assigned location are shown.
8. Assignment matching is case-insensitive and supports older assignment field names.
9. Admin-only modules including Khurooj remain forcibly hidden for cashiers.
10. Main Warehouse Inventory remains separately available only when Admin grants that permission.

No new Supabase SQL is required.
Windows installer was not built.
