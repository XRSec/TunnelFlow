import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN }
};

const getSystemLanguage = () => {
  if (navigator.language.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
};

const storedLang = localStorage.getItem('tunnelflow:language') || 'system';
const initialLang = storedLang === 'system' ? getSystemLanguage() : storedLang;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export const changeAppLanguage = (lang: 'system' | 'zh-CN' | 'en') => {
  localStorage.setItem('tunnelflow:language', lang);
  if (lang === 'system') {
    i18n.changeLanguage(getSystemLanguage());
  } else {
    i18n.changeLanguage(lang);
  }
};

export default i18n;

window.addEventListener('storage', (e) => {
  if (e.key === 'tunnelflow:language') {
    const newLang = e.newValue || 'system';
    if (newLang === 'system') {
      i18n.changeLanguage(getSystemLanguage());
    } else {
      i18n.changeLanguage(newLang);
    }
  }
});
