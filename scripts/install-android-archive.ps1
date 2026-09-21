param(
    [Parameter(Mandatory=$true)][string]$Archive,
    [Parameter(Mandatory=$true)][string]$Destination,
    [Parameter(Mandatory=$true)][string]$Checksum,
    [string]$Prefix = ''
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolchainRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.toolchain'))
$destinationRoot = [IO.Path]::GetFullPath($Destination)
if (-not $destinationRoot.StartsWith($toolchainRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination must be inside this project toolchain.' }
$algorithm = if ($Checksum.Length -eq 40) { 'SHA1' } else { 'SHA256' }
if ((Get-FileHash -LiteralPath $Archive -Algorithm $algorithm).Hash.ToLower() -ne $Checksum.ToLower()) { throw 'Archive checksum mismatch.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive).Path)
try {
    foreach ($entry in $zip.Entries) {
        if (-not $entry.FullName.StartsWith($Prefix, [StringComparison]::Ordinal)) { continue }
        $relativePath = $entry.FullName.Substring($Prefix.Length)
        if (-not $relativePath) { continue }
        $outputPath = [IO.Path]::GetFullPath((Join-Path $destinationRoot $relativePath))
        if (-not $outputPath.StartsWith($destinationRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive entry.' }
        if ($entry.FullName.EndsWith('/')) { New-Item -ItemType Directory -Force $outputPath | Out-Null; continue }
        New-Item -ItemType Directory -Force (Split-Path -Parent $outputPath) | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $outputPath, $true)
    }
} finally { $zip.Dispose() }
Write-Output "Installed $Destination"
