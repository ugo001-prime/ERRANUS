$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$archive = Join-Path $projectRoot '.toolchain/downloads/jdk21.zip'
while (-not (Test-Path -LiteralPath $archive) -or (Get-Item -LiteralPath $archive).Length -ne 201096952) { Start-Sleep -Seconds 15 }
$digest = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower()
if ($digest -ne '192441a9d27da813bada974bb88b4cf64d37a9589ed37f204374d411ca5ce07f') { throw 'Java archive checksum mismatch.' }
$destination = Join-Path $projectRoot '.toolchain/java'
New-Item -ItemType Directory -Force $destination | Out-Null
Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
. (Join-Path $PSScriptRoot 'android-env.ps1')
& java -version
if ($LASTEXITCODE -ne 0) { throw 'Java installation failed.' }
# These are the standard SDK component licenses required for the requested Android build.
1..30 | ForEach-Object { 'y' } | & "$env:ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager.bat" "--sdk_root=$env:ANDROID_HOME" --licenses *> (Join-Path $projectRoot '.toolchain/sdk-licenses.log')
if ($LASTEXITCODE -ne 0) { throw 'Android SDK license configuration failed.' }
