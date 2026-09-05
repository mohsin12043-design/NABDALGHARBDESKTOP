NABD AL-GHARB DESKTOP v1.9.8

COMBINED FINAL TEST READY PACKAGE

Included:
1. Complete Vehicle Stock work through v1.8.7.
2. Complete Mini Store work through v1.9.7.
3. Combined source validation for both modules.
4. A practical Windows test checklist.
5. GitHub build workflow for MSI and EXE artifacts.
6. Corrected release workflow with a required version input for manual releases.
7. Manual release no longer uses the branch name main as the release tag.
8. Tauri updater endpoint, public key and signing secret references remain configured.
9. src-tauri/src/main.rs is included and non-empty.
10. No new Supabase SQL is required.

The Windows installer was not compiled in this Linux environment. Use GitHub Actions for the real Windows build, installation test and signed release.
