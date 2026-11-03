// /visio/:room — Wedy Visio full screen. With `?k=` it is a guest's invite link (no account); otherwise the signed-in
// staff member joins (HR, or an employee taking part in the meeting).
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Video } from 'lucide-react';
import { getVisioGuestInfo, getVisioInfo } from '@/services/api';
import { useAuth } from '@/lib/auth';
import { useLang, type TKey } from '@/lib/lang';
import { Spinner } from '@/components/ui';
import { VisioCall } from '@/components/visio/VisioCall';
import '@/components/visio/visio.css';

export default function VisioPage() {
  const { room = '' } = useParams();
  const [params] = useSearchParams();
  const k = params.get('k') ?? '';
  const { user, loading } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const guestQ = useQuery({ queryKey: ['visio-guest', room, k], queryFn: () => getVisioGuestInfo(room, k), enabled: !!k, retry: false });
  const staffQ = useQuery({ queryKey: ['visio-info', room], queryFn: () => getVisioInfo(room), enabled: !k && !!user, retry: false });
  const q = k ? guestQ : staffQ;

  if (!k && !loading && !user) return <Navigate to={`/login?next=${encodeURIComponent(`/visio/${room}`)}`} replace />;
  if ((k ? guestQ.isLoading : loading || staffQ.isLoading)) return <div className="vz vz-page vz-pre"><Spinner size={28} color="#fff" /></div>;
  if (q.isError || !q.data) {
    const code = axios.isAxiosError(q.error) ? String(q.error.response?.data?.detail ?? '') : '';
    const key: TKey = code === 'expired_link' ? 'vz_err_expired' : code === 'invalid_link' ? 'vz_err_link' : code === 'not_invited' ? 'vz_err_not_invited' : 'vz_err_room';
    return (
      <div className="vz vz-page vz-pre">
        <div className="vz-pre-side" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="vz-av lg" style={{ background: 'linear-gradient(135deg,#0e6f84,#16b6c8)' }}><Video size={34} /></span>
          <h2>{t('vz_brand')}</h2>
          <p className="vz-err">{t(key)}</p>
        </div>
      </div>
    );
  }
  const info = q.data;
  const back = () => { if (k) return; if (window.history.length > 1) nav(-1); else nav('/'); };
  return (
    <VisioCall room={room} title={info.title} mode="page" liveCount={info.live} canInvite={!!info.can_invite}
      auth={k ? { guest: k, name: info.guest_name ?? '' } : { staff: true }} onLeave={k ? undefined : back} />
  );
}
