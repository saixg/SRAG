import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Building2, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
    };
  };
};
declare global { interface Window { google?: GoogleIdentity } }

export interface LoginProps { onLoginSuccess: () => void; }

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { isLoading, googleSignInConfigured, loginWithGoogleCredential } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handleLoginSuccess = useCallback(() => onLoginSuccess(), [onLoginSuccess]);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!googleSignInConfigured || !clientId) return;
    let cancelled = false;
    const onScriptError = () => setError('Google sign-in could not load. Check your connection and try again.');
    const renderGoogleButton = () => {
      if (cancelled || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async response => {
          if (!response.credential) {
            setError('Google did not return a sign-in credential. Please try again.');
            return;
          }
          setError(null);
          try {
            await loginWithGoogleCredential(response.credential);
            handleLoginSuccess();
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Company sign-in failed. Please try again.');
          }
        },
      });
      const target = document.getElementById('google-sign-in-button');
      if (target) { target.replaceChildren(); window.google.accounts.id.renderButton(target, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(340, target.clientWidth || 340), logo_alignment: 'left' }); }
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    const script = existing || document.createElement('script');
    script.addEventListener('load', renderGoogleButton);
    script.addEventListener('error', onScriptError);
    if (window.google) renderGoogleButton();
    else if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      script.removeEventListener('load', renderGoogleButton);
      script.removeEventListener('error', onScriptError);
    };
  }, [clientId, googleSignInConfigured, loginWithGoogleCredential, handleLoginSuccess]);

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
          <div className="login-panel-heading"><p className="login-eyebrow">WELCOME TO NEXUS ONE</p><h2>Sign in to your workspace</h2><p>Use your company Google account to continue.</p></div>
          {error && <div className="login-error" role="alert">{error}</div>}
          {isLoading ? <div className="login-loading" role="status"><span /> Checking your company sessionâ€¦</div> : (
            <>
              {googleSignInConfigured ? <div id="google-sign-in-button" className="google-button-host" aria-label="Continue with Google" /> : (
                <button className="google-button google-button-unavailable" type="button" disabled aria-disabled="true">
                  <span className="google-g" aria-hidden="true">G</span><span>Google sign-in setup required</span><ArrowUpRight size={17} aria-hidden="true" />
                </button>
              )}
              {!googleSignInConfigured && <p className="google-setup-note" role="note">Add VITE_GOOGLE_CLIENT_ID and the auth endpoint settings from the portal .env.example, then restart the web app.</p>}
            </>
          )}
          <div className="login-divider"><span>SECURE COMPANY SIGN-IN</span></div>
          <p className="login-privacy">Your identity and access are managed by your company. If you have trouble signing in, contact your workplace administrator.</p>
          <div className="login-help"><span>Need access?</span><span>Contact your IT or People team</span></div>
          <p className="login-footnote">Nexus One Â· Employee workspace</p>
        </section>
      </div>
    </main>
  );
};
