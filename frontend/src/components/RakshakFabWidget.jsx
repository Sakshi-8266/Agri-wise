import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Minimize2, Maximize2, Send, Bot, User, 
  Sparkles, RefreshCw, Layers, ShieldCheck, ChevronDown, 
  MapPin, AlertCircle, Leaf, MessageSquare, Mic, MicOff, Volume2, VolumeX, RotateCcw,
  Play, Square
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import CustomAgriLogo from './CustomAgriLogo';
import WavyProgressLoader from './WavyProgressLoader';
import ElevenLabsVoiceAssistant from './ElevenLabsVoiceAssistant';

export default function RakshakFabWidget() {
  const { t, currentLanguageObj, greeting } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeMode, setActiveMode] = useState('voice'); // 'voice' (ElevenLabs) | 'chat' (RAG)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [farmerData, setFarmerData] = useState({ name: 'Ramesh Patel', farm: null, crops: [] });
  const messagesEndRef = useRef(null);

  // Multilingual Speech Recognition & Synthesis
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const recognitionRef = useRef(null);

  const SPEECH_LANG_MAP = {
    hi: 'hi-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    mr: 'mr-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    bn: 'bn-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    or: 'or-IN',
    en: 'en-IN'
  };

  const currentSpeechLang = SPEECH_LANG_MAP[currentLanguageObj?.code] || 'hi-IN';

  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentSpeechLang;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleSpeakMessage = (text, idx) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = currentSpeechLang;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  // Load farmer dossier once on mount to personalize greeting
  useEffect(() => {
    loadDossier();
  }, []);

  const loadDossier = async () => {
    try {
      const u = api.getUser();
      const [prof, farms] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getFarms().catch(() => [])
      ]);

      let allCrops = [];
      if (farms && farms.length > 0) {
        allCrops = await api.getCrops(farms[0].id).catch(() => []);
      }

      const rawName = u?.name || prof?.name || 'Ramesh Patel';
      const cleanName = rawName.replace(/\(.*?\)/g, '').trim();
      const farmObj = farms && farms.length > 0 ? farms[0] : null;

      setFarmerData({
        name: cleanName,
        farm: farmObj,
        crops: allCrops,
        profile: prof
      });

      // Construct Initial Dossier Welcome
      const greetWord = greeting || 'Namaste';
      const farmName = farmObj?.farm_name || 'Anand Agro Farm';
      const farmArea = farmObj ? `${farmObj.area} ${farmObj.area_unit}` : '18.5 Acres';
      const location = farmObj?.location || (prof ? `${prof.district}, ${prof.state}` : 'Anand, Gujarat');

      let cropSummary = 'Sharbati Wheat (HD-3226) & Hybrid Tomato';
      if (allCrops && allCrops.length > 0) {
        cropSummary = allCrops.map(c => `${c.crop_name} (${c.growth_stage || 'Active'})`).join(', ');
      }

      setMessages([
        {
          sender_role: 'assistant',
          content: `${greetWord} ${cleanName} ji! 🙏\n\nI am your persistent **Rakshak AI** copilot. I am synced with **${farmName}** (${farmArea}, ${location}) and your standing crops: **${cropSummary}**.\n\nYou can consult me anytime across any page for fertilizer plans, spray timings, market price forecasts, or disease remedies!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChat = () => {
    setActiveConversationId(null);
    setErrorState(null);
    setInput('');
    loadDossier();
  };

  const handleRetry = () => {
    if (lastQuery) {
      handleSendMessage(lastQuery);
    }
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, loading]);

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    setLastQuery(query);
    setErrorState(null);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender_role: 'user', content: query, timestamp: nowTime };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatAssistant(query, activeConversationId);
      if (res.conversation_id) {
        setActiveConversationId(res.conversation_id);
      }
      setMessages(prev => [...prev, {
        sender_role: 'assistant',
        content: res.response || res.reply || 'Analysis completed for your query.',
        sources: res.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      setErrorState(err.message || 'Error communicating with agricultural knowledge engine.');
      setMessages(prev => [...prev, {
        sender_role: 'assistant',
        content: 'I encountered a temporary communication hitch. Please verify your query or try again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'What is the recommended fertilizer schedule for wheat right now?',
    'Should I irrigate today based on the weather forecast?',
    'What are the current mandi rates for Sharbati Wheat in Anand?'
  ];

  return (
    <div style={{ position: 'fixed', bottom: '26px', right: '26px', zIndex: 1200 }}>
      {/* Floating Action Button (FAB) when collapsed - Prominent High-Contrast AI Copilot */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="rakshak-fab-button"
          title="Rakshak AI Copilot • Multilingual Voice & Crop Intelligence"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #092619 0%, #164e34 100%)',
            color: '#ffffff',
            border: '2.5px solid #f59e0b',
            boxShadow: '0 8px 28px rgba(18, 53, 36, 0.45), 0 0 22px rgba(245, 158, 11, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.12) translateY(-2px)';
            e.currentTarget.style.borderColor = '#fbbf24';
            e.currentTarget.style.boxShadow = '0 12px 36px rgba(18, 53, 36, 0.55), 0 0 28px rgba(245, 158, 11, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.borderColor = '#f59e0b';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(18, 53, 36, 0.45), 0 0 22px rgba(245, 158, 11, 0.35)';
          }}
        >
          {/* Prominent Custom Agricultural AI Logo */}
          <CustomAgriLogo size={30} variant="icon" />
          
          {/* Prominent High-Contrast AI Badge */}
          <span 
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#f59e0b',
              color: '#092619',
              fontSize: '0.62rem',
              fontWeight: 900,
              padding: '1px 5px',
              borderRadius: '999px',
              border: '2px solid #092619',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }} 
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            AI
          </span>
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div 
          className="rakshak-modal-window animate-scale-in"
          style={{
            width: isMinimized ? '300px' : '410px',
            maxWidth: 'calc(100vw - 32px)',
            height: isMinimized ? '52px' : '590px',
            maxHeight: 'calc(100vh - 80px)',
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid rgba(27, 56, 43, 0.14)',
            boxShadow: '0 16px 44px rgba(18, 53, 36, 0.25), 0 4px 14px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #0f291e 0%, #16382a 100%)',
            padding: '12px 16px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CustomAgriLogo size={30} variant="icon" />
              <div>
                <div style={{ 
                  fontSize: '0.92rem', 
                  fontWeight: 800, 
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  Rakshak AI
                  <span style={{ 
                    fontSize: '0.64rem', 
                    background: 'rgba(245, 158, 11, 0.25)', 
                    color: '#fef3c7', 
                    padding: '1px 6px', 
                    borderRadius: '4px',
                    fontWeight: 700 
                  }}>
                    PROACTIVE
                  </span>
                </div>
                {!isMinimized && (
                  <div style={{ fontSize: '0.68rem', color: '#88b89e' }}>
                    Synced: {farmerData.name} • Anand, Gujarat
                  </div>
                )}
              </div>
            </div>

            {/* Window Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px'
                }}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  setSpeakingIdx(null);
                  setIsOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px'
                }}
                title="Close Widget"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Section (Hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Mode Switcher Bar */}
              <div style={{
                display: 'flex',
                background: '#eef5f1',
                borderBottom: '1px solid rgba(27, 56, 43, 0.1)',
                padding: '4px 8px',
                gap: '6px',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setActiveMode('voice')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeMode === 'voice' ? '#123524' : 'transparent',
                    color: activeMode === 'voice' ? '#ffffff' : '#33503f',
                    fontSize: '0.76rem',
                    fontWeight: activeMode === 'voice' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sparkles size={14} color={activeMode === 'voice' ? '#f59e0b' : '#10b981'} />
                  ElevenLabs Voice Agent
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('chat')}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeMode === 'chat' ? '#123524' : 'transparent',
                    color: activeMode === 'chat' ? '#ffffff' : '#33503f',
                    fontSize: '0.76rem',
                    fontWeight: activeMode === 'chat' ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <MessageSquare size={14} />
                  Kisan Agri Chat
                </button>
              </div>

              {activeMode === 'voice' ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <ElevenLabsVoiceAssistant variant="compact" onClose={() => {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setSpeakingIdx(null);
                    setIsOpen(false);
                  }} />
                </div>
              ) : (
                <>
                  {/* Context Strip with Clear Chat & Stop Voice */}
                  <div style={{
                    background: '#f4f8f5',
                    padding: '6px 14px',
                    borderBottom: '1px solid rgba(27, 56, 43, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: '#2d5740',
                    fontWeight: 600
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={13} color="#10b981" />
                      ICAR Knowledge Core Active
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {speakingIdx !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                            setSpeakingIdx(null);
                          }}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #f87171',
                            color: '#dc2626',
                            borderRadius: '999px',
                            padding: '1px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Square size={9} fill="#dc2626" />
                          <span>Stop Voice / रोकें</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearChat}
                        title="Clear chat history"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#688273',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#688273'}
                      >
                        Clear Chat
                      </button>
                    </div>
                  </div>

              {/* Messages Area */}
              <div style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#fcfdfc'
              }}>
                {messages.map((m, idx) => {
                  const isUser = m.sender_role === 'user';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        alignSelf: isUser ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        background: isUser ? '#123524' : '#ffffff',
                        color: isUser ? '#ffffff' : '#16382a',
                        border: isUser ? 'none' : '1px solid rgba(27, 56, 43, 0.1)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        fontSize: '0.84rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        position: 'relative'
                      }}>
                        {m.content}

                        {/* Read Aloud Text-to-Speech Button for Assistant Responses */}
                        {!isUser && (
                          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleSpeakMessage(m.content, idx)}
                              title={speakingIdx === idx ? "Stop Voice (आवाज़ रोकें)" : "Listen to advice (आवाज़ में सुनें)"}
                              style={{
                                background: speakingIdx === idx ? '#fee2e2' : '#f0fdf4',
                                border: speakingIdx === idx ? '1px solid #f87171' : '1px solid #bbf7d0',
                                borderRadius: '999px',
                                padding: '2px 9px',
                                fontSize: '0.68rem',
                                color: speakingIdx === idx ? '#dc2626' : '#059669',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              {speakingIdx === idx ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                              <span>{speakingIdx === idx ? 'Stop / रोकें' : 'Play / सुनें'}</span>
                            </button>
                          </div>
                        )}
                        {/* Message Timestamp */}
                        {m.timestamp && (
                          <div style={{
                            fontSize: '0.62rem',
                            color: isUser ? '#a7f3d0' : '#94a3b8',
                            marginTop: '4px',
                            textAlign: isUser ? 'right' : 'left'
                          }}>
                            {m.timestamp}
                          </div>
                        )}
                      </div>

                      {/* Sources / Citations if available */}
                      {m.sources && m.sources.length > 0 && (
                        <div style={{
                          marginTop: '4px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                          fontSize: '0.68rem'
                        }}>
                          {m.sources.map((s, sIdx) => (
                            <span 
                              key={sIdx}
                              style={{
                                background: '#edf5f0',
                                color: '#1b4d36',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #c9e2d3'
                              }}
                            >
                              📚 {s.title || s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Progressive Wave Loader while answering */}
                {loading && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid rgba(27, 56, 43, 0.1)',
                    maxWidth: '85%'
                  }}>
                    <WavyProgressLoader 
                      compact={true} 
                      text="Synthesizing ICAR & localized telemetry..." 
                    />
                  </div>
                )}
                {errorState && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    color: '#991b1b',
                    fontSize: '0.74rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}>
                    <span>{errorState}</span>
                    <button
                      type="button"
                      onClick={handleRetry}
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <RotateCcw size={10} /> Retry
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Sample Prompt Pills */}
              {messages.length <= 2 && (
                <div style={{
                  padding: '8px 14px',
                  background: '#f9fbf9',
                  borderTop: '1px solid rgba(27, 56, 43, 0.06)',
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}>
                  {sampleQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(27, 56, 43, 0.12)',
                        borderRadius: '999px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        color: '#2d5740',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#10b981';
                        e.currentTarget.style.background = '#edf7f1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(27, 56, 43, 0.12)';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Voice Listening Banner */}
              {isListening && (
                <div style={{
                  background: 'linear-gradient(90deg, #fef2f2 0%, #fee2e2 100%)',
                  padding: '6px 14px',
                  borderTop: '1px solid #fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.76rem',
                  color: '#991b1b',
                  fontWeight: 700
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      display: 'inline-block',
                      animation: 'pulse 1s infinite'
                    }} />
                    <span>{t('nav.listening', 'Listening... Speak now')} ({currentLanguageObj.nativeName})</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#b91c1c',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '0.72rem'
                    }}
                  >
                    Done / बंद करें
                  </button>
                </div>
              )}

              {/* Chat Input Bar */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                style={{
                  padding: '10px 14px',
                  background: '#ffffff',
                  borderTop: '1px solid rgba(27, 56, 43, 0.08)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}
              >
                {/* Multilingual Voice Microphone Button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title={isListening ? "Stop listening" : `Speak in ${currentLanguageObj.nativeName} (बोलकर पूछें)`}
                  style={{
                    background: isListening ? '#fee2e2' : '#edf5f0',
                    border: isListening ? '1.5px solid #ef4444' : '1px solid rgba(27, 56, 43, 0.15)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    color: isListening ? '#dc2626' : '#123524',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {isListening ? (
                    <MicOff size={16} color="#dc2626" />
                  ) : (
                    <Mic size={16} color="#10b981" />
                  )}
                  <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                    {isListening ? 'Stop' : 'Voice'}
                  </span>
                </button>

                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? `${t('nav.listening', 'Listening...')}` : `${t('nav.voicePlaceholder', 'Ask Rakshak or tap mic to speak in Hindi...')}`}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: isListening ? '1.5px solid #ef4444' : '1px solid rgba(27, 56, 43, 0.15)',
                    fontSize: '0.84rem',
                    color: '#16382a',
                    outline: 'none',
                    background: isListening ? '#fffdfd' : '#ffffff'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#10b981'; }}
                  onBlur={(e) => { if (!isListening) e.target.style.borderColor = 'rgba(27, 56, 43, 0.15)'; }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  style={{
                    background: input.trim() ? '#123524' : '#d2ddd7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 13px',
                    cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </>
      )}
    </div>
  )}
</div>

  );
}
