$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'android-env.ps1')
$avdName = 'Erranus_API_36'
$avdPath = Join-Path $env:ANDROID_AVD_HOME "$avdName.avd"
$systemPath = Join-Path $env:ANDROID_HOME 'system-images/android-36/default/x86_64/x86_64'
if (-not (Test-Path (Join-Path $systemPath 'system.img'))) { throw 'Android 36 emulator image is missing.' }
New-Item -ItemType Directory -Force $env:ANDROID_AVD_HOME, $avdPath | Out-Null
@"
avd.ini.encoding=UTF-8
path=$avdPath
target=android-36
"@ | Set-Content -LiteralPath (Join-Path $env:ANDROID_AVD_HOME "$avdName.ini") -Encoding utf8
@"
AvdId=$avdName
PlayStore.enabled=false
abi.type=x86_64
avd.ini.displayname=Erranus Android 16
disk.dataPartition.size=6G
fastboot.forceChosenSnapshotBoot=no
fastboot.forceColdBoot=yes
hw.device.manufacturer=Google
hw.device.name=pixel_5
hw.cpu.arch=x86_64
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader_indirect
hw.keyboard=yes
hw.lcd.density=420
hw.lcd.height=2340
hw.lcd.width=1080
image.sysdir.1=system-images/android-36/default/x86_64/x86_64
runtime.network.latency=none
runtime.network.speed=full
showDeviceFrame=no
tag.display=Default
tag.id=default
vm.heapSize=256
"@ | Set-Content -LiteralPath (Join-Path $avdPath 'config.ini') -Encoding utf8
& "$env:ANDROID_HOME/emulator/emulator.exe" -list-avds
