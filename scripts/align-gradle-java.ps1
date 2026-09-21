# The local Android toolchain uses Java 21. These Expo/React Native build plugins
# request Java 17 only as their compiler toolchain; Java 21 can compile that target.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$paths = @(
    (Join-Path $projectRoot 'node_modules/.pnpm/@react-native+gradle-plugin@0.83.10/node_modules/@react-native/gradle-plugin'),
    (Join-Path $projectRoot 'node_modules/.pnpm/react-native@0.83.10_@babel_c257dc156170f8e10c53494a9e9db7ec/node_modules/react-native/ReactAndroid'),
    (Get-ChildItem (Join-Path $projectRoot 'node_modules/.pnpm') -Directory -Filter 'expo-modules-core@55.0.26*' | Select-Object -First 1 | ForEach-Object FullName)
)
$changed = 0
foreach ($path in $paths) {
    if (-not $path -or -not (Test-Path $path)) { continue }
    Get-ChildItem -Path $path -Recurse -File -Include '*.gradle','*.gradle.kts' | ForEach-Object {
        $original = Get-Content -LiteralPath $_.FullName -Raw
        $updated = $original.Replace('jvmToolchain(17)', 'jvmToolchain(21)').Replace('JavaLanguageVersion.of(17)', 'JavaLanguageVersion.of(21)')
        if ($updated -ne $original) {
            Set-Content -LiteralPath $_.FullName -Value $updated -Encoding utf8
            $changed++
        }
    }
}
Write-Output "Aligned $changed Gradle build files to Java 21."
