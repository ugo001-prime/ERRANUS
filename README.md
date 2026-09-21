# Erranus mobile prototype

An Expo / React Native prototype for a Nigerian paid-task marketplace. The same `App.tsx` source supports Android and iPhone.

## Run the web application

Open `frontend-preview.html` in any browser. It is a responsive, standalone Erranus web app and needs no Node.js, Expo, emulator, or installation. It supports private browser accounts, task posting, worker/customer role switching, signed task acceptance, privacy-gated customer details, optional browser GPS, a completed-tasks dashboard, and reviews. Demo data stays in that browser through local storage.

## Run on the prepared Android emulator

Open the `erranus` folder in VS Code, then choose **Terminal → New Terminal**. Run this one command:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1
```

It checks the app, creates the Android APK, verifies it, and writes it to `artifacts\Erranus-preview.apk`. Then start the emulator and install it with:

```powershell
. scripts/android-env.ps1
emulator -avd Erranus_API_36
adb wait-for-device
adb install -r artifacts\Erranus-preview.apk
```

After the emulator has started, use the terminal in a second VS Code tab to run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-erranus.ps1`, then choose **a** to open the app in the emulator.

`pnpm check` checks TypeScript, `pnpm test` exercises task lifecycle rules, and `pnpm bundle` exports the Android JavaScript bundle. An exported bundle is not an installable APK.

## Test on an iPhone

This app is configured for iPhone, including its foreground location permission message. Apple’s iPhone Simulator works only on a Mac with Xcode; it cannot run on this Windows computer. You can instead use your physical iPhone after installing an iOS development build.

The first development build requires an Apple Developer Program membership, an Apple account configured for the build service, and an iPhone registered for internal testing. Create the iOS development build through EAS, install it on your iPhone, then return to this folder and run `pnpm iphone`. Scan the displayed QR code with your iPhone’s Camera app to open Erranus. Both the laptop and iPhone need to be able to reach the development server; the configured tunnel supports different networks.

Expo Go from the iPhone App Store cannot load this project because it supports up to Expo SDK 54 and Erranus is on SDK 55. Do not use an Android APK on an iPhone.

## Try the demo

Browse a task, type a signature, grant agreement consent and accept. Allow Android location permission to see the last GPS update. Start work, request completion, then use the explicitly labelled customer simulation to confirm it and try a review. Switch roles at the top to post tasks from the customer profile. The worker can then accept those tasks; switch back to the customer account to confirm their completion without the simulation.

## Implemented scope

- Task browsing and category filters with Nigerian sample jobs and NGN amounts.
- Separate worker/customer views, task posting and local task status.
- Versioned acceptance snapshot including scope, price, name and timestamp.
- Customer-detail visibility gating in the demo interface.
- Foreground GPS permission handling and cleanup on completion request, cancellation, unmount and backgrounding.
- A completed-task review preview.

## Deliberate prototype limitations

All task data is held in memory and resets when the app restarts. Demo identities, reviews and signatures are not authenticated. No real customer information is bundled. UI visibility checks are not server authorization. GPS fixes are not transmitted or stored as a route. Location collection pauses when the app goes into the background or changes to the customer role. Background tracking, a foreground service notification, recovery after process termination and device testing are still required.

There is no backend, account creation, real payment, payout, secure signature service, customer notification, dispute system or production review moderation. The simulation buttons must be removed before release. A production service must enforce participant permissions, atomic job claiming, versioned bilateral agreements, idempotent payment webhooks, restricted location access and retention, and verified reviews on the server. The local rule tests do not establish production security or concurrency guarantees.

See PRODUCT_BRIEF.md for the intended full product and outstanding decisions. Do not use this prototype for real paid jobs.

## Validation in this workspace

Dependencies are installed and matched to Expo SDK 55. TypeScript checking and all three task-rule tests pass. The Android JavaScript bundle also succeeds. Java 21, Android API 36, build tools, CMake, NDK, platform tools and an Android emulator image have been prepared inside `.toolchain`.

The build script aligns Expo and React Native's Gradle-only Java 17 toolchain declarations with the bundled Java 21 compiler. This is needed because this computer has no Java 17 installation; the changes are reapplied after dependency repair and do not alter the app's JavaScript source.

The Gradle distribution is downloaded and verified. The build script safely checks its official SHA-256 before compiling. Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1`; it runs checks, compiles a signed preview APK, verifies it and writes it to `artifacts/Erranus-preview.apk`.

No physical Android device is connected. The prepared emulator is the planned test target; an iPhone cannot install or test an Android APK.

## Reference

Location implementation follows the foreground APIs in https://docs.expo.dev/versions/v55.0.0/sdk/location/ . The preview build uses JavaScriptCore because Windows blocks this workspace from executing the downloaded Hermes compiler.
