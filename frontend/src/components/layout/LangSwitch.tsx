import { useLang, type Lang } from '@/lib/lang';

const OPTIONS: { code: Lang; short: string; name: string }[] = [
  { code: 'fr', short: 'FR', name: 'Français' },
  { code: 'ar', short: 'ع', name: 'العربية' },
  { code: 'en', short: 'EN', name: 'English' },
];

/** FR | ع | EN switch (moved to the topbar / portal nav: the redesigned sidebar has no controls). */
export function LangSwitch() {
  const { lang, setLang, t } = useLang();
  return (
    <div className="wy-lang" role="group" aria-label={t('language_switch')}>
      {OPTIONS.map(o => (
        <button
          key={o.code} type="button" lang={o.code} title={o.name} aria-label={o.name} aria-pressed={lang === o.code}
          className={`wy-lang-item${lang === o.code ? ' is-active' : ''}`}
          onClick={() => setLang(o.code)}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
