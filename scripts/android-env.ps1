$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$originalUserProfile = $env:USERPROFILE
$nodeCandidates = @(
    (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    'C:\Program Files\nodejs\node.exe',
    (Join-Path $originalUserProfile 'AppData\Local\Programs\nodejs\node.exe')
) + @(Get-ChildItem -Path (Join-Path $originalUserProfile '.cache\codex-runtimes') -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -ExpandProperty FullName)
$nodeExe = $nodeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $nodeExe) { throw 'Node.js is missing. Install the LTS version from https://nodejs.org/ and reopen VS Code.' }
$env:ERRANUS_NODE = $nodeExe
$jdkDirectory = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.toolchain/java') -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'bin/java.exe') } | Select-Object -First 1
if (-not $jdkDirectory) { throw 'Java is missing from .toolchain/java. See README.md.' }
$env:JAVA_HOME = $jdkDirectory.FullName
$env:ANDROID_HOME = Join-Path $projectRoot '.toolchain/android-sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = Join-Path $projectRoot '.toolchain/gradle-home'
$env:ANDROID_USER_HOME = Join-Path $projectRoot '.toolchain/android-user'
$env:ANDROID_SDK_HOME = $env:ANDROID_USER_HOME
$env:USERPROFILE = $env:ANDROID_USER_HOME
$env:HOMEDRIVE = [IO.Path]::GetPathRoot($env:ANDROID_USER_HOME).TrimEnd('\\')
$env:HOMEPATH = $env:ANDROID_USER_HOME.Substring($env:HOMEDRIVE.Length)
$env:ANDROID_AVD_HOME = Join-Path $projectRoot '.toolchain/avd'
$env:EXPO_NO_TELEMETRY = '1'
$env:CI = '1'
$env:Path = "$env:JAVA_HOME/bin;$env:ANDROID_HOME/platform-tools;$env:ANDROID_HOME/emulator;$env:Path"
