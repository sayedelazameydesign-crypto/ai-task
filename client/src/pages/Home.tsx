import { useEffect, useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowUp,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Command,
  Database,
  FileText,
  Github,
  Globe2,
  LayoutDashboard,
  LogIn,
  Menu,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X,
  Zap,
  ListTodo,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

 type ChatMessage = { role: "user" | "assistant"; content: string };

const starterPrompts = [
  { icon: "✦", label: "رتّب أفكاري", prompt: "ساعدني في ترتيب أفكاري وتحويلها إلى خطة عملية من خطوات واضحة." },
  { icon: "⌁", label: "حلّل ملفًا", prompt: "أريد تحليل ملف أو مستند مع استخراج أهم القرارات والمهام." },
  { icon: "↗", label: "أنشئ سير عمل", prompt: "صمّم لي سير عمل قابلًا للتنفيذ لمشروع جديد مع نقاط تحقق." },
];

function LogoMark() {
  return <div className="logo-mark"><Sparkles size={17} strokeWidth={2.3} /></div>;
}

function Sidebar({ active, onClose }: { active: string; onClose?: () => void }) {
  const nav = [
    { label: "المحادثة", icon: Command },
    { label: "المشاريع", icon: LayoutDashboard },
    { label: "الذاكرة", icon: BrainCircuit },
    { label: "التكاملات", icon: Globe2 },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand"><LogoMark /><div><strong>NOVA</strong><span>personal AI OS</span></div></div>
        {onClose && <button className="icon-button mobile-only" onClick={onClose} aria-label="إغلاق القائمة"><X size={18} /></button>}
      </div>
      <Button className="new-chat" onClick={onClose}><Plus size={17} /> محادثة جديدة</Button>
      <nav className="nav-list" aria-label="التنقل الرئيسي">
        {nav.map(({ label, icon: Icon }) => label === "المشاريع" ? <Link href="/tasks" key={label} className="nav-item"><Icon size={17} />المهام</Link> : <button key={label} className={`nav-item ${active === label ? "active" : ""}`}><Icon size={17} />{label}{label === "المحادثة" && <span className="nav-dot" />}</button>)}
      </nav>
      <div className="sidebar-divider" />
      <div className="side-section-title"><span>مساحات العمل</span><button className="mini-icon"><Plus size={14} /></button></div>
      <button className="workspace-item"><span className="workspace-icon violet">A</span><span>Atlas launch</span><MoreHorizontal size={15} /></button>
      <button className="workspace-item"><span className="workspace-icon mint">P</span><span>Personal</span><MoreHorizontal size={15} /></button>
      <div className="sidebar-bottom">
        <div className="plan-card"><div className="plan-icon"><Zap size={15} /></div><div><b>الخطة الأساسية</b><span>بنية الوكيل جاهزة للتوسع</span></div></div>
        <Link href="/settings" className="nav-item"><Settings2 size={17} />الإعدادات</Link>
        <div className="profile-row"><div className="avatar">م</div><div className="profile-copy"><b>مساحتك الشخصية</b><span>الحساب المتصل</span></div><ChevronDown size={15} /></div>
      </div>
    </aside>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return <div className="empty-state">
    <div className="empty-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="empty-core"><BrainCircuit size={26} /></div></div>
    <p className="eyebrow">مساعدك الشخصي، لكن أذكى</p>
    <h1>ما الذي تريد <em>إنجازه</em> اليوم؟</h1>
    <p className="empty-copy">NOVA يفهم الهدف، يتذكر ما يهمك، وينفّذ عبر أدوات آمنة مع التحقق من كل نتيجة.</p>
    <div className="starter-grid">{starterPrompts.map(item => <button className="starter-card" key={item.label} onClick={() => onPrompt(item.prompt)}><span className="starter-icon">{item.icon}</span><span>{item.label}</span><ArrowUp size={14} /></button>)}</div>
  </div>;
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [completedTaskId, setCompletedTaskId] = useState<number | null>(null);
  const createTask = trpc.tasks.create.useMutation();
  const pauseTask = trpc.tasks.pause.useMutation();
  const resumeTask = trpc.tasks.resume.useMutation();
  const tasks = trpc.tasks.list.useQuery();
  const activeTask = trpc.tasks.get.useQuery({ id: activeTaskId ?? 0 }, { enabled: Boolean(activeTaskId), refetchInterval: activeTaskId ? 1000 : false });
  const taskEvents = trpc.tasks.events.useQuery({ id: activeTaskId ?? 0 }, { enabled: Boolean(activeTaskId), refetchInterval: activeTaskId ? 1000 : false });
  const capabilities = trpc.chat.capabilities.useQuery();
  const memories = trpc.chat.memories.useQuery();
  const isEmpty = messages.length === 0;
  const displayName = user?.name?.split(" ")[0] ?? "صديقي";
  const capabilityCount = capabilities.data?.length ?? 0;
  const activeMemoryCount = memories.data?.length ?? 0;
  const placeholder = useMemo(() => isEmpty ? "اكتب هدفًا، فكرة، أو مهمة تريد إنجازها..." : "تابع المحادثة مع NOVA...", [isEmpty]);

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || createTask.isPending) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    createTask.mutate({ goal: content, messages: next }, {
      onSuccess: task => { setActiveTaskId(task.id); void tasks.refetch(); },
      onError: error => setMessages(current => [...current, { role: "assistant", content: `تعذر إنشاء المهمة. ${error.message}` }]),
    });
  };

  useEffect(() => {
    if (!activeTaskId) return;
    const source = new EventSource(`/api/tasks/${activeTaskId}/events`);
    source.addEventListener("task", () => { void tasks.refetch(); void activeTask.refetch(); });
    return () => source.close();
  }, [activeTaskId]);

  useEffect(() => {
    const task = activeTask.data;
    if (task?.status === "completed" && task.result && completedTaskId !== task.id) {
      setCompletedTaskId(task.id);
      setMessages(current => [...current, { role: "assistant", content: task.result ?? "اكتملت المهمة." }]);
    }
  }, [activeTask.data, completedTaskId]);

  return <div className="app-shell" dir="rtl">
    <div className={`mobile-overlay ${mobileNav ? "visible" : ""}`} onClick={() => setMobileNav(false)} />
    <div className={`sidebar-wrap ${mobileNav ? "open" : ""}`}><Sidebar active="المحادثة" onClose={() => setMobileNav(false)} /></div>
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-start"><button className="icon-button mobile-only" onClick={() => setMobileNav(true)} aria-label="فتح القائمة"><Menu size={20} /></button><div className="breadcrumb"><span>مساحتك الشخصية</span><span className="slash">/</span><b>محادثة جديدة</b></div></div>
        <div className="topbar-actions"><div className="live-status"><span className="status-pulse" /> النظام متصل</div><button className="icon-button"><Search size={18} /></button><button className="icon-button"><BellIcon /></button>{isAuthenticated ? <button className="top-avatar" onClick={() => logout()}>م</button> : <Button variant="outline" className="login-button" onClick={() => startLogin()}><LogIn size={15} /> تسجيل الدخول</Button>}</div>
      </header>
      <section className={`conversation ${isEmpty ? "is-empty" : ""}`}>
        {isEmpty ? <><div className="welcome-line">مرحبًا، {displayName} <span>✦</span></div><EmptyState onPrompt={setInput} /></> : <div className="message-list">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><div className={`message-avatar ${message.role}`}>{message.role === "assistant" ? <LogoMark /> : "م"}</div><div className="message-content"><div className="message-meta"><b>{message.role === "assistant" ? "NOVA" : displayName}</b><span>{message.role === "assistant" ? "الوكيل الشخصي" : "الآن"}</span></div>{message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : <p>{message.content}</p>}</div></div>)}{activeTask.data && <TaskProgress task={activeTask.data} events={taskEvents.data ?? []} onPause={() => pauseTask.mutate({ id: activeTask.data!.id })} onResume={() => resumeTask.mutate({ id: activeTask.data!.id })} />}</div>}
        <form className="composer-wrap" onSubmit={submit}><div className="composer"><button type="button" className="composer-icon"><Plus size={19} /></button><textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder={placeholder} rows={1} aria-label="رسالة إلى NOVA" /><button type="button" className="composer-icon"><Mic size={18} /></button><button className="send-button" type="submit" disabled={!input.trim() || createTask.isPending}><ArrowUp size={18} /></button></div><div className="composer-foot"><span><ShieldCheck size={13} /> الوكيل يعمل ضمن حدودك الآمنة</span><span>Enter للإرسال · Shift + Enter لسطر جديد</span></div></form>
      </section>
      <footer className="status-strip"><div><CircleDashed size={14} /> <span>حلقة الوكيل</span><b>{activeTask?.data?.status === "running" ? "تنفّذ" : "جاهزة"}</b></div><div><Database size={14} /> ذاكرة طويلة المدى <b>{activeMemoryCount} سياق</b></div><div><ListTodo size={14} /> مهام محفوظة <b>{tasks.data?.length ?? 0}</b></div><div className="provider-label">Managed LLM <span>•</span> NVIDIA-compatible</div></footer>
    </main>
  </div>;
}

