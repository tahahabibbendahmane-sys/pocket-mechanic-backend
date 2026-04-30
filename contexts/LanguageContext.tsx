import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Language, getTranslation, TranslationKeys } from '@/i18n';

const LANGUAGE_STORAGE_KEY = '@pocket_mechanic:language';
const SUPPORTED_LANGUAGES: Language[] = ['en', 'fr', 'es'];

function getDeviceLanguage(): Language {
  try {
    const locales = getLocales();
    if (locales.length > 0) {
      const langCode = locales[0].languageCode as Language;
      if (SUPPORTED_LANGUAGES.includes(langCode)) {
        return langCode;
      }
    }
  } catch {}
  return 'en';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage as Language)) {
          setLanguageState(savedLanguage as Language);
        } else {
          const deviceLang = getDeviceLanguage();
          setLanguageState(deviceLang);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (newLanguage: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      setLanguageState(newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  const t = getTranslation(language);

  // Don't render children until language is loaded to prevent flash
  if (isLoading) {
    return null;
  }

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
