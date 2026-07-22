import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, RefreshCw, AlertTriangle, Calendar, FileText, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/AppShell';
import { Spinner, Button } from '../../components/ui';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';

interface SmartNotif {
  id: string; type: string; icon: string; color: string;
  title: string; body: string; time: string; unread: boolean; priority: number;
}

const fetchNotifs = () =>
  api.get<{ data: SmartNotif[]; unread_count: number; count: number }>('/notifications').then(r => r.data);

const markAllRead = () => api.post('/notifications/mark-all-read').then(r => r.data);

function TypeIcon({ type, color }: { type: string; color: string }) {
  const icons: Record<string, React.ReactNode> = {
    contract_expiring: <AlertTriangle size={15} />,
    leave_pending:     <Calendar size={15} />,
    document_generated:<FileText size={15} />,
    cdd_risk:          <AlertTriangle size={15} />,
    new_employee:      <Users size={15} />,
  };
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: color + '22', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}>
      {icons[type] ?? <Bell size={15} />}
    </div>
  );
}

function NotifRow({ n }: { n: SmartNotif }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
      background: n.unread ? `${n.color}08` : 'var(--surface)',
      borderBottom: '1px solid var(--line)', position: 'relative', transition: 'background 0.15s',
    }}>
      {n.unread && (
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: n.color, borderRadius: '0 2px 2px 0' }} />
      )}
      <TypeIcon type={n.type} color={n.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: n.unread ? 600 : 500, color: 'var(--fg)', margin: '0 0 2px', lineHeight: 1.4 }}>{n.title}</p>
        <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>{n.body}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{n.time}</span>
        {n.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.color, display: 'block' }} />}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useLang();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifs,
    refetchInterval: 60_000,
  });

  const markMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notif_all_marked'));
    },
  });

  const TYPE_LABELS: Record<string, string> = {
    contract_expiring: t('cat_contracts'),
    cdd_risk:          t('cat_contracts'),
    leave_pending:     t('cat_leaves'),
    document_generated: t('cat_documents'),
  };

  const notifs   = data?.data ?? [];
  const unread   = data?.unread_count ?? 0;
  const filtered = filter === 'all' ? notifs
    : filter === 'unread' ? notifs.filter(n => n.unread)
    : notifs.filter(n => TYPE_LABELS[n.type] === filter);

  const categories = ['all', 'unread', t('cat_contracts'), t('cat_leaves'), t('cat_documents')];
  const catLabel: Record<string, string> = {
    all: t('filter_all'),
    unread: `${t('filter_unread')} (${unread})`,
    [t('cat_contracts')]: t('cat_contracts'),
    [t('cat_leaves')]: t('cat_leaves'),
    [t('cat_documents')]: t('cat_documents'),
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 720, margin: '0 auto' }}>
      <PageHeader
        title={t('notifications')}
        subtitle={unread > 0 ? `${unread} ${t('unread_alerts')}` : t('no_unread')}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => refetch()}>
              <RefreshCw size={13} /> {t('notif_refresh')}
            </Button>
            {unread > 0 && (
              <Button variant="soft" loading={markMut.isPending} onClick={() => markMut.mutate()}>
                <CheckCheck size={13} /> {t('notif_mark_all_read')}
              </Button>
            )}
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--line)', cursor: 'pointer',
              background: filter === cat ? 'var(--primary)' : 'var(--surface)',
              color: filter === cat ? '#fff' : 'var(--ink-2)',
              transition: 'all 0.15s',
            }}>
            {catLabel[cat] ?? cat}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-2)' }}>
            <Bell size={36} style={{ margin: '0 auto 14px', opacity: 0.15 }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{t('notif_none_title')}</p>
            <p style={{ fontSize: 13 }}>
              {filter === 'unread' ? t('notif_up_to_date') : t('notif_empty_cat')}
            </p>
          </div>
        ) : (
          filtered.map(n => <NotifRow key={n.id} n={n} />)
        )}
      </div>

      {notifs.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10, textAlign: 'center' }}>
          {t('notif_footer')}
        </p>
      )}
    </div>
  );
}
