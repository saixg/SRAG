import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, BookOpen, Building2, Check, ChevronDown, CircleHelp, Compass, LockKeyhole, Menu, Search, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { publicFaqs, publicNavigation, publicResources, publicSolutions } from '../data/publicSiteContent';
import './public-site.css';

type PublicSiteProps = { currentRoute: string; onNavigate: (path: string) => void };
type LeadStatus = 'idle' | 'sending' | 'sent' | 'unavailable' | 'error';
const leadEndpoint = import.meta.env.VITE_PUBLIC_LEAD_ENDPOINT as string | undefined;
const publicYear = new Date().getFullYear();

const pageMeta: Record<string, { title: string; description: string }> = {
  home: { title: 'Nexus One | A clearer place to start the workday', description: 'Explore Nexus One, an employee workspace concept bringing company updates, employee services, team information, learning, and support into one portal.' },
  solutions: { title: 'Solutions | Nexus One', description: 'Explore employee self-service, people operations, and team-work journeys in the Nexus One portal preview.' },
  resources: { title: 'Resources | Nexus One', description: 'Search practical guides, FAQs, templates, training, and product preview notes for employee portals.' },
  customers: { title: 'Customer stories | Nexus One', description: 'See the current status of verified customer stories for Nexus One.' },
  pricing: { title: 'Pricing and fit | Nexus One', description: 'Understand the preview, deployment questions, and an assumption-based time-savings estimator.' },
  trust: { title: 'Trust and security | Nexus One', description: 'Understand what is and is not verified in the current Nexus One portal preview.' },
  accessibility: { title: 'Accessibility | Nexus One', description: 'Read about accessibility features and limitations in the Nexus One preview.' },
  company: { title: 'About Nexus One | Nexus Technologies', description: 'Learn about the Nexus One employee workspace concept and explore the current preview.' },
  support: { title: 'Support | Nexus One', description: 'Find answers about portal access, sample data, support, and the Nexus One preview.' },
  contact: { title: 'Request a walkthrough | Nexus One', description: 'Request a conversation about the Nexus One employee workspace preview.' },
};

const navigateLink = (event: React.MouseEvent<HTMLAnchorElement>, path: string, navigate: (path: string) => void) => {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const LinkButton: React.FC<{ to: string; onNavigate: (path: string) => void; children: React.ReactNode; secondary?: boolean; className?: string }> = ({ to, onNavigate, children, secondary, className = '' }) => (
  <a className={`public-button ${secondary ? 'public-button-secondary' : 'public-button-primary'} ${className}`} href={to} onClick={event => navigateLink(event, to, onNavigate)}>{children}</a>
);

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
  const [visible, setVisible] = useState(() => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window));
  const id = React.useId();
  useEffect(() => {
    if (visible) return;
    const element = document.querySelector(`[data-reveal-id="${id}"]`);
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, visible]);
  return <div data-reveal-id={id} className={`public-reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
};

const SiteHeader: React.FC<PublicSiteProps> = ({ currentRoute, onNavigate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return [
      ...publicResources.filter(item => `${item.title} ${item.summary} ${item.topic} ${item.type}`.toLowerCase().includes(term)).slice(0, 4).map(item => ({ title: item.title, detail: `${item.type} · ${item.topic}`, path: `/resources#${item.slug}` })),
      ...publicSolutions.filter(item => `${item.title} ${item.summary} ${item.audience}`.toLowerCase().includes(term)).slice(0, 3).map(item => ({ title: item.title, detail: `Solution · ${item.audience}`, path: `/solutions#${item.id}` })),
      ...publicFaqs.filter(item => `${item.question} ${item.answer}`.toLowerCase().includes(term)).slice(0, 2).map(item => ({ title: item.question, detail: 'FAQ', path: '/support' })),
    ].slice(0, 6);
  }, [search]);
  const go = (path: string) => { onNavigate(path); setMenuOpen(false); setSearchOpen(false); setSearch(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <header className="public-header">
    <a href="/" className="public-brand" onClick={event => navigateLink(event, '/', onNavigate)} aria-label="Nexus One home">
      <span className="public-brand-mark"><Building2 size={20} aria-hidden="true" /></span><span><strong>Nexus One</strong><small>Employee workspace</small></span>
    </a>
    <button type="button" className="public-mobile-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
    <nav className={`public-nav ${menuOpen ? 'public-nav-open' : ''}`} aria-label="Main navigation">
      {publicNavigation.map(item => <a key={item.path} href={item.path} aria-current={currentRoute === item.path.slice(1) ? 'page' : undefined} onClick={event => { navigateLink(event, item.path, onNavigate); setMenuOpen(false); }}>{item.label}</a>)}
      <a className="public-nav-support" href="/support" onClick={event => { navigateLink(event, '/support', onNavigate); setMenuOpen(false); }}>Support</a>
    </nav>
    <div className="public-header-actions">
      <button type="button" className="public-icon-button" aria-label={searchOpen ? 'Close search' : 'Search the site'} aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}><Search size={18} /></button>
      <LinkButton to="/login" onNavigate={onNavigate} secondary className="public-signin">Employee sign in</LinkButton>
      <LinkButton to="/contact" onNavigate={onNavigate}>Request a walkthrough <ArrowRight size={15} /></LinkButton>
    </div>
    {searchOpen && <div className="public-search-popover">
      <label htmlFor="public-site-search">Search solutions, guides, and FAQs</label>
      <div className="public-search-input"><Search size={17} /><input id="public-site-search" autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Try leave, team, or security" onKeyDown={event => { if (event.key === 'Escape') setSearchOpen(false); }} /><button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button></div>
      {search.trim() && <div className="public-search-results" role="status">{results.length ? results.map((item, index) => <a key={`${item.path}-${index}`} href={item.path} onClick={event => navigateLink(event, item.path, go)}><strong>{item.title}</strong><span>{item.detail}</span></a>) : <p>No results. Try a different search.</p>}</div>}
    </div>}
  </header>;
};

