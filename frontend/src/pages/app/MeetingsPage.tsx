import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Video, Copy, ExternalLink, Plus, MapPin, Clock, Sparkles,
  CheckCircle2, Send, Download, CalendarPlus,
} from 'lucide-react';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { Avatar, Modal } from '../../components/ui';
import { getOrgChart } from '@/services/api';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';

// ── Static data ───────────────────────────────────────────────────────────────

const AV_GRADS = [
  'linear-gradient(135deg,#0e6f84,#16b6c8)',
  'linear-gradient(135deg,#5444b8,#9a8bf0)',
  'linear-gradient(135deg,#0f6f49,#2bbd86)',
  'linear-gradient(135deg,#a8650a,#e6a948)',
  'linear-gradient(135deg,#b8402c,#ef6b54)',
  'linear-gradient(135deg,#2f4bb0,#4a69d8)',
];

const KIND: Record<string, [string, string, string]> = {
  onb:    ['Onboarding',  '#e4f2f4', '#0b5f72'],
  int:    ['Entretien',   '#ece9fb', '#5444b8'],
  meet:   ['Réunion',     '#e1f5ec', '#0f6f49'],
  train:  ['Formation',   '#fbefda', '#8a5207'],
  review: ['Revue',       '#eef2f4', '#33474f'],
};

interface MeetingAction {
  t: string; owner: string; due: string;
}

interface Meeting {
  id: string; group: string; time: string; dur: string; kind: string;
  title: string; place: string; visio: boolean; people: string[];
  agenda?: string[];
  summary?: string;
  decisions?: string[];
  actions?: MeetingAction[];
}

const UPCOMING: Meeting[] = [
  { id: 'm1', group: 'Lundi 2 novembre', time: '09:00', dur: '1 h', kind: 'onb', title: 'Bilan 30 jours · Mehdi Rami', place: 'Salle Ourika', visio: false, people: ['Mehdi Rami', 'Salma Idrissi', 'Adil Mernissi'], agenda: ['Retour sur le premier mois', 'Prise en main du CRM et des outils', 'Premiers résultats commerciaux', 'Objectifs des 60 prochains jours'] },
  { id: 'm2', group: 'Lundi 2 novembre', time: '10:30', dur: '1 h', kind: 'int', title: 'Entretien · Zineb Haddad', place: 'Google Meet', visio: true, people: ['Zineb Haddad', 'Imane Kettani', 'Driss Lahlou'], agenda: ["Présentation du parcours", "Cas pratique : conception d'une API", 'Questions de la candidate', 'Prochaines étapes'] },
  { id: 'm3', group: 'Mardi 3 novembre', time: '09:30', dur: '1 h 30', kind: 'meet', title: 'Réunion RH hebdomadaire', place: 'Salle Ourika', visio: false, people: ['Salma Idrissi', 'Sara El Fassi', 'Nadia Berrada'], agenda: ['Recrutements en cours : 4 postes', 'Demandes de congés de novembre', 'Préparation de la paie'] },
  { id: 'm4', group: 'Mardi 3 novembre', time: '15:00', dur: '2 h', kind: 'train', title: 'Formation · Code du travail', place: 'Salle Toubkal', visio: false, people: ['Sara El Fassi', 'Youssef Amrani', 'Adil Mernissi', 'Driss Lahlou', 'Hajar Benjelloun', 'Karim Lahlou'], agenda: ['Durée du travail et heures supplémentaires', 'Congés et absences', 'Rupture du contrat et préavis'] },
  { id: 'm5', group: 'Jeudi 5 novembre', time: '16:00', dur: '1 h', kind: 'meet', title: 'Comité de direction', place: 'Salle du conseil', visio: false, people: ['Hassan Bennis', 'Salma Idrissi', 'Fatima Zahra Alami', 'Youssef Amrani'], agenda: ['Résultats du T3', 'Budget 2027 : masse salariale', 'Plan de recrutement du T1'] },
];

