import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Mic,
  ArrowUp,
  MessageSquare,
  Zap,
  History,
  Plus,
  X,
  Clock } from
'lucide-react';
import './App.css';

// Lazy-load the heavy WebGL orb (17KB + OGL dep) — out of critical bundle
const VoicePoweredOrb = lazy(() =>
import('./components/ui/voice-powered-orb').then((m) => ({ default: m.VoicePoweredOrb }))
);

function App() {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'agent';text: string;time: string;}[]>([
  { role: 'agent', text: 'Kirtos system online. How can I assist you today?', time: new Date().toLocaleTimeString() }]
  );
  const [status, setStatus] = useState('CONNECTING...');
  const [retryCount, setRetryCount] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<{id: string;lastActivity: string;}[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);


  const [currentSessionId, setCurrentSessionId] = useState(() => {
    const saved = localStorage.getItem('kirtos_session_id');
    if (saved) return saved;
    const newId = `session-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('kirtos_session_id', newId);
    return newId;
  });

  const sessionIdRef = useRef(currentSessionId);
  useEffect(() => {
    sessionIdRef.current = currentSessionId;
    localStorage.setItem('kirtos_session_id', currentSessionId);
  }, [currentSessionId]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const resp = await fetch(`http://localhost:3001/history/${currentSessionId}`);
        const data = await resp.json();

        if (data.status === 'success') {
          if (data.history.length > 0) {
            const mappedHistory = data.history.map((h: any) => ({
              role: h.role === 'assistant' ? 'agent' : 'user',
              text: h.content,
              time: new Date(h.timestamp).toLocaleTimeString()
            }));
            setMessages(mappedHistory);
          } else {
            setMessages([{ role: 'agent', text: 'Kirtos system online. How can I assist you today?', time: new Date().toLocaleTimeString() }]);
          }
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [currentSessionId]);

  const fetchSessions = async () => {
    try {
      const resp = await fetch('http://localhost:3001/sessions');
      const data = await resp.json();
      if (data.status === 'success') {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const startNewChat = () => {
    const newId = `session-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(newId);
    setShowSessions(false);
  };

  const loadSession = (id: string) => {
    setCurrentSessionId(id);
    setShowSessions(false);
  };


  useEffect(() => {
    let heartbeatInterval: any;

    const connectWS = () => {
      const ws = new WebSocket('ws://localhost:3001/ws');

      ws.onopen = () => {
        console.log('[WS] Connected');
        setStatus('CONNECTED');
        setRetryCount(0);
        setConnectionError(false);
        socketRef.current = ws;


        ws.send(JSON.stringify({
          type: 'control',
          action: 'sync',
          session_id: sessionIdRef.current
        }));


        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'control', action: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);


        if (data.type === 'control') {
          if (data.action === 'pong') return;
          if (data.action === 'sync_ack') {
            console.log(`[WS] Session ${data.session_id} synced`);
            return;
          }
        }

        if (data.message) {
          setMessages((prev) => [...prev, {
            role: 'agent',
            text: data.message,
            time: new Date().toLocaleTimeString()
          }]);
        }
        if (data.status === 'error' || data.status === 'failed' || data.status === 'denied') {
          setMessages((prev) => [...prev, {
            role: 'agent',
            text: `Error: ${data.message || 'System error'}`,
            time: new Date().toLocaleTimeString()
          }]);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setStatus('DISCONNECTED');
        clearInterval(heartbeatInterval);

        setRetryCount((prev) => {
          const nextCount = prev + 1;
          if (nextCount >= 5) {
            setConnectionError(true);
          } else {
            setTimeout(connectWS, 3000);
          }
          return nextCount;
        });
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        setStatus('ERROR');
      };
    };

    connectWS();
    return () => {
      clearInterval(heartbeatInterval);
      socketRef.current?.close();
    };
  }, [currentSessionId]);


  const toggleListening = () => {
    if (isListening) {
      console.log('User requested STOP listening');
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      setMessages((prev) => [...prev, {
        role: 'agent',
        text: 'Speech recognition is not supported in this browser.',
        time: new Date().toLocaleTimeString()
      }]);
      return;
    }

    console.log('Initializing fresh speech recognition...');
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition event: START');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const { transcript } = event.results[0][0];
      console.log('Speech recognition event: RESULT', transcript);
      handleSendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition event: ERROR', event.error);
      setIsListening(false);
      setVoiceDetected(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition event: END');
      setIsListening(false);
      setVoiceDetected(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to start recognition', e);
      setIsListening(false);
    }
  };


  useEffect(() => {

  }, []);

  const handleSendMessage = (textOverride?: string) => {
    const messageText = typeof textOverride === 'string' ? textOverride : input;
    if (!messageText.trim() || !socketRef.current) return;


    setMessages((prev) => [...prev, {
      role: 'user',
      text: messageText,
      time: new Date().toLocaleTimeString()
    }]);


    socketRef.current.send(JSON.stringify({
      type: 'natural-language',
      session_id: currentSessionId,
      text: messageText
    }));

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className="minimal-workspace">
            <div className="mesh-gradient"></div>

            {connectionError &&
      <div className="connectivity-banner">
                    <Zap size={14} className="banner-icon" />
                    <span>Connection lost. Multiple retry attempts failed.</span>
                    <button onClick={() => {
          setRetryCount(0);
          setConnectionError(false);




          window.location.reload();
        }}>RETRY NOW</button>
                </div>
      }

            <header className="minimal-header">
                <div className="brand">
                    <Zap size={20} className="accent-icon" />
                    <h1>KIRTOS<span>AI</span></h1>
                </div>

                <div className="header-actions">
                    <button className="icon-btn" title="New Chat" onClick={startNewChat}>
                        <Plus size={20} />
                    </button>
                    <button className={`icon-btn ${showSessions ? 'active' : ''}`} title="Chat History" onClick={() => {
            if (!showSessions) fetchSessions();
            setShowSessions(!showSessions);
          }}>
                        <History size={20} />
                    </button>
                    <div className={`status-tag ${status.toLowerCase()}`}>
                        <span className="dot"></span>
                        {status}
                    </div>
                </div>
            </header>

            {}
            <aside className={`history-sidebar ${showSessions ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>PAST CHATS</h2>
                    <button onClick={() => setShowSessions(false)}><X size={20} /></button>
                </div>
                <div className="session-list">
                    {sessions.length === 0 ?
          <div className="empty-state">No past sessions found.</div> :

          sessions.map((s) =>
          <div
            key={s.id}
            className={`session-item ${s.id === currentSessionId ? 'active' : ''}`}
            onClick={() => loadSession(s.id)}>
            
                                <Clock size={14} className="item-icon" />
                                <div className="item-details">
                                    <div className="item-id">{s.id.replace('session-', '')}</div>
                                    <div className="item-date">{new Date(s.lastActivity).toLocaleDateString()}</div>
                                </div>
                            </div>
          )
          }
                </div>
            </aside>

            <main className="core-content">
                <section className="voice-stage">
                    <div className="orb-wrapper">
                        <Suspense fallback={<div style={{ width: '100%', height: '100%' }} />}>
                            <VoicePoweredOrb
                enableVoiceControl={isListening}
                hue={240}
                voiceSensitivity={3}
                className="main-orb"
                onVoiceDetected={setVoiceDetected} />
              
                        </Suspense>
                    </div>
                    <button
            className={`voice-trigger ${isListening ? 'listening' : ''} ${voiceDetected ? 'pulse' : ''}`}
            onClick={toggleListening}>
            
                        <Mic size={32} />
                    </button>
                    <div className="stage-caption">
                        {isListening ? voiceDetected ? 'ANALYZING VOICE...' : 'LISTENING...' : 'TAP TO SPEAK'}
                    </div>
                </section>

                <section className="chat-stage">
                    <div className="chat-container">
                        <div className="message-list scrollbar-hide">
                            {isLoadingHistory ?
              <div className="loading-history">Syncing memories...</div> :

              messages.map((msg, i) =>
              <div key={i} className={`message-bubble ${msg.role}`}>
                                        <div className="bubble-content">{msg.text}</div>
                                        <div className="bubble-meta">{msg.time}</div>
                                    </div>
              )
              }
                            <div ref={chatEndRef} />
                        </div>

                        <div className="input-strip">
                            <div className="strip-inner">
                                <MessageSquare size={18} className="strip-icon" />
                                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your command..." />
                
                                <button className="send-trigger" onClick={() => handleSendMessage()}>
                                    <ArrowUp size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>);

}

export default App;