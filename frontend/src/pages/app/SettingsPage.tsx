import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, SlidersHorizontal, Calendar, FileText, CreditCard, Upload, Scale,
  Plus, Trash2, Pencil, Check, X, Download, QrCode,
} from 'lucide-react';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api, listContractTypes, createContractType, updateContractType, deleteContractType } from '@/services/api';
import type { ContractType } from '@/services/api';
import { useLang } from '../../lib/lang';
import { RV } from '@/components/motion';

/* ── shared toggle ─────────────────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{ position: 'relative', width: 40, height: 24, border: 'none', borderRadius: 99, background: on ? 'var(--primary)' : 'var(--track)', cursor: 'pointer', padding: 0, transition: 'background .2s', flexShrink: 0 }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .2s cubic-bezier(.2,.8,.2,1)' }} />
    </button>
  );
}

/* ── field helper ──────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>
      {label}
      {children}
    </label>
  );
}

/* ── Entreprise tab ────────────────────────────────────────────────── */
const CF_KEYS = ['name', 'sector', 'ice', 'rc', 'if', 'cnss', 'address', 'city', 'phone', 'email'] as const;
const CF_LABELS: Record<string, string> = {
  name: 'Raison sociale', sector: "Secteur d'activité", ice: 'ICE', rc: 'Registre du commerce',
  if: 'Identifiant fiscal', cnss: 'N° CNSS employeur', address: 'Adresse', city: 'Ville', phone: 'Téléphone', email: 'Email RH',
};
const CF_MONO = ['ice', 'rc', 'if', 'cnss', 'phone'];

