import React, { useState } from 'react';
import { Page } from '../../components/layout/AppShell';
import {
  Search, Rocket, Users, FileText, Calendar, Wallet, ShieldCheck, Puzzle,
  ChevronDown, MessageSquare, Mail, Clock, ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Data ──────────────────────────────────────────────────────────────────────
const CATS = [
  { key: 'start',   label: 'Démarrage',    Icon: Rocket,      tint: '#e4f2f4', color: '#0b5f72', n: 6 },
  { key: 'people',  label: 'Employés',     Icon: Users,       tint: '#ece9fb', color: '#5444b8', n: 9 },
  { key: 'docs',    label: 'Documents',    Icon: FileText,    tint: '#e1f5ec', color: '#0f6f49', n: 12 },
  { key: 'leave',   label: 'Congés',       Icon: Calendar,    tint: '#fbefda', color: '#8a5207', n: 8 },
  { key: 'pay',     label: 'Paie',         Icon: Wallet,      tint: '#fbe9e6', color: '#a33a28', n: 7 },
  { key: 'sec',     label: 'Sécurité',     Icon: ShieldCheck, tint: '#eef2f4', color: '#33474f', n: 5 },
  { key: 'int',     label: 'Intégrations', Icon: Puzzle,      tint: '#e7eefb', color: '#2f4bb0', n: 6 },
];

const CAT_LABELS: Record<string, string> = Object.fromEntries(CATS.map(c => [c.key, c.label]));

const FAQ = [
  { cat: 'start',  q: "Comment importer mes employés existants ?",              a: "Depuis Employés › Importer, déposez un fichier Excel ou CSV : Wedy détecte automatiquement les colonnes (nom, CIN, poste, date d'embauche…). Vous pouvez aussi importer un CV : l'IA pré-remplit le dossier pour vous." },
  { cat: 'start',  q: "Mes employés peuvent-ils accéder à Wedy ?",             a: "Oui, via le portail employé : chacun consulte ses soldes, demande des congés ou des documents et suit ses formations, depuis un ordinateur ou un téléphone." },
  { cat: 'docs',   q: "Puis-je générer un document en arabe ?",                a: "Oui. Choisissez la langue à l'étape 3 du générateur. Les modèles disponibles en arabe s'affichent de droite à gauche ; avec la rédaction IA, Wedy traduit aussi les autres modèles." },
  { cat: 'docs',   q: "Comment ajouter ma signature et le cachet de l'entreprise ?", a: "Dans Paramètres › Documents, téléversez une image de votre signature et de votre cachet. Ils sont apposés automatiquement sur chaque document généré." },
  { cat: 'leave',  q: "Comment Wedy calcule-t-il le solde de congés ?",        a: "Par défaut, 1,5 jour ouvrable par mois de service, plus 1,5 jour par période de 5 ans d'ancienneté, conformément au Code du travail. Vous pouvez ajuster ces règles dans Paramètres › Congés et temps." },
  { cat: 'leave',  q: "Les jours fériés religieux sont-ils pris en compte ?",  a: "Oui. Les fêtes religieuses suivent le calendrier lunaire : Wedy ajuste leurs dates chaque année, et vous pouvez les corriger manuellement si besoin." },
  { cat: 'pay',    q: "Wedy calcule-t-il la CNSS et l'IR ?",                   a: "Wedy prépare les variables de paie (absences, primes, heures supplémentaires) et contrôle les anomalies. Le calcul final s'exporte vers Sage Paie ou Cegid, et le fichier Damancom est généré pour la CNSS." },
  { cat: 'pay',    q: "Que vérifie le contrôle IA des bulletins ?",            a: "Les écarts inhabituels : heures supplémentaires élevées, primes sans justificatif, fins de contrat à intégrer, variations de salaire. Chaque alerte doit être vérifiée avant la validation de la paie." },
  { cat: 'sec',    q: "Comment mes données sont-elles protégées ?",            a: "Vos données sont chiffrées au repos (AES-256) et en transit (TLS 1.3), sauvegardées chaque jour et traitées conformément à la loi 09-08. Chaque action est tracée dans le journal d'audit." },
  { cat: 'int',    q: "Comment connecter Slack ou Teams ?",                    a: "Dans Intégrations, activez l'outil souhaité et autorisez l'accès. Les demandes de congé et les alertes arrivent alors dans vos canaux, avec des boutons d'approbation." },
  { cat: 'people', q: "Comment compléter un dossier incomplet ?",              a: "Ouvrez le dossier, onglet Fichiers, puis « Compléter avec l'IA ». Wedy lit les pièces (CV, diplômes, contrat) et propose les champs manquants ; rien n'est modifié sans votre validation." },
];

const SUGG = ['Solde de congés', 'Modèle en arabe', 'Export Sage Paie', 'Importer des employés'];

const NEWS = [
  { tag: 'IA',       tint: '#ece9fb', color: '#5444b8', t: 'Rédaction IA des documents en arabe',    d: 'Octobre 2026' },
  { tag: 'Nouveau',  tint: '#e1f5ec', color: '#0f6f49', t: 'Contrôle IA des bulletins de paie',      d: 'Septembre 2026' },
  { tag: 'Amélioré', tint: '#e4f2f4', color: '#0b5f72', t: 'Organigramme interactif avec recherche', d: 'Août 2026' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = norm(q.trim()).split(/\s+/).filter(w => w.length > 2);

  const filteredFaq = FAQ.filter(f => {
    const matchCat = !catFilter || f.cat === catFilter;
    const matchQ = !words.length || words.some(w => norm(f.q + ' ' + f.a).includes(w.replace(/s$/, '')));
    return matchCat && matchQ;
  });

  const faqLabel = catFilter || q
    ? `${filteredFaq.length} résultat${filteredFaq.length > 1 ? 's' : ''}${catFilter ? ' · ' + CAT_LABELS[catFilter] : ''}`
    : `${FAQ.length} questions`;

  return (
    <Page>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Hero */}
        <section style={{
          position: 'relative', overflow: 'hidden', borderRadius: 26,
          background: '#06141a', color: '#e8eff1', padding: '42px 28px 34px',
          textAlign: 'center', isolation: 'isolate',
        }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
            <div className="wedy-drift" style={{ position: 'absolute', left: '-6%', top: '-70%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} />
            <div className="wedy-drift" style={{ position: 'absolute', right: '-6%', top: '-50%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.38),transparent)', animationDelay: '-9s', animationDuration: '27s' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '40px 40px', WebkitMaskImage: 'radial-gradient(ellipse 60% 70% at 50% 40%,#000 30%,transparent 80%)', maskImage: 'radial-gradient(ellipse 60% 70% at 50% 40%,#000 30%,transparent 80%)' }} />
          </div>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#0f262e', border: '2px solid rgba(95,227,240,.5)', boxShadow: '0 0 40px -6px rgba(39,192,212,.7)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            <img src="/wedy-avatar.png" alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ margin: '16px 0 0', color: '#f1f8f9', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px,3.4vw,42px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>
            Comment pouvons-nous vous aider ?
          </h1>
          <div style={{ position: 'relative', maxWidth: 560, margin: '22px auto 0' }}>
            <Search size={18} style={{ position: 'absolute', left: 18, top: '50%', marginTop: -9, color: '#8ea5ad', pointerEvents: 'none' }} />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setOpenIdx(null); }}
              placeholder="Rechercher : congés, CNSS, modèle en arabe…"
              style={{
                width: '100%', height: 54, padding: '0 18px 0 48px', borderRadius: 16,
                border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.07)',
                color: '#fff', fontFamily: 'inherit', fontSize: 15, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            {SUGG.map(s => (
              <button key={s} type="button"
                onClick={() => { setQ(s); setCatFilter(null); setOpenIdx(null); }}
                style={{ height: 32, padding: '0 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.05)', color: '#cfdde1', fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Category cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
          {CATS.map(c => {
            const Icon = c.Icon;
            const active = catFilter === c.key;
            return (
              <button key={c.key} type="button"
                onClick={() => { setCatFilter(active ? null : c.key); setOpenIdx(null); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                  padding: 16, borderRadius: 18,
                  border: `1px solid ${active ? c.color : 'var(--border)'}`,
                  background: active ? c.tint : '#fff',
                  fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                  transition: 'border-color .2s',
                }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.tint, color: c.color }}>
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{c.n} articles</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          {/* FAQ */}
          <div style={{ flex: '2 1 520px', minWidth: 0, borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 20px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Questions fréquentes</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{faqLabel}</span>
            </div>
            {filteredFaq.length === 0 ? (
              <div style={{ padding: '30px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 14, color: 'var(--text-2)' }}>
                Aucune réponse trouvée.
              </div>
            ) : (
              filteredFaq.map((f, i) => {
                const cat = CATS.find(c => c.key === f.cat)!;
                const open = openIdx === i;
                return (
                  <div key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <button type="button" onClick={() => setOpenIdx(open ? null : i)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '15px 20px', border: 'none',
                        background: open ? '#f8fbfb' : '#fff',
                        fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                        transition: 'background .2s',
                      }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cat.tint, color: cat.color, whiteSpace: 'nowrap' }}>
                        {cat.label}
                      </span>
                      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{f.q}</span>
                      <ChevronDown size={17} style={{ color: 'var(--text-muted)', transition: 'transform .3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                    </button>
                    {open && (
                      <div style={{ padding: '0 20px 18px 20px', fontSize: 14, lineHeight: 1.65, color: '#33474f' }}>
                        {f.a}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: 12.5, color: 'var(--text-muted)' }}>
                          Cette réponse vous a aidé ?
                          <button type="button" onClick={() => toast.success('Merci pour votre retour !')}
                            style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--success-ink)', cursor: 'pointer' }}>Oui</button>
                          <button type="button" onClick={() => toast.info('Merci · notre équipe va améliorer cet article')}
                            style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--danger-ink)', cursor: 'pointer' }}>Non</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar */}
          <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Ask Wedy */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 18, borderRadius: 20, background: 'linear-gradient(140deg,#5444b8,#6d5ad6 55%,#0e7f96)', color: '#fff', cursor: 'pointer' }}
              onClick={() => toast.info('Ouverture du Copilote…')}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                <img src="/wedy-avatar.png" alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Demandez à Wedy</div>
                <div style={{ fontSize: 12.5, opacity: .9, marginTop: 2 }}>Réponse immédiate, en français, arabe ou anglais.</div>
              </div>
              <ArrowUpRight size={18} />
            </div>

            {/* Contact support */}
            <div style={{ padding: 18, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Contacter le support</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => toast.info('Une conseillère vous répond dans un instant…')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                  <MessageSquare size={17} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Chat en direct</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)' }}>Réponse moyenne en 4 min</span>
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-ink)', flexShrink: 0 }} />
                </button>
                <a href="mailto:support@wedy.ma" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', textDecoration: 'none' }}>
                  <Mail size={17} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>support@wedy.ma</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)' }}>Réponse sous 2 h ouvrées</span>
                  </span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, background: 'var(--subtle)' }}>
                  <Clock size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Lundi – vendredi, 9 h – 18 h (heure de Casablanca)</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ padding: 18, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ position: 'relative', display: 'inline-flex', width: 9, height: 9 }}>
                  <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success-ink)' }} />
                  <span style={{ position: 'relative', width: 9, height: 9, borderRadius: '50%', background: 'var(--success-ink)' }} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Tous les systèmes sont opérationnels</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 13 }}>
                {[
                  ['Application',    '99,99 %'],
                  ['Copilote IA',    '99,95 %'],
                  ['API et webhooks','99,98 %'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#33474f' }}>{k}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success-ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* News */}
            <div style={{ padding: 18, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Nouveautés</div>
              {NEWS.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: n.tint, color: n.color, height: 'fit-content', whiteSpace: 'nowrap' }}>
                    {n.tag}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{n.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
