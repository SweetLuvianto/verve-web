# VERVE relay — reads DevBridge (localhost) -> privacy-scrubbed snapshot -> publishes a
# static file to the verve-web-data GitHub Pages repo. One-way OUTWARD push only.
# The DevBridge token is read via DPAPI in-process and NEVER leaves this machine / never
# appears in the published file. Mirrors lib/tt-hovertext.ts + lib/sanitize.ts; the website
# independently re-checks (assertPublishable) as a second net.
#
# Usage:
#   pwsh -File verve-relay.ps1 -Once          # single pass (testing)
#   pwsh -File verve-relay.ps1                 # loop (read ~15s, publish on change / heartbeat)
param(
  [switch]$Once,
  [switch]$SelfTest,
  [int]$IntervalSec = 15,
  [int]$HeartbeatSec = 90,
  [switch]$NoKeepAlive,        # skip the avatar keep-alive teleport (e.g. when push-bridge already does it)
  [int]$KeepAliveCycles = 40,  # at 15s interval => teleport ~every 10 min (dodge idle-logout)
  [string]$KaRegion = "Shelter",
  [double]$KaX = 236, [double]$KaY = 132, [double]$KaZ = 1505,
  [string]$DataRepo = "D:\dev\verve-web-data",
  [string]$VenueId = "shelter",
  [string]$VenueName = "Table & Tales — Shelter",
  [string]$OrderBoard = "TT_OrderBoard_Main",
  [string]$ScoreBoard = "TT_Scoreboard_Main",
  [string]$Slurl = "",
  [string]$Hours = ""
)
$ErrorActionPreference = "SilentlyContinue"

