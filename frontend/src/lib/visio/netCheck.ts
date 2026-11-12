// Quick look at what this network allows before a call: which kinds of ICE candidates the browser can gather.
//   relay  = the TURN relay of the server is reachable (the call works even behind a strict firewall)
//   srflx  = a STUN server answered (direct connections are possible, but they fail between some networks)
//   neither = UDP / STUN is blocked here
export type NetFound = { host: boolean; srflx: boolean; relay: boolean };
export type NetState = 'checking' | 'relay' | 'direct' | 'blocked';

export async function checkNetwork(ice: RTCIceServer[], ms = 5000): Promise<NetFound> {
  const found: NetFound = { host: false, srflx: false, relay: false };
  if (typeof RTCPeerConnection === 'undefined') return found;
  const pc = new RTCPeerConnection({ iceServers: ice });
  try {
    pc.createDataChannel('check');
    await new Promise<void>(resolve => {
      const timer = window.setTimeout(resolve, ms);
      const done = () => { window.clearTimeout(timer); resolve(); };
      pc.onicecandidate = e => {
        if (!e.candidate) { done(); return; }
        const m = / typ (host|srflx|relay)/.exec(e.candidate.candidate);
        if (m) found[m[1] as keyof NetFound] = true;
        if (found.relay) done(); // nothing better to wait for
      };
      pc.createOffer().then(o => pc.setLocalDescription(o)).catch(done);
    });
  } finally { pc.close(); }
  return found;
}

export const netStateOf = (f: NetFound): NetState => (f.relay ? 'relay' : f.srflx ? 'direct' : 'blocked');
