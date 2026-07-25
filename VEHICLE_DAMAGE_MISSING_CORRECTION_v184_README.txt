Nabd Al-Gharb Desktop v1.8.4
Damage and Missing Entry Correction

Completed:
1. Added Correct and Cancel actions for active damaged and missing Vehicle Stock records.
2. Admin can correct product, adjustment type, quantity, reason and remarks.
3. Original posted records are never deleted or overwritten.
4. A VCR correction reference is created and linked to the original VDM or VMS reference.
5. Example: original quantity 80 corrected to 8 restores 72 pieces automatically.
6. Product changes restore the original product and deduct the corrected product quantity.
7. Cancel Original Entry creates a VCN reference and restores the full original quantity.
8. Cashiers can submit a VCRQ correction request without changing stock.
9. Admin can review, approve or reject cashier correction requests.
10. Approved requests apply the stock correction and create a VCR document.
11. Rejected requests do not change stock.
12. History shows Active, Pending, Corrected, Cancelled, Approved and Rejected status.
13. Settlement totals ignore corrected or cancelled original entries and use the approved corrected values.
14. Correction, cancellation and request references open in the existing company PDF layout.
15. Main Warehouse remains unchanged for damage, missing, correction and cancellation actions.
16. No new Supabase SQL is required because the existing synced movement history key stores these records.

Safety rule:
Only Admin applies final corrections or cancellations. A cashier can request a correction for an assigned vehicle.
