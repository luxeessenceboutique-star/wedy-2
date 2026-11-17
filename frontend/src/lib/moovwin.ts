// Moovwin (moovwin.com), a job board without a publishing API: what « Diffuser l'annonce » prepares for its form.
export const MOOVWIN_URL = 'https://moovwin.com/';
export const MOOVWIN_COLOR = '#e8590c';

// the usual job-board categories (backend: annonces.job_category) — the closest one is chosen on Moovwin
const CATEGORY_RULES: [RegExp, string][] = [
  [/d[ée]velopp|developer|full ?stack|front|back ?end|data|\bia\b|\bai\b|devops|informati|logiciel|software|cloud|r[ée]seau|syst[eè]me/i, 'Informatique / Développement'],
  [/commercial|vente|sales|business|account|client/i, 'Commercial / Vente'],
  [/marketing|communication|social media|community|seo|contenu/i, 'Marketing / Communication'],
  [/compta|finance|audit|contr[ôo]le de gestion|tr[ée]sor|fiscal/i, 'Finance / Comptabilité'],
  [/\brh\b|ressources humaines|recrut|talent|paie/i, 'Ressources humaines'],
  [/design|\bux\b|\bui\b|graphi|cr[ée]ati/i, 'Design / Création'],
  [/assistant|administrati|secr[ée]tari|office/i, 'Administratif'],
  [/logisti|transport|achat|supply/i, 'Logistique / Achats'],
];
export const jobCategory = (title: string) => CATEGORY_RULES.find(([re]) => re.test(title))?.[1] ?? 'Autre';
export const educationOf = (text: string) => /bac\s*\+\s*\d/i.exec(text)?.[0].replace(/\s+/g, '').replace(/^bac/i, 'Bac') ?? '';
/** The ad's text without the markdown marks (Moovwin's description box is plain text). */
export const plainText = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '').replace(/\n{3,}/g, '\n\n').trim();

