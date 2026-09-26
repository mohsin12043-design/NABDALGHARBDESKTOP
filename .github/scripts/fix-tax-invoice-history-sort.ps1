param(
  [string]$IndexPath = (Join-Path $PSScriptRoot '..\..\dist\index.html')
)

$ErrorActionPreference = 'Stop'
$IndexPath = [IO.Path]::GetFullPath($IndexPath)
$html = [IO.File]::ReadAllText($IndexPath)
$modulePattern = '(?<prefix>(?:var |,)\s*INV=b64utf8\(")(?<data>[^"]+)(?<suffix>"\))'
$moduleMatch = [regex]::Match($html, $modulePattern)
if (-not $moduleMatch.Success) { throw 'Embedded Tax Invoice module was not found.' }

$module = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($moduleMatch.Groups['data'].Value))
if ($module.Contains('function historyDateTime(rec)') -and $module.Contains('loadHistory().slice().sort(')) {
  Write-Output 'Tax Invoice history is already sorted newest first.'
  exit 0
}

$oldSort = 'function renderHistory\(filter\)\{\s*var hist=loadHistory\(\)\.slice\(\)\.reverse\(\);'
$newSort = @'
function historyDateTime(rec){
    rec=rec||{};
    var raw=String(rec.date||'').trim(),date=null,m=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m){var y=+m[1],mo=+m[2]-1,dy=+m[3],check=new Date(Date.UTC(y,mo,dy));if(check.getUTCFullYear()===y&&check.getUTCMonth()===mo&&check.getUTCDate()===dy)date=check;}
    else if(raw){var parsed=Date.parse(raw);if(!isNaN(parsed))date=new Date(parsed);}
    var time=String(rec.time||'').trim(),tm=time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if(date&&tm){var hh=+tm[1],mm=+tm[2],ss=+(tm[3]||0),ampm=(tm[4]||'').toUpperCase();if(mm<60&&ss<60&&hh<=23){if(ampm){if(hh<1||hh>12)return date.getTime();hh=(hh%12)+(ampm==='PM'?12:0);}date.setUTCHours(hh,mm,ss,0);}}
    if(date)return date.getTime();
    var saved=Date.parse(String(rec.savedAt||''));return isNaN(saved)?0:saved;
  }
  function renderHistory(filter){
    var hist=loadHistory().slice().sort(function(a,b){var ta=historyDateTime(a),tb=historyDateTime(b);if(ta!==tb)return tb-ta;var na=String(a&&a.no||'').match(/(\d+)$/),nb=String(b&&b.no||'').match(/(\d+)$/);if(na&&nb&&+na[1]!==+nb[1])return +nb[1]-+na[1];var sa=Date.parse(String(a&&a.savedAt||''))||0,sb=Date.parse(String(b&&b.savedAt||''))||0;return sb-sa;});
'@
$updatedModule = [regex]::Replace($module, $oldSort, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newSort.Trim() }, 1)
if ($updatedModule -eq $module) { throw 'The expected previous-invoice reverse-order code was not found.' }

$updatedBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($updatedModule))
$updatedHtml = [regex]::Replace($html, $modulePattern, [System.Text.RegularExpressions.MatchEvaluator]{
  param($m)
  $m.Groups['prefix'].Value + $updatedBase64 + $m.Groups['suffix'].Value
}, 1)
[IO.File]::WriteAllText($IndexPath, $updatedHtml, [Text.UTF8Encoding]::new($false))
Write-Output 'Tax Invoice Previous Invoices now sort by invoice date and time, newest first.'
