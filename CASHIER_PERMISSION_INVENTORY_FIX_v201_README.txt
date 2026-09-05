NABD AL-GHARB DESKTOP v2.0.1

CASHIER MODULE VISIBILITY AND ASSIGNED INVENTORY FIX

Completed:
1. A cashier sees only modules explicitly selected by Admin.
2. Admin-only modules are completely hidden from cashiers instead of showing an Admin-only message.
3. Dashboard, Central Stock Control, Employees, Khurooj, Salary, Advance, Commercial Invoice, Settings, Cashier Panel, Cashier Report and Discount Requests remain Admin-only.
4. Central Stock Control is removed from the cashier permission list because the module is Admin-only.
5. Permission checks are applied before a launcher module can open.
6. Empty permissions are supported, so a new cashier can see no business modules until Admin grants access.
7. New cashier accounts start with no module permissions.
8. Vehicle Inventory shows only positive-quantity products in the cashier's assigned vehicle.
9. Mini Store Inventory shows only positive-quantity products in the cashier's assigned Mini Store.
10. Zero, negative and other-location products are hidden from cashier inventory views.
11. Inventory card title automatically changes for Vehicle, Mini Store or dual assignment.
12. Admin retains complete access to every module and inventory location.

No new Supabase SQL is required.
Windows installer was not built. Continue remaining module work and build once at the end.
