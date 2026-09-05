NABD AL-GHARB DESKTOP v1.7.5
TESTING STOCK MODE

Implemented
1. Vehicle Stock and Mini Store now accept the full transfer quantity even when Main Warehouse stock is lower.
   Example: Warehouse 5, transfer 30, Warehouse becomes -25 and the destination receives 30.
2. Testing Auto-Create can create a missing typed item with starting quantity 0.
3. Inventory contains two admin settings:
   - Auto-create missing items
   - Allow negative Main Warehouse stock
4. Both settings are ON by default for testing and sync through Supabase app_data.
5. When testing is finished, turn Auto-create OFF in Inventory. Negative stock can be left ON or turned OFF separately.
6. Transfer history stores warehouse_before, warehouse_after and auto_created fields.
7. Supabase products quantity is updated and missing test items can be inserted automatically.

Supabase
Run SUPABASE_TESTING_STOCK_MODE_v175.sql once. This removes a qty_on_hand nonnegative check if one exists and updates stock RPC functions for backward compatibility.

Version
Desktop version is 1.7.5.