const SiteFooter: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <footer className="public-footer">
    <div className="public-footer-main">
      <div className="public-footer-brand"><a href="/" className="public-brand" onClick={event => navigateLink(event, '/', onNavigate)}><span className="public-brand-mark"><Building2 size={20} /></span><span><strong>Nexus One</strong><small>Employee workspace</small></span></a><p>A clearer place to find the people, information, and everyday services that help work move forward.</p></div>
      <div><h2>Explore</h2><a href="/solutions" onClick={event => navigateLink(event, '/solutions', onNavigate)}>Solutions</a><a href="/resources" onClick={event => navigateLink(event, '/resources', onNavigate)}>Resources</a><a href="/customers" onClick={event => navigateLink(event, '/customers', onNavigate)}>Customer stories</a></div>
      <div><h2>Information</h2><a href="/pricing" onClick={event => navigateLink(event, '/pricing', onNavigate)}>Pricing and fit</a><a href="/trust" onClick={event => navigateLink(event, '/trust', onNavigate)}>Trust center</a><a href="/accessibility" onClick={event => navigateLink(event, '/accessibility', onNavigate)}>Accessibility</a><a href="/company" onClick={event => navigateLink(event, '/company', onNavigate)}>About Nexus One</a></div>
      <div><h2>Get help</h2><a href="/support" onClick={event => navigateLink(event, '/support', onNavigate)}>Support and FAQs</a><a href="/contact" onClick={event => navigateLink(event, '/contact', onNavigate)}>Contact</a><a href="/login" onClick={event => navigateLink(event, '/login', onNavigate)}>Employee sign in</a></div>
    </div>
    <div className="public-footer-bottom"><span>© {publicYear} Nexus One preview</span><span>Sample content is clearly identified. No customer results or compliance claims are published.</span></div>
  </footer>
);

const SectionHeading: React.FC<{ eyebrow: string; title: string; copy?: string; centered?: boolean }> = ({ eyebrow, title, copy, centered }) => (
  <div className={`public-section-heading ${centered ? 'public-centered' : ''}`}><span className="public-eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>
);

