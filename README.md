# Days++

An offline-first Android day-of-life counter built with TypeScript, React Native, and Expo. Choose your birthday, see a daily counter in the app, and add an Android home-screen widget.

## Quick start — первый запуск на Android-телефоне

Инструкция для **Linux и подключения по USB**. Устанавливается собственная development-сборка Days++, **не Expo Go**. Для первой сборки нужен интернет: будут скачаны зависимости и компоненты Android-сборки.

### 1. Подготовь инструменты и телефон

- Установи Node.js LTS 22.13+ и pnpm 11.18.0 (см. [Prerequisites](#prerequisites)).
- Установи Android Studio. Через SDK Manager установи Android SDK, Platform-Tools, Command-line Tools и SDK Platform / Build-Tools, необходимые проекту. Прими лицензии SDK. pnpm не устанавливает эти инструменты.
- На телефоне включи **режим разработчика → отладку по USB**, подключи его кабелем с поддержкой передачи данных и разблокируй экран.

### 2. Открой проект и укажи пути к Android SDK и JDK

Все следующие команды выполняй в одном терминале. Замени пути, если инструменты установлены в другом месте; `JAVA_HOME` должен указывать на полный JDK, например встроенный JDK Android Studio.

```sh
cd /home/keam/Documents/days++

export ANDROID_HOME="$HOME/Android/Sdk"
# Пример: замени на реальный путь к jbr в своей установке Android Studio.
export JAVA_HOME="/opt/android-studio/jbr"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

node --version
pnpm --version
java -version
javac -version
adb version
```

Если какая-либо команда не найдена, сначала исправь установку или пути. Переменные `export` действуют только в текущем терминале.

### 3. Установи зависимости проекта

```sh
pnpm install --frozen-lockfile
pnpm exec expo install --check --pnpm
```

### 4. Проверь подключение телефона

```sh
adb start-server
adb devices -l
```

На телефоне подтверди **«Разрешить отладку по USB»**, затем при необходимости повтори `adb devices -l`. Напротив телефона должен быть статус **`device`**, не `unauthorized` и не `offline`. Если список пуст, проверь кабель, USB-режим и права доступа к USB-устройству на Linux.

Для команд ниже оставь подключённым один физический телефон. Если их несколько, используй `adb -s SERIAL` вместо `adb -d`, подставив серийный номер из списка.

### 5. Собери, установи и открой приложение

```sh
# Соединение телефона с Metro на компьютере через USB.
adb -d reverse tcp:8081 tcp:8081

# Подготовка native-проекта с настройками Android-виджета.
pnpm run prebuild

# Выбери свой телефон из списка устройств.
pnpm run android --device
```

Последняя команда собирает и устанавливает development-приложение, запускает Metro и открывает Days++. Первая сборка может занять несколько минут. **Не закрывай терминал с Metro** во время разработки. Если сборка сообщает об отсутствующем SDK/Build-Tools или непринятых лицензиях, установи указанный компонент через SDK Manager и повтори команду.

Если приложение установилось, но не подключается к Metro по локальной сети, останови Metro сочетанием `Ctrl+C` и запусти через USB/localhost:

```sh
adb -d reverse tcp:8081 tcp:8081
pnpm start --localhost
```

Открой Days++ на телефоне; если development launcher предлагает ввести адрес сервера, укажи `http://localhost:8081`.

### 6. Проверь счётчик и добавь виджет

Выбери дату рождения, нажми **Show my day**, затем **Add home-screen widget**. Если launcher не поддерживает добавление из приложения: удерживай пустое место на домашнем экране → **Виджеты → Days++**.

Для последующих запусков, пока native-зависимости и конфигурация не менялись, достаточно подключить телефон и выполнить:

```sh
adb -d reverse tcp:8081 tcp:8081
pnpm start --localhost
```

Development-сборке нужен работающий Metro. Для использования без компьютера и проверки фонового обновления виджета нужна standalone APK: см. [Standalone APK / Play Store bundle](#standalone-apk--play-store-bundle).

## What is implemented

- Native birthday picker, local persistence, editing/canceling, and save/load error handling.
- A light/dark counter screen with accessible controls and support for scrolling/large text.
- Birthday is **day 1**. Counts local calendar days, not elapsed 24-hour periods.
- A cream, rounded Android home-screen widget with a serif date and day counter, compact sizing, automatic updates, and app launch on tap.
- Module-scope headless task registration, so scheduled widget updates do not require the React screen to be mounted.
- Updates on birthday save, app activation, local date change while open, widget addition/resizing, and best-effort periodic Android refresh.
- No backend, account, analytics, or birthday upload. Birthday is stored in app-private AsyncStorage, not encrypted; cloud backup is disabled with `allowBackup: false`. Some Android manufacturers may still transfer app data during device-to-device migration; Days++ itself never uploads the birthday.

## Stack

- Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript 6.
- `react-native-android-widget` 0.22.1 with its Expo config plugin.
- AsyncStorage, community Android date picker, safe-area-context.
- Jest/Expo preset and React Native Testing Library. `test-renderer` is pinned to 1.2.0 for compatibility with React 19.2.

The dependency versions are locked in `pnpm-lock.yaml`, and `package.json` pins pnpm 11.18.0. Use `pnpm install --frozen-lockfile` rather than replacing framework versions independently. `pnpm-workspace.yaml` selects a hoisted `node_modules` layout for Expo native tooling and Jest. Use pnpm exclusively and keep `pnpm-lock.yaml` as the project's only package-manager lockfile.

## Run on Android

**Expo Go is not supported:** this app uses a custom native widget module.

### Prerequisites

1. A supported Node.js LTS release (Node 22.13+ or a compatible newer LTS) and **pnpm 11.18.0**.
2. Android Studio with an Android SDK, SDK platform/build tools required by the generated project, platform-tools, and an emulator or USB-debugging-enabled phone.
3. A full JDK compatible with the generated Android Gradle plugin. Prefer the JDK bundled with your current Android Studio; do not assume a system Java runtime alone includes the compiler/tooling.
4. `ANDROID_HOME` pointing to your SDK, with `platform-tools` on `PATH`.

If pnpm is not installed, enable it with Corepack (when available in your Node installation):

```sh
corepack enable
corepack prepare pnpm@11.18.0 --activate
pnpm --version
```

If Corepack is unavailable, install pnpm using the [official installation instructions](https://pnpm.io/installation). pnpm installs the JavaScript dependencies; it does **not** install Android Studio, the Android SDK, or the JDK.

Typical Linux environment (adjust to your installation):

```sh
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
# Set JAVA_HOME to your Android Studio bundled JDK or compatible full JDK.
pnpm install --frozen-lockfile
pnpm run android
```

`pnpm run android` generates native code if needed, builds a development client, installs it, and starts Metro. On subsequent runs with the installed development client:

```sh
pnpm start
```

To add an Expo-compatible native dependency, use `pnpm exec expo install <package> --pnpm`. For ordinary JavaScript dependencies, use `pnpm add <package>` (or `pnpm add -D <package>` for development tools).

After changing `app.config.ts`, native dependencies, or widget plugin options, regenerate and rebuild:

```sh
pnpm run prebuild
pnpm run android
```

`android/` is generated and ignored. Make persistent native configuration changes through Expo config/plugins, not manual edits to generated files. The example application ID is `com.daysplusplus.app`; choose an ID you control before publication.

### Add the widget

Open Days++, save your birthday, then choose **Add home-screen widget**. If the launcher does not support the pinning prompt, the app explains the manual route: long-press the home screen → Widgets → Days++ → drag onto the home screen.

The widget can also be added before onboarding and will prompt you to set a birthday.

### Standalone APK / Play Store bundle

`eas.json` includes development, preview APK, and production AAB profiles. Cloud builds are optional and require an Expo account/project and signing setup:

```sh
pnpm dlx eas-cli login
pnpm dlx eas-cli build:configure
pnpm dlx eas-cli build --platform android --profile preview
# For Play Store, after package/signing/store setup:
pnpm dlx eas-cli build --platform android --profile production
```

A **preview/release build** embeds JavaScript and is the right way to test headless updates with Metro stopped. Development builds may still need a reachable Metro server to load JavaScript.

No cloud build, signing key, account, or upload was created automatically. Production publishing also needs a real app icon, store assets, privacy declarations, versioning, and release review; the current native launcher icon is the template default.

## Checks

```sh
pnpm run check          # Strict TypeScript + all Jest tests
pnpm run export:android # Generate a production Hermes JavaScript bundle, NOT an APK
pnpm exec expo install --check --pnpm
pnpm dlx expo-doctor

# Verify calendar arithmetic under DST and distant time zones:
TZ=America/New_York pnpm test src/domain/__tests__/lifeDay.test.ts
TZ=Pacific/Kiritimati pnpm test src/domain/__tests__/lifeDay.test.ts
TZ=Pacific/Honolulu pnpm test src/domain/__tests__/lifeDay.test.ts
```

## Counting rules

Birthdays are saved as strict `YYYY-MM-DD` calendar dates, never timestamps. Birthday = 1; the following calendar date = 2. Today's date comes from the **current device time zone**, so travel across the date line can move the count backward or forward. Leap days and daylight-saving transitions use Gregorian calendar ordinals, not elapsed local milliseconds.

The utility accepts years 0001–9999. The user-facing Android picker intentionally starts at 1900. Future birthdays are rejected. A bad saved value or storage failure produces a recoverable setup/error state rather than silently inventing a date.

## Widget refresh limitations

The widget automatically requests a refresh at the **next local midnight**, using a native inexact `AlarmManager` alarm. Each delivery schedules the following local midnight (calendar arithmetic handles DST). The provider also requests updates every **30 minutes** as a fallback. Scheduling is restored after reboot/unlock, app upgrades, clock changes, and time-zone changes, and is canceled when the last widget is removed.

**Install a standalone/release APK for automatic updates without a computer.** Development builds can depend on Metro for headless JavaScript. The native receiver starts the existing WorkManager/headless task, which reads the saved birthday; it needs neither an open app screen nor network access in a standalone build.

Android can defer alarms and WorkManager execution due to Doze, battery settings, vendor policies, or force-stop. **An exact midnight refresh is not guaranteed.** No exact-alarm permissions or continually running service are used. On vivo and other restrictive devices, allow background activity/autostart for Days++ if updates are delayed. Force-stopping the app may require opening it again.

Native scheduling is maintained in `plugins/withDailyWidgetRefresh.js` and `plugins/android/`, not manual edits to the generated Android project. With a JDK configured, run `node scripts/test-daily-schedule.cjs` to check the actual Java calendar helper across midnight, DST, leap-day, and date-line boundaries.

- Each callback reloads saved data and computes the current local day.
- Opening the app and saving a birthday request an update for all installed instances.
- Tap the widget to open the app and request a fresh count; the widget has no extra controls.
- A date label in the widget helps make stale content visible.
- The app's foreground timer is not used as a background scheduling mechanism.

## Project map

```text
App.tsx                          Birthday flow and main counter screen
index.ts                         App + headless widget task registration
app.config.ts                    Android identity, widget provider, permissions
src/domain/lifeDay.ts             Pure date-only rules and formatting
src/storage/birthday.ts           Shared persistent birthday access
src/theme.ts                      Shared light/dark color tokens
src/widget/DaysWidget.tsx         Android widget primitives (not RN Views)
src/widget/widgetTaskHandler.tsx  Task lifecycle and app-triggered updates
src/**/__tests__/                 Date, persistence, UI, and widget tests
docs/DEVICE_TESTING.md            Real-device acceptance checklist
```

## Verification status and dependency caveats

The daily-refresh implementation passed strict TypeScript, **119 tests across six Jest suites**, and **9 native Java scheduling checks**. Repeated Android prebuild preserves the custom widget provider. Earlier checks also passed all 21 Expo Doctor checks and production JavaScript export. `.github/workflows/check.yml` repeats code, time-zone, native calendar, prebuild, and JS export checks (it does not compile an APK).

A standalone release APK was built and installed over the development version on a vivo V2538 (Android 16), preserving the existing widget. With Metro stopped, the package-update receiver requested a headless refresh and WorkManager reported successful completion. Android's alarm dump confirmed the next daily alarm for local midnight in Europe/Moscow. Actual overnight delivery, reboot recovery, and aggressive battery-saving behavior still require the device checklist; they are not claimed verified. This locally installed release uses the existing development signing key for compatibility, not production/store signing.

The dependency audit at implementation time reported moderate transitive advisories rooted in `uuid <11.1.1` through Expo's `xcode` configuration tooling, with no compatible automatic fix for the framework chain. This is not app birthday-processing code, but it should be revisited before release. Do not apply forced dependency downgrades or audit fixes blindly: they may break the selected native stack. Run `pnpm audit --registry=https://registry.npmjs.org` against a registry that implements the audit endpoint.
