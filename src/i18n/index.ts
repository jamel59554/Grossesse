import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './locales/fr/common.json';
import quests from './locales/fr/quests.json';
import weeks from './locales/fr/weeks.json';

// Pour ajouter une langue : créer locales/<lng>/*.json avec les mêmes clés
// et l'ajouter ici.
export const resources = {
  fr: { translation: { ...common, quests: { ...common.quests, ...quests }, weeks } },
} as const;

export const SUPPORTED_LANGUAGES = Object.keys(resources) as (keyof typeof resources)[];
export const DEFAULT_LANGUAGE = 'fr';

function detectLanguage(): string {
  const deviceLanguage = getLocales()[0]?.languageCode ?? DEFAULT_LANGUAGE;
  return (SUPPORTED_LANGUAGES as string[]).includes(deviceLanguage) ? deviceLanguage : DEFAULT_LANGUAGE;
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
