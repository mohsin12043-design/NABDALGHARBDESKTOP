Nabd Al-Gharb Desktop v161

Fix scope:
- No module HTML or business logic changed from v160.
- Bundled jsPDF and html2canvas locally inside dist/vendor for packaged Tauri builds.
- Also included vendor copies at project root for standalone HTML testing.

This fixes PDF generation in these four new modules after Windows software build:
1. Employee
2. Salary Slip
3. Advance Slip
4. Commercial Invoice

PDF generation and exact PDF-layout printing now work offline and no longer depend on CDN/internet access.
All existing modules remain untouched.
