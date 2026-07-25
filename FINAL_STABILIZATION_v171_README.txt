Nabd Al Gharb Desktop v1.7.1 - Final Stabilization

Completed static release checks:
- Main Warehouse, Vehicle Stock and Mini Store module references are present.
- Vehicle and Mini Store cloud/backup storage keys are present.
- Mini Store price permission key is now included in instant cloud synchronization.
- Mini Store price permission key remains included in full cloud backup/sync.
- JavaScript syntax validation passed for all inline application scripts.
- package.json and tauri.conf.json versions match at 1.7.1.
- Existing Tauri updater plugin configuration was preserved.

Important release blocker:
The updater endpoint and public key are still placeholder values in src-tauri/tauri.conf.json. A real GitHub release endpoint and Tauri updater public key must be inserted before auto-update can work in production.

Build limitation in this environment:
Rust/Cargo and a Windows build environment are not installed here, so MSI/NSIS installer generation and real Windows runtime testing were not performed. Build and test the installer on the development Windows computer before distributing it.
