param([string]$Architectures = 'arm64-v8a,x86_64')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'android-env.ps1')
$powershellExe = Join-Path $PSHOME 'powershell.exe'
Push-Location $projectRoot
try {
    & $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'repair-pnpm-links.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Local dependency-link repair failed.' }
    & $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'align-gradle-java.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Gradle Java alignment failed.' }
    & $env:ERRANUS_NODE node_modules/typescript/bin/tsc --noEmit
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript checks failed.' }
    & $env:ERRANUS_NODE --test tests/*.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Task rule tests failed.' }
    & $env:ERRANUS_NODE node_modules/expo/bin/cli prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android project generation failed.' }
    $sdkPath = $env:ANDROID_HOME.Replace('\', '/')
    Set-Content -LiteralPath android/local.properties -Value "sdk.dir=$sdkPath" -Encoding utf8
    $gradleArchive = Join-Path $projectRoot '.toolchain/downloads/gradle.zip'
    if ((Test-Path -LiteralPath $gradleArchive) -and (Get-Item -LiteralPath $gradleArchive).Length -eq 134491514) {
        $gradleDigest = (Get-FileHash -LiteralPath $gradleArchive -Algorithm SHA256).Hash.ToLower()
        if ($gradleDigest -ne '8fad3d78296ca518113f3d29016617c7f9367dc005f932bd9d93bf45ba46072b') { throw 'Invalid Gradle archive.' }
        $wrapperPath = Join-Path $projectRoot 'android/gradle/wrapper/gradle-wrapper.properties'
        $wrapperText = Get-Content -LiteralPath $wrapperPath -Raw
        $wrapperText = $wrapperText -replace '(?m)^distributionUrl=.*$', "distributionUrl=$(([uri]$gradleArchive).AbsoluteUri)"
        $wrapperText = $wrapperText -replace '(?m)^networkTimeout=.*$', 'networkTimeout=120000'
        Set-Content -LiteralPath $wrapperPath -Value $wrapperText -Encoding utf8
    }
    Push-Location android
    try {
        & ./gradlew.bat assembleRelease "-PreactNativeArchitectures=$Architectures" --max-workers=2 --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'APK compilation failed.' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Force artifacts | Out-Null
    Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination artifacts/Erranus-preview.apk -Force
    & "$env:ANDROID_HOME/build-tools/36.0.0/apksigner.bat" verify --verbose artifacts/Erranus-preview.apk
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    $apkHash = (Get-FileHash -LiteralPath artifacts/Erranus-preview.apk -Algorithm SHA256).Hash.ToLower()
    Set-Content -LiteralPath artifacts/Erranus-preview.apk.sha256 -Value "$apkHash  Erranus-preview.apk"
    Write-Output 'Created artifacts/Erranus-preview.apk (offline preview, development signing key).'
} finally { Pop-Location }