const HomePage: React.FC<PublicSiteProps> = ({ onNavigate }) => {
  const [tourTab, setTourTab] = useState('Home');
  const tourTabs = ['Home', 'People', 'Services'];
  const tourContent: Record<string, { title: string; detail: string; badge: string }> = {
    Home: { title: 'A useful starting point for the workday', detail: 'See announcements, upcoming events, current tasks, and quick links together.', badge: 'Employee dashboard' },
    People: { title: 'Find people and team context', detail: 'Browse colleague profiles, team details, and organization information.', badge: 'Company directory' },
    Services: { title: 'Get to everyday employee services', detail: 'Find leave, attendance, payroll, benefits, and support entry points.', badge: 'Employee services' },
  };
  return <>
    <section className="public-hero">
      <div className="public-hero-copy"><span className="public-eyebrow"><Sparkles size={14} /> ONE CONNECTED WORKPLACE</span><h1>Make the workday easier to <em>navigate.</em></h1><p>Bring company updates, employee services, team information, and support into one clear place to start.</p><div className="public-hero-actions"><LinkButton to="/contact" onNavigate={onNavigate}>Request a walkthrough <ArrowRight size={16} /></LinkButton><LinkButton to="/solutions" onNavigate={onNavigate} secondary>Explore solutions</LinkButton></div><p className="public-hero-note">Nexus One is an employee workspace preview. Some screens use sample data and are not connected to live HR systems.</p></div>
      <div className="public-hero-visual" aria-label="Illustration of the Nexus One employee workspace"><div className="public-product-window"><div className="public-window-bar"><span /><span /><span /><b>Nexus One workspace</b></div><div className="public-window-layout"><div className="public-window-side"><i /><i /><i /><i /><i /></div><div className="public-window-main"><div className="public-window-greeting"><small>EMPLOYEE DASHBOARD</small><strong>Good morning</strong><span>Your workday, in one place.</span></div><div className="public-window-metrics"><div><small>LEAVE BALANCE</small><b>—</b><span>Connected data required</span></div><div><small>UPCOMING</small><b>Events</b><span>Company calendar</span></div></div><div className="public-window-task"><span className="public-window-dot" /><div><b>Find what you need</b><small>People · updates · support</small></div><ArrowRight size={15} /></div></div></div></div><span className="public-visual-caption">A product illustration, not a live customer account</span></div>
    </section>
    <section className="public-proof-strip"><div><span className="public-proof-icon"><Compass size={19} /></span><p><strong>One place to start</strong><span>Everyday workplace destinations in one workspace</span></p></div><div><span className="public-proof-icon"><Users size={19} /></span><p><strong>Designed around people</strong><span>Useful paths for employees, teams, and people operations</span></p></div><div><span className="public-proof-icon"><ShieldCheck size={19} /></span><p><strong>Clear about the preview</strong><span>Sample data and unavailable connections are identified</span></p></div></section>
    <section className="public-section public-solutions-section"><Reveal><SectionHeading eyebrow="SOLUTIONS" title="The right information, closer to the work" copy="Explore the common journeys the Nexus One workspace is designed to bring together." /></Reveal><div className="public-solution-grid">{publicSolutions.map((solution, index) => <Reveal key={solution.id} delay={index * 70}><article className="public-solution-card" id={solution.id}><span className="public-card-index">0{index + 1}</span><span className="public-card-audience">{solution.audience}</span><h3>{solution.title}</h3><p>{solution.summary}</p><a href={`/solutions#${solution.id}`} onClick={event => navigateLink(event, `/solutions#${solution.id}`, onNavigate)}>Explore this journey <ArrowRight size={15} /></a></article></Reveal>)}</div></section>
    <section className="public-section public-tour-section"><Reveal><SectionHeading eyebrow="A QUICK LOOK" title="See how the workspace fits together" copy="Explore a few real sections from the employee portal. Preview data is illustrative." /></Reveal><div className="public-tour"><div className="public-tour-tabs" role="tablist" aria-label="Workspace preview sections">{tourTabs.map((tab, index) => <button key={tab} data-tour-tab={tab} type="button" role="tab" aria-selected={tourTab === tab} aria-controls="workspace-preview" tabIndex={tourTab === tab ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const step = event.key === 'ArrowRight' ? 1 : -1; const next = tourTabs[(index + step + tourTabs.length) % tourTabs.length]; setTourTab(next); document.querySelector<HTMLButtonElement>(`[data-tour-tab="${next}"]`)?.focus(); } }} onClick={() => setTourTab(tab)}>{tab}</button>)}</div><div className="public-tour-content" id="workspace-preview" role="tabpanel" aria-label={`${tourTab} preview`}><div className="public-tour-text"><span>{tourContent[tourTab].badge}</span><h3>{tourContent[tourTab].title}</h3><p>{tourContent[tourTab].detail}</p><LinkButton to="/login" onNavigate={onNavigate} secondary>Employee sign in <ArrowRight size={15} /></LinkButton></div><div className="public-tour-screen"><div className="public-tour-screen-head"><span /><span /><span /><b>{tourContent[tourTab].badge}</b></div><div className="public-tour-screen-content"><div className="public-tour-line wide" /><div className="public-tour-line" /><div className="public-tour-tile-row"><i /><i /><i /></div><div className="public-tour-row"><span /><div><i /><i /></div></div><div className="public-tour-row"><span /><div><i /><i /></div></div></div></div></div></div></section>
    <section className="public-section public-journey-section"><Reveal><SectionHeading eyebrow="CHOOSE A STARTING POINT" title="Explore by the work you do" copy="Choose a path to see where the portal may be useful. This choice is only for browsing; it does not track you or change access." centered /></Reveal><div className="public-journey-grid">{publicSolutions.map(item => <a key={item.id} href={`/solutions#${item.id}`} onClick={event => navigateLink(event, `/solutions#${item.id}`, onNavigate)}><span>{item.audience}</span><strong>{item.title}</strong><ArrowDownRight size={19} /></a>)}</div></section>
    <section className="public-section public-resource-teaser"><Reveal><div className="public-resource-teaser-copy"><span className="public-eyebrow">RESOURCE LIBRARY</span><h2>Useful guidance, clearly labeled.</h2><p>Browse practical portal guides, FAQs, templates, and product notes. Preview materials are not a substitute for your employer’s current policies.</p><LinkButton to="/resources" onNavigate={onNavigate} secondary>Explore resources <ArrowRight size={15} /></LinkButton></div><div className="public-resource-preview"><span><BookOpen size={18} /> GUIDE</span><strong>Employee portal: a practical starting point</strong><small>Getting started · Preview content</small><hr /><span><CircleHelp size={18} /> FAQ</span><strong>Who can access employee information?</strong><small>People operations · Preview content</small></div></Reveal></section>
    <FaqSection />
    <FinalCta onNavigate={onNavigate} />
  </>;
};

