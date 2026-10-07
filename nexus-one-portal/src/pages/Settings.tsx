import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  Layers,
  Save,
  RotateCcw,
  Check,
  ExternalLink,
  Moon,
  Sun,
  Monitor,
  Waves,
  Eye,
  Lock,
  Smartphone
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Tabs } from '../components/common/Tabs';
import { DEFAULT_USER_SETTINGS } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { UserSettings } from '../types';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'appearance' | 'language' | 'privacy' | 'apps'>('account');
  const [settings, setSettings] = useState<UserSettings>(() => {
    try { return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(localStorage.getItem('nexus_one_preferences_v1') || '{}') }; } catch { return DEFAULT_USER_SETTINGS; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    localStorage.setItem('nexus_one_preferences_v1', JSON.stringify(settings));
  }, [settings]);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+91 98450 12345');
  const [timezone, setTimezone] = useState('IST (UTC+05:30)');

  // Connected apps state
  const [connectedApps, setConnectedApps] = useState([
    { id: 'google_cal', name: 'Google Calendar', icon: '??', status: 'Not connected', desc: 'Preview selection only; no calendar account is connected.' },
    { id: 'slack', name: 'Slack', icon: '??', status: 'Not connected', desc: 'Preview selection only; no Slack messages are sent.' },
    { id: 'ms_teams', name: 'Microsoft Teams', icon: '??', status: 'Not connected', desc: 'Preview selection only; Teams is not connected.' },
    { id: 'github', name: 'GitHub', icon: '??', status: 'Not connected', desc: 'Preview selection only; GitHub is not connected.' },
    { id: 'figma', name: 'Figma', icon: '??', status: 'Not connected', desc: 'Preview selection only; Figma is not connected.' }
  ]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast('Preferences saved on this device.', 'success');
    }, 600);
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_USER_SETTINGS);
    addToast('Preferences restored to portal preview defaults.', 'info');
  };

  const handleToggleApp = (id: string) => {
    setConnectedApps(prev => prev.map(app => {
      if (app.id === id) {
        const nextStatus = app.status === 'Enabled in preview' ? 'Not connected' : 'Enabled in preview';
        addToast(`${app.name}: ${nextStatus}. No external account was changed.`, nextStatus === 'Enabled in preview' ? 'success' : 'info');
        return { ...app, status: nextStatus };
      }
      return app;
    }));
  };

  const tabsList = [
    { id: 'account', label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'language', label: 'Language & Region' },
    { id: 'privacy', label: 'Privacy & Security' },
    { id: 'apps', label: 'Connected Apps' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111A2E]/90 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Settings & Preferences
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your personal profile, notification frequencies, workspace visual theme, and linked integrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={handleResetSettings}
          >
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            loading={isSaving}
            onClick={handleSaveSettings}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <Tabs
          tabs={tabsList}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />

        {/* Tab 1: Account */}
        {activeTab === 'account' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card title="Account Information" subtitle="Update your contact and timezone details">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Primary Timezone
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
                      >
                        <option value="IST (UTC+05:30)">IST (UTC+05:30) - Bengaluru</option>
                        <option value="PST (UTC-08:00)">PST (UTC-08:00) - San Francisco</option>
                        <option value="EST (UTC-05:00)">EST (UTC-05:00) - New York</option>
                        <option value="GMT (UTC+00:00)">GMT (UTC+00:00) - London</option>
                        <option value="SGT (UTC+08:00)">SGT (UTC+08:00) - Singapore</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B1020]/60 border border-slate-800 space-y-1">
                    <p className="text-xs font-semibold text-slate-200">Employee ID</p>
                    <p className="text-xs text-slate-400">
                      Product Experience â€¢ Employee ID: <span className="font-mono text-[#27D8E8]">{user?.employeeId || 'Assigned by your company'}</span>
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <Card title="Company sign-in" subtitle="Your username and password are verified by the portal service">
                <p className="text-xs leading-relaxed text-slate-400">Your company administrator provisions your account and manages your access. Contact your IT or People team if you need a password reset.</p>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Notifications */}
        {activeTab === 'notifications' && (
          <Card title="Notification Preferences" subtitle="Control delivery channels and notification triggers">
            <div className="divide-y divide-slate-800/80">
              {[
                {
                  key: 'emailNotifications',
                  title: 'Email Notifications',
                  desc: 'Receive digest summaries, leave approvals, and emergency announcements in your work inbox.',
                  val: settings.emailNotifications
                },
                {
                  key: 'announcementNotifications',
                  title: 'Company Announcements Alert',
                  desc: 'Instant desktop push notifications when executives or People Ops post company-wide news.',
                  val: settings.announcementNotifications
                },
                {
                  key: 'taskReminders',
                  title: 'Task & Approval Reminders',
                  desc: 'Get notified when deliverables are assigned to you or when designs require your sign-off.',
                  val: settings.taskReminders
                },
                {
                  key: 'eventReminders',
                  title: 'Internal Events & Calendar Invites',
                  desc: 'Receive RSVP reminders 30 minutes before town halls and workshops begin.',
                  val: settings.eventReminders
                },
                {
                  key: 'learningReminders',
                  title: 'Learning & Goal Nudges',
                  desc: 'Weekly progress reminders to complete enrolled certification courses.',
                  val: settings.learningReminders
                }
              ].map((item) => (
                <div key={item.key} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !item.val;
                      setSettings(prev => ({
                        ...prev,
                        [item.key]: next
                      }));
                      addToast(`${item.title} ${next ? 'enabled' : 'disabled'}.`, 'info');
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      item.val ? 'bg-[#4F7CFF]' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.val ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tab 3: Appearance */}
        {activeTab === 'appearance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Interface Theme" subtitle="Customize the visual atmosphere of Nexus One">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'blue', label: 'Blue Focus', icon: Waves, desc: 'Soft blue surfaces' },
                    { id: 'dark', label: 'Midnight Navy', icon: Moon, desc: 'Corporate dark' },
                    { id: 'light', label: 'Clean Light', icon: Sun, desc: 'High Contrast' }
                  ].map(mode => {
                    const Icon = mode.icon;
                    const isSelected = settings.theme === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({ ...prev, theme: mode.id as any }));
                          addToast(`Theme switched to ${mode.label}`, 'success');
                        }}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-[#4F7CFF]/10 border-[#4F7CFF] ring-1 ring-[#4F7CFF]'
                            : 'bg-[#0B1020]/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-2 ${isSelected ? 'text-[#4F7CFF]' : 'text-slate-400'}`} />
                        <p className="text-xs font-bold text-white">{mode.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Layout Density
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {['comfortable', 'compact'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({ ...prev, density: d as any }));
                          addToast(`Density set to ${d}.`, 'info');
                        }}
                        className={`p-3 rounded-xl border capitalize text-xs font-semibold transition-all ${
                          settings.density === d
                            ? 'bg-[#4F7CFF]/10 border-[#4F7CFF] text-[#27D8E8]'
                            : 'bg-[#0B1020]/40 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d} View
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Primary Color Accent" subtitle="Select your personalized UI highlight tone">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: '#4F7CFF', label: 'Electric Blue', hex: '#4F7CFF' },
                    { id: '#27D8E8', label: 'Bright Cyan', hex: '#27D8E8' },
                    { id: '#8B6CFF', label: 'Innovation Violet', hex: '#8B6CFF' },
                    { id: '#21C7A8', label: 'Emerald Teal', hex: '#21C7A8' }
                  ].map(color => {
                    const isSelected = settings.accentColor === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({ ...prev, accentColor: color.id }));
                          addToast(`Primary accent changed to ${color.label}.`, 'info');
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'bg-slate-800/80 border-[#4F7CFF] ring-1 ring-[#4F7CFF]'
                            : 'bg-[#0B1020]/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color.hex }} />
                        <span className="text-xs font-semibold text-white">{color.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-[#0B1020]/60 border border-slate-800 mt-4">
                  <p className="text-xs text-slate-400">
                    Blue highlights and clear text contrast keep key controls easy to scan.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 4: Language & Region */}
        {activeTab === 'language' && (
          <Card title="Language & Regional Formats" subtitle="Select language and date-time localization">
            <div className="max-w-xl space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Portal Display Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, language: e.target.value }));
                    addToast(`Language updated to ${e.target.value}.`, 'success');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
                >
                  <option value="English (US)">English (US) - Corporate Default</option>
                  <option value="English (UK)">English (UK)</option>
                  <option value="Hindi (à¤¹à¤¿à¤¨à¥à¤¦à¥€)">Hindi (à¤¹à¤¿à¤¨à¥à¤¦à¥€)</option>
                  <option value="Spanish (EspaÃ±ol)">Spanish (EspaÃ±ol)</option>
                  <option value="French (FranÃ§ais)">French (FranÃ§ais)</option>
                  <option value="German (Deutsch)">German (Deutsch)</option>
                  <option value="Japanese (æ—¥æœ¬èªž)">Japanese (æ—¥æœ¬èªž)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Currency Format
                </label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
                >
                  <option value="INR">INR (â‚¹) - Indian Rupee (Default based on Bengaluru HQ)</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (â‚¬) - Euro</option>
                  <option value="GBP">GBP (Â£) - British Pound</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 5: Privacy */}
        {activeTab === 'privacy' && (
          <Card title="Privacy & Visibility" subtitle="Control which colleague groups can view your profile and availability">
            <div className="divide-y divide-slate-800/80">
              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">Profile Directory Visibility</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Control who can discover and preview your employee details in global search.</p>
                </div>
                <select
                  value={settings.profileVisibility}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, profileVisibility: e.target.value as any }));
                    addToast(`Profile visibility set to ${e.target.value}.`, 'info');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#0B1020] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
                >
                  <option value="Company">Company Wide</option>
                  <option value="Team Only">Team Only</option>
                  <option value="Private">Restricted / Private</option>
                </select>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 6: Connected Apps */}
        {activeTab === 'apps' && (
          <Card title="Enterprise Integrations" subtitle="Preview controls only; no third-party services are connected">
            <div className="divide-y divide-slate-800/80">
              {connectedApps.map(app => (
                <div key={app.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{app.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        {app.name}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          app.status === 'Enabled in preview'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {app.status}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{app.desc}</p>
                    </div>
                  </div>

                  <Button
                    variant={app.status === 'Enabled in preview' ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleApp(app.id)}
                  >
                    {app.status === 'Enabled in preview' ? 'Disable preview' : 'Enable preview'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