function Now-Iso { (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") }
function Get-Header {
  $sess = Get-Content "$env:LOCALAPPDATA\Verve\FirestormDevBridge\session.json" -Raw | ConvertFrom-Json
  $script:BridgeBase = "http://127.0.0.1:$(if ($sess.bridgePort) { $sess.bridgePort } else { 8797 })"
  $tok = ConvertTo-SecureString $sess.tokenProtected | ConvertFrom-SecureString -AsPlainText
  $h = @{ Authorization = "Bearer $tok" }
  Remove-Variable tok
  return $h
}
function HumanizeEvent($s) {
  if ($s -and $s -cmatch '^[a-z0-9_]+$') {
    return ((($s -replace '_', ' ') -split ' ' | ForEach-Object { if ($_) { $_.Substring(0,1).ToUpper() + $_.Substring(1) } }) -join ' ')
  }
  return $s
}
function ToInt($s) { $d = ($s -replace '[^0-9-]', ''); if ($d -eq '' -or $d -eq '-') { return 0 } else { return [int]$d } }

# --- mirror of lib/sanitize.ts (high-precision; refuse to publish on a hit) ---
function Scan-Forbidden($json) {
  if ($json -match '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') { return 'uuid' }
  if ($json -match 'secondlife\.com/app/agent/' -or $json -match 'secondlife://[^ ]*/agent/') { return 'agent_ref' }
  if ($json -match '(gho_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,})') { return 'token' }
  if ($json -match '(?i)bearer\s+[A-Za-z0-9._\-]{16,}') { return 'bearer' }
  return $null
}

function Parse-Orders($text) {
  $rows = @()
  $lines = $text -split "`n"
  foreach ($l in ($lines | Select-Object -Skip 1)) {
    if ($l -notmatch '\|') { continue }
    $p = $l -split '\s*\|\s*'
    $table = if ($p.Count -gt 1) { $p[1].Trim() } else { '' }
    $dish = if ($p.Count -gt 3) { ($p[3] -replace '_', ' ').Trim() } else { '' }
    $state = if ($p.Count -gt 4) { $p[4].Trim() } else { '' }
    if (-not $table -and -not $dish) { continue }
    $rows += [ordered]@{ table = $table; dish = $dish; state = $state }
  }
  return , $rows
}
function Parse-Score($text) {
  $lines = $text -split "`n"
  $metrics = @()
  foreach ($kv in @(@('Shift Score', 'shiftScore'), @('Staff served', 'guestsServed'), @('Loyalty guests', 'loyaltyGuests'))) {
    $label = $kv[0]; $key = $kv[1]
    $line = $lines | Where-Object { $_ -match ('^' + [regex]::Escape($label) + '\s*:') } | Select-Object -First 1
    if ($line) {
      $val = ($line -replace ('^' + [regex]::Escape($label) + '\s*:\s*'), '').Trim()
      $metrics += [ordered]@{ key = $key; label = $label; value = (ToInt $val); format = 'int' }
    }
  }
  $evLine = $lines | Where-Object { $_ -match '^Event\s*:' } | Select-Object -First 1
  $event = if ($evLine) { HumanizeEvent (($evLine -replace '^Event\s*:\s*', '').Trim()) } else { $null }
  return @{ event = $event; metrics = $metrics }
}

function Build-Offline($errorClass) {
  $now = Now-Iso
  return [ordered]@{
    envelopeVersion = 1
    game = [ordered]@{ id = 'table-and-tales'; name = 'Table & Tales'; kind = 'venue'; instanceId = $VenueId }
    venue = [ordered]@{ id = $VenueId; name = $VenueName }
    status = [ordered]@{ state = 'unknown' }
    metrics = @()
    panels = @()
    freshness = [ordered]@{ generatedAt = $now; ttlSeconds = 90; heartbeat = [ordered]@{ online = $false; errorClass = $errorClass } }
  }
}

function Build-Snapshot($orderText, $scoreText) {
  $now = Now-Iso
  $orders = Parse-Orders $orderText
  $score = Parse-Score $scoreText
  $panels = @([ordered]@{ type = 'orders.active.v1'; title = 'Kitchen'; rows = $orders })
  if ($score.event) { $panels += [ordered]@{ type = 'event.summary.v1'; title = 'Tonight'; eventTitle = $score.event } }
  $venue = [ordered]@{ id = $VenueId; name = $VenueName }
  if ($Slurl) { $venue.slurl = $Slurl }
  if ($Hours) { $venue.hoursLabel = $Hours }
  return [ordered]@{
    envelopeVersion = 1
    game = [ordered]@{ id = 'table-and-tales'; name = 'Table & Tales'; kind = 'venue'; instanceId = $VenueId }
    venue = $venue
    status = [ordered]@{ state = 'open' }
    metrics = $score.metrics
    panels = $panels
    freshness = [ordered]@{ generatedAt = $now; sourceReadAt = $now; ttlSeconds = 90; heartbeat = [ordered]@{ online = $true; lastOkAt = $now; errorClass = 'none' } }
  }
}

# Build a snapshot from a live read; falls back to an offline snapshot on any failure,
# and to a privacy-hold snapshot if the scrubbed output still trips the forbidden scan.
function Read-And-Build($hdr) {
  try {
    $s = (Invoke-WebRequest "$BridgeBase/session" -Headers $hdr -TimeoutSec 8 -UseBasicParsing).Content | ConvertFrom-Json
    if (-not $s.connected) { return Build-Offline 'bridge_unreachable' }
  } catch { return Build-Offline 'bridge_unreachable' }
  try {
    $near = ((Invoke-WebRequest "$BridgeBase/objects/nearby?radius=64&resolve=true" -Headers $hdr -TimeoutSec 25 -UseBasicParsing).Content | ConvertFrom-Json).objects
    $ob = $near | Where-Object { $_.name -eq $OrderBoard } | Select-Object -First 1
    $sb = $near | Where-Object { $_.name -eq $ScoreBoard } | Select-Object -First 1
    if (-not $ob -or -not $sb) { return Build-Offline 'stale_source' }
    $ot = ((Invoke-WebRequest "$BridgeBase/objects/text?objectId=$($ob.objectId)" -Headers $hdr -TimeoutSec 10 -UseBasicParsing).Content | ConvertFrom-Json).text
    $st = ((Invoke-WebRequest "$BridgeBase/objects/text?objectId=$($sb.objectId)" -Headers $hdr -TimeoutSec 10 -UseBasicParsing).Content | ConvertFrom-Json).text
  } catch { return Build-Offline 'stale_source' }
  $snap = Build-Snapshot $ot $st
  $json = $snap | ConvertTo-Json -Depth 12 -Compress
  $hit = Scan-Forbidden $json
  if ($hit) { Write-Host "[$(Get-Date -f HH:mm:ss)] PRIVACY HOLD ($hit) — refusing to publish live data"; return Build-Offline 'privacy_hold' }
  return $snap
}

# Content hash over the MEANINGFUL fields only (so heartbeat-only changes don't count).
function Content-Hash($snap) {
  $core = [ordered]@{ status = $snap.status; metrics = $snap.metrics; panels = $snap.panels }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($core | ConvertTo-Json -Depth 12 -Compress))
  return [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes))
}

function Publish($snap) {
  $now = $snap.freshness.generatedAt
  $json = $snap | ConvertTo-Json -Depth 12 -Compress
  # final defensive scan before anything is written
  $hit = Scan-Forbidden $json
  if ($hit) { Write-Host "PUBLISH BLOCKED ($hit)"; return }
  $reg = [ordered]@{
    schemaVersion = 1; generatedAt = $now
    games = @([ordered]@{ id = 'table-and-tales'; name = 'Table & Tales'; venues = @([ordered]@{
      id = $VenueId; name = $VenueName; status = $snap.status.state; online = $snap.freshness.heartbeat.online; generatedAt = $now; dataPath = "tt/$VenueId.json" }) })
  }
  New-Item -ItemType Directory -Force -Path "$DataRepo\tt" | Out-Null
  Set-Content -Path "$DataRepo\tt\$VenueId.json" -Value $json -Encoding UTF8 -NoNewline
  Set-Content -Path "$DataRepo\registry.json" -Value ($reg | ConvertTo-Json -Depth 8 -Compress) -Encoding UTF8 -NoNewline
  Push-Location $DataRepo
  git add "tt/$VenueId.json" registry.json *> $null
  git commit -q -m "snapshot $VenueId $now ($($snap.status.state)/$(if($snap.freshness.heartbeat.online){'online'}else{'offline'}))" *> $null
  git push -q origin main *> $null
  Pop-Location
  Write-Host "[$(Get-Date -f HH:mm:ss)] published $VenueId state=$($snap.status.state) online=$($snap.freshness.heartbeat.online) orders=$(($snap.panels | Where-Object {$_.type -eq 'orders.active.v1'}).rows.Count)"
}

