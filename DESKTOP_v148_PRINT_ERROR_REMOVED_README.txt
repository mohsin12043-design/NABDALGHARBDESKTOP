Desktop v148 print error removed

Base file: NabdAlGharbDesktop_NativePrint_v145_tax_invoice_bottom_print.zip

Fix details:
- Removed old PDF blob/window.open print helper scripts from all embedded modules.
- Removed the v146/v147 print pollution risk.
- Print now uses clean HTML layout only, matching the approved PDF layout.
- Script tags are stripped from the print document so JavaScript code cannot appear under the layout.
- Specific PDF-first modules patched to print captured layout HTML: Cash Receipt, Tax Invoice, Customer Ledger, Sales Report, Vendor Statement.
- Other report modules already print their PDF layout HTML and now use the clean iframe print engine.
- Generate PDF buttons still download/save PDF files normally.
- v144 Customer Ledger fields and Company Mobile Number setting are preserved.
- v145 Tax Invoice bottom Print button is preserved.
