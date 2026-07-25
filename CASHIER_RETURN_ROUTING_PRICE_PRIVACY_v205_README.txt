NABD AL-GHARB DESKTOP v2.0.5

CASHIER STOCK OPERATIONS, SALES RETURN ROUTING AND VEHICLE PRICE PRIVACY

Completed:
1. Admin permission panel now includes My Vehicle Stock Operations and My Mini Store Stock Operations.
2. Existing assigned cashiers receive the matching operational permission once during migration because older versions did not offer these permission checkboxes.
3. Mohsin can open My Mini Store Stock when the Mini Store operation permission is enabled.
4. Mini Store cashier can record return, damage, missing, billing, settlement and edit requests only for the assigned Mini Store.
5. Vehicle cashier can use the matching operations only for the assigned vehicle.
6. Sales Return now has a Returned Stock Destination field.
7. Mini Store cashier returns automatically go to an assigned Mini Store.
8. Vehicle cashier returns automatically go to an assigned vehicle.
9. A cashier assigned to more than one allowed location can choose only from assigned locations.
10. Admin can choose Main Warehouse, any Vehicle or any Mini Store.
11. Editing a Sales Return adjusts the quantity difference in the saved destination.
12. Changing a return destination removes the old quantity from the old destination and adds the new quantity to the new destination.
13. Sales Return PDF, history, full report and Excel show the stock destination.
14. Vehicle Price is hidden from Main Warehouse Inventory for every cashier.
15. Vehicle Price is also removed from cashier PDF and Excel exports.
16. Vehicle Price remains visible only to Admin.

No new Supabase SQL is required. Sales Return destination metadata is stored in the existing synced sales return ownership data.

Windows installer was not built. Continue remaining module work and install once at the end.