function Run-Once {
  $hdr = Get-Header
  $snap = Read-And-Build $hdr
  Publish $snap
  return $snap
}

if ($SelfTest) {
  $fail = 0
  function Check($cond, $label) { if ($cond) { Write-Host "  ok  $label" } else { Write-Host "  FAIL $label"; $script:fail++ } }
  Check ((Scan-Forbidden "a1b2c3d4-e5f6-7a8b-9c0d-112233445566") -eq 'uuid') "scan flags a UUID"
  Check ((Scan-Forbidden "secondlife.com/app/agent/abc") -eq 'agent_ref') "scan flags an agent ref"
  Check ((Scan-Forbidden "The Velvet Table") -eq $null) "table name is safe"
  Check ((Scan-Forbidden "Caesar Salad") -eq $null) "dish name is safe"
  Check ((HumanizeEvent "food_critic_visit") -eq "Food Critic Visit") "humanize id-like event"
  Check ((HumanizeEvent "Live Jazz Night") -eq "Live Jazz Night") "leave human event"
  $ot = "Service Rail`n1 | The Velvet Table | grill | pasta_cream | WAITING`n2 | The Hearth Table | bar | wine_red | COOKING"
  $rows = Parse-Orders $ot
  Check ($rows.Count -eq 2) "parse 2 order rows (header skipped)"
  Check ($rows[0].dish -eq "pasta cream") "dish de-underscored"
  Check ($rows[0].table -eq "The Velvet Table") "table label parsed"
  $sc = Parse-Score "Table & Tales`nEvent: food_critic_visit`nShift Score: 200`nStaff served: 2`nLoyalty guests: 1"
  Check ($sc.event -eq "Food Critic Visit") "score event humanized"
  Check ((($sc.metrics | Where-Object { $_.key -eq 'shiftScore' }).value) -eq 200) "shiftScore parsed"
  # build from a row carrying a planted UUID -> scan must catch it before publish
  $leak = "Service Rail`n1 | guest a1b2c3d4-e5f6-7a8b-9c0d-112233445566 | grill | pasta_cream | WAITING"
  $snapLeak = Build-Snapshot $leak "Shift Score: 1"
  $jsonLeak = $snapLeak | ConvertTo-Json -Depth 12 -Compress
  Check ((Scan-Forbidden $jsonLeak) -eq 'uuid') "planted UUID in a built snapshot is caught"
  if ($fail -gt 0) { Write-Host "SELFTEST FAILED ($fail)"; exit 1 } else { Write-Host "ALL RELAY SELFTEST CHECKS PASSED" }
  return
}

if ($Once) { Run-Once | Out-Null; return }

# loop mode with single-instance lock
$lock = "$env:TEMP\verve-relay-$VenueId.lock"
if (Test-Path $lock) {
  $old = Get-Content $lock -ErrorAction SilentlyContinue
  if ($old -and (Get-Process -Id $old -ErrorAction SilentlyContinue)) { Write-Host "relay already running (pid $old)"; return }
}
"$PID" | Set-Content $lock
Write-Host "verve-relay running (venue=$VenueId, read ${IntervalSec}s, heartbeat ${HeartbeatSec}s). Ctrl+C to stop."
$lastHash = ''; $lastPublish = [DateTime]::MinValue; $cycle = 0
try {
  while ($true) {
    $cycle++
    $hdr = Get-Header
    # keep-alive: a teleport (mutation; needs the kill-switch on) dodges the ~30-min idle-logout.
    # Skipped when -NoKeepAlive (e.g. push-bridge already keeps the avatar online).
    if (-not $NoKeepAlive -and ($cycle % $KeepAliveCycles -eq 1) -and $cycle -gt 1) {
      $ru = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      try { Invoke-WebRequest "$BridgeBase/avatar/teleport?regionName=$KaRegion&x=$KaX&y=$KaY&z=$KaZ&allowTeleport=true&confirm=true&runId=ka$ru" -Method POST -Headers $hdr -TimeoutSec 15 -UseBasicParsing | Out-Null } catch {}
    }
    $snap = Read-And-Build $hdr
    $h = Content-Hash $snap
    $due = ((Get-Date) - $lastPublish).TotalSeconds -ge $HeartbeatSec
    if ($h -ne $lastHash -or $due) { Publish $snap; $lastHash = $h; $lastPublish = Get-Date }
    Start-Sleep -Seconds $IntervalSec
  }
} finally { Remove-Item $lock -ErrorAction SilentlyContinue }
