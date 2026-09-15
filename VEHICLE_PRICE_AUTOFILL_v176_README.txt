NABD AL-GHARB DESKTOP v1.7.6
VEHICLE PRICE AUTO-FILL

CHANGES
1. Inventory now includes a Vehicle Price column.
2. Add Product and Edit Product forms now include Vehicle Price (SAR).
3. Vehicle Price is saved using the existing nag_vehicle_prices_v1 data key.
4. Vehicle Stock automatically fills Vehicle Price when an inventory item is selected.
5. If no Vehicle Price is saved, Vehicle Stock uses Wholesale Price as the fallback.
6. The auto-filled price remains editable inside Vehicle Stock.
7. Inventory Excel export and import now include Vehicle Price.
8. Inventory PDF and print report now include Vehicle Price.
9. Renaming or deleting a product also updates its Vehicle Price mapping.
10. Existing negative stock and testing auto-create features remain unchanged.

HOW TO USE
1. Open Inventory.
2. Add or edit a product.
3. Enter the Vehicle Price and save.
4. Open Vehicle Stock.
5. Select the product.
6. Vehicle Price will appear automatically.

SUPABASE
No new SQL is required for this update. The existing cloud sync configuration already includes nag_vehicle_prices_v1.

BUILD
The source version is 1.7.6. Build the Windows installer through GitHub Actions.
