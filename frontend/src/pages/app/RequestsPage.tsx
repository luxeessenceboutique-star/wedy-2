import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Calendar, FileText, MessageSquare, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Page, PageHeader } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui';
import { RV } from '@/components/motion';
import { listInbox, decideRequest, getApiError, getLeaveBalance, listLeaveRequests, type InboxItem, type InboxKind } from '@/services/api';
import { useLang, type TKey } from '@/lib/lang';
import { tf } from '@/lib/format';

const AV = [
  'linear-gradient(135deg,#0e6f84,#16b6c8)',
  'linear-gradient(135deg,#5444b8,#9a8bf0)',
  'linear-gradient(135deg,#0f6f49,#2bbd86)',
  'linear-gradient(135deg,#a8650a,#e6a948)',
  'linear-gradient(135deg,#b8402c,#ef6b54)',
  'linear-gradient(135deg,#2f4bb0,#4a69d8)',
];
const avGrad = (name: string) => AV[(name.charCodeAt(0) + name.length) % AV.length];
const initials = (name: string) => name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const KIND_META: Record<string, { icon: typeof Calendar; color: string; labelKey: string }> = {
  leave:    { icon: Calendar,      color: '#6d5ad6', labelKey: 'req_type_leave' },
  document: { icon: FileText,      color: '#0e6f84', labelKey: 'req_type_doc' },
  other:    { icon: MessageSquare, color: '#b06b0c', labelKey: 'req_type_other' },
};

const STATUS_DARK: Record<string, { bg: string; color: string }> = {
  pending:     { bg: 'rgba(230,169,72,.18)',    color: '#f0bd6a' },
  approved:    { bg: 'rgba(43,189,134,.18)',    color: '#4fd3a0' },
  completed:   { bg: 'rgba(43,189,134,.18)',    color: '#4fd3a0' },
  rejected:    { bg: 'rgba(239,107,84,.18)',    color: '#ef8b78' },
};

const STATUS_LIGHT: Record<string, { bg: string; color: string; labelKey: TKey }> = {
  pending:     { bg: '#fbefda', color: '#8a5207', labelKey: 'status_pending_item' },
  approved:    { bg: '#e1f5ec', color: '#0f6f49', labelKey: 'status_approved_item' },
  completed:   { bg: '#e1f5ec', color: '#0f6f49', labelKey: 'status_approved_item' },
  rejected:    { bg: '#fbe9e6', color: '#a33a28', labelKey: 'status_rejected_item' },
  in_progress: { bg: '#e4f2f4', color: '#0b5f72', labelKey: 'doc_status_in_progress' },
};

const TAB_KEYS = ['pending', 'approved', 'refused', 'all'] as const;
const TAB_LABEL_KEYS: Record<string, string> = {
  pending: 'req_tab_pending', approved: 'req_tab_approved', refused: 'req_tab_refused', all: 'req_tab_all',
};
const KIND_KEYS = ['all', 'leave', 'document', 'other'] as const;
const KIND_LABEL_KEYS: Record<string, string> = {
  all: 'req_kind_all', leave: 'req_kind_leave', document: 'req_kind_doc', other: 'req_kind_other',
};

const fmtShortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

const isPendingItem = (item: InboxItem) => item.state === 'pending';
const isApprovedItem = (item: InboxItem) => item.status === 'approved' || item.status === 'completed';
const isRefusedItem = (item: InboxItem) => item.status === 'rejected';

