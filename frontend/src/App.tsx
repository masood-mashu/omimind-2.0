import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, type ActionItem, type AskResult, type Health, type Meeting, type MeetingAnalysis, type Memory, type OmiWebhookUrls, shortDate } from './lib/api';
import { signIn, signOut, signUp } from './lib/auth';
import './auth.css';

type IconName = 'grid' | 'calendar' | 'check' | 'spark' | 'settings' | 'search' | 'arrow' | 'mic' | 'clock' | 'plus' | 'chevron' | 'activity' | 'close' | 'external' | 'send' | 'refresh';

type SpeechResultEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type SpeechRecognitionController = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionController;

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    check: <><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4L17 17.4a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" transform="translate(1 2) scale(.92)"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    external: <><path d="M14 3h7v7M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const sampleMeetings: Meeting[] = [
  { session_id: 'sample-01', title: 'Product direction sync', updated_at: Date.now() / 1000 - 3600 * 3, segment_count: 12, preview: 'Launch scope, onboarding, and the customer feedback loop.' },
  { session_id: 'sample-02', title: 'Customer discovery — Aisha', updated_at: Date.now() / 1000 - 86400, segment_count: 8, preview: 'The team shared customer patterns and follow-up questions.' },
  { session_id: 'sample-03', title: 'Monday planning', updated_at: Date.now() / 1000 - 86400 * 2, segment_count: 16, preview: 'Priorities, owners, and the next milestone.' },
];

const sampleMemories: Memory[] = [
  { id: 'a', session_id: 'sample-01', speaker: 'You', text: 'Let’s keep the first launch focused on the meeting recap and clear action owners.', created_at: Date.now() / 1000 - 3600 * 3, source: 'sample' },
  { id: 'b', session_id: 'sample-01', speaker: 'Maya', text: 'I can share the updated onboarding flow by Thursday afternoon.', created_at: Date.now() / 1000 - 3600 * 3, source: 'sample' },
  { id: 'c', session_id: 'sample-02', speaker: 'Aisha', text: 'People want to find the decision later without replaying the whole conversation.', created_at: Date.now() / 1000 - 86400, source: 'sample' },
];

const sampleActions: (ActionItem & { done: boolean })[] = [
  { id: 'sample-action-1', text: 'Share the updated onboarding flow', owner: 'Maya Chen', due_date: 'Fri, Oct 16', created_at: Date.now() / 1000, session_id: 'sample-01', done: false },
  { id: 'sample-action-2', text: 'Send the customer interview notes', owner: 'You', due_date: 'Today', created_at: Date.now() / 1000, session_id: 'sample-02', done: false },
  { id: 'sample-action-3', text: 'Review the launch checklist', owner: 'Jordan Lee', due_date: 'Oct 17', created_at: Date.now() / 1000, session_id: 'sample-03', done: true },
];