const SolutionsPage: React.FC<PublicSiteProps> = ({ onNavigate }) => <>
  <PageIntro eyebrow="SOLUTIONS" title="A connected starting point for everyday work" copy="Nexus One brings familiar employee destinations into a single workspace. These are product directions, not claims about live integrations." />
  <div className="public-page-grid">{publicSolutions.map((solution, index) => <Reveal key={solution.id} delay={index * 60}><article className="public-solution-detail" id={solution.id}><span className="public-card-audience">{solution.audience}</span><h2>{solution.title}</h2><p>{solution.summary}</p><ul>{solution.points.map(point => <li key={point}><Check size={16} />{point}</li>)}</ul><a href="/resources" onClick={event => navigateLink(event, '/resources', onNavigate)}>Read the portal guides <ArrowRight size={15} /></a></article></Reveal>)}</div>
  <Callout title="Bring your company systems into the conversation" copy="A production rollout needs your identity, HR, payroll, learning, and support systems to be configured by your organization. This preview has no live HR integrations." onNavigate={onNavigate} />
</>;

const ResourcesPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All types');
  const [topic, setTopic] = useState('All topics');
  const [feedback, setFeedback] = useState<Record<string, 'yes' | 'no'>>({});
  const types = ['All types', ...Array.from(new Set(publicResources.map(item => item.type)))];
  const topics = ['All topics', ...Array.from(new Set(publicResources.map(item => item.topic)))];
  const filtered = publicResources.filter(item => (type === 'All types' || item.type === type) && (topic === 'All topics' || item.topic === topic) && `${item.title} ${item.summary} ${item.body}`.toLowerCase().includes(query.trim().toLowerCase()));
  const clear = () => { setQuery(''); setType('All types'); setTopic('All topics'); };
  return <>
    <PageIntro eyebrow="RESOURCE CENTER" title="Guidance for the everyday questions" copy="Search the preview library for practical guides, FAQs, templates, and training notes. Material here is general guidance, not your company’s official policy." />
    <section className="public-resource-tools" aria-label="Filter resources"><label className="public-resource-search"><Search size={18} /><span className="sr-only">Search resources</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search guides, FAQs, and topics" /></label><label>Content type<select value={type} onChange={event => setType(event.target.value)}>{types.map(item => <option key={item}>{item}</option>)}</select></label><label>Topic<select value={topic} onChange={event => setTopic(event.target.value)}>{topics.map(item => <option key={item}>{item}</option>)}</select></label><button type="button" className="public-text-button" onClick={clear}>Clear filters</button></section>
    <p className="public-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}</p>
    {filtered.length ? <div className="public-resource-grid">{filtered.map((item, index) => <Reveal key={item.slug} delay={(index % 3) * 50}><details className="public-resource-card" id={item.slug}><summary><span className="public-resource-meta"><span>{item.type}</span><span>{item.topic}</span></span><h2>{item.title}</h2><p>{item.summary}</p><span className="public-resource-open">Read overview <ChevronDown size={15} /></span></summary><div className="public-resource-detail"><p>{item.body}</p><small>{item.status} · Confirm details with your organization.</small><div className="public-resource-feedback" role="group" aria-label={`Feedback on ${item.title}`}><span>Was this useful?</span><button type="button" aria-pressed={feedback[item.slug] === 'yes'} onClick={() => setFeedback(previous => ({ ...previous, [item.slug]: 'yes' }))}>Yes</button><button type="button" aria-pressed={feedback[item.slug] === 'no'} onClick={() => setFeedback(previous => ({ ...previous, [item.slug]: 'no' }))}>No</button><span className="public-feedback-status" role="status">{feedback[item.slug] ? 'Thanks for your feedback. It stays in this page only.' : ''}</span></div></div></details></Reveal>)}</div> : <div className="public-empty-state"><Search size={22} /><h2>No matching resources</h2><p>Try a broader search or clear the filters.</p><button className="public-button public-button-secondary" type="button" onClick={clear}>Clear filters</button></div>}
    <p className="public-content-note">These materials are structured preview content. A CMS, document repository, and review workflow are not connected in this build.</p>
  </>;
};

