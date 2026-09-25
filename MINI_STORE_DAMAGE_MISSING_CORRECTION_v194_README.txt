NABD AL-GHARB DESKTOP v1.9.4
MINI STORE DAMAGE AND MISSING CORRECTION

Added:
1. Admin can correct an active Mini Store damaged or missing entry.
2. Admin can cancel an active Mini Store damaged or missing entry.
3. Cashier can submit a correction request for an assigned Mini Store.
4. Admin can review, approve or reject a pending correction request.
5. Original audit records are never deleted or overwritten.
6. Correcting 80 pieces to 8 restores 72 pieces to Mini Store Stock.
7. A wrong product correction restores the original product and deducts the corrected product.
8. Cancelling an entry restores the full original quantity to Mini Store Stock.
9. Main Warehouse quantity remains unchanged for corrections and cancellations.
10. References:
    MCR for approved or direct correction
    MCN for cancellation
    MCRQ for cashier correction request
11. History includes Status and Action columns.
12. Correction, cancellation and request references open in the company PDF layout.
13. Corrected and cancelled originals are excluded from active damaged and missing totals.
14. Cashier can only request changes for an assigned Mini Store.
15. Existing Vehicle Stock and earlier Mini Store features remain included.

Permissions:
Admin:
- Correct
- Cancel
- Review requests
- Approve or reject requests

Cashier:
- Request Edit only
- No stock change until Admin approval
- Cannot cancel a posted entry

Supabase:
No new SQL is required. The feature uses the existing Mini Store transfer history and inventory storage keys.

Windows installer:
Not built in this environment. Build once through GitHub Actions after all Mini Store modules are complete.