function readCompletedActions(userId: string): string[] {
  if (!userId) return ['sample-action-3'];
  try {
    return JSON.parse(localStorage.getItem(`omimind.completed.${userId}`) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function App() {
  const [active, setActive] = useState('Overview');
  const [health, setHealth] = useState<Health | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>(sampleMeetings);
  const [memories, setMemories] = useState<Memory[]>(sampleMemories);
  const [actualActions, setActualActions] = useState<ActionItem[]>([]);
  const [uid, setUid] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [captureTitle, setCaptureTitle] = useState('Meeting notes');
  const [captureTranscript, setCaptureTranscript] = useState('');
  const [captureActive, setCaptureActive] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognitionController | null>(null);
  const [query, setQuery] = useState('What did we decide about the first launch?');
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const [meetingAnalysis, setMeetingAnalysis] = useState<{ title: string; result: MeetingAnalysis } | null>(null);
  const [analyzingMeeting, setAnalyzingMeeting] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [omiWebhookUrls, setOmiWebhookUrls] = useState<OmiWebhookUrls | null>(null);
  const [omiWebhookLoading, setOmiWebhookLoading] = useState(false);
  const [omiWebhookError, setOmiWebhookError] = useState('');
  const [completedActions, setCompletedActions] = useState<string[]>(['sample-action-3']);

  const connected = health?.status === 'ok';
  const liveData = connected && !demoMode;
  const meetingCount = liveData ? meetings.length : 12;
  const memoryCount = liveData ? memories.length : 86;
  const actions = liveData ? actualActions.map((action) => ({ ...action, due_date: action.due_date || 'No due date', done: Boolean(action.completed) || completedActions.includes(action.id) })) : sampleActions.map((action) => ({ ...action, done: completedActions.includes(action.id) }));
  const taskCount = actions.filter((action) => !action.done).length;
  const userMark = demoMode ? 'DM' : uid.slice(0, 2).toUpperCase() || 'OM';
  const recentMeetings = useMemo(() => (connected ? meetings : sampleMeetings).slice(0, 3), [connected, meetings]);
  const visibleMemories = useMemo(() => memories.slice(0, 3), [memories]);

  useEffect(() => {
    let alive = true;
    const onAuthExpired = () => {
      if (alive) {
        setUid('');
        setAnswer(null);
        setMeetingAnalysis(null);
      }
    };
    window.addEventListener('omimind:auth-expired', onAuthExpired);
    api.me().then(({ uid: verifiedUid }) => {
      if (alive) {
        setCompletedActions(readCompletedActions(verifiedUid));
        setUid(verifiedUid);
      }
    }).catch(() => {
      if (alive) setUid('');
    }).finally(() => {
      if (alive) setAuthReady(true);
    });
    return () => { alive = false; window.removeEventListener('omimind:auth-expired', onAuthExpired); };
  }, []);

  useEffect(() => {
    if (!demoMode) return;
    let alive = true;
    api.health().then((status) => { if (alive) setHealth(status); }).catch(() => { if (alive) setHealth(null); });
    return () => { alive = false; };
  }, [demoMode]);

  useEffect(() => {
    if (!showSettings || demoMode || !uid) return;
    let alive = true;
    setOmiWebhookUrls(null);
    setOmiWebhookLoading(true);
    setOmiWebhookError('');
    api.omiWebhookUrls().then((urls) => {
      if (alive) setOmiWebhookUrls(urls);
    }).catch((cause) => {
      if (alive) setOmiWebhookError(cause instanceof Error ? cause.message : 'Could not create Omi webhook URLs.');
    }).finally(() => {
      if (alive) setOmiWebhookLoading(false);
    });
    return () => { alive = false; };
  }, [showSettings, demoMode, uid]);

  useEffect(() => {
    if (uid) localStorage.setItem(`omimind.completed.${uid}`, JSON.stringify(completedActions));
  }, [completedActions, uid]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!uid) return;
      try {
        const status = await api.health();
        if (!alive) return;
        setHealth(status);
        const [meetingData, memoryData, actionData] = await Promise.all([api.meetings(), api.memories(), api.actions()]);
        if (!alive) return;
        setMeetings(meetingData);
        setMemories(memoryData);
        setActualActions(actionData);
      } catch {
        if (alive) setHealth(null);
      }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [uid]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function refresh() {
    if (!uid) return;
    setBusy(true);
    setError('');
    try {
      const status = await api.health();
      setHealth(status);
      const [meetingData, memoryData, actionData] = await Promise.all([api.meetings(), api.memories(), api.actions()]);
      setMeetings(meetingData);
      setMemories(memoryData);
      setActualActions(actionData);
      setToast('Workspace refreshed');
    } catch (cause) {
      setHealth(null);
      setError(cause instanceof Error ? cause.message : 'Could not reach the OMIMIND API.');
    } finally {
      setBusy(false);
    }
  }

  async function askMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    if (demoMode) {
      setError('Demo preview uses sample conversations. Sign in to ask Lyzr about your own Qdrant memory.');
      return;
    }
    setBusy(true);
    setError('');
    setAnswer(null);
    try {
      const result = await api.ask(query.trim());
      setAnswer(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not get an answer. Check your API connection.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      if (authMode === 'signUp') {
        await signUp(authEmail.trim(), authPassword);
        setAuthMode('signIn');
        setAuthPassword('');
        setAuthMessage('Account created. Sign in with the email and password you just entered.');
        return;
      } else {
        await signIn(authEmail.trim(), authPassword);
      }
      const { uid: verifiedUid } = await api.me();
      setHealth(null);
      setMeetings(sampleMeetings);
      setMemories(sampleMemories);
      setActualActions([]);
      setAnswer(null);
      setMeetingAnalysis(null);
      setCompletedActions(readCompletedActions(verifiedUid));
      setUid(verifiedUid);
      setAuthPassword('');
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : 'Could not sign in. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function leaveWorkspace() {
    await signOut();
    setUid('');
    setHealth(null);
    setMeetings(sampleMeetings);
    setMemories(sampleMemories);
    setAnswer(null);
    setMeetingAnalysis(null);
    setActualActions([]);
    setCompletedActions(['sample-action-3']);
  }

  async function copyWebhookUrl(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(`${label} URL copied`);
    } catch {
      setOmiWebhookError('Clipboard access was blocked. Select and copy the URL manually.');
    }
  }

  function toggleCapture() {
    if (captureActive) {
      recognition?.stop();
      setCaptureActive(false);
      return;
    }
    setCaptureError('');
    const browserWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const SpeechRecognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCaptureError('Live speech capture is not available in this browser. Use Chrome or enter a transcript below.');
      return;
    }
    const next = new SpeechRecognition();
    next.continuous = true;
    next.interimResults = true;
    next.lang = navigator.language || 'en-US';
    next.onresult = (event) => {
      const newText: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) newText.push(result[0]?.transcript ?? '');
      }
      if (newText.length) setCaptureTranscript((current) => `${current}${current.trim() ? ' ' : ''}${newText.join(' ').trim()}`.slice(0, 50000));
    };
    next.onerror = (event) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone access was blocked. Allow microphone access for this site, then try again.',
        'audio-capture': 'No usable microphone was found. Check your microphone connection and browser permission.',
        network: 'Your browser could not reach its speech-to-text service. This does not affect Omi mobile; use your Omi app or paste a transcript here.',
        'service-not-allowed': 'This browser does not allow its speech-to-text service. Use your Omi app or paste a transcript here.',
        'no-speech': 'No speech was detected. Check the microphone input and try again.',
      };
      setCaptureError(messages[event.error] ?? `Speech capture stopped (${event.error}). Use your Omi app or paste a transcript here.`);
      setCaptureActive(false);
    };
    next.onend = () => setCaptureActive(false);
    setRecognition(next);
    setCaptureTranscript('');
    try {
      next.start();
      setCaptureActive(true);
    } catch {
      setCaptureError('Could not start speech capture. Check microphone permission and try again.');
    }
  }

  async function saveTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoMode) {
      setCaptureError('Sign in to save transcripts to your private meeting memory.');
      return;
    }
    if (!captureTranscript.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.ingest(captureTitle.trim() || 'Voice note', captureTranscript.trim());
      setCaptureTranscript('');
      setToast('Voice transcript saved to Qdrant memory');
      setActive('Meetings');
      await refresh();
    } catch (cause) {
      setCaptureError(cause instanceof Error ? cause.message : 'Could not save this transcript.');
    } finally {
      setBusy(false);
    }
  }

  async function analyzeMeeting(meeting: Meeting) {
    if (demoMode) {
      setAnalysisError('Sign in to analyze meetings from your private workspace.');
      return;
    }
    setAnalyzingMeeting(meeting.session_id);
    setAnalysisError('');
    try {
      const result = await api.analyze(meeting.session_id);
      setMeetingAnalysis({ title: meeting.title, result });
      await refresh();
      setToast(`Lyzr found ${result.action_items.length} action items`);
    } catch (cause) {
      setAnalysisError(cause instanceof Error ? cause.message : 'Could not analyze this meeting.');
    } finally {
      setAnalyzingMeeting('');
    }
  }

  function toggleAction(id: string) {
    setCompletedActions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const navItems: { label: string; icon: IconName; count?: string }[] = [
    { label: 'Overview', icon: 'grid' },
    { label: 'Live capture', icon: 'mic' },
    { label: 'Meetings', icon: 'calendar', count: String(meetingCount).padStart(2, '0') },
    { label: 'Memory stream', icon: 'activity', count: String(memoryCount).padStart(2, '0') },
    { label: 'Action items', icon: 'check', count: String(taskCount).padStart(2, '0') },
    { label: 'Ask your memory', icon: 'spark' },
  ];
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase();

  if (!authReady || (!uid && !demoMode)) {
    return <div className="auth-screen">
      <section className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark"><span /><span /><span /><span /></span><span>omi<span className="brand-light">mind</span></span></div>
        <span className="eyebrow"><span className="eyebrow-line" /> PRIVATE MEETING MEMORY</span>
        <h1>{!authReady ? 'Checking your session…' : authMode === 'signIn' ? 'Welcome back.' : 'Create your workspace.'}</h1>
        <p className="auth-description">Sign in to access your Omi conversations, Qdrant memory, and grounded Lyzr answers.</p>
        {authReady && <form className="auth-form" onSubmit={(event) => void submitAuth(event)}>
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" autoComplete="email" type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" />
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'} type="password" minLength={8} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" />
          {authError && <div className="auth-error" role="alert">{authError}</div>}
          {authMessage && <div className="auth-message" role="status">{authMessage}</div>}
          <button className="button button-primary auth-submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'signIn' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={15} /></button>
        </form>}
        {authReady && <button className="auth-mode" onClick={() => { setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn'); setAuthError(''); setAuthMessage(''); }}>
          {authMode === 'signIn' ? 'New to OMIMIND? Create an account' : 'Already have an account? Sign in'}
        </button>}
        {authReady && <button className="demo-entry" onClick={() => { setHealth(null); setMeetings(sampleMeetings); setMemories(sampleMemories); setActualActions([]); setCompletedActions((current) => current.includes('sample-action-3') ? current : [...current, 'sample-action-3']); setDemoMode(true); setActive('Overview'); }}>Explore the read-only demo <Icon name="arrow" size={14} /></button>}
        {authReady && <p className="demo-note">Sample data only. No real meetings or private memory are accessed.</p>}
        <div className="auth-integrations"><span>OMI</span><i /> <span>QDRANT</span><i /> <span>LYZR</span></div>
      </section>
    </div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActive('Overview')} aria-label="OMIMIND home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>omi<span className="brand-light">mind</span></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-avatar">{userMark}</div>
          <div className="workspace-meta"><strong>{demoMode ? 'Demo workspace' : 'My workspace'}</strong><span>{demoMode ? 'Sample data · read-only' : 'Authenticated memory'}</span></div>
          <Icon name="chevron" size={15} />
        </div>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.label} aria-label={item.label} className={`nav-link ${active === item.label ? 'is-active' : ''}`} onClick={() => setActive(item.label)}>
              <Icon name={item.icon} size={17} /><span>{item.label}</span>{item.count && <small>{item.count}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-plan">
            <div className="plan-icon"><Icon name="spark" size={16} /></div>
            <strong>Your memory is growing</strong>
            <p>Every conversation makes OMIMIND more useful.</p>
            <div className="plan-progress"><span style={{ width: `${Math.min(100, (memoryCount / 120) * 100)}%` }} /></div>
            <small>{memoryCount} <span>/ 120 memories</span></small>
          </div>
          <button className="nav-link settings-link" onClick={() => setShowSettings(true)}><Icon name="settings" size={17} /><span>Settings & integrations</span></button>
          <div className="user-row"><div className="user-avatar">{userMark}</div><div className="user-meta"><strong>{demoMode ? 'Demo visitor' : 'Signed-in member'}</strong><span>{demoMode ? 'Sample workspace' : 'Private workspace'}</span></div><button className="more-button" aria-label={demoMode ? 'Exit demo' : 'Open settings'} onClick={() => demoMode ? setDemoMode(false) : setShowSettings(true)}>{demoMode ? '×' : '···'}</button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{active}</strong></div>
          <div className="topbar-actions">
            <div className={`connection-pill ${connected ? 'connected' : ''}`}><span className="status-dot" />{connected ? 'API connected' : 'Preview mode'}</div>
            <button className={`icon-button ${busy ? 'spinning' : ''}`} aria-label="Refresh workspace" disabled={demoMode} onClick={() => void refresh()}><Icon name="refresh" size={17} /></button>
            <button className="top-avatar" aria-label={demoMode ? 'Exit demo' : 'Open account settings'} title={demoMode ? 'Exit demo' : undefined} onClick={() => demoMode ? setDemoMode(false) : setShowSettings(true)}>{userMark}</button>
          </div>
        </header>

        <div className="page-content">
          <section className={`welcome-row ${active !== 'Overview' ? 'hidden-section' : ''}`}>
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> {todayLabel}</div>
              <h1>Your conversations,<br /><span>moving you forward.</span></h1>
              <p className="welcome-copy">The important things said in your meetings, ready when you need them.</p>
            </div>
            <button className="button button-primary" onClick={() => setShowSettings(true)}><Icon name="plus" size={17} /> Connect Omi <Icon name="arrow" size={15} /></button>
          </section>

          {!connected && active === 'Overview' && <section className="preview-banner"><span className="preview-icon"><Icon name="activity" size={16} /></span><p><strong>Preview workspace</strong><span> Connect the backend and your Omi account to see your own meeting memory.</span></p><button onClick={() => setShowSettings(true)}>Set up integrations <Icon name="arrow" size={14} /></button></section>}

          <section className={`stats-grid ${active !== 'Overview' ? 'hidden-section' : ''}`} aria-label="Workspace summary">
            <article className="stat-card"><div className="stat-top"><span>MEETINGS</span><span className="stat-icon lilac"><Icon name="calendar" size={17} /></span></div><div className="stat-value">{meetingCount}<span className="stat-trend">{liveData ? 'in memory' : '+3 this week'}</span></div><div className="stat-foot">Conversations captured</div><div className="stat-sparkline lilac-line"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="stat-card"><div className="stat-top"><span>OPEN ACTIONS</span><span className="stat-icon amber"><Icon name="check" size={17} /></span></div><div className="stat-value">{taskCount}<span className="stat-trend amber-text">{liveData ? 'from Omi' : 'to review'}</span></div><div className="stat-foot">Owners and next steps</div><div className="stat-sparkline amber-line"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="stat-card"><div className="stat-top"><span>MEMORY MOMENTS</span><span className="stat-icon mint"><Icon name="spark" size={17} /></span></div><div className="stat-value">{memoryCount}<span className="stat-trend mint-text">{liveData ? 'in Qdrant' : '+18 this week'}</span></div><div className="stat-foot">Things worth remembering</div><div className="stat-sparkline mint-line"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="stat-card agent-stat"><div className="stat-top"><span>AGENT STATUS</span><span className="status-live"><i /> {health?.lyzr_configured ? 'CONFIGURED' : 'SETUP'}</span></div><div className="agent-name"><span className="agent-orbit"><Icon name="spark" size={17} /></span><div><strong>OMI Intelligence</strong><small>{health?.lyzr_configured ? 'Lyzr credentials set' : 'Waiting for Lyzr credentials'}</small></div></div><div className="agent-foot"><span className={connected ? 'good' : ''}><i />{connected ? 'Backend online' : 'Backend not connected'}</span><button onClick={() => setShowSettings(true)}>Configure <Icon name="arrow" size={13} /></button></div></article>
          </section>

          <section className={`content-grid ${active !== 'Overview' ? 'hidden-section' : ''}`}>
            <div className="left-column">
              <article className="panel ask-panel">
                <div className="panel-heading"><div className="heading-icon ask-icon"><Icon name="spark" size={18} /></div><div><h2>Ask your memory</h2><p>Get an answer grounded in what was actually said.</p></div><span className="powered-label"><i /> MEMORY SEARCH</span></div>
                <form className="ask-form" onSubmit={askMemory}>
                  <label className="visually-hidden" htmlFor="memory-question">Ask something from your meetings</label>
                  <Icon name="search" size={18} />
                  <input id="memory-question" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask anything from your meetings…" />
                  <button aria-label="Ask OMIMIND" disabled={demoMode || busy || !query.trim()}><Icon name="send" size={16} /></button>
                </form>
                <div className="suggestions"><span>TRY</span><button onClick={() => setQuery('What are my open action items?')}>My open action items</button><button onClick={() => setQuery('What did the team decide last week?')}>Decisions from last week</button><button onClick={() => setQuery('What did Maya say she would do?')}>What Maya committed to</button></div>
                {busy && <div className="answer-state"><span className="loader" /> Searching your meeting memory and asking Lyzr…</div>}
                {error && <div className="inline-error"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" size={14} /></button></div>}
                {answer && <div className="answer-result"><div className="answer-result-head"><span><Icon name="spark" size={14} /> GROUNDED ANSWER</span><small>{answer.provider === 'lyzr_studio_cloud' ? 'Lyzr' : answer.provider}</small></div><p>{answer.answer}</p><div className="answer-sources">Based on {answer.context.length} memory {answer.context.length === 1 ? 'snippet' : 'snippets'}</div></div>}
              </article>

              <article className="panel meetings-panel">
                <div className="panel-heading"><div className="heading-icon meeting-icon"><Icon name="calendar" size={18} /></div><div><h2>Recent meetings</h2><p>Your latest conversations, kept in context.</p></div><button className="text-button" onClick={() => setActive('Meetings')}>View all <Icon name="arrow" size={14} /></button></div>
                <div className="meeting-list">
                  {recentMeetings.length ? recentMeetings.map((meeting, index) => (
                    <button className="meeting-row" key={meeting.session_id} onClick={() => { setQuery(`Summarize ${meeting.title}`); setActive('Ask your memory'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      <div className={`meeting-art art-${index + 1}`}><span>{index === 0 ? 'PD' : index === 1 ? 'CD' : 'MP'}</span><i /></div>
                      <div className="meeting-info"><strong>{meeting.title}</strong><span>{meeting.preview || `${meeting.segment_count} conversation moments captured`}</span></div>
                      <div className="meeting-meta"><span><Icon name="clock" size={13} /> {shortDate(meeting.updated_at)}</span><small>{meeting.segment_count} moments</small></div>
                      <Icon name="chevron" size={16} />
                    </button>
                  )) : <div className="empty-inline">Your Omi conversations will appear here after the first webhook arrives.</div>}
                </div>
              </article>
            </div>

            <aside className="right-column">
              <article className="panel actions-panel">
                <div className="panel-heading compact-heading"><div className="heading-icon action-icon"><Icon name="check" size={17} /></div><div><h2>Next steps</h2><p>What you said you’d do.</p></div></div>
                <div className="action-list">
                  {actions.length ? actions.slice(0, 4).map((action) => <div className={`action-row ${action.done ? 'is-done' : ''}`} key={action.id}>
                    <button className="action-check" aria-label={action.done ? 'Mark as open' : 'Mark complete'} title={demoMode ? 'Read-only demo' : action.completed ? 'Completed in Omi' : undefined} disabled={demoMode || Boolean(action.completed)} onClick={() => toggleAction(action.id)}>{action.done && <Icon name="check" size={12} />}</button>
                    <div className="action-copy"><strong>{action.text}</strong><span>{action.owner || 'Owner not specified'}</span></div><span className={`due-pill ${action.due_date === 'Today' ? 'due-today' : ''}`}>{action.due_date}</span>
                  </div>) : <div className="empty-inline">{liveData ? 'No action items captured in your recent Omi conversations yet.' : 'Action items will appear here as your meetings are captured.'}</div>}
                </div>
                <button className="panel-footer-button" onClick={() => setActive('Action items')}>All action items <Icon name="arrow" size={14} /></button>
              </article>

              <article className="panel memory-panel">
                <div className="panel-heading compact-heading"><div className="heading-icon memory-icon"><Icon name="activity" size={17} /></div><div><h2>Memory stream</h2><p>Small moments, easy to find.</p></div><button className="more-button" aria-label="Explore memory stream" onClick={() => { setActive('Memory stream'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>···</button></div>
                <div className="memory-feed">
                  {visibleMemories.map((memory, index) => <div className="memory-item" key={memory.id}>
                    <span className={`memory-dot dot-${index % 3}`} /><div className="memory-item-body"><p>“{memory.text}”</p><div><strong>{memory.speaker}</strong><span>·</span><span>{shortDate(memory.created_at)}</span><button onClick={() => { setQuery(`What was said about: ${memory.text.slice(0, 52)}`); setActive('Ask your memory'); }}>Ask <Icon name="arrow" size={12} /></button></div></div>
                  </div>)}
                </div>
                <button className="panel-footer-button" onClick={() => { setActive('Memory stream'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Explore memory <Icon name="arrow" size={14} /></button>
              </article>
            </aside>
          </section>

          {active !== 'Overview' && <section className="panel alternate-page">
            {active === 'Memory stream' && <>
              <div className="alternate-heading"><div><span className="eyebrow">YOUR PRIVATE CONVERSATION MEMORY</span><h1>Memory stream</h1><p>Transcript moments saved from your Omi conversations.</p></div><span className="count-badge">{(liveData ? memories.length : demoMode ? sampleMemories.length : 0).toLocaleString()} MOMENTS</span></div>
              <div className="alternate-memories memory-page-feed">{(liveData ? memories : demoMode ? sampleMemories : []).length ? (liveData ? memories : sampleMemories).map((memory, index) => <div className="alternate-memory" key={memory.id}><span className={`memory-dot dot-${index % 3}`} /><p>“{memory.text}”</p><div className="memory-page-meta"><small>{memory.speaker} · {shortDate(memory.created_at)}</small><button className="memory-ask-button" onClick={() => { setQuery(`What was said about: ${memory.text.slice(0, 52)}`); setActive('Ask your memory'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Ask <Icon name="arrow" size={12} /></button></div></div>) : <div className="empty-inline">No memory moments yet. Connect Omi or save a transcript to build this user’s private memory.</div>}</div>
            </>}
            {active === 'Meetings' && <>
              <div className="alternate-heading"><div><span className="eyebrow">YOUR CONVERSATION ARCHIVE</span><h1>Meetings</h1><p>Searchable context from the things you’ve talked through.</p></div><button className="button button-primary" onClick={() => setShowSettings(true)}><Icon name="mic" size={16} /> Connect Omi</button></div>
              <div className="alternate-list">
                {recentMeetings.length ? recentMeetings.map((meeting, index) => <div className="meeting-entry" key={meeting.session_id}>
                  <button className="meeting-row" onClick={() => { setQuery(`Summarize ${meeting.title}`); setActive('Ask your memory'); }}>
                    <div className={`meeting-art art-${index + 1}`}><span>{index === 0 ? 'PD' : index === 1 ? 'CD' : 'MP'}</span><i /></div><div className="meeting-info"><strong>{meeting.title}</strong><span>{meeting.preview || `${meeting.segment_count} conversation moments captured`}</span></div><div className="meeting-meta"><span><Icon name="clock" size={13} /> {shortDate(meeting.updated_at)}</span><small>{meeting.segment_count} moments</small></div><Icon name="chevron" size={16} />
                  </button>
                  <button className="meeting-analyze" disabled={demoMode || !connected || !health?.lyzr_configured || Boolean(analyzingMeeting)} onClick={() => void analyzeMeeting(meeting)}><Icon name="spark" size={14} />{analyzingMeeting === meeting.session_id ? 'Analyzing…' : 'Analyze with Lyzr'}</button>
                </div>) : <div className="empty-inline">Your Omi conversations will appear here after the first webhook arrives.</div>}
              </div>
              {analysisError && <div className="inline-error" role="alert">{analysisError}</div>}
              {meetingAnalysis && <article className="meeting-analysis"><div className="analysis-kicker"><Icon name="spark" size={14} /> LYZR MEETING ANALYSIS</div><h2>{meetingAnalysis.title}</h2><p>{meetingAnalysis.result.summary}</p>{meetingAnalysis.result.decisions.length > 0 && <><h3>Decisions</h3><ul>{meetingAnalysis.result.decisions.map((decision, index) => <li key={`${index}-${decision}`}>{decision}</li>)}</ul></>}{meetingAnalysis.result.action_items.length > 0 && <><h3>Action items</h3><ul>{meetingAnalysis.result.action_items.map((action, index) => <li key={`${index}-${action.description}`}><strong>{action.description}</strong><span>{[action.owner, action.due_date, action.priority].filter(Boolean).join(' · ') || 'Owner and timing not stated'}</span>{action.quote && <blockquote>“{action.quote}”</blockquote>}</li>)}</ul></>}</article>}
            </>}
            {active === 'Live capture' && <>
              <div className="alternate-heading"><div><span className="eyebrow">VOICE TO SEARCHABLE MEMORY</span><h1>Capture a conversation</h1><p>Speak naturally. OMIMIND will save the transcript to your private Qdrant memory.</p></div></div>
              <form className="capture-form" onSubmit={(event) => void saveTranscript(event)}>
                <label htmlFor="capture-title">Meeting title</label>
                <input id="capture-title" value={captureTitle} onChange={(event) => setCaptureTitle(event.target.value)} maxLength={200} placeholder="Weekly product sync" />
                <div className="capture-controls"><button className={`button ${captureActive ? 'capture-stop' : 'button-primary'}`} type="button" disabled={demoMode} onClick={toggleCapture}><Icon name={captureActive ? 'close' : 'mic'} size={16} /> {captureActive ? 'Stop listening' : 'Start live capture'}</button><span className={`capture-status ${captureActive ? 'is-recording' : ''}`}><i />{demoMode ? 'Sign in to capture audio' : captureActive ? 'Listening for speech' : 'Microphone idle'}</span></div>
                <label htmlFor="capture-transcript">Transcript</label>
                <textarea id="capture-transcript" value={captureTranscript} onChange={(event) => setCaptureTranscript(event.target.value)} maxLength={50000} rows={10} placeholder="Start live capture, or paste a transcript here…" />
                <div className="capture-footer"><span>{captureTranscript.length.toLocaleString()} / 50,000 characters</span><button className="button button-primary" disabled={demoMode || busy || !captureTranscript.trim()}><Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save to meeting memory'}</button></div>
                {captureError && <div className="inline-error" role="alert">{captureError}</div>}
                <p className="capture-privacy">Browser dictation depends on your browser’s speech service and may be unavailable on some networks. Omi mobile capture works separately through the webhook in Settings. You can also paste a transcript here.</p>
              </form>
            </>}
            {active === 'Action items' && <>
              <div className="alternate-heading"><div><span className="eyebrow">COMMITMENTS FROM YOUR MEETINGS</span><h1>Action items</h1><p>Clear owners and due dates, captured from Omi conversations.</p></div><span className="count-badge">{taskCount} OPEN</span></div>
              <div className="alternate-actions">{actions.length ? actions.map((action) => <div className={`action-row ${action.done ? 'is-done' : ''}`} key={action.id}>
                <button className="action-check" aria-label={action.done ? 'Mark as open' : 'Mark complete'} title={demoMode ? 'Read-only demo' : action.completed ? 'Completed in Omi' : undefined} disabled={demoMode || Boolean(action.completed)} onClick={() => toggleAction(action.id)}>{action.done && <Icon name="check" size={12} />}</button><div className="action-copy"><strong>{action.text}</strong><span>{action.owner || 'Owner not specified'} · From {action.title || 'meeting'}</span></div><span className={`due-pill ${action.due_date === 'Today' ? 'due-today' : ''}`}>{action.due_date || 'No due date'}</span>
              </div>) : <div className="empty-inline">No action items captured in your recent Omi conversations yet.</div>}</div>
            </>}
            {active === 'Ask your memory' && <>
              <div className="alternate-heading"><div><span className="eyebrow">SEARCH EVERY CONVERSATION</span><h1>Ask your memory</h1><p>Answers are grounded in your own meeting snippets.</p></div></div>
              <form className="ask-form alternate-ask-form" onSubmit={askMemory}><Icon name="search" size={18} /><label className="visually-hidden" htmlFor="section-question">Ask something from your meetings</label><input id="section-question" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask anything from your meetings…" /><button aria-label="Ask OMIMIND" disabled={demoMode || busy || !query.trim()}><Icon name="send" size={16} /></button></form>
              <div className="suggestions alternate-suggestions"><span>TRY</span><button onClick={() => setQuery('What are my open action items?')}>My open action items</button><button onClick={() => setQuery('What did the team decide last week?')}>Decisions from last week</button><button onClick={() => setQuery('What did Maya say she would do?')}>What Maya committed to</button></div>
              {busy && <div className="answer-state"><span className="loader" /> Searching your meeting memory and asking Lyzr…</div>}{error && <div className="inline-error">{error}</div>}
              {answer && <div className="answer-result"><div className="answer-result-head"><span><Icon name="spark" size={14} /> GROUNDED ANSWER</span><small>{answer.provider === 'lyzr_studio_cloud' ? 'Lyzr' : answer.provider}</small></div><p>{answer.answer}</p><div className="answer-sources">Based on {answer.context.length} memory snippets</div></div>}
              <div className="alternate-memories"><h2>Recent memory moments</h2>{visibleMemories.length ? visibleMemories.map((memory) => <div className="alternate-memory" key={memory.id}><span className="memory-dot"/><p>“{memory.text}”</p><small>{memory.speaker} · {shortDate(memory.created_at)}</small></div>) : <div className="empty-inline">Your recent conversation moments will appear here.</div>}</div>
            </>}
          </section>}

          <footer className={`page-footer ${active !== 'Overview' ? 'alternate-footer' : ''}`}><div><span className="footer-logo"><span className="brand-mark"><span/><span/><span/><span/></span>OMIMIND</span><span>Conversations that carry forward.</span></div><div><span className="footer-status"><i /> {connected ? 'API online' : 'Waiting for your backend'}</span><span>Omi <b>·</b> Qdrant <b>·</b> Lyzr</span></div></footer>
        </div>
      </main>

      {showSettings && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false); }}>
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="modal-head"><div><span className="eyebrow">{demoMode ? 'DEMO PREVIEW' : 'YOUR WORKSPACE'}</span><h2 id="settings-title">{demoMode ? 'Preview integrations' : 'Connect your meeting memory'}</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><Icon name="close" /></button></div>
          <p className="modal-intro">{demoMode ? 'This workspace uses sample data. Sign in to connect your private meeting memory and configure Omi.' : 'Connect Omi to send conversations into the private memory for this signed-in account.'}</p>
          {!demoMode && <><label className="field-label" htmlFor="uid">Verified workspace ID <span>from your signed-in account</span></label>
          <input id="uid" className="settings-input" value={uid} readOnly />
          <p className="setup-hint">Omi webhook URLs below are signed for this workspace. Incoming conversations stay with this account even when other users sign in.</p>
          <div className="webhook-setup">
            <strong>Omi webhook URLs for this account</strong>
            <p>Copy each URL into Omi → Developer Settings. Conversation Events and Real-time Transcript use separate URLs.</p>
            {omiWebhookLoading && <small>Preparing secure URLs…</small>}
            {omiWebhookError && <div className="inline-error" role="alert">{omiWebhookError}</div>}
            {omiWebhookUrls && <>
              <label htmlFor="omi-conversation-url">Conversation Events</label>
              <div className="webhook-copy-row"><input id="omi-conversation-url" value={omiWebhookUrls.conversation} readOnly /><button onClick={() => void copyWebhookUrl(omiWebhookUrls.conversation, 'Conversation')}>Copy</button></div>
              <label htmlFor="omi-realtime-url">Real-time Transcript</label>
              <div className="webhook-copy-row"><input id="omi-realtime-url" value={omiWebhookUrls.realtime} readOnly /><button onClick={() => void copyWebhookUrl(omiWebhookUrls.realtime, 'Real-time transcript')}>Copy</button></div>
              <small>These links are private credentials. Do not post or share them.</small>
            </>}
          </div></>}
          <div className="integration-list">
            <div><span className="integration-mark omi-mark"><Icon name="mic" size={16}/></span><div><strong>Omi voice capture</strong><small>{health?.omi_configured ? 'Per-account webhook signing is ready' : 'Configure the Omi webhook signing key on the backend'}</small></div><span className={health?.omi_configured ? 'integration-state on' : 'integration-state'}>{health?.omi_configured ? 'READY' : 'CONNECT'}</span></div>
            <div><span className="integration-mark qdrant-mark">Q</span><div><strong>Qdrant memory</strong><small>{health?.qdrant === 'connected' ? 'Vector store connected' : 'Waiting for API connection'}</small></div><span className={health?.qdrant === 'connected' ? 'integration-state on' : 'integration-state'}>{health?.qdrant === 'connected' ? 'READY' : 'CONNECT'}</span></div>
            <div><span className="integration-mark lyzr-mark"><Icon name="spark" size={16}/></span><div><strong>Lyzr reasoning</strong><small>{health?.lyzr_configured ? health.action_extractor_configured ? 'Credentials set for answers and action extraction' : 'Answer agent set; action extraction uses the manager' : 'Add your Lyzr agent credentials'}</small></div><span className={health?.lyzr_configured ? 'integration-state on' : 'integration-state'}>{health?.lyzr_configured ? 'CONFIGURED' : 'CONNECT'}</span></div>
          </div>
          <div className="setup-hint"><strong>Local backend</strong><code>uvicorn server.app:app --reload --port 8000</code><span>Then start the React app with <code>npm run dev</code> from <code>frontend/</code>.</span></div>
          <div className="modal-actions"><a href="https://app.hidevs.xyz/hackathons/stop-prompting-solo-agents-hackathon-2026?tab=submit" target="_blank" rel="noreferrer">Hackathon submission page <Icon name="external" size={14}/></a><button className="button button-primary" onClick={() => { if (demoMode) void api.health().then(setHealth).catch(() => setHealth(null)); else void refresh(); setShowSettings(false); }}>Check connection <Icon name="arrow" size={14}/></button>{demoMode ? <button className="auth-mode" onClick={() => { setShowSettings(false); setDemoMode(false); }}>Exit demo</button> : <button className="auth-mode" onClick={() => void leaveWorkspace()}>Sign out</button>}</div>
        </section>
      </div>}
      {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={14}/></span>{toast}</div>}
      <span className="data-mode-label">{liveData ? 'LIVE WORKSPACE' : 'SAMPLE PREVIEW DATA'}</span>
    </div>
  );
}

export default App;