function TaskProgress({ task, events, onPause, onResume }: { task: { id: number; status: string; progress: number; goal: string; retries: number }; events: Array<{ id: string; type: string; message: string; createdAt: string }>; onPause: () => void; onResume: () => void }) {
  const paused = task.status === "paused";
  const finished = task.status === "completed";
  return <div className="task-progress"><div className="task-progress-top"><div className="trace-heading"><ListTodo size={15} /> المهمة #{task.id} · {task.status === "planning" ? "تخطيط" : task.status === "running" ? "تنفيذ" : task.status === "paused" ? "متوقفة" : finished ? "مكتملة" : "في الطابور"}</div><div className="task-controls">{paused ? <button onClick={onResume} aria-label="استكمال المهمة"><Play size={14} /></button> : !finished && <button onClick={onPause} aria-label="إيقاف المهمة"><Pause size={14} /></button>}</div></div><p>{task.goal}</p><div className="progress-track"><span style={{ width: `${task.progress}%` }} /></div><div className="task-progress-foot"><small>{task.progress}% مكتمل</small>{task.retries > 0 && <small><RotateCcw size={12} /> إعادة المحاولة {task.retries}/3</small>}</div><div className="activity-timeline">{events.slice(-4).map(event => <div className="activity-item" key={event.id}><span className="activity-line" /><div><b>{event.message}</b><small>{event.type} · {new Date(event.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</small></div></div>)}</div></div>;
}

function BellIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>; }
