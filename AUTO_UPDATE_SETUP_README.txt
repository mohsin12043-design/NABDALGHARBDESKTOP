NABD AL-GHARB DESKTOP AUTO UPDATE SETUP
=======================================

What has been added
-------------------
1. Tauri 2 updater plugin in Rust.
2. Automatic update check after app startup.
3. A manual "Check for Updates" button in Admin Settings.
4. Passive Windows installation, so the old app does not need to be uninstalled.
5. Updater artifacts and signature generation enabled.

Important: complete these two values before building
----------------------------------------------------
Open src-tauri/tauri.conf.json and replace:

REPLACE_GITHUB_OWNER
REPLACE_GITHUB_REPO
REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY

Example endpoint:
https://github.com/your-name/your-repository/releases/latest/download/latest.json

One-time signing key setup on Windows PowerShell
------------------------------------------------
Run inside the project folder:

npm install
npm run tauri signer generate -- -w "$HOME/.tauri/nabd-al-gharb.key"

Keep the private key file safe. Never upload it to GitHub or place it inside the app ZIP.
Copy the generated PUBLIC key text into tauri.conf.json under plugins.updater.pubkey.

Before every release
--------------------
1. Increase the same version in all three files:
   package.json
   src-tauri/Cargo.toml
   src-tauri/tauri.conf.json

2. In PowerShell set the signing key:

$env:TAURI_SIGNING_PRIVATE_KEY="$HOME/.tauri/nabd-al-gharb.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD="YOUR_KEY_PASSWORD"

3. Build on Windows:

npm run tauri build

4. Create a GitHub Release with the same version tag, for example v1.0.1.
5. Upload the generated NSIS installer, its .sig file, and latest.json.

Recommended release automation
------------------------------
Use the included .github/workflows/release-desktop.yml workflow after adding these GitHub repository secrets:

TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD

The workflow builds the Windows app and publishes updater files when a tag beginning with v is pushed.

Data safety
-----------
The application identifier remains com.nabdalgharb.desktop. Do not change it.
Normal in-place updates replace application files but preserve WebView localStorage and Supabase cloud data.
Create a full backup before the first updater-enabled installation and test it on one non-production PC first.

First deployment rule
---------------------
Existing PCs do not yet contain updater code. Install this updater-enabled build manually once on every PC, over the existing installation. Do not uninstall first. All later versions can update through GitHub.
