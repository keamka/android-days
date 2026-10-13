const fs = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const SYSTEM_ACTIONS = [
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.TIME_SET',
  'android.intent.action.TIMEZONE_CHANGED',
  'android.intent.action.DATE_CHANGED',
  'android.intent.action.MY_PACKAGE_REPLACED',
];

function configureManifest(manifest) {
  manifest['uses-permission'] ??= [];
  if (!manifest['uses-permission'].some((p) => p.$['android:name'] === 'android.permission.RECEIVE_BOOT_COMPLETED')) {
    manifest['uses-permission'].push({ $: { 'android:name': 'android.permission.RECEIVE_BOOT_COMPLETED' } });
  }
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow({ manifest });
  application.receiver ??= [];
  const name = '.widget.DailyWidgetRefreshReceiver';
  application.receiver = application.receiver.filter((r) => r.$['android:name'] !== name);
  application.receiver.push({
    $: { 'android:name': name, 'android:exported': 'false' },
    'intent-filter': [{ action: SYSTEM_ACTIONS.map((action) => ({ $: { 'android:name': action } })) }],
  });
  return manifest;
}

function withDailyWidgetRefresh(config) {
  const packageName = config.android?.package;
  if (!packageName || !/^[A-Za-z_]\w*(\.[A-Za-z_]\w*)+$/.test(packageName)) {
    throw new Error('Daily widget refresh requires a valid android.package.');
  }
  config = withAndroidManifest(config, (mod) => {
    configureManifest(mod.modResults.manifest);
    return mod;
  });
  // Register BEFORE react-native-android-widget: dangerous mods run in reverse
  // registration order, so our subclass is written after its generated stub.
  return withDangerousMod(config, ['android', async (mod) => {
    const target = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/java', ...packageName.split('.'), 'widget');
    await fs.mkdir(target, { recursive: true });
    for (const filename of ['DailyWidgetSchedule.java', 'DailyWidgetRefreshReceiver.java', 'DaysWidget.java']) {
      const source = await fs.readFile(path.join(__dirname, 'android', filename), 'utf8');
      await fs.writeFile(path.join(target, filename), source.replaceAll('__PACKAGE__', packageName));
    }
    return mod;
  }]);
}

module.exports = withDailyWidgetRefresh;
module.exports.configureManifest = configureManifest;
module.exports.SYSTEM_ACTIONS = SYSTEM_ACTIONS;
