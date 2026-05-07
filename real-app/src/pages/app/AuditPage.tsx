import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ClipboardList, Search } from 'lucide-react';
import { listAuditLogs, type AuditLog } from '../../lib/api';
import { Card, Badge, Spinner } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { useLang } from '../../lib/lang';

const ACTION_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  CREATE: 'success', DELETE: 'danger', UPDATE: 'default',
  APPROVED: 'success', REJECTED: 'danger', BULK_GENERATE: 'warning',
};

const ENTITY_LABEL: Record<string, string> = {
  employee: 'Employé', leave_request: 'Congé', payroll_record: 'Paie',
  document: 'Document', template: 'Template',
};

export default function AuditPage() {
  const { t } = useLang();
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const LIMIT = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', skip],
    queryFn: () => listAuditLogs({ skip, limit: LIMIT }),
  });

  const logs = data?.data ?? [];
  const total = data?.count ?? 0;

  const filtered = search
    ? logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.entity.toLowerCase().includes(search.toLowerCase()) ||
        (l.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={t('audit_log')}
        subtitle={`${total} ${t('col_actions').toLowerCase()} · ${t('audit_subtitle')}`}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder={t('audit_search_ph')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card pad={false}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '180px 110px 110px 1fr 140px', gap: 12, fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>{t('col_date')}</span><span>{t('col_action')}</span><span>{t('col_entity')}</span><span>{t('col_resource_id')}</span><span>{t('col_user')}</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
            <ClipboardList size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>{t('audit_no_entries')}</p>
          </div>
        ) : (
          filtered.map((log: AuditLog, i) => (
            <div key={log.id} style={{
              padding: '12px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'grid', gridTemplateColumns: '180px 110px 110px 1fr 140px', gap: 12,
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                {format(new Date(log.created_at), 'dd/MM/yy HH:mm')}
              </span>
              <Badge variant={ACTION_VARIANT[log.action] ?? 'default'}>{log.action}</Badge>
              <span style={{ fontSize: 12, color: 'var(--fg)' }}>
                {ENTITY_LABEL[log.entity] || log.entity}
              </span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.entity_id ? log.entity_id.slice(0, 12) + '…' : '—'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.profiles?.full_name || log.user_id?.slice(0, 8) || '—'}
              </span>
            </div>
          ))
        )}
      </Card>

      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - LIMIT))}>
            ← {t('prev_page')}
          </button>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)', alignSelf: 'center' }}>
            {skip + 1}–{Math.min(skip + LIMIT, total)} / {total}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={skip + LIMIT >= total} onClick={() => setSkip(s => s + LIMIT)}>
            {t('next_page')} →
          </button>
        </div>
      )}
    </div>
  );
}
