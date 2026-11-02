/** Fills `{name}` placeholders of a translated string: tf(t('x'), { name: 'Salma' }). */
export const tf = (text: string, vars: Record<string, string | number | null | undefined>): string =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
