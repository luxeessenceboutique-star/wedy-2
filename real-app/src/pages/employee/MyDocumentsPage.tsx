import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { api, getApiError } from '../../lib/api';
import { Button, Spinner, Modal } from '../../components/ui';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { useLang } from '../../lib/lang';

const getDocRequests = () => api.get('/portal/me/document-requests').then(r => r.data).catch(() => []);
const submitDocRequest = (body: any) => api.post('/portal/me/document-requests', body).then(r => r.data);

const safeFormat = (d: any) => {
  if (!d) return '—'; const dt = new Date(d);
  return isValid(dt) ? format(dt, 'dd/MM/yyyy HH:mm') : d;
};

export default function MyDocumentsPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doc_type: 'attestation_travail', comment: '' });

  const DOC_TYPES = [
    { value: 'attestation_travail',   label: t('doc_type_attestation_travail') },
    { value: 'bulletin_paie',         label: t('doc_type_bulletin_paie') },
    { value: 'attestation_conge',     label: t('doc_type_attestation_conge') },
    { value: 'certificat_presence',   label: t('doc_type_certificat_presence') },
    { value: 'lettre_recommandation', label: t('doc_type_lettre_recommandation') },
    { value: 'autre',                 label: t('doc_type_autre') },
  ];

  const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:     { label: t('doc_status_pending'),     color: 'var(--warn)', bg: 'var(--warn-soft)', icon: <Clock size={13} /> },
    in_progress: { label: t('doc_status_in_progress'), color: 'var(--primary)', bg: 'var(--primary-soft)', icon: <Clock size={13} /> },
    completed:   { label: t('doc_status_completed'),   color: 'var(--success)', bg: 'var(--success-soft)', icon: <CheckCircle size={13} /> },
    rejected:    { label: t('doc_status_rejected'),    color: 'var(--danger)', bg: '#fef2f2', icon: <XCircle size={13} /> },
  };

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['portal-doc-requests'], queryFn: getDocRequests, retry: false,
  });

  const submitMut = useMutation({
    mutationFn: () => submitDocRequest(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-doc-requests'] });
      qc.invalidateQueries({ queryKey: ['portal-stats'] });
      setShowForm(false);
      setForm({ doc_type: 'attestation_travail', comment: '' });
      toast.success(t('mydoc_success'));
    },
    onError: (e: any) => toast.error(getApiError(e, t('error'))),
  });

  return (
    <div style={{ padding: '24px 28px', maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{t('mydoc_title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>{t('mydoc_subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={14} /> {t('mydoc_request_btn')}
        </Button>
      </div>

      {/* Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="card card-pad" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 2px', color: meta.color }}>
              {(requests as any[]).filter((r: any) => r.status === key).length}
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', margin: 0 }}>{meta.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (requests as any[]).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-2)' }}>
          <FileText size={40} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 500 }}>{t('mydoc_empty')}</p>
          <Button onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
            <Plus size={13} /> {t('mydoc_request_btn')}
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(requests as any[]).map((r: any) => {
            const sm = STATUS_META[r.status] ?? STATUS_META.pending;
            const docLabel = DOC_TYPES.find(d => d.value === r.doc_type)?.label ?? r.doc_type;
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', border: '1px solid var(--line)',
                borderLeft: `4px solid ${sm.color}`,
                borderRadius: 12, background: 'var(--surface)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: sm.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sm.color,
                }}>
                  <FileText size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 3px' }}>{docLabel}</p>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', gap: 14 }}>
                    {r.comment && <span>{r.comment}</span>}
                    <span>{t('mydoc_requested_on')} {safeFormat(r.created_at)}</span>
                  </div>
                  {r.hr_note && (
                    <p style={{ fontSize: 12, color: 'var(--primary)', padding: '4px 8px', background: 'var(--primary-soft)', borderRadius: 6, margin: '6px 0 0' }}>
                      {t('mydoc_hr_note_prefix')} {r.hr_note}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  borderRadius: 20, background: sm.bg, color: sm.color, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {sm.icon}
                  <span>{sm.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('mydoc_modal_title')} width={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">{t('mydoc_type_label')} *</label>
            <select className="input" value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}>
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('mydoc_comment_label')}</label>
            <textarea className="input" rows={3} style={{ resize: 'none', padding: '8px 12px' }}
              value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              placeholder={t('mydoc_comment_ph')} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
            <Button onClick={() => submitMut.mutate()} loading={submitMut.isPending}>
              {t('mydoc_submit_btn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
