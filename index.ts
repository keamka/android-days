import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';

// Must also register when Android starts JavaScript without mounting the app.
registerWidgetTaskHandler(widgetTaskHandler);
registerRootComponent(App);
