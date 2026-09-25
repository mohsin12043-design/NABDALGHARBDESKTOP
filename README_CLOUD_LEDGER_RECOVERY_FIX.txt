Nabd Al-Gharb Desktop v2.1.8 Cloud Ledger Recovery Fix

Problem found
The shared app_data sync was replacing complete ledger and history keys. If the mobile or laptop started with an older local copy, that copy could replace newer rows. Customer Ledger also restored customer names from invoice history but did not always rebuild the missing invoice rows.

Fix included
1. Ledger, invoice history, receipt history, and cashier activity now merge by stable reference instead of replacing the complete array.
2. Cloud pull and realtime updates preserve both local and cloud rows.
3. Customer Ledger repairs missing invoice and receipt rows from saved history when the module opens.
4. Duplicate invoice and receipt rows are prevented by invoice or receipt number.
5. Existing records and customer data are preserved. No reset and no SQL change were used.

Validation
The desktop shell and all 23 embedded modules parse successfully.
