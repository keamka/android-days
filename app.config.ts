import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Days++',
  slug: 'days-plus-plus',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  scheme: 'daysplusplus',
  platforms: ['android'],
  android: {
    package: 'com.daysplusplus.app',
    versionCode: 1,
    allowBackup: false,
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.VIBRATE',
    ],
  },
  plugins: [
    'expo-status-bar',
    '@react-native-community/datetimepicker',
    './plugins/withDailyWidgetRefresh',
    [
      'react-native-android-widget',
      {
        fonts: ['./assets/fonts/WidgetSerif.ttf'],
        widgets: [
          {
            name: 'DaysWidget',
            label: 'Days++',
            description: 'A little reminder of the day you are living.',
            minWidth: '250dp',
            minHeight: '140dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
  ],
};

export default config;
