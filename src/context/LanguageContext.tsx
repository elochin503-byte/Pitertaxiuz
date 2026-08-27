import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../lib/i18n';

interface LanguageContextType {
  lang: Language;
  language: Language;
  setLang: (l: Language) => void;
  setLanguage: (l: Language) => void;
  t: typeof translations.uz;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('piter_taxi_lang') as Language;
    return saved === 'ru' || saved === 'en' ? saved : 'uz';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('piter_taxi_lang', newLang);
  };

  const currentTranslations = translations[lang] || translations.uz;

  return (
    <LanguageContext.Provider
      value={{
        lang,
        language: lang,
        setLang,
        setLanguage: setLang,
        t: currentTranslations
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
