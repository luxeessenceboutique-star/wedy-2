import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowBigUp, ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff, KeyRound, LayoutDashboard, LifeBuoy, Lock, Mail } from 'lucide-react';
import '@/styles/login.css';
import { useAuth, isHRRole } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { prefersReducedMotion } from '@/lib/inView';
import { useNotify } from '@/lib/notify';
import { getApiError } from '@/services/api';
import { useReveal } from '@/components/motion';
import { BrandPanel } from '@/components/login/BrandPanel';
import { LoginReveal as R } from '@/components/login/LoginReveal';
import type { MosaicHandle } from '@/components/login/AvatarMosaic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** How long the "Bon retour" screen stays before the redirect (the progress bar fills over the same time). */
const SUCCESS_MS = 2200;
const SUCCESS_REDUCED_MS = 600;

function firstNameOf(fullName: string | undefined, email: string): string {
  const first = (fullName?.trim().split(/\s+/)[0]) || (email.trim().split('@')[0] ?? '').split(/[._-]/)[0];
  return first ? first[0].toUpperCase() + first.slice(1) : '';
}

/** "Bon retour, Salma." — check mark drawing itself, a progress bar and where we are heading. */
function LoginSuccess({ name, employee, destination }: { name: string; employee: boolean; destination: string }) {
  const { t } = useLang();
  const reduced = prefersReducedMotion();
  const ringRef = useReveal<SVGCircleElement>('draw', { duration: 900 });
  const tickRef = useReveal<SVGPathElement>('draw', { delay: 450, duration: 650 });
  const barRef = useReveal<HTMLDivElement>('growx', { delay: 400, duration: reduced ? 0 : SUCCESS_MS - 400 });
  return (
    <div className="lg-ok">
      <R variant="scale" className="lg-ok-mark">
        <span className="lg-ok-ping lg-ping" aria-hidden="true" />
        <svg viewBox="0 0 100 100" className="lg-ok-svg" aria-hidden="true">
          <circle cx="50" cy="50" r="46" style={{ fill: 'var(--success-soft)' }} />
          <circle ref={ringRef} cx="50" cy="50" r="46" style={{ fill: 'none', stroke: 'var(--success)', strokeWidth: 4, strokeLinecap: 'round', transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
          <path ref={tickRef} d="M31 51 L44 64 L70 37" style={{ fill: 'none', stroke: 'var(--success)', strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
        </svg>
      </R>
      <R as="h1" variant="up" delay={300} className="lg-ok-h1" role="status">{t('login_success_title').replace('{name}', name)}</R>
      <R as="p" variant="up" delay={380} className="lg-sub">{t(employee ? 'login_success_employee' : 'login_success_hr')}</R>
      <R variant="fade" delay={440} className="lg-ok-bar"><div ref={barRef} /></R>
      <R variant="fade" delay={520} className="lg-ok-where"><LayoutDashboard size={14} />{window.location.host}{destination}</R>
    </div>
  );
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const { t } = useLang();
  const notify = useNotify();
  const navigate = useNavigate();

  const [step, setStep] = useState<'login' | 'success'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState('/app');

  const cardRef = useRef<HTMLDivElement>(null);
  const mosaicRef = useRef<MosaicHandle>(null);
  const redirectTimer = useRef<number>(0);

  useEffect(() => {
    const previous = document.title;
    document.title = t('login_page_title');
    return () => { document.title = previous; };
  }, [t]);

  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);

  const shake = () => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;
    try {
      card.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-11px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
        { duration: 440, easing: 'ease-in-out' },
      );
    } catch { /* animations unsupported */ }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const mail = email.trim();
    const problem = !EMAIL_RE.test(mail) ? t('login_err_email') : !password ? t('login_err_password') : '';
    if (problem) { setError(problem); shake(); return; }

    setError('');
    setLoading(true);
    try {
      const { role } = await login(mail, password);
      const dest = isHRRole(role) ? '/app' : '/employee';
      setDestination(dest);
      setStep('success');
      mosaicRef.current?.burst(1.3);
      redirectTimer.current = window.setTimeout(() => navigate(dest), prefersReducedMotion() ? SUCCESS_REDUCED_MS : SUCCESS_MS);
    } catch (err: unknown) {
      setError(getApiError(err, t('login_err_generic')));
      shake();
    } finally {
      setLoading(false);
    }
  };

  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    const on = !!e.getModifierState?.('CapsLock');
    if (on !== caps) setCaps(on);
  };

  // The submit button leans towards the cursor (12% horizontally, 30% vertically)
  const lean = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch' || prefersReducedMotion()) return;
    const b = e.currentTarget, r = b.getBoundingClientRect();
    b.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.12).toFixed(1)}px`);
    b.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
  };
  const unlean = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty('--tx', '0px');
    e.currentTarget.style.setProperty('--ty', '0px');
  };

  const consent = t('login_consent').split(/(\{terms\}|\{privacy\})/).map((part, i) =>
    part === '{terms}' ? <Link key={i} to="/legal">{t('login_terms')}</Link>
      : part === '{privacy}' ? <Link key={i} to="/legal">{t('login_privacy')}</Link>
      : part);

  return (
    <div className="lg">
      <main className="lg-main">
        <div className="lg-top">
          <R variant="down"><Link to="/" className="lg-back"><ArrowLeft size={15} />{t('login_back_to_site')}</Link></R>
          <R variant="down" delay={80}>
            <button type="button" className="lg-help" onClick={() => notify.info(t('login_help_hint'), { duration: 6000 })}>
              <LifeBuoy size={15} />{t('login_need_help')}
            </button>
          </R>
        </div>

        <div className="lg-stage">
          <R variant="up" delay={120} className="lg-card-wrap">
            <div className="lg-card-glow" aria-hidden="true" />
            <div ref={cardRef} className="lg-card">
              {step === 'login' ? (
                <form onSubmit={handleSubmit} noValidate className="lg-form">
                  <R variant="up" delay={200} className="lg-badge"><Lock size={12} />{t('login_secure_badge')}</R>
                  <R as="h1" variant="up" delay={260} className="lg-h1">{t('login_title')}</R>
                  <R as="p" variant="up" delay={320} className="lg-sub">{t('login_subtitle')}</R>

                  <R as="label" variant="up" delay={380} className="lg-field" style={{ marginTop: 30 }}>
                    <span className="lg-label">{t('login_email_label')}</span>
                    <span className="lg-ctl">
                      <span className="lg-ico"><Mail size={17} /></span>
                      <input
                        type="text" inputMode="email" autoComplete="email" className="lg-input"
                        placeholder={t('login_email_placeholder')} value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                      />
                    </span>
                  </R>

                  <R variant="up" delay={440} className="lg-field" style={{ marginTop: 18 }}>
                    <div className="lg-field-head">
                      <label htmlFor="lg-pw" className="lg-label">{t('login_password_label')}</label>
                      <button type="button" className="lg-link" onClick={() => notify.info(t('login_forgot_hint'), { duration: 6000 })}>{t('login_forgot')}</button>
                    </div>
                    <span className="lg-ctl">
                      <span className="lg-ico"><KeyRound size={17} /></span>
                      <input
                        id="lg-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" className="lg-input lg-input--pw"
                        placeholder={t('login_password_placeholder')} value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        onKeyDown={checkCaps} onKeyUp={checkCaps}
                      />
                      <button type="button" className="lg-eye" onClick={() => setShowPw(s => !s)} aria-label={t('login_toggle_password')} aria-pressed={showPw}>
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                    {caps && <R variant="up" className="lg-caps"><ArrowBigUp size={15} />{t('login_caps_on')}</R>}
                  </R>

                  {error && <R variant="up" className="lg-error" role="alert"><CircleAlert size={17} /><span>{error}</span></R>}

                  <R variant="up" delay={500} style={{ marginTop: 26 }}>
                    <button type="submit" className="lg-submit" disabled={loading} onPointerMove={lean} onPointerLeave={unlean}>
                      {loading ? (
                        <><span className="lg-spinner wedy-spin" style={{ ['--dur' as string]: '.8s' }} /><span>{t('login_submitting')}</span></>
                      ) : (
                        <><span>{t('login_submit')}</span><ArrowRight size={18} /></>
                      )}
                    </button>
                  </R>

                  <R variant="fade" delay={600} as="p" className="lg-consent">{consent}</R>
                </form>
              ) : (
                <LoginSuccess name={firstNameOf(user?.full_name, user?.email ?? email)} employee={destination !== '/app'} destination={destination} />
              )}
            </div>
          </R>
        </div>
      </main>

      <BrandPanel mosaicRef={mosaicRef} />
    </div>
  );
}
