// Wedy Visio engine: camera / microphone / screen, and one WebRTC connection per other participant (mesh, ≤ 6 people).
// The Wedy API only relays the handshake over a WebSocket (/api/visio/ws/:room); audio and video go peer to peer.
//
// Negotiation is done once per pair: the newcomer sends the offer to everyone already in the room, with one audio and
// one video transceiver; the others answer. Afterwards nothing is renegotiated: muting toggles the track, the camera and
// the screen share swap the video track with replaceTrack(), so a late camera or a screen share needs no new offer.
import { useCallback, useEffect, useRef, useState } from 'react';
import { TOKEN_KEY, getIceConfig } from '@/services/api';

export type VisioPeer = { id: string; name: string; role: 'host' | 'guest'; mic: boolean; cam: boolean; screen: boolean; stream: MediaStream | null; conn: string };
export type VisioChat = { id: string; from: string; name: string; text: string; at: string; mine: boolean };
export type VisioStatus = 'preview' | 'connecting' | 'in' | 'left' | 'error';
export type VisioAuth = { guest: string; name: string } | { staff: true };

type Link = { pc: RTCPeerConnection; audio: RTCRtpSender | null; video: RTCRtpSender | null; pending: RTCIceCandidateInit[]; stream: MediaStream };

const wsUrl = (room: string, auth: VisioAuth) => {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const q = 'guest' in auth ? `guest=${encodeURIComponent(auth.guest)}&name=${encodeURIComponent(auth.name)}` : `token=${encodeURIComponent(localStorage.getItem(TOKEN_KEY) ?? '')}`;
  return `${proto}://${window.location.host}/api/visio/ws/${room}?${q}`;
};

