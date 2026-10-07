import React, { useCallback, useState } from 'react';
import { Building2, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface LoginProps { onLoginSuccess: () => void; }

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { isLoading, loginWithPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleLoginSuccess = useCallback(() => onLoginSuccess(), [onLoginSuccess]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') || '').trim();
    const password = String(form.get('password') || '');
    try {
      await loginWithPassword(username, password);
      handleLoginSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed. Check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-grid">
        <section className="login-intro" aria-labelledby="login-heading">
          <a className="login-brand" href="/login" aria-label="Nexus One sign in">
            <span className="login-brand-mark"><Building2 size={22} aria-hidden="true" /></span>
            <span><strong>Nexus One</strong><small>Employee workspace</small></span>
          </a>
          <div className="login-copy">
            <span className="login-eyebrow"><Sparkles size={15} aria-hidden="true" /> ONE CONNECTED WORKPLACE</span>
            <h1 id="login-heading">Your workday,<br />in one place.</h1>
            <p>Find the people, information, and tools you need to move work forward.</p>
          </div>
          <ul className="login-benefits">
            <li><CheckCircle2 size={18} aria-hidden="true" /><span>Company news and events, all in one view</span></li>
            <li><CheckCircle2 size={18} aria-hidden="true" /><span>Everyday people services, easier to find</span></li>
            <li><CheckCircle2 size={18} aria-hidden="true" /><span>Team actions and learning in context</span></li>
          </ul>
          <div className="login-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="visual-center"><Building2 size={34} /></div>
            <span className="visual-chip chip-one">People</span><span className="visual-chip chip-two">Work</span><span className="visual-chip chip-three">Growth</span>
          </div>
        </section>

        <section className="login-panel" aria-label="Sign in">
          <div className="login-panel-top"><span className="login-secure"><LockKeyhole size={14} /> COMPANY ACCESS</span><span className="login-step">01 <i /> 01</span></div>
          <div className="login-panel-heading"><p className="login-eyebrow">WELCOME TO NEXUS ONE</p><h2>Sign in to your workspace</h2><p>Enter the username and password provided by your company.</p></div>
          {error && <div className="login-error" role="alert">{error}</div>}
          {isLoading ? <div className="login-loading" role="status"><span /> Checking your company session...</div> : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-field" htmlFor="login-username">Username or work email
                <input id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} />
              </label>
              <label className="login-field" htmlFor="login-password">Password
                <input id="login-password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
              </label>
              <button className="login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in securely'}</button>
            </form>
          )}
          <div className="login-divider"><span>SECURE COMPANY SIGN-IN</span></div>
          <p className="login-privacy">Your identity and access are managed by your company. If you have trouble signing in, contact your workplace administrator.</p>
          <div className="login-help"><span>Need access?</span><span>Contact your IT or People team</span></div>
          <p className="login-footnote">Nexus One | Employee workspace</p>
        </section>
      </div>
    </main>
  );
};