const CustomersPage: React.FC = () => <>
  <PageIntro eyebrow="CUSTOMER STORIES" title="Evidence should be earned, not invented" copy="There are no verified public customer stories or approved outcome metrics available in this project yet." />
  <section className="public-proof-empty"><div className="public-proof-empty-icon"><Users size={23} /></div><div><span className="public-eyebrow">NO VERIFIED STORIES PUBLISHED</span><h2>Customer proof will appear here after review.</h2><p>We will only publish a story when the customer, implementation details, quote, and measurable outcomes have been confirmed and approved. No customer names, logos, or performance figures are fabricated for this preview.</p></div></section>
  <div className="public-proof-framework"><SectionHeading eyebrow="WHAT A STORY SHOULD INCLUDE" title="Useful context, not just a logo" copy="A strong customer story explains what changed and how the result was measured." /><div className="public-proof-framework-grid">{['The organization and context, with permission', 'The workplace problem and chosen approach', 'Implementation scope and connected systems', 'A dated, verified outcome and its measurement', 'A customer-approved quote and review status'].map((item, index) => <div key={item}><span>0{index + 1}</span><p>{item}</p></div>)}</div></div>
</>;

const PricingPage: React.FC = () => {
  const [employees, setEmployees] = useState('250');
  const [minutes, setMinutes] = useState('15');
  const [weeks, setWeeks] = useState('46');
  const hours = Math.round((Number(employees) || 0) * (Number(minutes) || 0) * (Number(weeks) || 0) / 60);
  return <>
    <PageIntro eyebrow="PRICING & FIT" title="Start with your requirements, not an invented price" copy="Public prices and packaged plans are not configured for this preview. Deployment scope depends on your systems, access requirements, and content." />
    <div className="public-fit-grid"><section className="public-fit-card"><span className="public-eyebrow">HOW TO QUALIFY A DEPLOYMENT</span><h2>Make the scope clear first.</h2><ul><li><Check size={16} /> Which employee services should be in the portal?</li><li><Check size={16} /> Which identity, HR, payroll, and learning systems are in use?</li><li><Check size={16} /> What roles and information access rules must be enforced?</li><li><Check size={16} /> Which teams own content, support, and updates?</li></ul><p>No plans, prices, or service-level commitments have been approved for public use.</p></section><section className="public-estimator" aria-labelledby="estimator-heading"><span className="public-eyebrow">ASSUMPTION-BASED ESTIMATOR</span><h2 id="estimator-heading">Explore possible time reclaimed</h2><p>Enter your own assumptions. This estimates time only; it is not a measured result or a promise of savings.</p><label>Employees in scope<input type="number" min="1" max="100000" value={employees} onChange={event => setEmployees(event.target.value)} /></label><label>Minutes saved per employee, per week<input type="number" min="0" max="600" value={minutes} onChange={event => setMinutes(event.target.value)} /></label><label>Working weeks per year<input type="number" min="1" max="52" value={weeks} onChange={event => setWeeks(event.target.value)} /></label><div className="public-estimate-result" aria-live="polite"><span>Illustrative annual hours</span><strong>{hours.toLocaleString()}</strong><small>employees × minutes × weeks ÷ 60</small></div><small className="public-estimate-note">Calculated only from the values you enter. No data is stored or sent.</small></section></div>
  </>;
};

