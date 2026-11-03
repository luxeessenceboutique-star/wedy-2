import { useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { createContractType, deleteContractType, getApiError, listContractTypes, updateContractType, type ContractType } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';

const input: CSSProperties = { height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none', background: '#ffffff', minWidth: 0 };
const iconBtn: CSSProperties = { width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 9, background: 'transparent', color: '#7d8f97', cursor: 'pointer', flexShrink: 0 };

/** "Référentiels RH": the contract types offered in the employee forms (CDI, CDD, Stage…). */
export function ContractTypesCard() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const { data: types = [], isLoading } = useQuery({ queryKey: ['contract-types'], queryFn: listContractTypes });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '' });
  const [edit, setEdit] = useState<{ id: string; name: string; description: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['contract-types'] });
  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const create = useMutation({ mutationFn: () => createContractType({ name: draft.name.trim(), description: draft.description.trim() || undefined }), onSuccess: () => { refresh(); setDraft({ name: '', description: '' }); setAdding(false); notify.success(t('set_ct_added')); }, onError: fail });
  const update = useMutation({ mutationFn: () => updateContractType(edit!.id, { name: edit!.name.trim(), description: edit!.description.trim() || undefined }), onSuccess: () => { refresh(); setEdit(null); notify.success(t('set_ct_saved')); }, onError: fail });
  const remove = useMutation({ mutationFn: (id: string) => deleteContractType(id), onSuccess: () => { refresh(); notify.success(t('set_ct_deleted')); }, onError: fail });

  return (
    <RV as="div" variant="up" style={{ padding: 22, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('set_ct_title')}</div>
          <div style={{ fontSize: 13, color: '#52646d', marginTop: 2 }}>{t('set_ct_sub')}</div>
        </div>
        {!adding && <button type="button" onClick={() => { setAdding(true); setEdit(null); }} className="btn btn-secondary" style={{ height: 38 }}><Plus size={14} /> {t('mtg_add')}</button>}
      </div>
      {adding && (
        <form onSubmit={e => { e.preventDefault(); if (draft.name.trim()) create.mutate(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, padding: 12, borderRadius: 14, background: '#f3fafb', border: '1px solid #b9dfe5' }}>
          <input autoFocus value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder={t('set_ct_name_ph')} style={{ ...input, flex: '1 1 120px' }} />
          <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder={t('set_ct_desc_ph')} style={{ ...input, flex: '3 1 220px' }} />
          <button type="button" onClick={() => { setAdding(false); setDraft({ name: '', description: '' }); }} className="btn btn-secondary" style={{ height: 40 }}><X size={14} /></button>
          <button type="submit" disabled={!draft.name.trim() || create.isPending} className="btn btn-primary" style={{ height: 40 }}>{create.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
        </form>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>}
        {!isLoading && types.length === 0 && <div style={{ padding: '18px 0', fontSize: 13.5, color: '#5f7079', textAlign: 'center' }}>{t('set_ct_none')}</div>}
        {types.map((ct: ContractType) => (
          <div key={ct.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #f0f3f4', flexWrap: 'wrap' }}>
            {edit?.id === ct.id ? (
              <form onSubmit={e => { e.preventDefault(); if (edit.name.trim()) update.mutate(); }} style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                <input autoFocus value={edit.name} onChange={e => setEdit(x => x && { ...x, name: e.target.value })} style={{ ...input, flex: '1 1 110px' }} />
                <input value={edit.description} onChange={e => setEdit(x => x && { ...x, description: e.target.value })} placeholder={t('set_ct_desc_ph')} style={{ ...input, flex: '3 1 200px' }} />
                <button type="button" aria-label={t('cancel')} onClick={() => setEdit(null)} style={iconBtn}><X size={14} /></button>
                <button type="submit" aria-label={t('save')} disabled={!edit.name.trim() || update.isPending} style={{ ...iconBtn, background: '#0e6f84', color: '#ffffff' }}>{update.isPending ? <Spinner size={13} color="#fff" /> : <Check size={14} />}</button>
              </form>
            ) : (
              <>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12.5, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: '#e4f2f4', color: '#0b5f72', flexShrink: 0 }}>{ct.name}</span>
                <span style={{ flex: 1, minWidth: 120, fontSize: 13.5, color: ct.description ? '#33474f' : '#a3b1b7' }}>{ct.description || t('set_ct_no_desc')}</span>
                <button type="button" aria-label={t('edit')} title={t('edit')} onClick={() => { setEdit({ id: ct.id, name: ct.name, description: ct.description ?? '' }); setAdding(false); }} style={iconBtn} className="set-h4"><Pencil size={14} /></button>
                <button type="button" aria-label={t('delete')} title={t('delete')} onClick={() => { if (window.confirm(tf(t('set_ct_confirm'), { name: ct.name }))) remove.mutate(ct.id); }} style={{ ...iconBtn, color: '#b8402c' }} className="set-h4"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </RV>
  );
}