export default function RequestsPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const kindParam = params.get('kind') as InboxKind | null;
  const focusId = params.get('id');

  const [tab, setTab] = useState<'pending' | 'approved' | 'refused' | 'all'>(
    kindParam || focusId ? 'all' : 'pending',
  );
  const [kindFilter, setKindFilter] = useState<string>(
    kindParam === 'leave' || kindParam === 'document' || kindParam === 'other' ? kindParam : 'all',
  );
  const [curId, setCurId] = useState<string | null>(focusId);
  const [comment, setComment] = useState('');
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['requests-inbox'],
    queryFn: listInbox,
    refetchInterval: 30000,
  });

  const decideMut = useMutation({
    mutationFn: (v: { item: InboxItem; status: string; note?: string }) =>
      decideRequest(v.item.kind, v.item.id, v.status, v.note),
    onSuccess: (_d, v) => {
      const kindLabel = t((KIND_META[v.item.kind]?.labelKey ?? 'req_type_other') as TKey);
      const msg = v.status === 'rejected' || v.status === 'refused'
        ? tf(t('req_toast_refused'), { type: kindLabel, name: v.item.employee_name })
        : tf(t('req_toast_approved'), { type: kindLabel, name: v.item.employee_name });
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['requests-inbox'] });
      qc.invalidateQueries({ queryKey: ['requests-count'] });
      if (v.item.kind === 'leave') qc.invalidateQueries({ queryKey: ['leaves'] });
      // auto-select next pending after 900ms
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      nextTimerRef.current = setTimeout(() => {
        const all = data?.data ?? [];
        const next = all.find(x => x.state === 'pending' && String(x.id) !== effectiveCurId);
        if (next && tab === 'pending') setCurId(String(next.id));
      }, 900);
    },
    onError: (e: unknown) => toast.error(getApiError(e, t('req_err_decide'))),
  });

  useEffect(() => () => { if (nextTimerRef.current) clearTimeout(nextTimerRef.current); }, []);

  const allItems: InboxItem[] = data?.data ?? [];

  // Nothing picked yet: default to the first pending item, without a render-triggering effect.
  // (Falling back to a non-pending item would make it appear, confusingly, in the "pending" list below.)
  const defaultItem = allItems.find(i => i.state === 'pending');
  const effectiveCurId = curId ?? (defaultItem ? String(defaultItem.id) : null);

  const countOf = (tabKey: string) => {
    if (tabKey === 'all') return allItems.length;
    if (tabKey === 'pending') return allItems.filter(isPendingItem).length;
    if (tabKey === 'approved') return allItems.filter(isApprovedItem).length;
    if (tabKey === 'refused') return allItems.filter(isRefusedItem).length;
    return 0;
  };

  const visible = allItems.filter(i => {
    const tabMatch =
      tab === 'all' ? true :
      tab === 'pending' ? (isPendingItem(i) || String(i.id) === effectiveCurId) :
      tab === 'approved' ? isApprovedItem(i) :
      tab === 'refused' ? isRefusedItem(i) :
      true;
    const kindMatch = kindFilter === 'all' || i.kind === kindFilter;
    return tabMatch && kindMatch;
  });

  const cur = allItems.find(i => String(i.id) === effectiveCurId);
  const decide = (status: string) => {
    if (!cur) return;
    setComment('');
    decideMut.mutate({ item: cur, status, note: comment.trim() || undefined });
  };

  const isCurLeave = cur?.kind === 'leave' && !!cur.employee_id;
  const { data: curLeaveBalance } = useQuery({
    queryKey: ['requests-leave-balance', cur?.employee_id],
    queryFn: () => getLeaveBalance(cur!.employee_id!),
    enabled: isCurLeave,
  });
  const { data: curLeaveRows } = useQuery({
    queryKey: ['requests-leave-detail', cur?.employee_id],
    queryFn: () => listLeaveRequests({ employee_id: cur!.employee_id! }),
    enabled: isCurLeave,
  });
  const curLeaveRow = curLeaveRows?.find(l => l.id === cur?.id);
  const curBalanceDays = curLeaveBalance ? curLeaveBalance.annual_total - curLeaveBalance.annual_used : null;
  const curRequestedDays = curLeaveRow?.days ?? null;
  const curAfterDays = curBalanceDays != null && curRequestedDays != null ? Math.max(0, curBalanceDays - curRequestedDays) : null;
  const curMotif = cur?.kind === 'leave' ? (curLeaveRow?.reason || '') : (cur?.details ?? '');
  const curAiText = isCurLeave && curBalanceDays != null && curRequestedDays != null
    ? (curBalanceDays < curRequestedDays
        ? tf(t('req_ai_insufficient'), { balance: String(curBalanceDays).replace('.', ','), days: String(curRequestedDays) })
        : tf(t('req_ai_sufficient'), { balance: String(curBalanceDays).replace('.', ','), days: String(curRequestedDays) }))
    : null;

  const curStatus = cur?.status ?? 'pending';
  const curIsPending = cur ? isPendingItem(cur) : false;
  const curIsDone = cur ? !isPendingItem(cur) : false;
  const curSt = STATUS_LIGHT[curStatus] ?? STATUS_LIGHT.pending;
  const curStDark = STATUS_DARK[curStatus] ?? STATUS_DARK.pending;

  if (isLoading) {
    return (
      <Page>
        <PageHeader title={t('requests')} subtitle={t('req_subtitle')} />
        <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>
      </Page>
    );
  }

  return (
    <Page>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" className="wy-ph-title">{t('requests')}</RV>
          <RV as="p" variant="up" delay={60} className="wy-ph-sub">{t('req_subtitle')}</RV>
        </div>
        {/* Segmented tabs */}
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', padding: 4, borderRadius: 13, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          {TAB_KEYS.map(k => {
            const active = tab === k;
            const n = countOf(k);
            return (
              <button key={k} type="button" onClick={() => setTab(k)} style={{
                position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7,
                height: 36, padding: '0 13px', border: 'none', borderRadius: 10,
                background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', color: active ? '#ffffff' : '#52646d',
              }}>
                {active && <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: '#0a1c24' }} className="wy-pill" />}
                <span style={{ position: 'relative' }}>{t(TAB_LABEL_KEYS[k] as TKey)}</span>
                <span style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '1px 6px', borderRadius: 99, background: active ? 'rgba(255,255,255,.18)' : '#eef2f4', color: active ? '#ffffff' : '#52646d' }}>{n}</span>
              </button>
            );
          })}
        </RV>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* ── Left: list ── */}
        <RV as="div" variant="up" delay={120} style={{ flex: '1 1 380px', minWidth: 0, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          {/* Kind filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid #eef2f4' }}>
            {KIND_KEYS.map(k => (
              <button key={k} type="button" onClick={() => setKindFilter(k)} style={{
                height: 32, padding: '0 12px', borderRadius: 99,
                border: `1px solid ${kindFilter === k ? '#b9dfe5' : '#e2e8eb'}`,
                background: kindFilter === k ? '#e4f2f4' : '#ffffff',
                color: kindFilter === k ? '#0b5f72' : '#52646d',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>{t(KIND_LABEL_KEYS[k] as TKey)}</button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{t('req_empty')}</div>
          ) : (
            visible.map((item, i) => {
              const isSelected = String(item.id) === effectiveCurId;
              const km = KIND_META[item.kind] ?? KIND_META.other;
              const Icon = km.icon;
              const stLight = STATUS_LIGHT[item.status] ?? STATUS_LIGHT.pending;
              const ini = initials(item.employee_name);
              const av = avGrad(item.employee_name);
              return (
                <button key={`${item.kind}:${item.id}`} type="button"
                  onClick={() => { setCurId(String(item.id)); setComment(''); }}
                  style={{
                    position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px', border: 'none', borderBottom: '1px solid #eef2f4',
                    background: isSelected ? '#f3fafb' : '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                    transition: 'background .15s',
                  }}
                  data-reveal="up" data-delay={String(i * 45)}
                >
                  {isSelected && <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 3px 3px 0', background: '#16b6c8' }} />}
                  <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: av, color: '#ffffff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{ini}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.employee_name}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7d8f97', flexShrink: 0 }}>{fmtShortDate(item.created_at)}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{ display: 'inline-flex', color: km.color }}><Icon size={13} /></span>
                      <span style={{ fontSize: 13, color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: stLight.bg, color: stLight.color, flexShrink: 0 }}>{t(stLight.labelKey)}</span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </RV>

        {/* ── Right: detail ── */}
        {cur ? (
          <RV as="div" variant="left" delay={160} style={{ flex: '1.3 1 440px', minWidth: 0, position: 'sticky', top: 90, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            {/* Dark header */}
            <div style={{ position: 'relative', overflow: 'hidden', padding: 24, background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
              <div aria-hidden="true" className="wedy-drift" style={{ position: 'absolute', right: -80, top: -120, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)', zIndex: -1 } as CSSProperties} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avGrad(cur.employee_name), color: '#ffffff', fontSize: 17, fontWeight: 700, border: '2px solid rgba(255,255,255,.2)', flexShrink: 0 }}>
                  {initials(cur.employee_name)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-.03em' }}>{cur.employee_name}</div>
                  <div style={{ fontSize: 13.5, color: '#9fb4bb' }}>{cur.department ?? '—'}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 99, background: curStDark.bg, color: curStDark.color }}>{t(curSt.labelKey)}</span>
              </div>
              {/* Request type tile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.15)', color: '#5fe3f0', flexShrink: 0 }}>
                  {(() => { const Icon = (KIND_META[cur.kind] ?? KIND_META.other).icon; return <Icon size={18} />; })()}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{cur.title}</div>
                  <div style={{ fontSize: 13, color: '#9fb4bb' }}>{cur.details ?? ''}</div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Motif */}
              {curMotif && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('req_motif')}</div>
                  <div style={{ marginTop: 6, fontSize: 14.5, lineHeight: 1.55, color: '#1d3540' }}>{curMotif}</div>
                </div>
              )}

              {/* Leave balance tiles */}
              {cur.kind === 'leave' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: '#f3f6f7' }}>
                    <div style={{ fontSize: 11.5, color: '#5f7079' }}>{t('req_solde')}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>{curBalanceDays != null ? String(curBalanceDays).replace('.', ',') : '—'} j</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: '#f3f6f7' }}>
                    <div style={{ fontSize: 11.5, color: '#5f7079' }}>{t('req_requested')}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>{curRequestedDays ?? '—'} j</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: '#e4f2f4' }}>
                    <div style={{ fontSize: 11.5, color: '#0b5f72' }}>{t('req_after')}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#0b5f72' }}>
                      {curAfterDays != null ? String(curAfterDays).replace('.', ',') : '—'} j
                    </div>
                  </div>
                </div>
              )}

              {/* AI insight: a real balance-vs-request check for leave; hidden when there is nothing computed to say */}
              {curAiText && (
                <div className="wy-ai">
                  <img src="/wedy-avatar.png" alt="" className="wy-ai-avatar" />
                  <div>
                    <div className="wy-ai-label">{t('req_ai_label')}</div>
                    <div className="wy-ai-text">{curAiText}</div>
                  </div>
                </div>
              )}

              {/* Pending: comment + actions */}
              {curIsPending && (
                <>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={2}
                    placeholder={t('req_comment_ph')}
                    className="input"
                    style={{ resize: 'vertical', minHeight: 64, height: 'auto', padding: '11px 13px' }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => decide('rejected')} disabled={decideMut.isPending}
                      className="btn btn-danger-outline" style={{ flex: 1, height: 46 }}>
                      <X size={16} /> {t('req_refuse')}
                    </button>
                    <button type="button" onClick={() => decide(cur.kind === 'document' ? 'completed' : 'approved')} disabled={decideMut.isPending}
                      style={{ flex: 1.4, position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0f6f49,#16a06b)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 12px 26px -12px rgba(22,160,107,.8)' }}>
                      <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
                      <span style={{ position: 'relative', display: 'inline-flex' }}><Check size={16} strokeWidth={2.4} /></span>
                      <span style={{ position: 'relative' }}>{t('req_approve')}</span>
                    </button>
                  </div>
                </>
              )}

              {/* Done: status banner */}
              {curIsDone && (
                <RV as="div" variant="up" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, background: curSt.bg, color: curSt.color, fontSize: 14, fontWeight: 600 }}>
                  {curStatus === 'rejected' ? <X size={18} /> : <Check size={18} />}
                  {curStatus === 'rejected' ? t('req_done_refused') : t('req_done_approved')}
                </RV>
              )}
            </div>
          </RV>
        ) : (
          <div style={{ flex: '1.3 1 440px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#7d8f97', fontSize: 14 }}>
            {t('req_select_hint')}
          </div>
        )}
      </div>
    </Page>
  );
}
