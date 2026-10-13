# Android acceptance checklist

These are manual acceptance tests, **not claims of completed device testing**. Native prebuild and JS export are not substitutes for these checks. Test a standalone preview APK with Metro stopped, in addition to development builds.

## Setup and persistence

- [ ] Fresh install shows setup, not a made-up count.
- [ ] Cancel the native date picker: no birthday is selected or saved.
- [ ] Pick today: main screen shows Day 1. Pick yesterday: Day 2.
- [ ] Future dates cannot be selected; invalid/future data cannot produce a count.
- [ ] Save, restart, and reboot: the birthday is retained.
- [ ] Edit and save: the displayed date and count change.
- [ ] Edit and cancel: the saved birthday and count are unchanged.
- [ ] Clearing app storage returns the app to setup.
- [ ] No storage access, notification, or exact-alarm permission prompts appear.

## Appearance and accessibility

- [ ] Check onboarding and counter in light and dark mode.
- [ ] Large text/display scaling works without obscuring essential controls.
- [ ] TalkBack announces date selection, buttons, error messages, and the day count.
- [ ] The screen remains usable on a narrow phone and scrolls to all controls.
- [ ] Check native date-picker labels and date formatting in a second locale.

## Launcher widget

- [ ] Widget appears in the launcher's widget picker with label Days++.
- [ ] Adding before birthday setup shows a setup prompt; tapping opens the app.
- [ ] App's add-widget button opens a pin prompt when supported, otherwise instructions.
- [ ] Add after setup: count matches the app.
- [ ] Add two instances and edit birthday: both update.
- [ ] Tap widget body: app opens and requests a fresh count; no extra widget controls are displayed.
- [ ] Resize short/wide and switch system theme: text fits and remains legible.
- [ ] Remove one instance: the other continues to update.
- [ ] Test a Pixel-style launcher and another launcher if available.

## Date/background behavior

- [ ] Keep app open across local midnight: app count changes promptly.
- [ ] Close UI and stop Metro with standalone APK installed: background widget updates still work.
- [ ] With a widget installed, `adb shell dumpsys alarm` includes `com.daysplusplus.app.DAILY_WIDGET_REFRESH` scheduled for the next local midnight.
- [ ] Leave widget overnight: the midnight alarm or periodic fallback eventually shows the new date/count without opening the app or running Metro.
- [ ] After reboot/unlock, time-zone change, and APK replacement, verify the midnight alarm is rescheduled.
- [ ] Removing the last widget cancels the daily alarm; adding a widget schedules it again.
- [ ] Change time zone/date with app backgrounded, then reopen: app and widget refresh.
- [ ] Reboot and allow the launcher/OS to restore the widget: periodic/manual refresh works.
- [ ] Test battery saver/Doze; record delay rather than assuming precise scheduling.
- [ ] Test force-stop then reopen. Document OEM restrictions if updates remain suppressed.

## Before distribution

- [ ] Complete an actual native APK build and installation.
- [ ] Choose an owned application ID and supply app icon/store assets.
- [ ] Review final merged release manifest, backup behavior, and permissions.
- [ ] Rerun dependency audit and resolve/reassess framework tooling advisories.
- [ ] Verify release signing, backup/privacy statements, and store disclosures.
- [ ] Ensure standalone build needs no account, network connection, or Metro server for normal use.
