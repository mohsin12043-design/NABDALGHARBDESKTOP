NABD AL-GHARB DESKTOP v156 - FOUR MODULES

Added to stable Desktop v155:
1. Employee
2. Salary Slip
3. Advance Slip
4. Commercial Invoice

Salary Slip and Advance Slip retain Company Expenses integration from the stable mobile module logic.
All four modules are admin-only in the desktop home screen.
Existing desktop modules and native print behavior were not changed.

Supabase:
- If HR tables already exist from the mobile application, do not rerun SUPABASE_HR_MODULES.sql.
- If Commercial Invoice table already exists, do not rerun SUPABASE_COMMERCIAL_INVOICE.sql.
- Run only the missing SQL setup files in Supabase SQL Editor.
