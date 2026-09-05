NABD AL-GHARB DESKTOP v2.0.0

EMPLOYEE DRIVING LICENSE AND SAVE FIX

Completed:
1. Driving License Number is included in Add Employee and Edit Employee.
2. Driving License Expiry date is included.
3. License number is included in employee search and employee table.
4. Employee PDF and print report include License Number and Expiry.
5. The generated Supabase ID is no longer sent during employee insert.
6. Existing employee edits now use UPDATE by ID instead of UPSERT.
7. New employees use INSERT without ID, allowing Supabase to generate it automatically.
8. Legacy HR fields are kept compatible with the current Employee module.
9. Duplicate Employee Code and missing database fields show clearer error messages.
10. Save button is protected against duplicate clicks.

Required Supabase step:
Run SUPABASE_EMPLOYEE_SAVE_FIX_v200.sql once in Supabase SQL Editor before final testing.

Cause of the screenshot error:
The old code used UPSERT and included the existing ID while editing. Your Supabase ID column is generated automatically, so PostgreSQL rejected a non-default ID value. The new code separates INSERT and UPDATE and does not change the generated ID.

Windows installer was not built.
