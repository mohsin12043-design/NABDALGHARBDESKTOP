$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $root "src-tauri\tauri.conf.json"
$packagePath = Join-Path $root "package.json"
$cargoPath = Join-Path $root "src-tauri\Cargo.toml"
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$package = Get-Content $packagePath -Raw | ConvertFrom-Json
$cargo = Get-Content $cargoPath -Raw
$cargoVersion = [regex]::Match($cargo, '(?ms)^\[package\].*?^version\s*=\s*"([^"]+)"').Groups[1].Value
$errors = @()
if ($config.version -ne $package.version -or $config.version -ne $cargoVersion) {
  $errors += "Version mismatch: tauri=$($config.version), package=$($package.version), cargo=$cargoVersion"
}
$pubkey = [string]$config.plugins.updater.pubkey
$endpoint = [string]$config.plugins.updater.endpoints[0]
if ([string]::IsNullOrWhiteSpace($pubkey) -or $pubkey -match 'REPLACE_') {
  $errors += "Updater public key is missing or still a placeholder."
}
if ([string]::IsNullOrWhiteSpace($endpoint) -or $endpoint -match 'REPLACE_' -or $endpoint -notmatch '^https://github\.com/.+/.+/releases/latest/download/latest\.json$') {
  $errors += "Updater endpoint is missing, invalid, or still a placeholder."
}
if (-not (Test-Path (Join-Path $root '.github\workflows\release-desktop.yml'))) {
  $errors += "GitHub release workflow is missing."
}
if ($errors.Count -gt 0) {
  Write-Host "RELEASE CONFIG NOT READY" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  exit 1
}
Write-Host "Release configuration is ready for version $($config.version)." -ForegroundColor Green
