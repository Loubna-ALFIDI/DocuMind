import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, MessageSquareText, ArrowUp, Sparkles, Trash2, Plus, PanelLeftClose, Menu, X, LoaderCircle, BookOpen, ShieldCheck, Command } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const initialMessages = [{ role: 'assistant', welcome: true }];

function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState(initialMessages);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [busyId, setBusyId] = useState('');
  const fileInput = useRef(null);
  const bottom = useRef(null);
  useEffect(() => { refreshDocuments(); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function refreshDocuments() {
    try { const res = await fetch(`${API}/documents`); if (res.ok) setDocuments(await res.json()); }
    catch { /* Backend may still be starting. */ }
  }
  async function uploadFiles(files) {
    if (!files?.length) return;
    setError(''); setUploading(true);
    for (const file of files) {
      const data = new FormData(); data.append('file', file);
      try {
        const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: data });
        const body = await res.json(); if (!res.ok) throw new Error(body.detail || 'Upload failed');
      } catch (e) { setError(e.message || 'Could not connect to the DocuMind API.'); }
    }
    await refreshDocuments(); setUploading(false);
  }
  async function removeDocument(doc) {
    setBusyId(doc.id); setError('');
    try { const res = await fetch(`${API}/documents/${doc.id}`, { method: 'DELETE' }); if (!res.ok) throw new Error('Could not remove document.'); await refreshDocuments(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(''); }
  }
  async function ask(text = question) {
    const value = text.trim(); if (!value || loading) return;
    setQuestion(''); setError(''); setMessages(m => [...m, { role: 'user', content: value }]); setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: value }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.detail || 'Could not get an answer.');
      setMessages(m => [...m, { role: 'assistant', content: body.answer, sources: body.sources }]);
    } catch (e) { setMessages(m => [...m, { role: 'assistant', content: e.message || 'Could not connect to the DocuMind API.', failed: true }]); }
    finally { setLoading(false); }
  }
  function resetChat() { setMessages(initialMessages); setError(''); }
  const suggestions = ['What are the key points?', 'Summarize this document', 'What deadlines are mentioned?'];

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? '' : 'sidebar-hidden'}`}>
      <div className="brand"><div className="brand-mark"><BookOpen size={19}/></div><span>documind</span><button className="icon-button collapse" onClick={() => setSidebar(false)} aria-label="Close sidebar"><PanelLeftClose size={17}/></button></div>
      <button className="new-chat" onClick={resetChat}><Plus size={16}/> New conversation <span className="shortcut">⌘ K</span></button>
      <div className="side-label"><span>YOUR WORKSPACE</span><span className="count">{documents.length}</span></div>
      <div className={`upload-zone ${dragging ? 'dragging' : ''}`} onClick={() => fileInput.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}>
        <input ref={fileInput} type="file" accept=".pdf,.txt,.md" multiple hidden onChange={e => { uploadFiles(e.target.files); e.target.value = ''; }}/>
        <div className="upload-icon">{uploading ? <LoaderCircle className="spin" size={18}/> : <Upload size={18}/>}</div>
        <div><strong>{uploading ? 'Indexing files…' : 'Add your documents'}</strong><small>Drop files or <span>browse</span></small></div>
        <small className="filetypes">PDF · TXT · MD</small>
      </div>
      <div className="document-list">
        {documents.length ? documents.map(doc => <div className="document-row" key={doc.id}><div className="file-icon"><FileText size={16}/></div><span title={doc.filename}>{doc.filename}</span><button className="remove-doc" onClick={() => removeDocument(doc)} aria-label={`Delete ${doc.filename}`} disabled={busyId === doc.id}>{busyId === doc.id ? <LoaderCircle className="spin" size={14}/> : <Trash2 size={14}/>}</button></div>) : <div className="empty-docs"><FileText size={17}/><span>Your library is empty.<br/>Upload a document to begin.</span></div>}
      </div>
      <div className="sidebar-bottom"><div className="privacy"><ShieldCheck size={15}/><span>Your documents stay yours</span></div><div className="profile"><div className="avatar">D</div><div><strong>Personal workspace</strong><small>Private library</small></div><span className="online-dot"/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">{!sidebar && <button className="icon-button menu-toggle" onClick={() => setSidebar(true)} aria-label="Open sidebar"><Menu size={19}/></button>}<div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>Chat</strong></div><div className="topbar-right"><span className="status"><span/> All systems ready</span><div className="top-avatar">D</div></div></header>
      <section className="chat-layout">
        <div className="conversation" key={messages.length === 1 ? 'welcome' : 'chat'}>
          {messages.length === 1 ? <div className="welcome-wrap"><div className="welcome-emblem"><div className="emblem-inner"><Sparkles size={24}/></div><span className="orbit orbit-one"/><span className="orbit orbit-two"/></div><div className="eyebrow"><span/> YOUR DOCUMENTS, UNDERSTOOD</div><h1>Knowledge at your<br/><em>fingertips.</em></h1><p className="welcome-copy">Ask a question, explore an idea, or get a clear summary.<br/>Your documents are ready when you are.</p>
            {documents.length > 0 ? <><div className="suggestion-label">A GOOD PLACE TO START</div><div className="suggestions">{suggestions.map((s, i) => <button className="suggestion" key={s} onClick={() => ask(s)}><span className="suggestion-icon">{i === 0 ? <Sparkles size={15}/> : i === 1 ? <FileText size={15}/> : <MessageSquareText size={15}/>}</span><span>{s}</span><ArrowUp size={14} className="suggestion-arrow"/></button>)}</div></> : <div className="welcome-nudge"><span className="nudge-number">01</span><span>Start by adding a document to your library</span><ArrowUp size={15}/></div>}
          </div> : <div className="message-list">{messages.slice(1).map((m, i) => <div className={`message message-${m.role}`} key={i}>{m.role === 'assistant' && <div className="assistant-mark"><BookOpen size={15}/></div>}<div className="message-body">{m.role === 'user' ? <div className="user-bubble">{m.content}</div> : <><div className={`answer ${m.failed ? 'answer-error' : ''}`}>{m.content}</div>{m.sources?.length > 0 && <div className="sources"><div className="sources-heading"><span className="source-rule"/> SOURCES <span className="source-count">{m.sources.length}</span></div><div className="source-grid">{m.sources.map((s, n) => <div className="source-card" key={n}><div className="source-file"><FileText size={14}/></div><div className="source-info"><strong>{s.filename}</strong><small>{s.page ? `Page ${s.page}` : `Section ${s.chunk}`}</small></div><span className="source-ref">{String(n + 1).padStart(2, '0')}</span></div>)}</div></div>}</>}</div></div>)}{loading && <div className="message message-assistant"><div className="assistant-mark"><BookOpen size={15}/></div><div className="thinking"><span/><span/><span/></div></div>}<div ref={bottom}/></div>}
        </div>
        <div className="composer-area"><div className="composer"><textarea value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }} placeholder="Ask anything about your documents…" rows={1}/><div className="composer-footer"><span className="composer-hint"><Command size={12}/> Enter to send <span className="hint-divider">·</span> Shift + Enter for a new line</span><button className="send-button" disabled={!question.trim() || loading} onClick={() => ask()} aria-label="Send message">{loading ? <LoaderCircle className="spin" size={17}/> : <ArrowUp size={18}/>}</button></div></div><div className="disclaimer">DocuMind answers from your sources. Always verify important details.</div></div>
      </section>
    </main>
    {error && <div className="toast" role="status"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>;
}

export default App;
