import ReactDOM from 'react-dom/client';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from './app/App';
import { isNativeIOS } from './shared/config/config';
import './styles/base.css';
import './styles/layout.css';
import './styles/dashboard.css';
import './styles/components.css';
import './styles/atendimento.css';
import './styles/login.css';
import './styles/theme.css';
import './styles/ios.css';

const nativeIOS = isNativeIOS();

if (nativeIOS) {
  document.documentElement.classList.add('cf-native-ios');
  const syncStatusBar = () => {
    const dark = document.documentElement.classList.contains('dark');
    StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark }).catch(() => {});
  };
  syncStatusBar();
  new MutationObserver(syncStatusBar).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

if (nativeIOS) {
  window.requestAnimationFrame(() => SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {}));
}
