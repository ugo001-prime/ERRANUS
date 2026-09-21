# Restores pnpm's directory links using its local package map after an interrupted install.
# No downloads are performed; every target must already exist under node_modules/.pnpm.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$modulesRoot = Join-Path $projectRoot 'node_modules'
$map = Get-Content -LiteralPath (Join-Path $modulesRoot '.package-map.json') -Raw | ConvertFrom-Json -AsHashtable
$packageEntries = $map.packages

function Add-DirectoryLink([string]$linkPath, [string]$targetPath) {
    if (Test-Path -LiteralPath $linkPath) { return }
    if (-not (Test-Path -LiteralPath $targetPath -PathType Container)) { return }
    New-Item -ItemType Directory -Force (Split-Path -Parent $linkPath) | Out-Null
    New-Item -ItemType Junction -Path $linkPath -Target $targetPath | Out-Null
}

foreach ($entryKey in $packageEntries.Keys) {
    if ($entryKey -eq '.') { continue }
    $entry = $packageEntries[$entryKey]
    $packageFolder = [IO.Path]::GetFullPath((Join-Path $modulesRoot $entry.url))
    $dependencyRoot = Split-Path -Parent $packageFolder
    if ((Split-Path -Leaf $dependencyRoot).StartsWith('@')) { $dependencyRoot = Split-Path -Parent $dependencyRoot }
    foreach ($dependencyName in $entry.dependencies.Keys) {
        $dependencyKey = $entry.dependencies[$dependencyName]
        if (-not $packageEntries.ContainsKey($dependencyKey)) { throw "Package map target not found: $dependencyKey" }
        $target = [IO.Path]::GetFullPath((Join-Path $modulesRoot $packageEntries[$dependencyKey].url))
        Add-DirectoryLink (Join-Path $dependencyRoot $dependencyName) $target
    }
}

foreach ($dependencyName in $packageEntries['.'].dependencies.Keys) {
    $dependencyKey = $packageEntries['.'].dependencies[$dependencyName]
    $target = [IO.Path]::GetFullPath((Join-Path $modulesRoot $packageEntries[$dependencyKey].url))
    Add-DirectoryLink (Join-Path $modulesRoot $dependencyName) $target
}

Write-Output 'Restored local pnpm links.'
