// Wedy Visio call UI: preview before joining, then the video grid, the controls, the chat and the invite link.
// `mode="page"` fills the screen (/visio/:room); `mode="dock"` is the floating panel of the interview room.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Copy, Link2, Maximize2, MessageSquare, Mic, MicOff, Minimize2, MonitorUp, PhoneOff, RefreshCw, Send, ShieldCheck, TriangleAlert, Users, Video, VideoOff, WifiOff, X,
} from 'lucide-react';
import { makeGuestLink, getApiError, getIceConfig } from '@/services/api';
import { checkNetwork, netStateOf, type NetState } from '@/lib/visio/netCheck';
import { useVisio, type VisioAuth, type VisioPeer } from '@/lib/visio/useVisio';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './visio.css';

function VideoEl({ stream, muted, mirror }: { stream: MediaStream | null; muted?: boolean; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const v = ref.current; if (v && v.srcObject !== stream) v.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={mirror ? 'vz-mirror' : undefined} />;
}

/** Remote audio stays on even when the tile shows the avatar (camera off). */
function Tile({ name, stream, cam, mic, screen, me, conn, big }: { name: string; stream: MediaStream | null; cam: boolean; mic: boolean; screen: boolean; me?: boolean; conn?: string; big?: boolean }) {
  const { t } = useLang();
  const hasVideo = !!stream && stream.getVideoTracks().some(tr => tr.readyState === 'live') && (cam || screen);
  return (
    <div className={`vz-tile${big ? ' big' : ''}${screen ? ' screen' : ''}`}>
      {stream && <VideoEl stream={stream} muted={me} mirror={me && !screen} />}
      {!hasVideo && <span className="vz-av" style={{ background: avatarGradient(name || '?') }}>{initialsOf(name || '?')}</span>}
      <span className="vz-name">{!mic && <MicOff size={12} />}{name}{me ? ` (${t('vz_you')})` : ''}{screen ? ` · ${t('vz_sharing')}` : ''}</span>
      {conn && conn !== 'connected' && conn !== 'new' && <span className="vz-conn">{conn === 'failed' || conn === 'disconnected' || conn === 'stuck' ? t('vz_conn_failed') : t('vz_conn_wait')}</span>}
    </div>
  );
}

export function VisioCall({ room, auth, title, mode = 'page', canInvite, guestDefault = '', onLeave, autoJoin, liveCount = 0 }: {
  room: string; auth: VisioAuth | null; title: string; mode?: 'page' | 'dock'; canInvite?: boolean; guestDefault?: string;
  onLeave?: () => void; autoJoin?: boolean; liveCount?: number;
}) {
  const { t } = useLang();
  const notify = useNotify();
  const v = useVisio(room, auth);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [msg, setMsg] = useState('');
  const [big, setBig] = useState(false);
  const [invite, setInvite] = useState<{ open: boolean; name: string; url: string; busy: boolean }>({ open: false, name: guestDefault, url: '', busy: false });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const h = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(h); }, []);
  const [autoDone, setAutoDone] = useState(false);
  // what this network allows (relay / direct only / blocked), looked up once before the call
  const [net, setNet] = useState<{ state: NetState; configured: boolean }>({ state: 'checking', configured: false });
  const guestKey = auth && 'guest' in auth ? auth.guest : '';
  const hasAuth = !!auth;
  useEffect(() => {
    if (!hasAuth || autoJoin) return;
    let cancelled = false;
    (async () => {
      let ice: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
      let configured = false;
      try { const c = await getIceConfig(room, guestKey || undefined); ice = c.iceServers; configured = !!c.turn_configured; } catch { /* public STUN only */ }
      const found = await checkNetwork(ice).catch(() => ({ host: false, srflx: false, relay: false }));
      if (!cancelled) setNet({ state: netStateOf(found), configured });
    })();
    return () => { cancelled = true; };
  }, [room, guestKey, hasAuth, autoJoin]);
  if (autoJoin && !autoDone && v.local && v.status === 'preview') { setAutoDone(true); v.join(); }

  const unread = chatOpen ? 0 : Math.max(0, v.chat.filter(c => !c.mine).length - seen);
  const openChat = () => { setChatOpen(o => !o); setSeen(v.chat.filter(c => !c.mine).length); };
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'end' }); }, [v.chat, chatOpen]);
  const submitChat = (e: FormEvent) => { e.preventDefault(); v.sendChat(msg); setMsg(''); };
  const leave = () => { v.leave(); onLeave?.(); };
  const makeLink = async () => {
    if (!invite.name.trim()) return;
    setInvite(i => ({ ...i, busy: true }));
    try {
      const r = await makeGuestLink(room, invite.name.trim());
      setInvite(i => ({ ...i, url: r.url, busy: false }));
      try { await navigator.clipboard.writeText(r.url); notify.success(t('vz_link_copied')); } catch { /* shown in the box */ }
    } catch (e) { setInvite(i => ({ ...i, busy: false })); notify.error(getApiError(e, t('error'))); }
  };
  const elapsed = v.joinedAt ? Math.floor((now - v.joinedAt) / 1000) : 0;
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const errKey: Record<string, TKey> = { not_invited: 'vz_err_not_invited', invalid_link: 'vz_err_link', expired_link: 'vz_err_expired', room_full: 'vz_err_full', auth_required: 'vz_err_auth', disconnected: 'vz_err_lost', unavailable: 'vz_err_unavailable' };

  // ── preview ──────────────────────────────────────────────────────────────────
  if (v.status === 'preview' || v.status === 'connecting' || v.status === 'error') {
    return (
      <div className={`vz vz-${mode} vz-pre`}>
        <div className="vz-pre-video">
          {v.local && v.cam ? <VideoEl stream={v.local} muted mirror /> : <span className="vz-av lg" style={{ background: avatarGradient(guestDefault || title) }}>{initialsOf(('guest' in (auth ?? {}) ? (auth as { name: string }).name : '') || title)}</span>}
          <div className="vz-pre-ctl">
            <button type="button" className={v.mic ? '' : 'off'} onClick={v.toggleMic} disabled={!v.local?.getAudioTracks().length} aria-label={t(v.mic ? 'vz_mute' : 'vz_unmute')}>{v.mic ? <Mic size={18} /> : <MicOff size={18} />}</button>
            <button type="button" className={v.cam ? '' : 'off'} onClick={v.toggleCam} aria-label={t(v.cam ? 'vz_cam_off' : 'vz_cam_on')}>{v.cam ? <Video size={18} /> : <VideoOff size={18} />}</button>
          </div>
        </div>
        <div className="vz-pre-side">
          <div className="vz-kicker"><Video size={13} />{t('vz_brand')}</div>
          <h2>{title}</h2>
          <p className="vz-muted">{liveCount ? tf(t(liveCount === 1 ? 'vz_live_one' : 'vz_live_n'), { n: liveCount }) : t('vz_live_none')}</p>
          {v.mediaErr && <p className="vz-warn">{t(v.mediaErr === 'none' ? 'vz_media_none' : 'vz_media_cam')}</p>}
          {!autoJoin && (
            <p className={`vz-net ${net.state}`} role="status">
              {net.state === 'checking' ? <Spinner size={12} /> : net.state === 'relay' ? <ShieldCheck size={14} /> : net.state === 'direct' ? <TriangleAlert size={14} /> : <WifiOff size={14} />}
              <span>{t(({ checking: 'vz_net_checking', relay: 'vz_net_relay', direct: 'vz_net_direct', blocked: 'vz_net_blocked' } as const)[net.state])}</span>
            </p>
          )}
          {!autoJoin && net.state !== 'relay' && net.state !== 'checking' && !net.configured && auth && 'staff' in auth && <p className="vz-fine">{t('vz_fail_noturn')}</p>}
          {v.status === 'error' && <p className="vz-err">{t(errKey[v.error] ?? 'vz_err_unavailable')}</p>}
          <button type="button" className="vz-join" onClick={v.join} disabled={v.status === 'connecting' || ['not_invited', 'invalid_link', 'expired_link'].includes(v.error)}>
            {v.status === 'connecting' ? <Spinner size={15} color="#fff" /> : v.status === 'error' ? <RefreshCw size={16} /> : <Video size={16} />}
            {t(v.status === 'error' ? 'vz_retry' : 'vz_join')}
          </button>
          {onLeave && <button type="button" className="vz-link" onClick={leave}>{t('cancel')}</button>}
          <p className="vz-fine">{t('vz_privacy')}</p>
        </div>
      </div>
    );
  }

  if (v.status === 'left') {
    return (
      <div className={`vz vz-${mode} vz-pre vz-left`}>
        <div className="vz-pre-side" style={{ textAlign: 'center', alignItems: 'center' }}>
          <h2>{t('vz_left')}</h2>
          <p className="vz-muted">{tf(t('vz_left_s'), { time: clock })}</p>
          <button type="button" className="vz-join" onClick={() => window.location.reload()}><RefreshCw size={16} />{t('vz_rejoin')}</button>
        </div>
      </div>
    );
  }

  // ── in the call ──────────────────────────────────────────────────────────────
  const sharer = v.screen ? 'me' : v.peers.find(p => p.screen)?.id;
  const tiles: (VisioPeer & { me?: boolean })[] = [
    ...v.peers,
    { id: 'me', name: v.me?.name ?? '', role: 'host', mic: v.mic, cam: v.cam, screen: v.screen, stream: v.local, conn: 'connected', me: true },
  ];
  const spotlight = sharer ? tiles.find(x => x.id === sharer) : v.peers.length === 1 ? v.peers[0] : null;
  const rest = spotlight ? tiles.filter(x => x !== spotlight) : tiles;
  return (
    <div className={`vz vz-${mode} vz-in${big ? ' vz-big' : ''}`}>
      <div className="vz-top">
        <span className="vz-rec" />
        <b title={title}>{title}</b>
        <span className="vz-clock">{clock}</span>
        <span className="vz-count"><Users size={13} />{v.peers.length + 1}</span>
        <span style={{ flex: 1 }} />
        {canInvite && <button type="button" className="vz-ghost" onClick={() => setInvite(i => ({ ...i, open: !i.open }))}><Link2 size={14} />{mode === 'page' ? t('vz_invite') : ''}</button>}
        {mode === 'dock' && <button type="button" className="vz-ghost" onClick={() => setBig(b => !b)} aria-label={t(big ? 'vz_shrink' : 'vz_expand')}>{big ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>}
      </div>
      {v.peers.some(p => p.conn === 'failed' || p.conn === 'stuck') && (
        <div className="vz-fail" role="alert">
          <TriangleAlert size={16} />
          <div>
            <b>{tf(t('vz_fail_title'), { name: v.peers.filter(p => p.conn === 'failed' || p.conn === 'stuck').map(p => p.name).filter(Boolean).join(', ') || '…' })}</b>
            <span>{t('vz_fail_help')}</span>
            {!v.turn?.given && auth && 'staff' in auth && <span>{t('vz_fail_noturn')}</span>}
          </div>
          <button type="button" onClick={v.join}><RefreshCw size={13} />{t('vz_reconnect')}</button>
        </div>
      )}
      {invite.open && (
        <div className="vz-invite">
          <div>{t('vz_invite_s')}</div>
          <div className="vz-invite-row">
            <input value={invite.name} onChange={e => setInvite(i => ({ ...i, name: e.target.value, url: '' }))} placeholder={t('vz_guest_name')} />
            <button type="button" onClick={makeLink} disabled={invite.busy || !invite.name.trim()}>{invite.busy ? <Spinner size={12} color="#fff" /> : <Link2 size={13} />}{t('vz_make_link')}</button>
          </div>
          {invite.url && <div className="vz-invite-row"><input readOnly value={invite.url} onFocus={e => e.target.select()} /><button type="button" onClick={() => { navigator.clipboard.writeText(invite.url).then(() => notify.success(t('vz_link_copied'))).catch(() => {}); }}><Copy size={13} />{t('vz_copy')}</button></div>}
        </div>
      )}
      <div className="vz-body">
        <div className={`vz-stage${spotlight ? ' spot' : ''} n${rest.length}`}>
          {spotlight && <Tile key={spotlight.id} name={spotlight.name} stream={spotlight.stream} cam={spotlight.cam} mic={spotlight.mic} screen={spotlight.screen} me={'me' in spotlight && !!spotlight.me} conn={spotlight.conn} big />}
          <div className="vz-strip">
            {rest.map(x => <Tile key={x.id} name={x.name} stream={x.stream} cam={x.cam} mic={x.mic} screen={x.screen} me={'me' in x && !!x.me} conn={x.conn} />)}
          </div>
          {!v.peers.length && <div className="vz-alone">{t('vz_alone')}</div>}
        </div>
        {chatOpen && (
          <aside className="vz-chat">
            <div className="vz-chat-h"><b>{t('vz_chat')}</b><button type="button" onClick={openChat} aria-label={t('close')}><X size={15} /></button></div>
            <div className="vz-chat-list">
              {!v.chat.length && <p className="vz-muted">{t('vz_chat_empty')}</p>}
              {v.chat.map(c => <div key={c.id} className={`vz-msg${c.mine ? ' mine' : ''}`}>{!c.mine && <small>{c.name}</small>}<span>{c.text}</span></div>)}
              <div ref={chatEnd} />
            </div>
            <form onSubmit={submitChat} className="vz-chat-in"><input value={msg} onChange={e => setMsg(e.target.value)} placeholder={t('vz_chat_ph')} /><button type="submit" aria-label={t('vz_send')}><Send size={15} /></button></form>
          </aside>
        )}
      </div>
      <div className="vz-bar">
        <button type="button" className={v.mic ? '' : 'off'} onClick={v.toggleMic} title={t(v.mic ? 'vz_mute' : 'vz_unmute')}>{v.mic ? <Mic size={19} /> : <MicOff size={19} />}</button>
        <button type="button" className={v.cam ? '' : 'off'} onClick={v.toggleCam} title={t(v.cam ? 'vz_cam_off' : 'vz_cam_on')}>{v.cam ? <Video size={19} /> : <VideoOff size={19} />}</button>
        {v.canScreen && <button type="button" className={v.screen ? 'on' : ''} onClick={v.toggleScreen} title={t(v.screen ? 'vz_screen_stop' : 'vz_screen')}><MonitorUp size={19} /></button>}
        <button type="button" className={chatOpen ? 'on' : ''} onClick={openChat} title={t('vz_chat')}><MessageSquare size={19} />{unread > 0 && <em>{unread}</em>}</button>
        <button type="button" className="leave" onClick={leave} title={t('vz_leave')}><PhoneOff size={19} />{mode === 'page' && <span>{t('vz_leave')}</span>}</button>
      </div>
    </div>
  );
}
