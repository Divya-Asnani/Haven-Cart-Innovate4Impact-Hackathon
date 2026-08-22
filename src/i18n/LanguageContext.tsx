import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { translations, LanguageCode, TranslationKey } from './translations';

interface LanguageContextProps {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await SecureStore.getItemAsync('app_language');
        if (storedLang === 'en' || storedLang === 'hi') {
          setLanguageState(storedLang as LanguageCode);
        }
      } catch (error) {
        console.error('Failed to load language', error);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: LanguageCode) => {
    try {
      await SecureStore.setItemAsync('app_language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Failed to save language', error);
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