const TrustPage: React.FC = () => <>
  <PageIntro eyebrow="TRUST CENTER" title="Clear boundaries are part of trust" copy="This page describes what is visible in the current preview. It does not make certifications, compliance, or production-security claims." />
  <div className="public-trust-grid">{[
    { icon: <LockKeyhole size={20} />, title: 'Sign-in', text: 'Employee sign-in and registration use organization-configured API endpoints. No production identity provider is configured in this frontend checkout.' },
    { icon: <ShieldCheck size={20} />, title: 'Employee data', text: 'Many portal screens use sample content. Do not use this preview as a source of live employee, payroll, or benefits information.' },
    { icon: <Users size={20} />, title: 'Access controls', text: 'Production access to sensitive data must be enforced by the organization’s backend and authorization policies. UI visibility alone is not a security boundary.' },
    { icon: <BookOpen size={20} />, title: 'Documents and AI', text: 'RAG document search is not included in this preview. Any future document assistant must check user and document permissions before retrieval.' },
  ].map(item => <article key={item.title}><span>{item.icon}</span><h2>{item.title}</h2><p>{item.text}</p></article>)}</div>
  <section className="public-policy-note"><span className="public-eyebrow">POLICIES & AVAILABILITY</span><h2>No public compliance documents or status page are configured yet.</h2><p>We will publish approved privacy, security, accessibility, legal, and reliability information here when the responsible owners provide it.</p></section>
</>;

const AccessibilityPage: React.FC<PublicSiteProps> = ({ onNavigate }) => <>
  <PageIntro eyebrow="ACCESSIBILITY" title="A usable experience for more people" copy="The Nexus One preview includes accessibility-minded patterns, but it has not had an independent accessibility audit and makes no conformance claim." />
  <div className="public-trust-grid">{[
    { icon: <Compass size={20} />, title: 'Keyboard access', text: 'Navigation, search, resource filters, and the preview tour use native links, buttons, form controls, visible focus styles, and keyboard interaction.' },
    { icon: <Sparkles size={20} />, title: 'Reduced motion', text: 'Nonessential page reveals and hover movement are minimized when the device requests reduced motion.' },
    { icon: <BookOpen size={20} />, title: 'Readable structure', text: 'The public pages use headings, labels, semantic landmarks, and status announcements for key form and search states.' },
    { icon: <CircleHelp size={20} />, title: 'Feedback and review', text: 'The preview has not been tested with a broad range of assistive technologies. Please report barriers so they can be reviewed.' },
  ].map(item => <article key={item.title}><span>{item.icon}</span><h2>{item.title}</h2><p>{item.text}</p></article>)}</div>
  <Callout title="Tell us about an accessibility barrier" copy="The contact form needs a configured lead endpoint before it can send a request. No message is sent in the unconfigured preview." onNavigate={onNavigate} />
