# Registers a Windows Scheduled Task that brings the whole VERVE venue live at logon:
# runs tt-venue-up.ps1 (relaunches viewer + applies in-world boards + starts push-bridge + web relay).
# Runs in the user's INTERACTIVE session (the viewer is a GUI app) at Limited run level.
#   Install:   pwsh -File install-venue-task.ps1
#   Remove:    pwsh -File install-venue-task.ps1 -Uninstall
#   Run now:   Start-ScheduledTask -TaskName VerveVenueUp
# NOTE: this auto-starts the venue with the mutation kill-switch ON (same as running
# tt-venue-up by hand). Only reversible ops happen on bring-up (board media + keep-alive teleport).
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$taskName = 'VerveVenueUp'
$venueScript = 'D:\dev\tt-boards\tt-venue-up.ps1'

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Unregistered scheduled task '$taskName'."
  return
}
if (-not (Test-Path $venueScript)) { throw "venue script not found: $venueScript" }

$pwshPath = (Get-Command pwsh).Source
$action = New-ScheduledTaskAction -Execute $pwshPath -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$venueScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERNAME"
$trigger.Delay = 'PT1M'  # let the desktop/network settle before launching the viewer
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
  -Description "Bring the VERVE venue live at logon (viewer + in-world boards + push-bridge + verve-web relay)." -Force | Out-Null
Write-Host "Registered scheduled task '$taskName' -> runs tt-venue-up.ps1 ~1 min after logon."
