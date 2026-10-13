import fs from 'node:fs';
import path from 'node:path';

const { configureManifest, SYSTEM_ACTIONS } = require('../../../plugins/withDailyWidgetRefresh');

test('daily refresh manifest is idempotent, private, and needs no exact-alarm permission', () => {
  const manifest = {
    application: [{ $: { 'android:name': '.MainApplication' }, receiver: [{ $: { 'android:name': '.widget.DaysWidget' } }] }],
  };
  configureManifest(manifest);
  const once = JSON.stringify(manifest);
  configureManifest(manifest);
  expect(JSON.stringify(manifest)).toBe(once);
  expect(once).toContain('android.permission.RECEIVE_BOOT_COMPLETED');
  expect(once).not.toContain('SCHEDULE_EXACT_ALARM');
  expect(once).not.toContain('USE_EXACT_ALARM');
  expect(manifest.application[0]!.receiver).toContainEqual(expect.objectContaining({
    $: { 'android:name': '.widget.DailyWidgetRefreshReceiver', 'android:exported': 'false' },
  }));
  for (const action of SYSTEM_ACTIONS) expect(once).toContain(action);
});

test('daily plugin runs after provider generation via reverse dangerous-mod ordering', () => {
  const config = fs.readFileSync(path.join(__dirname, '../../../app.config.ts'), 'utf8');
  expect(config.indexOf('./plugins/withDailyWidgetRefresh')).toBeLessThan(config.indexOf("'react-native-android-widget'"));
  expect(config).toContain('updatePeriodMillis: 1800000');
});

test('native refresh uses persisted headless updates and cancels when no widgets remain', () => {
  const receiver = fs.readFileSync(path.join(__dirname, '../../../plugins/android/DailyWidgetRefreshReceiver.java'), 'utf8');
  expect(receiver).toContain('RNWidgetJsCommunication.requestWidgetUpdate(context, "DaysWidget")');
  expect(receiver).toContain('setAndAllowWhileIdle');
  expect(receiver).toContain('PendingIntent.FLAG_IMMUTABLE');
  expect(receiver).toContain('if (widgetIds(context).length == 0)');
  const provider = fs.readFileSync(path.join(__dirname, '../../../plugins/android/DaysWidget.java'), 'utf8');
  expect(provider).toContain('DailyWidgetRefreshReceiver.cancel(context)');
});