const PAST: Meeting[] = [
  { id: 'p1', group: 'Jeudi 29 octobre', time: '14:00', dur: '1 h', kind: 'review', title: 'Revue des effectifs T4', place: 'Salle du conseil', visio: false, people: ['Salma Idrissi', 'Hassan Bennis', 'Fatima Zahra Alami'],
    summary: "Le plan d'embauche du T4 est validé : 4 postes ouverts, pour une masse salariale en hausse de 1,5 %. L'absentéisme aux Opérations reste le principal point d'attention.",
    decisions: ["Ouvrir le poste de Comptable senior à Rabat", "Renouveler 2 des 3 CDD arrivant à échéance en novembre", "Lancer un plan d'action sur l'absentéisme avec les Opérations"],
    actions: [{ t: "Publier l'annonce Comptable senior", owner: 'Salma Idrissi', due: '05/11' }, { t: 'Préparer les avenants de renouvellement', owner: 'Sara El Fassi', due: '08/11' }, { t: 'Analyser les absences du lundi', owner: 'Youssef Amrani', due: '15/11' }] },
  { id: 'p2', group: 'Lundi 26 octobre', time: '10:00', dur: '30 min', kind: 'meet', title: "Point paie d'octobre", place: 'Google Meet', visio: true, people: ['Nadia Berrada', 'Salma Idrissi'],
    summary: "La paie d'octobre est validée sans écart. Deux primes de projet ont été intégrées, et l'export vers Sage Paie est désormais automatique.",
    decisions: ["Valider la paie d'octobre", "Automatiser l'export Sage Paie chaque mois"],
    actions: [{ t: 'Envoyer les bulletins aux employés', owner: 'Nadia Berrada', due: '28/10' }, { t: 'Documenter la procédure de clôture', owner: 'Salma Idrissi', due: '06/11' }] },
  { id: 'p3', group: 'Mercredi 9 septembre', time: '11:00', dur: '45 min', kind: 'int', title: 'Entretien final · Mehdi Rami', place: 'Salle Rif', visio: false, people: ['Mehdi Rami', 'Adil Mernissi', 'Salma Idrissi'],
    summary: "Très bon entretien : excellente connaissance du marché PME casablancais et forte motivation. Prétentions salariales alignées sur la grille.",
    decisions: ["Faire une offre en CDI", "Démarrage le 1er octobre"],
    actions: [{ t: "Envoyer la promesse d'embauche", owner: 'Salma Idrissi', due: '10/09' }, { t: "Préparer l'onboarding", owner: 'Sara El Fassi', due: '30/09' }] },
];

const ALL_MEETINGS = [...UPCOMING, ...PAST];

