import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import {
    Mic,
    ArrowUp,
    MessageSquare,
    Zap
} from 'lucide-react'
import './App.css'

// Lazy-load the heavy WebGL orb (17KB + OGL dep) — out of critical bundle
const VoicePoweredOrb = lazy(() =>
    import('./components/ui/voice-powered-orb').then(m => ({ default: m.VoicePoweredOrb }))
)

function App() {
    const [input, setInput] = useState('')
    const [isListening, setIsListening] = useState(false)
    const [voiceDetected, setVoiceDetected] = useState(false)
    const [messages, setMessages] = useState<{ role: 'user' | 'agent', text: string, time: string }[]>([
        { role: 'agent', text: 'Kirtos system online. How can I assist you today?', time: new Date().toLocaleTimeString() }
    ])
    const [status, setStatus] = useState('CONNECTING...')

    const socketRef = useRef<WebSocket | null>(null)
    const chatEndRef = useRef<HTMLDivElement | null>(null)
    const recognitionRef = useRef<any>(null)
    const sessionId = useRef(`session-${Math.random().toString(36).substr(2, 9)}`)

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // WebSocket Connection
    useEffect(() => {
        const connectWS = () => {
            const ws = new WebSocket('ws://localhost:3001/ws')

            ws.onopen = () => {
                setStatus('CONNECTED')
                socketRef.current = ws
            }

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                if (data.message) {
                    setMessages(prev => [...prev, {
                        role: 'agent',
                        text: data.message,
                        time: new Date().toLocaleTimeString()
                    }])
                }
                if (data.status === 'error' || data.status === 'failed' || data.status === 'denied') {
                    setMessages(prev => [...prev, {
                        role: 'agent',
                        text: `Error: ${data.message || 'System error'}`,
                        time: new Date().toLocaleTimeString()
                    }])
                }
            }

            ws.onclose = () => {
                setStatus('DISCONNECTED')
                setTimeout(connectWS, 3000)
            }

            ws.onerror = () => setStatus('ERROR')
        }

        connectWS()
        return () => socketRef.current?.close()
    }, [])

    // Speech Recognition Handler
    const toggleListening = () => {
        if (isListening) {
            console.log('User requested STOP listening');
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            setMessages(prev => [...prev, {
                role: 'agent',
                text: 'Speech recognition is not supported in this browser.',
                time: new Date().toLocaleTimeString()
            }]);
            return;
        }

        console.log('Initializing fresh speech recognition...');
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onstart = () => {
            console.log('Speech recognition event: START');
            setIsListening(true);
        }

        recognition.onresult = (event: any) => {
            const { transcript } = event.results[0][0];
            console.log('Speech recognition event: RESULT', transcript);
            handleSendMessage(transcript);
        }

        recognition.onerror = (event: any) => {
            console.error('Speech recognition event: ERROR', event.error);
            setIsListening(false);
            setVoiceDetected(false);
        }

        recognition.onend = () => {
            console.log('Speech recognition event: END');
            setIsListening(false);
            setVoiceDetected(false);
        }

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (e) {
            console.error('Failed to start recognition', e);
            setIsListening(false);
        }
    }

    // Remove the old useEffect-based recognition setup
    useEffect(() => {
        // Recognition is now handled on-demand in toggleListening
    }, [])

    const handleSendMessage = (textOverride?: string) => {
        const messageText = typeof textOverride === 'string' ? textOverride : input
        if (!messageText.trim() || !socketRef.current) return

        // Add user message to UI
        setMessages(prev => [...prev, {
            role: 'user',
            text: messageText,
            time: new Date().toLocaleTimeString()
        }])

        // Send to agent
        socketRef.current.send(JSON.stringify({
            type: 'natural-language',
            session_id: sessionId.current,
            text: messageText
        }))

        setInput('')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSendMessage()
    }

    return (
        <div className="minimal-workspace">
            <div className="mesh-gradient"></div>

            <header className="minimal-header">
                <div className="brand">
                    <Zap size={20} className="accent-icon" />
                    <h1>KIRTOS<span>AI</span></h1>
                </div>
                <div className={`status-tag ${status.toLowerCase()}`}>
                    <span className="dot"></span>
                    {status}
                </div>
            </header>

            <main className="core-content">
                <section className="voice-stage">
                    <div className="orb-wrapper">
                        <Suspense fallback={<div style={{ width: '100%', height: '100%' }} />}>
                            <VoicePoweredOrb
                                enableVoiceControl={isListening}
                                hue={240}
                                voiceSensitivity={3}
                                className="main-orb"
                                onVoiceDetected={setVoiceDetected}
                            />
                        </Suspense>
                    </div>
                    <button
                        className={`voice-trigger ${isListening ? 'listening' : ''} ${voiceDetected ? 'pulse' : ''}`}
                        onClick={toggleListening}
                    >
                        <Mic size={32} />
                    </button>
                    <div className="stage-caption">
                        {isListening ? (voiceDetected ? 'ANALYZING VOICE...' : 'LISTENING...') : 'TAP TO SPEAK'}
                    </div>
                </section>

                <section className="chat-stage">
                    <div className="chat-container">
                        <div className="message-list scrollbar-hide">
                            {messages.map((msg, i) => (
                                <div key={i} className={`message-bubble ${msg.role}`}>
                                    <div className="bubble-content">{msg.text}</div>
                                    <div className="bubble-meta">{msg.time}</div>
                                </div>
                            ))}
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
                                    placeholder="Type your command..."
                                />
                                <button className="send-trigger" onClick={() => handleSendMessage()}>
                                    <ArrowUp size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default App
