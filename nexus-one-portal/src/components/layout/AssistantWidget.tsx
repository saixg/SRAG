import React, { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, MessageCircle, Sparkles, UserRound, RotateCcw } from 'lucide-react';

type ChatMessage = { id: number; role: 'assistant' | 'user'; content: string };

const welcome: ChatMessage = {
  id: 0,
  role: 'assistant',
  content: 'Hi! I’m your Nexus workplace assistant. Ask me about leave, payroll, benefits, learning, events, or how to use the portal. I’ll answer here without taking you away from this chat.'
};

function answerQuestion(question: string) {
  const text = question.toLowerCase();
  const asksForOtherPay = /(manager|another|other|colleague|employee|someone|their|his|her).{0,45}(salary|pay|compensation|payslip)|(salary|pay|compensation|payslip).{0,45}(manager|another|other|colleague|employee|someone|their|his|her)/.test(text);
  if (asksForOtherPay) return 'I can’t share another employee’s salary or payslip. Payroll details are private and should only be shown to the employee or an authorized administrator.';
  if (/(document|policy|handbook|pdf|file|image|contract|ocr|attachment|knowledge base|rag)/.test(text)) return 'Secure company document search is not connected in this preview yet. When it is enabled, answers must be limited to documents your account is allowed to access.';
  if (/(leave|holiday|vacation|attendance|time off)/.test(text)) return 'For time off, open Leave & Attendance and choose Apply for Leave. Select the leave type and dates, add a note if needed, then submit it for your manager’s approval. You can review your remaining balance and attendance from that section too.';
  if (/(pay|salary|payslip|payroll|compensation)/.test(text)) return 'Open Payroll to review your own payroll overview and available payslips. The current preview uses sample data; your company’s payroll service must be connected for real salary information.';
  if (/(benefit|wellness|insurance|reimburse)/.test(text)) return 'Open Benefits & Wellness to browse the benefits and wellness information available in the portal. The preview content is sample information, so confirm plan details with your People team.';
  if (/(learn|course|training|certif)/.test(text)) return 'Open Learning & Dev to browse learning paths and continue courses. The dashboard also shows a shortcut to your learning progress.';
  if (/(event|town hall|rsvp|calendar|invite)/.test(text)) return 'Open Events & Community to see upcoming events, event details, RSVP options, and calendar actions. Preview events use sample information.';
  if (/(people|colleague|directory|team|find someone)/.test(text)) return 'Use Company Directory to find colleagues by name, role, or department. Team Workspace also has team information.';
  if (/(task|approval|approve)/.test(text)) return 'Open Tasks & Approvals to review assigned work and pending approvals. The dashboard shows a short list of your current sample tasks.';
  if (/(profile|contact|account)/.test(text)) return 'Open My Profile to view your employee details. In Settings → Account, you can edit your contact details in this preview.';
  if (/(support|help|ticket|issue|problem)/.test(text)) return 'Open Help & Support to browse FAQs or raise a support ticket. For urgent company-specific issues, contact your People or IT team.';
  if (/(theme|appearance|dark|color|font)/.test(text)) return 'Go to Settings → Appearance to choose a workspace theme and layout density. Your preference is saved on this device.';
  if (/(search|find|portal)/.test(text)) return 'Use the search button in the top bar to search portal pages and available sample content. You can also ask me a question here and I’ll keep the answer in this chat.';
  return 'I can help with using the employee portal, including leave, payroll, benefits, learning, events, directory, tasks, profile, support, and appearance settings. What would you like to know?';
}

const suggestions = ['How do I apply for leave?', 'Where can I find my payslip?', 'How do I RSVP to an event?'];

export const AssistantWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isThinking, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const ask = (question = input) => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) return;
    const userMessage: ChatMessage = { id: nextId.current++, role: 'user', content: trimmed };
    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setIsThinking(true);
    window.setTimeout(() => {
      const reply: ChatMessage = { id: nextId.current++, role: 'assistant', content: answerQuestion(trimmed) };
      setMessages(previous => [...previous, reply]);
      setIsThinking(false);
    }, 350);
  };

  const startNewChat = () => {
    setMessages([{ ...welcome, id: nextId.current++ }]);
    setInput('');
  };

  return <>
    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header className="assistant-header">
        <span className="assistant-icon"><Sparkles size={19} /></span>
        <div className="assistant-heading"><h2 id="assistant-title">Nexus Assistant</h2><p><span className="assistant-online-dot" /> Workplace chat</p></div>
        <button type="button" onClick={startNewChat} aria-label="Start a new chat" title="New chat"><RotateCcw size={16} /></button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
      </header>
      <div className="assistant-scope">Answers stay in this chat. Company document search is not connected in this preview.</div>
      <div ref={scrollRef} className="assistant-messages" aria-live="polite" aria-relevant="additions text">
        {messages.map(message => <div className={`assistant-row ${message.role === 'user' ? 'assistant-row-user' : ''}`} key={message.id}>
          <span className={`assistant-avatar ${message.role === 'user' ? 'assistant-avatar-user' : ''}`} aria-hidden="true">{message.role === 'user' ? <UserRound size={15} /> : <Bot size={16} />}</span>
          <p className={`assistant-message ${message.role === 'user' ? 'assistant-message-user' : ''}`}>{message.content}</p>
        </div>)}
        {isThinking && <div className="assistant-row" role="status"><span className="assistant-avatar"><Bot size={16} /></span><p className="assistant-message assistant-typing"><i /><i /><i /><span className="sr-only">Assistant is responding</span></p></div>}
        {messages.length === 1 && <div className="assistant-suggestions" aria-label="Suggested questions">{suggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => ask(suggestion)}>{suggestion}</button>)}</div>}
      </div>
      <form className="assistant-input" onSubmit={event => { event.preventDefault(); ask(); }}>
        <label className="sr-only" htmlFor="assistant-question">Message Nexus Assistant</label>
        <textarea id="assistant-question" rows={1} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(); } }} placeholder="Message Nexus Assistant…" />
        <button aria-label="Send message" type="submit" disabled={!input.trim() || isThinking}><Send size={17} /></button>
      </form>
      <p className="assistant-disclaimer">Preview assistant · verify important company information with your administrator</p>
    </section>}
    <button className="assistant-launcher" type="button" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close Nexus Assistant' : 'Open Nexus Assistant'} aria-expanded={open}><MessageCircle size={19} /><span>Chat</span></button>
  </>;
};
