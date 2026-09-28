import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_CONFIG } from './global';
import commonsEs from '../translations/commons/es/index.json';
import loginEs from '../translations/login/es/index.json';
import flagsEs from '../translations/flags/es/index.json';

/**
 * CRMIA es una aplicación monolingüe (español). Se mantiene i18next para
 * centralizar los textos y poder añadir idiomas más adelante sin refactor.
 */
i18n.use(initReactI18next).init({
  resources: {
    es: {
      commons: commonsEs,
      login: loginEs,
      flags: flagsEs,
    },
  },
  lng: APP_CONFIG.DEFAULT_LANGUAGE,
  fallbackLng: 'es',
  defaultNS: 'commons',
  ns: ['commons', 'login', 'flags'],
  supportedLngs: ['es'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