</>;

const CompanyPage: React.FC<PublicSiteProps> = ({ onNavigate }) => <>
  <PageIntro eyebrow="ABOUT NEXUS ONE" title="One workspace for the moments that make up work" copy="Nexus One is an employee portal concept from Nexus Technologies, designed to bring common workplace information and service entry points together." />
  <div className="public-company-story"><div className="public-company-mark"><Building2 size={29} /></div><div><h2>Designed to make the next step easier to find</h2><p>Employees often move between places to find company news, colleague details, everyday services, learning, and support. Nexus One explores a more connected starting point while leaving each organization in control of its systems and policies.</p><p>The current portal preview contains illustrative screens and sample data. It is not a live deployment or a claim of customer adoption.</p></div></div>
  <Callout title="See what is included in the preview" copy="Explore the portal screens and read the practical guides. Sign-in availability depends on an organization-configured backend." onNavigate={onNavigate} action="Employee sign in" />
</>;

const SupportPage: React.FC = () => <>
  <PageIntro eyebrow="SUPPORT" title="Find an answer or the right next step" copy="These answers cover the Nexus One preview. For company account, policy, or benefit questions, your workplace administrator is the source of truth." />
  <div className="public-support-layout"><section><h2>Frequently asked questions</h2><div className="public-faq-list">{publicFaqs.map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}<ChevronDown size={17} /></summary><p>{item.answer}</p></details>)}</div></section><aside className="public-support-card"><span className="public-card-icon"><CircleHelp size={20} /></span><h2>Need help with your account?</h2><p>Sign-in, invitation codes, and access are managed by your organization. Contact your workplace IT or People team for help.</p><a href="/login">Go to employee sign in <ArrowRight size={15} /></a></aside></div>
</>;

const ContactPage: React.FC = () => {
  const [status, setStatus] = useState<LeadStatus>('idle');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadEndpoint) { setStatus('unavailable'); return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus('sending');
    try {
      const response = await fetch(leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(form.entries())) });
      if (!response.ok) throw new Error('The request could not be sent.');
      setStatus('sent'); formElement.reset();
    } catch { setStatus('error'); }
  };
  return <>
    <PageIntro eyebrow="CONTACT" title="Tell us what your workplace needs" copy="Share a little context and, when a lead service is configured, the team can follow up about a walkthrough. Fields marked required must be completed." />
    <div className="public-contact-grid"><section className="public-contact-context"><span className="public-card-icon"><Building2 size={20} /></span><h2>A useful first conversation</h2><p>Talk through employee journeys, identity and system connections, role-based access, and content ownership before discussing scope.</p><ul><li><Check size={16} /> Employee experience and information architecture</li><li><Check size={16} /> System connections and rollout requirements</li><li><Check size={16} /> Document access controls for future RAG</li></ul><p className="public-content-note">This preview has no configured public sales inbox or lead-routing service.</p></section><form className="public-contact-form" onSubmit={submit}>
      <label>Full name <span aria-hidden="true">*</span><input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
      <label>Work email <span aria-hidden="true">*</span><input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>Organization<input name="organization" autoComplete="organization" maxLength={160} /></label>
      <label>What would you like to discuss?<select name="interest" defaultValue="Employee portal"><option>Employee portal</option><option>People operations</option><option>Security and access</option><option>RAG document assistant</option><option>Other</option></select></label>
      <label className="public-contact-message">A little context<textarea name="message" rows={4} maxLength={2000} placeholder="What are you hoping to improve?" /></label>
      <label className="public-consent"><input type="checkbox" name="consent" value="yes" required /><span>I agree to be contacted about this request. <small>No analytics or marketing tracking is added by this preview.</small></span></label>
      <button className="public-button public-button-primary" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Request a walkthrough'} <ArrowRight size={16} /></button>
      {status === 'sent' && <p className="public-form-message success" role="status">Your request was sent. The team can follow up using the details you provided.</p>}
      {status === 'unavailable' && <p className="public-form-message" role="status">The request form is not connected yet; nothing was sent. A site administrator must configure the lead endpoint before this form can be used.</p>}
      {status === 'error' && <p className="public-form-message error" role="alert">We could not send your request. Please try again later.</p>}
    </form></div>
  </>;
};