function TabEntreprise() {
  const { user } = useAuth();
  const [c, setC] = useState<Record<string, string>>({
    name: (user as any)?.profile?.company || 'Tython SARL',
    sector: 'Agence digitale', ice: '001234567000089', rc: '345678 · Casablanca',
    if: '40123456', cnss: '1234567', address: "112 boulevard d'Anfa", city: 'Casablanca',
    phone: '+212 5 22 00 00 00', email: 'rh@tython.ma',
  });
  const [dirty, setDirty] = useState(false);
  const set = (k: string, v: string) => { setC(f => ({ ...f, [k]: v })); setDirty(true); };

  const initials = c.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TY';

  return (
    <div style={{ padding: 22, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
        <span style={{ width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#06141a,#0e6f84)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, flexShrink: 0 }}>
          {initials}
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{c.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Logo utilisé sur tous les documents générés</div>
        </div>
        <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Upload size={14} strokeWidth={1.8} /> Changer le logo
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 14 }}>
        {CF_KEYS.map(k => (
          <Field key={k} label={CF_LABELS[k]}>
            <input
              value={c[k] || ''}
              onChange={e => set(k, e.target.value)}
              className="input"
              style={{ fontFamily: CF_MONO.includes(k) ? 'var(--font-mono)' : undefined, fontSize: 14 }}
            />
          </Field>
        ))}
      </div>
      {dirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => { toast.success('Informations enregistrées'); setDirty(false); }}>
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Préférences tab ───────────────────────────────────────────────── */
const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
function TabPreferences() {
  const [lang, setLang] = useState('fr');
  const [tz, setTz] = useState('Africa/Casablanca');
  const [dateFmt, setDateFmt] = useState('dmy');
  const [cur, setCur] = useState('MAD');
  const [days, setDays] = useState([1, 1, 1, 1, 1, 0, 0]);

  const LANGS = [{ key: 'fr', label: 'Français' }, { key: 'ar', label: 'العربية' }, { key: 'en', label: 'English' }];

  return (
    <div style={{ padding: 22, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Langue par défaut de l'interface</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginTop: 10, maxWidth: 460 }}>
          {LANGS.map(l => (
            <button key={l.key} onClick={() => setLang(l.key)}
              style={{ height: 46, borderRadius: 12, border: `1px solid ${lang === l.key ? 'var(--primary)' : 'var(--border)'}`, background: lang === l.key ? 'var(--primary-soft)' : 'var(--surface)', color: lang === l.key ? 'var(--primary)' : 'var(--text-2)', fontFamily: l.key === 'ar' ? 'var(--font-ui)' : undefined, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
        <Field label="Fuseau horaire">
          <select value={tz} onChange={e => setTz(e.target.value)} className="select" style={{ height: 42, fontSize: 14 }}>
            <option value="Africa/Casablanca">Africa/Casablanca (GMT+1)</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="UTC">UTC</option>
          </select>
        </Field>
        <Field label="Format de date">
          <select value={dateFmt} onChange={e => setDateFmt(e.target.value)} className="select" style={{ height: 42, fontSize: 14 }}>
            <option value="dmy">JJ/MM/AAAA · 01/11/2026</option>
            <option value="iso">AAAA-MM-JJ · 2026-11-01</option>
          </select>
        </Field>
        <Field label="Devise">
          <select value={cur} onChange={e => setCur(e.target.value)} className="select" style={{ height: 42, fontSize: 14 }}>
            <option value="MAD">MAD · Dirham marocain</option>
            <option value="EUR">EUR · Euro</option>
          </select>
        </Field>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Semaine de travail</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {DAYS_FR.map((d, i) => (
            <button key={i} onClick={() => setDays(ds => ds.map((v, j) => j === i ? (v ? 0 : 1) : v))}
              style={{ width: 48, height: 44, borderRadius: 11, border: `1px solid ${days[i] ? 'var(--primary)' : 'var(--border)'}`, background: days[i] ? 'var(--primary-soft)' : 'var(--surface)', color: days[i] ? 'var(--primary)' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>
          {days.filter(Boolean).length} jour(s) de travail · {7 - days.filter(Boolean).length} jour(s) de repos
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => toast.success('Préférences enregistrées')}>Enregistrer</button>
      </div>
    </div>
  );
}

/* ── Congés tab ────────────────────────────────────────────────────── */
const HOLS = [
  ['01/01', 'Nouvel An'], ['11/01', "Manifeste de l'Indépendance"], ['14/01', 'Nouvel An amazigh'],
  ['≈ 20/03', 'Aïd al-Fitr (2 jours)'], ['01/05', 'Fête du Travail'], ['≈ 27/05', 'Aïd al-Adha (2 jours)'],
  ['≈ 16/06', '1er Moharram'], ['30/07', 'Fête du Trône'], ['14/08', 'Allégeance Oued Ed-Dahab'],
  ['20/08', 'Révolution du Roi et du Peuple'], ['21/08', 'Fête de la Jeunesse'],
  ['≈ 25/08', 'Aïd al-Mawlid (2 jours)'], ['06/11', 'Marche Verte'], ['18/11', "Fête de l'Indépendance"],
] as [string, string][];

function TabConges() {
  const [monthly, setMonthly] = useState('1.5');
  const [bonus, setBonus] = useState('1.5');
  const [cap, setCap] = useState('30');
  const [flow, setFlow] = useState('mgr-rh');
  const [holsOn, setHolsOn] = useState(HOLS.map(() => true));
  const holCount = holsOn.filter(Boolean).length;

  return (
    <div style={{ padding: 22, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Règles d'acquisition</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 14 }}>
        <Field label="Jours acquis par mois">
          <input type="number" step="0.5" value={monthly} onChange={e => setMonthly(e.target.value)} className="input" style={{ height: 42, fontSize: 14 }} />
        </Field>
        <Field label="Bonus par 5 ans d'ancienneté">
          <input type="number" step="0.5" value={bonus} onChange={e => setBonus(e.target.value)} className="input" style={{ height: 42, fontSize: 14 }} />
        </Field>
        <Field label="Plafond annuel (jours)">
          <input type="number" value={cap} onChange={e => setCap(e.target.value)} className="input" style={{ height: 42, fontSize: 14 }} />
        </Field>
        <Field label="Circuit de validation">
          <select value={flow} onChange={e => setFlow(e.target.value)} className="select" style={{ height: 42, fontSize: 14 }}>
            <option value="mgr-rh">Manager puis RH</option>
            <option value="rh">RH uniquement</option>
            <option value="mgr">Manager uniquement</option>
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--success-soft)', color: 'var(--success-ink)', fontSize: 13, lineHeight: 1.5 }}>
        <Scale size={16} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
        Valeurs par défaut conformes au Code du travail : 1,5 jour ouvrable par mois de service, +1,5 jour par période de 5 ans, dans la limite de 30 jours.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Jours fériés 2026</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{holCount} activés</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 6 }}>
        {HOLS.map(([d, name], i) => (
          <button key={i} onClick={() => setHolsOn(h => h.map((v, j) => j === i ? !v : v))}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 11, border: '1px solid var(--border)', background: holsOn[i] ? 'var(--surface)' : 'var(--subtle)', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', opacity: holsOn[i] ? 1 : 0.5 }}>
            <span style={{ width: 58, fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: holsOn[i] ? 'var(--primary)' : 'var(--text-muted)' }}>{d}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{name}</span>
            <span style={{ position: 'relative', width: 32, height: 18, borderRadius: 99, background: holsOn[i] ? 'var(--primary)' : 'var(--track)', flexShrink: 0, transition: 'background .2s' }}>
              <span style={{ position: 'absolute', top: 2, left: holsOn[i] ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
            </span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>≈ Fêtes religieuses : dates lunaires ajustées automatiquement chaque année.</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => toast.success('Paramètres congés enregistrés')}>Enregistrer</button>
      </div>
    </div>
  );
}

/* ── Documents tab ─────────────────────────────────────────────────── */
function TabDocuments() {
  const [prefix, setPrefix] = useState('ATT-2026-');
  const [docLang, setDocLang] = useState('fr');
  const [qr, setQr] = useState(true);
  const nextNo = `${prefix}${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`;

  return (
    <div style={{ padding: 22, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 14 }}>
        <Field label="Préfixe de numérotation">
          <input value={prefix} onChange={e => setPrefix(e.target.value)} className="input" style={{ fontFamily: 'var(--font-mono)', fontSize: 14, height: 42 }} />
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
            Prochain document : <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{nextNo}</strong>
          </span>
        </Field>
        <Field label="Langue par défaut des documents">
          <select value={docLang} onChange={e => setDocLang(e.target.value)} className="select" style={{ height: 42, fontSize: 14 }}>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 12 }}>
        <button onClick={() => toast.info('Chargement de signature (démo)')}
          style={{ height: 120, borderRadius: 14, border: '1.5px dashed var(--primary-200,#b9dfe5)', background: 'var(--primary-soft)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--primary)' }}>
          <span style={{ fontFamily: "'Brush Script MT','Segoe Script',cursive", fontSize: 26, color: 'var(--primary)' }}>S. Idrissi</span>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Signature · remplacer</span>
        </button>
        <button onClick={() => toast.info('Chargement de cachet (démo)')}
          style={{ height: 120, borderRadius: 14, border: '1.5px dashed var(--primary-200,#b9dfe5)', background: 'var(--primary-soft)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--primary)' }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid rgba(14,111,132,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 7.5, fontWeight: 700, lineHeight: 1.3, textAlign: 'center', transform: 'rotate(-12deg)' }}>TYTHON<br />SARL</span>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Cachet · remplacer</span>
        </button>
      </div>

      <button onClick={() => setQr(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <QrCode size={20} strokeWidth={1.8} style={{ color: 'var(--primary)' }} />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Code de vérification en pied de page</span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Les destinataires (banques, consulats…) vérifient l'authenticité du document en ligne.</span>
        </span>
        <Toggle on={qr} onChange={() => setQr(v => !v)} />
      </button>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => toast.success('Paramètres documents enregistrés')}>Enregistrer</button>
      </div>
    </div>
  );
}

/* ── Facturation tab ───────────────────────────────────────────────── */
const INVOICES = [
  { label: 'Novembre 2026', no: 'INV-2026-011', amount: '4 200 MAD' },
  { label: 'Octobre 2026',  no: 'INV-2026-010', amount: '4 200 MAD' },
  { label: 'Septembre 2026',no: 'INV-2026-009', amount: '4 200 MAD' },
];
function TabFacturation() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ position: 'relative', overflow: 'hidden', padding: 22, borderRadius: 20, background: 'var(--ink-950)', color: '#e8eff1' }}>
        <div className="wedy-drift" aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.45),transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: '#5fe3f0' }}>VOTRE FORMULE</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-.03em', marginTop: 6 }}>Enterprise</div>
            <div style={{ fontSize: 13.5, color: '#9fb4bb', marginTop: 4 }}>Contrat annuel · renouvellement le 01/01/2027</div>
          </div>
          <button className="btn" style={{ height: 40, background: '#effbfc', color: '#06141a', border: 'none' }} onClick={() => toast.info('Contactez support@wedy.ma')}>
            Contacter mon conseiller
          </button>
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 20 }}>
          {[
            { label: 'Collaborateurs actifs', value: '126 / 200', pct: 63 },
            { label: 'Documents ce mois', value: '48 / illimité', pct: 20 },
            { label: 'Stockage', value: '4,2 Go / 50 Go', pct: 8 },
          ].map((u, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize: 12, color: '#9fb4bb' }}>{u.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{u.value}</div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.1)', overflow: 'hidden', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${u.pct}%`, borderRadius: 99, background: 'linear-gradient(90deg,#16b6c8,#9a8bf0)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, borderBottom: '1px solid var(--border)' }}>Factures</div>
        {INVOICES.map(inv => (
          <div key={inv.no} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--success-soft)', color: 'var(--success-ink)', flexShrink: 0 }}>
              <FileText size={16} strokeWidth={1.8} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{inv.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>{inv.no}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{inv.amount}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'var(--success-soft)', color: 'var(--success-ink)' }}>Payée</span>
            <button onClick={() => toast.info('Téléchargement (démo)')}
              style={{ width: 34, height: 34, border: 'none', borderRadius: 9, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={15} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Référentiels tab (kept with real API) ────────────────────────── */
function TabReferentiels() {
  const qc = useQueryClient();
  const { data: types = [], isLoading } = useQuery({ queryKey: ['contract-types'], queryFn: listContractTypes });
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding]   = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const createMut = useMutation({
    mutationFn: () => createContractType({ name: newName.trim(), description: newDesc.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-types'] }); setNewName(''); setNewDesc(''); setAdding(false); toast.success('Type ajouté'); },
    onError: () => toast.error('Erreur lors de la création'),
  });
  const updateMut = useMutation({
    mutationFn: (id: string) => updateContractType(id, { name: editName.trim(), description: editDesc.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-types'] }); setEditId(null); toast.success('Mis à jour'); },
    onError: () => toast.error('Erreur'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContractType(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-types'] }); toast.success('Supprimé'); },
    onError: () => toast.error('Erreur'),
  });

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0, fontFamily: 'var(--font-display)' }}>Types de contrat</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Gérez les types de contrat disponibles (CDI, CDD, Stage…)</p>
        </div>
        <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { setAdding(true); setEditId(null); }}>
          <Plus size={13} strokeWidth={1.8} /> Ajouter
        </button>
      </div>

      {adding && (
        <div style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <label className="label">Nom *</label>
              <input className="input" placeholder="ex : CDI" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Description (optionnel)</label>
              <input className="input" placeholder="Contrat à Durée Indéterminée" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setNewName(''); setNewDesc(''); }}><X size={13} strokeWidth={1.8} /> Annuler</button>
            <button className="btn btn-primary btn-sm" disabled={!newName.trim() || createMut.isPending} onClick={() => createMut.mutate()}><Check size={13} strokeWidth={1.8} /> Enregistrer</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}><Spinner /></div>
      ) : types.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Aucun type de contrat configuré.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {types.map((ct: ContractType) => (
            <div key={ct.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: 'var(--subtle)' }}>
              {editId === ct.id ? (
                <>
                  <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: 120, fontSize: 13 }} autoFocus />
                  <input className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description…" style={{ flex: 1, fontSize: 13 }} />
                  <button onClick={() => updateMut.mutate(ct.id)} disabled={!editName.trim()} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'var(--primary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} strokeWidth={1.8} /></button>
                  <button onClick={() => setEditId(null)} style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} strokeWidth={1.8} /></button>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', background: 'var(--primary-soft)', border: '1px solid var(--primary)', borderRadius: 6, padding: '2px 10px', flexShrink: 0 }}>{ct.name}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)' }}>{ct.description || <em style={{ opacity: 0.5 }}>Pas de description</em>}</span>
                  <button onClick={() => { setEditId(ct.id); setEditName(ct.name); setEditDesc(ct.description ?? ''); }} style={{ width: 30, height: 30, border: 'none', borderRadius: 7, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13} strokeWidth={1.8} /></button>
                  <button onClick={() => { if (confirm(`Supprimer « ${ct.name} » ?`)) deleteMut.mutate(ct.id); }} style={{ width: 30, height: 30, border: 'none', borderRadius: 7, background: 'transparent', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} strokeWidth={1.8} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'company', label: 'Entreprise',       Icon: Building2 },
  { key: 'prefs',   label: 'Préférences',       Icon: SlidersHorizontal },
  { key: 'leave',   label: 'Congés et temps',   Icon: Calendar },
  { key: 'docs',    label: 'Documents',         Icon: FileText },
  { key: 'refs',    label: 'Référentiels RH',   Icon: FileText },
  { key: 'billing', label: 'Facturation',       Icon: CreditCard },
];

export default function SettingsPage() {
  const { t } = useLang() as any;
  const [tab, setTab] = useState('company');

  return (
    <Page>
      <PageHeader title={t('settings')} subtitle="Les informations de votre entreprise et les règles appliquées partout dans Wedy." />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <RV>
          <nav style={{ flex: '0 1 230px', minWidth: 200, position: 'sticky', top: 90, display: 'flex', flexDirection: 'column', gap: 3, padding: 8, borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {TABS.map(tb => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 12px', border: 'none', borderRadius: 11, background: tab === tb.key ? 'var(--ink-950)' : 'transparent', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: tab === tb.key ? '#fff' : 'var(--text-2)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { if (tab !== tb.key) e.currentTarget.style.background = 'var(--subtle)'; }}
                onMouseLeave={e => { if (tab !== tb.key) e.currentTarget.style.background = 'transparent'; }}
              >
                <tb.Icon size={16} strokeWidth={1.8} /> {tb.label}
              </button>
            ))}
          </nav>
        </RV>

        {/* Content */}
        <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RV key={tab}>
            {tab === 'company'  && <TabEntreprise />}
            {tab === 'prefs'    && <TabPreferences />}
            {tab === 'leave'    && <TabConges />}
            {tab === 'docs'     && <TabDocuments />}
            {tab === 'refs'     && <TabReferentiels />}
            {tab === 'billing'  && <TabFacturation />}
          </RV>
        </div>
      </div>
    </Page>
  );
}
