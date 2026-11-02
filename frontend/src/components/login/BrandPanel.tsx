import { useRef, type CSSProperties, type PointerEvent, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CalendarCheck, ShieldCheck, Sparkles, Zap, Globe } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/inView';
import { useLang } from '@/lib/lang';
import { AvatarMosaic, type MosaicHandle, type PanelPointer } from './AvatarMosaic';
import { LoginReveal as R } from './LoginReveal';

const par = (x: number, y: number): CSSProperties => ({
  transform: `translate3d(calc(var(--mx, 0) * ${x}px), calc(var(--my, 0) * ${y}px), 0)`,
});
const loop = (dur: number, delay = 0): CSSProperties => ({ ['--dur' as string]: `${dur}s`, ['--delay' as string]: `${delay}s` });

/** Dark animated panel of the login screen: orbits, avatar mosaic, floating cards, headline. */
export function BrandPanel({ mosaicRef }: { mosaicRef: Ref<MosaicHandle> }) {
  const { t } = useLang();
  const asideRef = useRef<HTMLElement>(null);
  const pointer = useRef<PanelPointer>({ x: null, y: null, inside: false });

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const a = asideRef.current;
    if (!a) return;
    pointer.current = { x: e.clientX, y: e.clientY, inside: true };
    if (prefersReducedMotion()) return;
    const r = a.getBoundingClientRect();
    a.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    a.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    a.style.setProperty('--cx', `${(e.clientX - r.left).toFixed(0)}px`);
    a.style.setProperty('--cy', `${(e.clientY - r.top).toFixed(0)}px`);
  };
  const onLeave = () => { pointer.current = { ...pointer.current, inside: false }; };

  // Headline: every word reveals on its own, the last one shimmers
  const l1 = t('login_hero_l1').split(' ');
  const l2 = t('login_hero_l2').split(' ');
  let step = 0;
  const word = (w: string, ai = false) => {
    const delay = 300 + step++ * 70;
    return (
      <R key={`${w}-${delay}`} as="span" variant="word" delay={delay} className={ai ? 'lg-word lg-word--ai wedy-shimmer' : 'lg-word'}>{w}</R>
    );
  };

  return (
    <aside ref={asideRef} className="lg-aside" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="lg-aside-bg" aria-hidden="true">
        <div className="lg-grid" />
        <div className="lg-orb lg-orb--a lg-drift" />
        <div className="lg-orb lg-orb--b lg-drift" style={loop(27, -9)} />
        <div className="lg-orb lg-orb--c lg-drift" style={loop(31, -15)} />
        <div className="lg-cursor-glow" />
      </div>

      <R variant="down" style={{ alignSelf: 'flex-start', display: 'flex' }}>
        <Link to="/" className="lg-brand">
          <img src="/wedy-avatar.png" alt="" />
          <span>Wedy</span>
        </Link>
      </R>

      <div className="lg-visual-wrap">
        <R variant="fade" duration={1200} className="lg-visual">
          <div className="lg-ring lg-ring--outer">
            <div className="lg-comet lg-comet--teal wedy-spin-slow" style={loop(10)} />
            <div className="lg-orbit wedy-spin-slow" style={loop(22)}><span className="lg-dot lg-dot--teal" /></div>
          </div>
          <div className="lg-ring lg-ring--inner">
            <div className="lg-comet lg-comet--violet wedy-spin-rev" style={loop(15)} />
            <div className="lg-orbit wedy-spin-rev" style={loop(18)}><span className="lg-dot lg-dot--violet" /></div>
          </div>
          <div className="lg-core-glow" />
          <AvatarMosaic pointer={pointer} ref={mosaicRef} />

          <R variant="right" delay={900} className="lg-fc-pos" style={{ left: 0, top: '4%' }}>
            <div className="lg-fc-par" style={par(-14, -10)}>
              <div className="lg-fc lg-float">
                <span className="lg-fc-ico" style={{ background: 'linear-gradient(135deg,#6d5ad6,#9a8bf0)' }}><Sparkles size={16} /></span>
                <div><div className="lg-fc-title">{t('login_card_doc_title')}</div><div className="lg-fc-sub">{t('login_card_doc_sub')}</div></div>
              </div>
            </div>
          </R>
          <R variant="left" delay={1150} className="lg-fc-pos" style={{ right: 0, top: '40%' }}>
            <div className="lg-fc-par" style={{ ...par(18, 12), transitionDuration: '.6s' }}>
              <div className="lg-fc lg-fc--light lg-float2">
                <span className="lg-fc-ico" style={{ borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)' }}><CalendarCheck size={16} /></span>
                <div><div className="lg-fc-title">{t('login_card_leave_title')}</div><div className="lg-fc-sub">{t('login_card_leave_sub')}</div></div>
              </div>
            </div>
          </R>
          <R variant="up" delay={1400} className="lg-fc-pos" style={{ left: '6%', bottom: '2%' }}>
            <div className="lg-fc-par" style={par(-10, 12)}>
              <div className="lg-fc lg-float" style={loop(6, -3)}>
                <span className="lg-fc-ico" style={{ background: 'rgba(39,192,212,.16)', color: 'var(--primary-glow)' }}><Bot size={17} /></span>
                <div><div className="lg-fc-title">{t('login_card_copilot_title')}</div><div className="lg-fc-sub">{t('login_card_copilot_sub')}</div></div>
              </div>
            </div>
          </R>
        </R>
      </div>

      <div className="lg-copy">
        <h2 className="lg-hero-h">
          <span className="lg-hero-line">{l1.map(w => word(w))}</span>
          <span className="lg-hero-line">{l2.map((w, i) => word(w, i === l2.length - 1))}</span>
        </h2>
        <R as="p" variant="up" delay={680} className="lg-hero-p">{t('login_hero_sub')}</R>
        <div className="lg-chips">
          <R as="span" variant="up" delay={760} className="lg-chip">
            <span className="lg-chip-ico" style={{ background: 'rgba(39,192,212,.15)', color: 'var(--primary-glow)' }}><Zap size={14} /></span>{t('login_chip_docs')}
          </R>
          <R as="span" variant="up" delay={830} className="lg-chip">
            <span className="lg-chip-ico" style={{ background: 'rgba(154,139,240,.17)', color: 'var(--ai-on-dark)' }}><Globe size={14} /></span>
            Français · <span style={{ fontFamily: 'var(--font-ar)' }}>العربية</span> · English
          </R>
          <R as="span" variant="up" delay={900} className="lg-chip">
            <span className="lg-chip-ico" style={{ background: 'rgba(43,189,134,.15)', color: 'var(--success-on-dark)' }}><ShieldCheck size={14} /></span>{t('login_chip_law')}
          </R>
        </div>
      </div>

      <R variant="fade" delay={1000} className="lg-foot">
        <span>{t('login_copyright')}</span>
        <span className="lg-foot-hint">{t('login_mosaic_hint')}</span>
      </R>
    </aside>
  );
}