function avOf(name: string) {
  return AV_GRADS[(name.charCodeAt(0) + name.length) % AV_GRADS.length];
}
function ini(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FaceStack({ names, size = 24, border = '#fff', limit = 3 }: { names: string[]; size?: number; border?: string; limit?: number }) {
  const shown = names.slice(0, limit);
  const extra = names.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', paddingLeft: 6 }}>
        {shown.map((name, i) => (
          <span key={i} title={name} style={{
            width: size, height: size, borderRadius: '50%', marginLeft: i === 0 ? -6 : -6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: avOf(name), color: '#fff',
            fontSize: size * 0.375, fontWeight: 700,
            border: `2px solid ${border}`, flexShrink: 0,
          }}>
            {ini(name)}
          </span>
        ))}
      </div>
      {extra > 0 && (
        <span style={{ marginLeft: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>+{extra}</span>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { user } = useAuth();
  const { t } = useLang();

  const [tab, setTab] = useState<'up' | 'past'>('up');
  const [curId, setCurId] = useState<string>('m1');
  const [agenda, setAgenda] = useState<Record<string, { text: string; done: boolean; ai: boolean }[]>>(
    () => Object.fromEntries(UPCOMING.map(m => [m.id, (m.agenda || []).map(text => ({ text, done: false, ai: false }))]))
  );
  const [newItem, setNewItem] = useState('');
  const [actions, setActions] = useState<Record<string, boolean>>({});
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [planModal, setPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ title: '', date: '', time: '', place: '', kind: 'meet' });

  const { data: orgData } = useQuery({ queryKey: ['orgchart'], queryFn: getOrgChart });

  const src = tab === 'up' ? UPCOMING : PAST;

  // group meetings
  const groups: { label: string; items: Meeting[] }[] = [];
  src.forEach(m => {
    let g = groups.find(x => x.label === m.group);
    if (!g) { g = { label: m.group, items: [] }; groups.push(g); }
    g.items.push(m);
  });

  const cur = ALL_MEETINGS.find(x => x.id === curId) || UPCOMING[0];
  const isPast = cur.id.startsWith('p');
  const curAgenda = agenda[cur.id] || [];
  const agendaDone = curAgenda.filter(a => a.done).length;

  const toggleAgenda = (meetingId: string, idx: number) => {
    setAgenda(prev => ({
      ...prev,
      [meetingId]: prev[meetingId].map((a, i) => i === idx ? { ...a, done: !a.done } : a),
    }));
  };

  const addAgendaItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAgenda(prev => ({
      ...prev,
      [cur.id]: [...(prev[cur.id] || []), { text: newItem.trim(), done: false, ai: false }],
    }));
    setNewItem('');
  };

  const suggestAgenda = async () => {
    if (suggestBusy) return;
    setSuggestBusy(true);
    await new Promise(r => setTimeout(r, 1400));
    const fallback = ['Points bloquants et risques', 'Décisions attendues', 'Prochaines étapes et responsables'];
    setAgenda(prev => ({
      ...prev,
      [cur.id]: [...(prev[cur.id] || []), ...fallback.map(text => ({ text, done: false, ai: true }))],
    }));
    setSuggestBusy(false);
    toast.success('3 points ajoutés par Wedy ✨');
  };

  const toggleAction = (key: string) => {
    setActions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const kBg = (kind: string) => KIND[kind]?.[1] ?? '#f3f6f7';
  const kColor = (kind: string) => KIND[kind]?.[2] ?? '#33474f';

  return (
    <Page>
      <PageHeader
        title="Réunions"
        subtitle="Préparez l'ordre du jour avec Wedy, qui rédige aussi le compte rendu."
        action={
          <button
            onClick={() => setPlanModal(true)}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', borderRadius: 12, fontSize: 14 }}
          >
            <CalendarPlus size={16} strokeWidth={1.8} /> Planifier une réunion
          </button>
        }
      />

      <div style={{ padding: '0 32px 56px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Left: meeting list ── */}
        <div style={{ flex: '1 1 360px', minWidth: 0, borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, padding: 5, margin: 12, borderRadius: 13, background: 'var(--subtle)' }}>
            {([['up', 'À venir', UPCOMING.length], ['past', 'Passées', PAST.length]] as const).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => { setTab(key as 'up' | 'past'); setCurId((key === 'up' ? UPCOMING : PAST)[0].id); }}
                style={{
                  position: 'relative', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 7, height: 36, border: 'none', borderRadius: 10,
                  background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', color: tab === key ? 'var(--text)' : 'var(--text-2)',
                }}
              >
                {tab === key && (
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(10,28,36,.14)' }} />
                )}
                <span style={{ position: 'relative' }}>{label}</span>
                <span style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{count}</span>
              </button>
            ))}
          </div>

          {/* Groups */}
          {groups.map(g => (
            <div key={g.label}>
              <div style={{ padding: '12px 16px 6px', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
                {g.label}
              </div>
              {g.items.map((m, idx) => {
                const isFirst = tab === 'up' && m === UPCOMING[0];
                const isActive = m.id === curId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setCurId(m.id)}
                    style={{
                      position: 'relative', width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '12px 16px', border: 'none', borderTop: '1px solid var(--border)',
                      background: isActive ? '#f3fafb' : '#fff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f6fafb'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff'; }}
                  >
                    {isActive && (
                      <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 3px 3px 0', background: '#16b6c8' }} />
                    )}
                    {/* Time bubble */}
                    <span style={{ width: 60, flexShrink: 0, padding: '7px 0', borderRadius: 11, background: kBg(m.kind), textAlign: 'center' }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: kColor(m.kind) }}>{m.time}</span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-2)' }}>{m.dur}</span>
                    </span>
                    {/* Info */}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
                        {isFirst && (
                          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#e1f5ec', color: '#0f6f49' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a06b' }} className="wedy-pulse" />
                            Prochaine
                          </span>
                        )}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.visio ? <Video size={13} strokeWidth={1.8} /> : <MapPin size={13} strokeWidth={1.8} />}
                          {m.place}
                        </span>
                        <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                          <FaceStack names={m.people} size={24} limit={3} />
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Right: detail panel ── */}
        <div style={{ flex: '1.6 1 520px', minWidth: 0, position: 'sticky', top: 90, borderRadius: 22, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>

          {/* Dark header */}
          <div style={{ position: 'relative', overflow: 'hidden', padding: '22px 24px', background: 'var(--ink-950)', color: '#e8eff1', isolation: 'isolate' }}>
            <div aria-hidden className="wedy-drift" style={{ position: 'absolute', right: -80, top: -130, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)', zIndex: -1 }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <span style={{ display: 'inline-flex', fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,.08)', color: '#b9cbd0' }}>
                  {KIND[cur.kind]?.[0] ?? 'Réunion'}
                </span>
                <div style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, letterSpacing: '-.03em', lineHeight: 1.15 }}>
                  {cur.title}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 13, color: '#b9cbd0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} strokeWidth={1.8} /> {cur.group} · {cur.time} · {cur.dur}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {cur.visio ? <Video size={14} strokeWidth={1.8} /> : <MapPin size={14} strokeWidth={1.8} />}
                    {cur.place}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toast.success(isPast ? 'Compte rendu envoyé aux participants ✓' : 'Ouverture de la réunion…')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', border: 'none', borderRadius: 11, background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {cur.visio ? <ExternalLink size={15} strokeWidth={1.8} /> : <Video size={15} strokeWidth={1.8} />}
                {isPast ? 'Voir CR' : cur.visio ? 'Rejoindre' : 'Démarrer'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <FaceStack names={cur.people} size={30} border="var(--ink-950)" limit={5} />
              <span style={{ fontSize: 13, color: '#b9cbd0' }}>
                {cur.people.length <= 3
                  ? cur.people.join(', ')
                  : `${cur.people.slice(0, 2).join(', ')} et ${cur.people.length - 2} autres`}
              </span>
            </div>
          </div>

          {/* Body: upcoming = agenda, past = summary + decisions + actions */}
          {!isPast ? (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Agenda header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Ordre du jour</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {agendaDone}/{curAgenda.length}
                </span>
              </div>

              {/* Agenda items */}
              {curAgenda.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleAgenda(cur.id, i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                    padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)',
                    background: item.done ? '#f9fafb' : '#fff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#b9dfe5'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: item.done ? 'none' : '1.5px solid #c3ced3', background: item.done ? '#0e6f84' : '#fff', color: '#fff' }}>
                    {item.done && <span style={{ fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)', width: 18, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontSize: 14, color: item.done ? 'var(--text-muted)' : 'var(--text)', textDecoration: item.done ? 'line-through' : 'none' }}>
                    {item.text}
                  </span>
                  {item.ai && (
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#ece9fb', color: '#5444b8' }}>IA</span>
                  )}
                </button>
              ))}

              {/* Add item form */}
              <form onSubmit={addAgendaItem} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  placeholder="Ajouter un point à l'ordre du jour…"
                  className="input"
                  style={{ flex: 1, minWidth: 0, height: 42, padding: '0 12px', borderRadius: 11, fontSize: 14 }}
                />
                <button type="submit" style={{ height: 42, padding: '0 14px', borderRadius: 11, border: '1px solid var(--border)', background: '#fff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                  Ajouter
                </button>
              </form>

              {/* AI button */}
              <button
                onClick={suggestAgenda}
                disabled={suggestBusy}
                style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#5444b8,#16b6c8)', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: suggestBusy ? 'default' : 'pointer', boxShadow: '0 14px 30px -14px rgba(109,90,214,.8)', opacity: suggestBusy ? 0.85 : 1 }}
              >
                <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
                {suggestBusy ? (
                  <>
                    <span className="wedy-spin" style={{ position: 'relative', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff' }} />
                    <span style={{ position: 'relative' }}>Wedy prépare des points…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} strokeWidth={1.8} style={{ position: 'relative' }} />
                    <span style={{ position: 'relative' }}>Compléter l'ordre du jour avec Wedy</span>
                  </>
                )}
              </button>

              {/* Notes */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                Notes de préparation
                <textarea
                  rows={3}
                  value={notes[cur.id] || ''}
                  onChange={e => setNotes(prev => ({ ...prev, [cur.id]: e.target.value }))}
                  placeholder="Points à aborder, documents à apporter…"
                  style={{ resize: 'vertical', padding: '10px 12px', borderRadius: 11, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: 'var(--text)', outline: 'none', background: '#fff' }}
                  onFocus={e => { e.target.style.borderColor = '#16b6c8'; e.target.style.boxShadow = '0 0 0 4px rgba(22,182,200,.14)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
              </label>
            </div>
          ) : (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* AI Summary */}
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: 14, borderRadius: 14, background: 'linear-gradient(135deg,rgba(22,182,200,.08),rgba(109,90,214,.08))', border: '1px solid rgba(109,90,214,.18)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e4f2f4', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={15} strokeWidth={1.8} style={{ color: '#0b5f72' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#5444b8' }}>Compte rendu rédigé par Wedy</div>
                  <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>{cur.summary}</div>
                </div>
              </div>

              {/* Decisions */}
              {cur.decisions && cur.decisions.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Décisions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cur.decisions.map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--text)' }}>
                        <CheckCircle2 size={17} strokeWidth={1.8} style={{ color: '#16a06b', flexShrink: 0, marginTop: 1 }} />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {cur.actions && cur.actions.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Actions</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {cur.actions.filter((_, i) => actions[`${cur.id}-${i}`]).length}/{cur.actions.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cur.actions.map((action, i) => {
                      const key = `${cur.id}-${i}`;
                      const done = !!actions[key];
                      return (
                        <button
                          key={i}
                          onClick={() => toggleAction(key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', width: '100%',
                            padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)',
                            background: '#fff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#b9dfe5'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >
                          <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: done ? 'none' : '1.5px solid #c3ced3', background: done ? '#16a06b' : '#fff', color: '#fff' }}>
                            {done && <span style={{ fontSize: 11, fontWeight: 900 }}>✓</span>}
                          </span>
                          <span style={{ flex: '1 1 200px', fontSize: 14, color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                            {action.t}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text)' }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avOf(action.owner), color: '#fff', fontSize: 9, fontWeight: 700 }}>
                              {ini(action.owner)}
                            </span>
                            {action.owner}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '2px 8px', borderRadius: 7, background: 'var(--subtle)', color: 'var(--text)' }}>
                            {action.due}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => toast.success('Compte rendu envoyé aux participants ✓')}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, padding: '0 14px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <Send size={15} strokeWidth={1.8} /> Envoyer aux participants
                </button>
                <button
                  onClick={() => toast.success('Export PDF en cours…')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <Download size={15} strokeWidth={1.8} /> PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Plan meeting modal ── */}
      {planModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,28,36,.45)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setPlanModal(false); }}
        >
          <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 32px 64px rgba(0,0,0,.18)', margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Planifier une réunion</span>
              <button onClick={() => setPlanModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="label">Titre</span>
                <input className="input" value={planForm.title} onChange={e => setPlanForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Réunion RH hebdomadaire" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="label">Date</span>
                  <input type="date" className="input" value={planForm.date} onChange={e => setPlanForm(p => ({ ...p, date: e.target.value }))} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="label">Heure</span>
                  <input type="time" className="input" value={planForm.time} onChange={e => setPlanForm(p => ({ ...p, time: e.target.value }))} />
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="label">Lieu / Lien</span>
                <input className="input" value={planForm.place} onChange={e => setPlanForm(p => ({ ...p, place: e.target.value }))} placeholder="Salle Ourika, Google Meet…" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="label">Type</span>
                <select className="select" value={planForm.kind} onChange={e => setPlanForm(p => ({ ...p, kind: e.target.value }))}>
                  {Object.entries(KIND).map(([k, [label]]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setPlanModal(false)} className="btn-ghost" style={{ height: 40, padding: '0 16px', borderRadius: 10 }}>Annuler</button>
                <button
                  onClick={() => { toast.success('Réunion planifiée ✓'); setPlanModal(false); setPlanForm({ title: '', date: '', time: '', place: '', kind: 'meet' }); }}
                  className="btn-primary"
                  disabled={!planForm.title.trim()}
                  style={{ height: 40, padding: '0 18px', borderRadius: 10 }}
                >
                  Planifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
