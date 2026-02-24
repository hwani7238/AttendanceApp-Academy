import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';
import AttendanceApp from './AttendanceApp';

const RootApp = Platform.OS === 'web' ? App : AttendanceApp;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(RootApp);