export function useVisio(room: string, auth: VisioAuth | null) {
  const [status, setStatus] = useState<VisioStatus>('preview');
  const [error, setError] = useState('');
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [peers, setPeers] = useState<VisioPeer[]>([]);
  const [chat, setChat] = useState<VisioChat[]>([]);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [screen, setScreen] = useState(false);
  const [mediaErr, setMediaErr] = useState('');
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const links = useRef(new Map<string, Link>());
  const audioRef = useRef<MediaStreamTrack | null>(null);
  const camRef = useRef<MediaStreamTrack | null>(null);
  const screenRef = useRef<MediaStreamTrack | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const stateRef = useRef({ mic: true, cam: true, screen: false });

  const send = (m: unknown) => { const ws = wsRef.current; if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); };
  const videoTrack = () => screenRef.current ?? camRef.current;
  const refreshLocal = () => {
    const tracks = [audioRef.current, videoTrack()].filter((t): t is MediaStreamTrack => !!t);
    const s = new MediaStream(tracks);
    localRef.current = s;
    setLocal(s);
  };
  const forEachVideoSender = (track: MediaStreamTrack | null) => links.current.forEach(l => { l.video?.replaceTrack(track).catch(() => {}); });

  // ── camera / microphone (preview, then the call) ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const get = (c: MediaStreamConstraints) => navigator.mediaDevices?.getUserMedia(c);
      let s: MediaStream | undefined;
      try { s = await get({ audio: { echoCancellation: true, noiseSuppression: true }, video: { width: { ideal: 1280 }, height: { ideal: 720 } } }); }
      catch {
        try { s = await get({ audio: true }); setMediaErr('camera'); setCam(false); stateRef.current.cam = false; }
        catch { setMediaErr('none'); setMic(false); setCam(false); stateRef.current = { mic: false, cam: false, screen: false }; }
      }
      if (cancelled) { s?.getTracks().forEach(t => t.stop()); return; }
      audioRef.current = s?.getAudioTracks()[0] ?? null;
      camRef.current = s?.getVideoTracks()[0] ?? null;
      refreshLocal();
    })();
    return () => {
      cancelled = true;
      [audioRef.current, camRef.current, screenRef.current].forEach(t => t?.stop());
      audioRef.current = camRef.current = screenRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── the call ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth || attempt === 0) return;
    let closed = false;
    let ice: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    const map = links.current;

    const upsertPeer = (id: string, patch: Partial<VisioPeer>) => setPeers(ps => (ps.some(p => p.id === id) ? ps.map(p => (p.id === id ? { ...p, ...patch } : p)) : [...ps, { id, name: '', role: 'guest', mic: true, cam: true, screen: false, stream: null, conn: 'new', ...patch }]));
    const drop = (id: string) => { map.get(id)?.pc.close(); map.delete(id); setPeers(ps => ps.filter(p => p.id !== id)); };

    const makeLink = (id: string, initiator: boolean): Link => {
      const pc = new RTCPeerConnection({ iceServers: ice });
      const stream = new MediaStream();
      const link: Link = { pc, audio: null, video: null, pending: [], stream };
      if (initiator) {
        link.audio = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
        link.video = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;
        link.audio.replaceTrack(audioRef.current).catch(() => {});
        link.video.replaceTrack(videoTrack()).catch(() => {});
      }
      pc.ontrack = e => {
        stream.getTracks().filter(t => t.kind === e.track.kind).forEach(t => stream.removeTrack(t));
        stream.addTrack(e.track);
        upsertPeer(id, { stream: new MediaStream(stream.getTracks()) });
      };
      pc.onicecandidate = e => { if (e.candidate) send({ t: 'signal', to: id, data: { candidate: e.candidate.toJSON() } }); };
      pc.onconnectionstatechange = () => upsertPeer(id, { conn: pc.connectionState });
      map.set(id, link);
      return link;
    };

    const call = async (id: string) => {
      const link = makeLink(id, true);
      await link.pc.setLocalDescription(await link.pc.createOffer());
      send({ t: 'signal', to: id, data: { description: link.pc.localDescription } });
    };

    const onSignal = async (from: string, data: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      if (data.description) {
        let link = map.get(from);
        if (data.description.type === 'offer') {
          if (link) { link.pc.close(); map.delete(from); }
          link = makeLink(from, false);
          await link.pc.setRemoteDescription(data.description);
          for (const tr of link.pc.getTransceivers()) {
            const kind = tr.receiver.track.kind;
            tr.direction = 'sendrecv';
            if (kind === 'audio') { link.audio = tr.sender; await tr.sender.replaceTrack(audioRef.current).catch(() => {}); }
            if (kind === 'video') { link.video = tr.sender; await tr.sender.replaceTrack(videoTrack()).catch(() => {}); }
          }
          await link.pc.setLocalDescription(await link.pc.createAnswer());
          send({ t: 'signal', to: from, data: { description: link.pc.localDescription } });
        } else if (link && link.pc.signalingState === 'have-local-offer') {
          await link.pc.setRemoteDescription(data.description);
        }
        if (link) { for (const c of link.pending.splice(0)) await link.pc.addIceCandidate(c).catch(() => {}); }
      } else if (data.candidate) {
        const link = map.get(from);
        if (!link) return;
        if (link.pc.remoteDescription) await link.pc.addIceCandidate(data.candidate).catch(() => {});
        else link.pending.push(data.candidate);
      }
    };

    (async () => {
      try { ice = (await getIceConfig()).iceServers; } catch { /* public STUN fallback */ }
      if (closed) return;
      const ws = new WebSocket(wsUrl(room, auth));
      wsRef.current = ws;
      const ping = window.setInterval(() => send({ t: 'ping' }), 25000);
      ws.onmessage = ev => {
        let m: Record<string, unknown>;
        try { m = JSON.parse(String(ev.data)); } catch { return; }
        switch (m.t) {
          case 'welcome': {
            setMe({ id: String(m.id), name: String(m.name) });
            setStatus('in'); setJoinedAt(Date.now()); setError('');
            send({ t: 'state', ...stateRef.current });
            for (const p of (m.peers as VisioPeer[]) ?? []) { upsertPeer(p.id, { ...p, stream: null, conn: 'connecting' }); call(p.id).catch(() => upsertPeer(p.id, { conn: 'failed' })); }
            break;
          }
          case 'joined': { const p = m.peer as VisioPeer; upsertPeer(p.id, { ...p, stream: null, conn: 'connecting' }); break; }
          case 'left': drop(String(m.id)); break;
          case 'state': upsertPeer(String(m.id), { mic: !!m.mic, cam: !!m.cam, screen: !!m.screen }); break;
          case 'signal': onSignal(String(m.from), m.data as never).catch(() => {}); break;
          case 'chat': setChat(c => [...c, { id: `${m.at}-${c.length}`, from: String(m.from), name: String(m.name), text: String(m.text), at: String(m.at), mine: false }]); break;
          case 'error': setError(String(m.code)); setStatus('error'); break;
        }
      };
      ws.onclose = () => {
        window.clearInterval(ping);
        map.forEach(l => l.pc.close()); map.clear(); setPeers([]);
        if (!closed) { setStatus(s => (s === 'left' || s === 'error' ? s : 'error')); setError(e => e || 'disconnected'); }
      };
      ws.onerror = () => setError(e => e || 'unavailable');
    })();

    return () => {
      closed = true;
      send({ t: 'leave' });
      wsRef.current?.close(); wsRef.current = null;
      map.forEach(l => l.pc.close()); map.clear();
    };
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── controls ─────────────────────────────────────────────────────────────────
  const join = useCallback(() => { setError(''); setStatus('connecting'); setAttempt(a => a + 1); }, []);
  const leave = useCallback(() => {
    send({ t: 'leave' });
    setStatus('left');
    wsRef.current?.close();
    [audioRef.current, camRef.current, screenRef.current].forEach(t => t?.stop());
  }, []);
  const toggleMic = () => {
    const t = audioRef.current;
    if (!t) return;
    t.enabled = !t.enabled;
    stateRef.current.mic = t.enabled; setMic(t.enabled); send({ t: 'state', mic: t.enabled });
  };
  const toggleCam = async () => {
    if (camRef.current) {
      camRef.current.stop(); camRef.current = null;
      if (!screenRef.current) forEachVideoSender(null);
      stateRef.current.cam = false; setCam(false); send({ t: 'state', cam: false }); refreshLocal();
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      camRef.current = s.getVideoTracks()[0];
      if (!screenRef.current) forEachVideoSender(camRef.current);
      stateRef.current.cam = true; setCam(true); setMediaErr(e => (e === 'camera' ? '' : e)); send({ t: 'state', cam: true }); refreshLocal();
    } catch { setMediaErr('camera'); }
  };
  const stopScreen = () => {
    screenRef.current?.stop(); screenRef.current = null;
    forEachVideoSender(camRef.current);
    stateRef.current.screen = false; setScreen(false); send({ t: 'state', screen: false }); refreshLocal();
  };
  const toggleScreen = async () => {
    if (screenRef.current) { stopScreen(); return; }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const tr = s.getVideoTracks()[0];
      screenRef.current = tr;
      tr.onended = () => { if (screenRef.current === tr) stopScreen(); };
      forEachVideoSender(tr);
      stateRef.current.screen = true; setScreen(true); send({ t: 'state', screen: true }); refreshLocal();
    } catch { /* the user cancelled the picker */ }
  };
  const sendChat = (text: string) => {
    const x = text.trim();
    if (!x) return;
    send({ t: 'chat', text: x });
    setChat(c => [...c, { id: `me-${c.length}-${x.length}`, from: me?.id ?? 'me', name: me?.name ?? '', text: x, at: new Date().toISOString(), mine: true }]);
  };

  // our own chat messages come back from the server: keep the local copy, drop the echo
  const shownChat = chat.filter(c => c.mine || c.from !== me?.id);

  return { status, error, me, peers, chat: shownChat, local, mic, cam, screen, mediaErr, joinedAt, join, leave, toggleMic, toggleCam, toggleScreen, sendChat, canScreen: !!navigator.mediaDevices?.getDisplayMedia };
}
