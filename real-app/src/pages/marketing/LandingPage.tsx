import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FileText, Users, Shield, Globe, Zap, Bot, BarChart3, ArrowRight, Check } from 'lucide-react';
import { WedyLogo } from '../../components/WedyLogo';

const FEATURES = [
  { icon: <Bot size={20} />, title: 'Claude AI-Powered', desc: 'Generate, enhance, and translate HR documents with state-of-the-art AI.' },
  { icon: <FileText size={20} />, title: 'Document Generation', desc: 'Create contracts, attestations, and letters in seconds from employee data.' },
  { icon: <Globe size={20} />, title: 'Trilingual', desc: 'Full support for French, Arabic (RTL), and English in all documents.' },
  { icon: <Shield size={20} />, title: 'Moroccan Labor Law', desc: 'Templates built for compliance with Moroccan labor regulations.' },
  { icon: <Users size={20} />, title: 'Employee Management', desc: 'Centralize employee records, contracts, and history in one place.' },
  { icon: <BarChart3 size={20} />, title: 'HR Analytics', desc: 'Dashboards and insights to optimize your HR operations.' },
];

const PRICING = [
  { name: 'Starter', price: '199', period: 'MAD/mo', features: ['Up to 25 employees', '50 documents/month', 'FR + AR languages', 'Email support'] },
  { name: 'Professional', price: '499', period: 'MAD/mo', features: ['Up to 100 employees', 'Unlimited documents', 'All languages + AI', 'Priority support', 'Custom templates'], highlight: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited everything', 'SAML SSO', 'Dedicated support', 'SLA guarantee', 'Custom integrations'] },
];

export default function LandingPage() {
  return (
    <div data-direction="A" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 32 }}>
          <WedyLogo size={26} />
          <nav style={{ display: 'flex', gap: 20, flex: 1 }}>
            {['Features', 'Pricing', 'Security', 'About'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{l}</a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/login"><button className="btn btn-ghost btn-sm">Sign in</button></Link>
            <Link to="/login"><button className="btn btn-primary btn-sm">Start free</button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div className="badge badge-primary" style={{ marginBottom: 20, display: 'inline-flex', gap: 6 }}>
          <Sparkles size={11} /> AI-powered HR for Moroccan companies
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', maxWidth: 800, margin: '0 auto 20px' }}>
          The <span style={{ color: 'var(--primary)' }}>AI-native</span> HR platform for modern teams.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--fg-muted)', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Wedy drafts, translates, and files every HR document — powered by Python and Claude AI. Built for Moroccan labor law compliance.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login"><button className="btn btn-primary btn-lg">Start free trial <ArrowRight size={15} /></button></Link>
          <button className="btn btn-ghost btn-lg">Book a demo</button>
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 32, color: 'var(--fg-muted)', fontSize: 13, flexWrap: 'wrap' }}>
          {['No credit card required', 'Free 14-day trial', 'Cancel anytime'].map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={13} style={{ color: 'var(--success)' }} /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* App preview */}
      <section style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', background: 'var(--bg-muted)' }}>
          <div style={{ background: 'var(--bg-elev)', padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {['#ef4444', '#f59e0b', '#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
            <div style={{ flex: 1, marginLeft: 8, height: 22, background: 'var(--bg-muted)', borderRadius: 4, maxWidth: 260, fontSize: 11, display: 'flex', alignItems: 'center', paddingInline: 8, color: 'var(--fg-muted)' }}>
              app.wedy.ai/dashboard
            </div>
          </div>
          <div style={{ height: 380, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>
              <BarChart3 size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>Dashboard preview</p>
              <Link to="/login"><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Try it live →</button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>Everything HR teams need</h2>
          <p style={{ fontSize: 16, color: 'var(--fg-muted)' }}>From document generation to analytics — all in one platform.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elev)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: 14 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 16, color: 'var(--fg-muted)' }}>Start free, scale as you grow.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {PRICING.map(p => (
            <div key={p.name} style={{
              padding: 28, border: p.highlight ? '2px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', background: p.highlight ? 'var(--primary-soft)' : 'var(--bg-elev)',
              position: 'relative',
            }}>
              {p.highlight && <div className="badge badge-primary" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>Most popular</div>}
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 700 }}>{p.price}</span>
                {p.period && <span style={{ fontSize: 13, color: 'var(--fg-muted)', marginLeft: 4 }}>{p.period}</span>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <Check size={13} style={{ color: 'var(--success)', flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/login">
                <button className={`btn ${p.highlight ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%' }}>
                  Get started
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--primary)', color: '#fff', padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Ready to transform your HR?</h2>
        <p style={{ opacity: 0.85, fontSize: 16, marginBottom: 28 }}>Join HR teams using Wedy to automate their daily operations.</p>
        <Link to="/login"><button className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)' }}>Start free trial <ArrowRight size={15} /></button></Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 24px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <WedyLogo size={20} />
          <span>© 2026 Wedy · Powered by Python + Claude AI</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: 'var(--fg-muted)' }}>Privacy</a>
            <a href="#" style={{ color: 'var(--fg-muted)' }}>Terms</a>
            <a href="#" style={{ color: 'var(--fg-muted)' }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
