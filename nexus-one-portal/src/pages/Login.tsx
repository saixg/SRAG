import React, { useCallback, useState } from 'react';
import { Building2, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type LoginMode = 'login' | 'register';

export interface LoginProps { onLoginSuccess: () => void; }

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { isLoading, loginWithPassword, registerAccount } = useAuth();
  const [mode, setMode] = useState<LoginMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleLoginSuccess = useCallback(() => onLoginSuccess(), [onLoginSuccess]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    try {
      if (mode === 'register') {
        if (password !== String(form.get('confirmPassword') || '')) {
          throw new Error('The passwords do not match.');
        }
        await registerAccount({
          name: String(form.get('name') || '').trim(),
          username: String(form.get('username') || '').trim(),
          email: String(form.get('email') || '').trim(),
          password,
          inviteCode: String(form.get('inviteCode') || ''),
        });
      } else {
        await loginWithPassword(String(form.get('username') || '').trim(), password);
      }
      handleLoginSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode: LoginMode) => {
    setError(null);
    setMode(nextMode);
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

        <section className="login-panel" aria-label={mode === 'register' ? 'Create employee account' : 'Sign in'}>
          <div className="login-panel-top"><span className="login-secure"><LockKeyhole size={14} /> COMPANY ACCESS</span><span className="login-step">01 <i /> 01</span></div>
          <div className="login-panel-heading"><p className="login-eyebrow">WELCOME TO NEXUS ONE</p><h2>{mode === 'register' ? 'Create your account' : 'Sign in to your workspace'}</h2><p>{mode === 'register' ? 'Use your company invitation to set up your employee account.' : 'Enter the username and password provided by your company.'}</p></div>
          {error && <div className="login-error" role="alert">{error}</div>}
          {isLoading ? <div className="login-loading" role="status"><span /> Checking your company session...</div> : (
            <form className="login-form" onSubmit={handleSubmit} key={mode}>
              {mode === 'register' && <label className="login-field" htmlFor="register-name">Full name
                <input id="register-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} />
              </label>}
              {mode === 'register' && <label className="login-field" htmlFor="register-email">Work email
                <input id="register-email" name="email" type="email" autoComplete="email" required maxLength={254} />
              </label>}
              <label className="login-field" htmlFor="login-username">{mode === 'register' ? 'Choose a username' : 'Username or work email'}
                <input id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={mode === 'register' ? 3 : 1} maxLength={254} />
              </label>
              <label className="login-field" htmlFor="login-password">Password
                <input id="login-password" name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={1024} />
              </label>
              {mode === 'register' && <label className="login-field" htmlFor="register-confirm-password">Confirm password
                <input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} />
              </label>}
              {mode === 'register' && <label className="login-field" htmlFor="register-invite">Company invitation code
                <input id="register-invite" name="inviteCode" type="password" autoComplete="off" required maxLength={128} />
              </label>}
              <button className="login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : (mode === 'register' ? 'Create employee account' : 'Sign in securely')}</button>
            </form>
          )}
          <div className="login-divider"><span>{mode === 'register' ? 'INVITED EMPLOYEES' : 'SECURE COMPANY SIGN-IN'}</span></div>
          <p className="login-privacy">{mode === 'register' ? 'Registration requires a company invitation code. Ask your IT or People team if you need one. New accounts receive employee access.' : 'Your identity and access are managed by your company. If you have trouble signing in, contact your workplace administrator.'}</p>
          <div className="login-help"><span>{mode === 'register' ? 'Already registered?' : 'New to Nexus One?'}</span><button className="login-mode-toggle" type="button" onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Sign in' : 'Create an account'}</button></div>
          <p className="login-footnote">Nexus One | Employee workspace</p>
        </section>
      </div>
    </main>
  );
};
