import { en } from './en';
import { fr } from './fr';
import { es } from './es';

export type TranslationKeys = typeof en;

export type Language = 'en' | 'fr' | 'es';

export const translations: Record<Language, TranslationKeys> = {
  en,
  fr,
  es,
};

export function getTranslation(language: Language): TranslationKeys {
  return translations[language] || translations.en;
}
