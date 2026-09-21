$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'android-env.ps1')
Set-Location $projectRoot
& $env:ERRANUS_NODE node_modules/expo/bin/cli start
