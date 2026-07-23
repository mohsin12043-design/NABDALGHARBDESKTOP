NABD AL-GHARB DESKTOP v1.7.2 - FINAL RELEASE PREPARATION

Completed in this package:
1. Synchronized application version across package.json, tauri.conf.json and Cargo.toml.
2. Preserved Vehicle Stock, Mini Store, invoices, reports, permissions and sync changes from v1.7.1.
3. Preserved the Tauri updater plugin, updater artifact generation and GitHub release workflow.
4. Added VALIDATE_RELEASE_CONFIG.ps1 to block production release when updater values are placeholders or versions do not match.

Still required before a production installer/update can be published:
1. Replace REPLACE_GITHUB_OWNER and REPLACE_GITHUB_REPO in src-tauri/tauri.conf.json.
2. Generate a Tauri signing key and place its PUBLIC key in plugins.updater.pubkey.
3. Add the PRIVATE key to the GitHub repository secret TAURI_SIGNING_PRIVATE_KEY.
4. Add the key password to TAURI_SIGNING_PRIVATE_KEY_PASSWORD if a password is used.
5. Run VALIDATE_RELEASE_CONFIG.ps1 on Windows.
6. Commit the project, push a version tag such as v1.7.2, and let release-desktop.yml build the NSIS installer, signature and latest.json.
7. Install the updater-enabled build manually over the current installation once on one test PC. Do not uninstall first.
8. Verify existing customers, stock, invoices and settings remain intact, then test update to a newer test version.

Important:
The current updater endpoint and public key remain placeholders because real GitHub repository details and signing credentials were not provided. The application features are included, but production auto update cannot work until those values are supplied.