const FaqSection: React.FC = () => <section className="public-section public-faq-section"><Reveal><SectionHeading eyebrow="COMMON QUESTIONS" title="Straight answers about the preview" copy="Know what is available now and what needs a company connection." /></Reveal><div className="public-faq-list">{publicFaqs.slice(0, 3).map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}<ChevronDown size={17} /></summary><p>{item.answer}</p></details>)}</div></section>;

const PageIntro: React.FC<{ eyebrow: string; title: string; copy: string }> = ({ eyebrow, title, copy }) => <section className="public-page-intro"><span className="public-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></section>;
const Callout: React.FC<{ title: string; copy: string; onNavigate: (path: string) => void; action?: string }> = ({ title, copy, onNavigate, action = 'Request a walkthrough' }) => <section className="public-callout"><div><span className="public-eyebrow">NEXT STEP</span><h2>{title}</h2><p>{copy}</p></div><LinkButton to={action === 'Employee sign in' ? '/login' : '/contact'} onNavigate={onNavigate}>{action} <ArrowRight size={16} /></LinkButton></section>;
const FinalCta: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => <section className="public-final-cta"><span className="public-eyebrow">EXPLORE THE WORKSPACE</span><h2>See whether a clearer employee starting point fits your organization.</h2><p>Start with the preview or share the workplace journeys you want to improve.</p><div><LinkButton to="/contact" onNavigate={onNavigate}>Request a walkthrough <ArrowRight size={16} /></LinkButton><LinkButton to="/login" onNavigate={onNavigate} secondary>Employee sign in</LinkButton></div></section>;

export const PublicSite: React.FC<PublicSiteProps> = ({ currentRoute, onNavigate }) => {
  const route = currentRoute.replace(/^\/+/, '') || 'home';
  useEffect(() => {
    const meta = pageMeta[route] || pageMeta.home;
    document.title = meta.title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.appendChild(description); }
    description.content = meta.description;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    robots.content = 'index,follow';
    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let tag = document.querySelector<HTMLMetaElement>(selector);
      if (!tag) { tag = document.createElement('meta'); if (property) tag.setAttribute('property', name); else tag.name = name; document.head.appendChild(tag); }
      tag.content = content;
    };
    setMeta('og:title', meta.title, true);
    setMeta('og:description', meta.description, true);
    setMeta('og:type', 'website', true);
    setMeta('twitter:card', 'summary');
    setMeta('twitter:title', meta.title);
    setMeta('twitter:description', meta.description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
    return () => { robots!.content = 'noindex,nofollow'; };
  }, [route]);

  let page: React.ReactNode;
  if (route === 'home') page = <HomePage currentRoute={route} onNavigate={onNavigate} />;
  else if (route === 'solutions') page = <SolutionsPage currentRoute={route} onNavigate={onNavigate} />;
  else if (route === 'resources') page = <ResourcesPage />;
  else if (route === 'customers') page = <CustomersPage />;
  else if (route === 'pricing') page = <PricingPage />;
  else if (route === 'trust') page = <TrustPage />;
  else if (route === 'accessibility') page = <AccessibilityPage currentRoute={route} onNavigate={onNavigate} />;
  else if (route === 'company') page = <CompanyPage currentRoute={route} onNavigate={onNavigate} />;
  else if (route === 'support') page = <SupportPage />;
  else if (route === 'contact') page = <ContactPage />;
  else page = <HomePage currentRoute="home" onNavigate={onNavigate} />;

  return <div className="public-site"><a className="public-skip-link" href="#public-content">Skip to content</a><SiteHeader currentRoute={route} onNavigate={onNavigate} /><main key={route} id="public-content" className="public-main">{page}</main><SiteFooter onNavigate={onNavigate} /></div>;
};
