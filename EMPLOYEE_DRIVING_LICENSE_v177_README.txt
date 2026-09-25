Nabd Al-Gharb Desktop v1.7.7
Employee Driving License Fields

Added:
1. Driving License Number in Add Employee and Edit Employee.
2. Driving License Expiry date.
3. License number included in employee search.
4. Employee table now shows Iqama, Passport and Driving License details.
5. Employee PDF and print report includes license number and expiry date.
6. Safe Supabase migration also fixes the missing department column error and refreshes the schema cache.

Required Supabase step:
Run SUPABASE_EMPLOYEE_DRIVING_LICENSE_v177.sql once in Supabase SQL Editor.
Expected result:
department_ready = true
license_number_ready = true
license_expiry_ready = true
