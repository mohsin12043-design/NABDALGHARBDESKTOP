Nabd Al-Gharb Desktop - Vehicle Stock Phase 1

Added:
1. Separate Vehicle Stock module on the home screen.
2. Create multiple vehicle stock locations.
3. Assign a cashier to each vehicle.
4. Separate Vehicle Price per product.
5. Transfer stock from Main Warehouse to a vehicle.
6. Main Warehouse quantity reduces on transfer.
7. Supabase decrement_stock RPC is called for database consistency.
8. Current vehicle inventory shows quantity, vehicle price, wholesale price and value.
9. Transfer history records date, vehicle, product, quantity and user.
10. New vehicle data keys are included in existing cloud sync and backup flow.

Auto Update Safety:
- src-tauri updater configuration and updater Rust code were not changed.
- Existing updater placeholders remain exactly as supplied.
- This phase changes the frontend module only.

New synced data keys:
- nag_vehicle_prices_v1
- nag_vehicles_v1
- nag_location_inventory_v1
- nag_stock_transfers_v1

Next phase:
- Vehicle cashier inventory restriction
- Vehicle customer wholesale sale deduction
- Stock return/replenishment
- One-click vehicle issue invoice and PDF
