import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isRtl = i18n.language === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);
}
