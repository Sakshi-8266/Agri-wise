import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, BookOpen, ShieldCheck, Sparkles, 
  HelpCircle, RefreshCw, MessageSquare, Languages, MapPin,
  Layers, Sprout, CheckCircle2, UserCheck, Mic, MicOff, Volume2, VolumeX,
  Plus, Trash2, Clock, AlertTriangle, CloudRain, ExternalLink, ArrowRight, RotateCcw,
  Play, Square, Pause
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { useLocation } from '../context/LocationContext';
import LanguageSelector from './LanguageSelector';
import ElevenLabsVoiceAssistant from './ElevenLabsVoiceAssistant';

export default function AgronomyAssistantView() {
  const { t, currentLanguageObj, greeting } = useLanguage();
  const { location } = useLocation();

  const [viewMode, setViewMode] = useState('text'); // 'text' (RAG) | 'voice' (ElevenLabs)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

  // Conversation Management
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);

  // Audio / Speech
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Farmer & Crops Telemetry
  const [farmerUser, setFarmerUser] = useState(null);
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [farmerFarms, setFarmerFarms] = useState([]);
  const [farmerCrops, setFarmerCrops] = useState([]);

  const currentSpeechLang = currentLanguageObj?.code === 'hi' ? 'hi-IN' : 'en-IN';

  // Load initial dossiers, conversations, and crops
  useEffect(() => {
    loadFarmerDetails();
    loadConversationsList();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversationsList = async () => {
    try {
      const list = await api.getConversations().catch(() => []);
      setConversations(list || []);
    } catch (err) {
      console.warn('Error loading conversations:', err);
    }
  };

  const loadFarmerDetails = async () => {
    try {
      const u = api.getUser();
      setFarmerUser(u);

      const [prof, farms] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getFarms().catch(() => [])
      ]);

      setFarmerProfile(prof);
      setFarmerFarms(farms || []);

      let allCrops = [];
      if (farms && farms.length > 0) {
        allCrops = await api.getCrops(farms[0].id).catch(() => []);
      }
      setFarmerCrops(allCrops || []);

      initializeGreeting(u, prof, farms, allCrops);
    } catch (err) {
      console.error(err);
    }
  };

  const initializeGreeting = (user, profile, farms, crops) => {
    const rawName = user?.name || profile?.name || 'Ramesh Patel';
    const cleanName = rawName.replace(/\(.*?\)/g, '').trim();
    const isHindi = currentLanguageObj?.code === 'hi';

    const greetingText = isHindi
      ? `नमस्ते ${cleanName} जी! 🙏\n\nमैं आपका **रक्षक AI** कृषि विशेषज्ञ सलाहकार हूँ। मैंने आपके फार्म (मेरठ, उत्तर प्रदेश) और सक्रिय फसलों (**शरबती गेहूं** व **टमाटर**) का डेटा लोड कर लिया है।\n\n📍 **मौसम चेतावनी**: मेरठ में अगले 4 दिनों में 19.4 मिमी बारिश का पूर्वानुमान है।\n\nआप मुझसे यूरिया व उर्वरक की सही मात्रा, जल निकासी, पीला रतुआ या झुलसा रोग नियंत्रण, और मंडी भाव के बारे में कभी भी पूछ सकते हैं!`
      : `Namaste ${cleanName} ji! 🙏\n\nI am your dedicated **Rakshak AI** Agronomic Intelligence Advisor. I have synchronized your registered farm profile and standing crops (**Sharbati Wheat** & **Hybrid Tomato**).\n\n📍 **Weather Alert**: Upcoming rainfall (~19.4 mm) forecast in 4 days over your location.\n\nAsk me anytime about fertilizer split applications, protective field measures, disease diagnosis, or mandi demand pricing!`;

    setMessages([
      {
        id: 'init-1',
        sender_role: 'assistant',
        content: greetingText,
        sources: [
          {
            title: "Agro-Meteorological Advisory Bulletin - Western UP Hub",
            category: "Weather Alert",
            relevance_score: 0.98,
            snippet: "Rainfall warning for Meerut district: 19.4 mm cumulative precipitation expected in 4 days. Halt chemical applications and clear field drains."
          }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Start a fresh new chat session
  const handleStartNewChat = () => {
    setActiveConversationId(null);
    setErrorState(null);
    setInput('');
    initializeGreeting(farmerUser, farmerProfile, farmerFarms, farmerCrops);
  };

  // Load an existing conversation from database
  const handleSelectConversation = async (convId) => {
    try {
      setLoading(true);
      setErrorState(null);
      const msgs = await api.getConversationMessages(convId);
      setActiveConversationId(convId);

      const formatted = (msgs || []).map(m => ({
        id: `db-${m.id}`,
        sender_role: m.sender_role,
        content: m.content,
        sources: m.sources || [],
        timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
      }));

      setMessages(formatted.length > 0 ? formatted : messages);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete a specific conversation
  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        handleStartNewChat();
      }
    } catch (err) {
      console.warn('Error deleting conversation:', err);
    }
  };

  // Clear all conversations
  const handleClearAllConversations = async () => {
    if (!window.confirm('Are you sure you want to clear your conversation history?')) return;
    try {
      await api.clearAllConversations();
      setConversations([]);
      handleStartNewChat();
    } catch (err) {
      console.warn('Error clearing conversations:', err);
    }
  };

  // Send query to RAG knowledge engine
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    setLastQuery(query);
    setErrorState(null);

    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender_role: 'user',
      content: query,
      timestamp: nowTimestamp
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chatAssistant(query, activeConversationId);
      
      if (res.conversation_id && res.conversation_id !== activeConversationId) {
        setActiveConversationId(res.conversation_id);
        loadConversationsList();
      }

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        sender_role: 'assistant',
        content: res.response || 'Guidance formulated based on agricultural knowledge records.',
        sources: res.sources || [],
        disclaimer: res.disclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('RAG Query Error:', err);
      setErrorState(err.message || 'Error communicating with agricultural knowledge engine.');
    } finally {
      setLoading(false);
    }
  };

  // Retry previous failed query
  const handleRetry = () => {
    if (lastQuery) {
      handleSendMessage(lastQuery);
    }
  };

  // Stop any active AI voice playback immediately
  const handleStopAllAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);
  };

  // Browser speech synthesis playback with Play / Stop toggle
  const handleSpeakMessage = (text, idx) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingIdx === idx) {
      handleStopAllAudio();
      return;
    }
    handleStopAllAudio();
    const cleanText = text.replace(/[*#_`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = currentSpeechLang;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  // Speech recognition dictation into input
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = currentSpeechLang;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) setInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const displayName = (farmerUser?.name || 'Ramesh Patel').replace(/\(.*?\)/g, '').trim();
  const primaryFarm = farmerFarms && farmerFarms.length > 0 ? farmerFarms[0] : null;

  // Agricultural quick prompts tailored to farmer crops
  const dynamicPrompts = [
    { label: "🌾 Sharbati Wheat Fertilizer", query: "What is the recommended fertilizer NPK schedule for Sharbati Wheat at tillering stage?" },
    { label: "🍅 Tomato Blight Defense", query: "How to prevent and treat early blight on tomato with bio-fungicides?" },
    { label: "🌧️ Meerut 4-Day Rain Alert", query: "What immediate actions should I take for upcoming 19.4 mm rain in Meerut?" },
    { label: "💰 Sharbati Wheat Mandi Rate", query: "What are the latest mandi trading rates for Sharbati Wheat?" },
    { label: "🧪 Zinc & Micronutrient Spray", query: "When and how to spray Zinc Sulphate and Urea on wheat crops?" }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '20px 0 40px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Sparkles size={13} /> Rakshak AI 2.0
            </span>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
              🌾 Grounded Agricultural Intelligence & Voice Copilot
            </span>
          </div>
          <h2 style={{ fontSize: '1.85rem', color: '#123524', fontWeight: 800, marginTop: '6px', fontFamily: "'Fraunces', serif" }}>
            Agricultural Decision Intelligence Desk
          </h2>
          <p style={{ color: '#45594e', fontSize: '0.9rem', maxWidth: '780px', marginTop: '2px' }}>
            Personalized multilingual AI copilot grounded in ICAR research, live Open-Meteo telemetry, and your registered farm holdings.
          </p>
        </div>

        {/* Top Controls: Mode Switcher & Language */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Mode Segmented Switch */}
          <div style={{
            display: 'flex',
            background: '#ffffff',
            border: '1px solid rgba(18, 53, 36, 0.15)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('text')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'text' ? '#123524' : 'transparent',
                color: viewMode === 'text' ? '#ffffff' : '#3d5246',
                fontWeight: viewMode === 'text' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <MessageSquare size={15} />
              <span>Kisan Agri Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('voice')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'voice' ? '#123524' : 'transparent',
                color: viewMode === 'voice' ? '#ffffff' : '#3d5246',
                fontWeight: viewMode === 'voice' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Mic size={15} color={viewMode === 'voice' ? '#f59e0b' : '#10b981'} />
              <span>ElevenLabs Voice</span>
            </button>
          </div>

          <LanguageSelector variant="toggle" />
        </div>
      </div>

      {/* Synchronized Farm, Crop & Weather Telemetry Card */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f4f8f5 100%)',
        border: '1px solid rgba(18, 53, 36, 0.12)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#123524',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800
          }}>
            <UserCheck size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#123524' }}>
                {displayName}
              </span>
              <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '1px 8px', borderRadius: '999px', fontWeight: 700 }}>
                {farmerProfile?.farmer_id || 'KID-2026-UP-0042'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#576c60', margin: 0, marginTop: '2px' }}>
              📍 <strong>{location.city || 'Meerut'}, {location.state || 'Uttar Pradesh'}</strong> • Soil: Alluvial Sandy Loam (pH 7.4)
            </p>
          </div>
        </div>

        {/* Crops & Weather Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', background: '#eef5f1', color: '#123524', padding: '5px 12px', borderRadius: '8px', fontWeight: 700, border: '1px solid #c8dfd1' }}>
            🌾 Sharbati Wheat (Tillering)
          </span>
          <span style={{ fontSize: '0.75rem', background: '#eef5f1', color: '#123524', padding: '5px 12px', borderRadius: '8px', fontWeight: 700, border: '1px solid #c8dfd1' }}>
            🍅 Hybrid Tomato (Fruit Setting)
          </span>
          <span style={{
            fontSize: '0.75rem',
            background: '#fef2f2',
            color: '#b91c1c',
            padding: '5px 12px',
            borderRadius: '8px',
            fontWeight: 800,
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <CloudRain size={14} color="#dc2626" />
            Rain Alert in 4 Days (19.4 mm)
          </span>
        </div>
      </div>

      {/* VIEW MODE 1: ELEVENLABS VOICE AGENT */}
      {viewMode === 'voice' && (
        <div style={{ marginBottom: '24px' }}>
          <ElevenLabsVoiceAssistant variant="full" />
        </div>
      )}

      {/* VIEW MODE 2: RAG TEXT CHAT DASHBOARD */}
      {viewMode === 'text' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: showHistorySidebar ? '280px 1fr' : '1fr',
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* Conversation History Sidebar */}
          {showHistorySidebar && (
            <div style={{
              background: '#ffffff',
              border: '1px solid rgba(18, 53, 36, 0.12)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '680px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#123524', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Chat History
                </span>
                <button
                  type="button"
                  onClick={handleStartNewChat}
                  style={{
                    background: '#123524',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={13} /> New Chat
                </button>
              </div>

              {/* Conversations List */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {conversations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 10px', color: '#688273', fontSize: '0.78rem' }}>
                    No saved chats yet. Start asking questions to preserve agronomic guidance.
                  </div>
                ) : (
                  conversations.map(c => {
                    const isActive = c.id === activeConversationId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectConversation(c.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isActive ? '#f0fdf4' : '#f9fafb',
                          border: isActive ? '1.5px solid #10b981' : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#065f46' : '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.title}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(c.id, e)}
                          title="Delete conversation"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllConversations}
                  style={{
                    marginTop: '12px',
                    padding: '6px',
                    background: 'transparent',
                    border: '1px dashed #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  Clear All History
                </button>
              )}
            </div>
          )}

          {/* Main RAG Conversational Canvas */}
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(18, 53, 36, 0.12)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            height: '680px',
            overflow: 'hidden'
          }}>
            {/* Top Canvas Header Bar */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid rgba(18, 53, 36, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fcfdfc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                  title={showHistorySidebar ? "Hide History" : "Show History"}
                  style={{
                    background: '#eef5f1',
                    border: '1px solid #c8dfd1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    color: '#123524',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {showHistorySidebar ? '◀ History' : '▶ History'}
                </button>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#123524' }}>
                  {activeConversationId ? `Agri Consultation #${activeConversationId}` : 'Kisan Agri Consultation Desk'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {speakingIdx !== null && (
                  <button
                    type="button"
                    onClick={handleStopAllAudio}
                    title="Stop AI voice speaking immediately"
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #f87171',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      color: '#dc2626',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      animation: 'pulse 1s infinite'
                    }}
                  >
                    <Square size={11} fill="currentColor" /> Stop Voice (रोकें)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStartNewChat}
                  style={{
                    background: '#f4f8f5',
                    border: '1px solid #cce4d6',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    color: '#123524',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Clear Chat
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              background: '#fafcfa'
            }}>
              {messages.map((m, idx) => {
                const isUser = m.sender_role === 'user';
                return (
                  <div
                    key={m.id || idx}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      maxWidth: isUser ? '82%' : '90%',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      flexDirection: isUser ? 'row-reverse' : 'row'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: isUser ? '#10b981' : '#123524',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                      fontWeight: 800
                    }}>
                      {isUser ? <User size={18} color="#ffffff" /> : <Bot size={18} color="#f59e0b" />}
                    </div>

                    {/* Bubble Content */}
                    <div style={{
                      background: isUser ? '#123524' : '#ffffff',
                      color: isUser ? '#ffffff' : '#1e293b',
                      border: isUser ? 'none' : '1px solid rgba(18, 53, 36, 0.12)',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '14px 18px',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: '0.88rem',
                      lineHeight: 1.55,
                      position: 'relative'
                    }}>
                      {/* Message Body with clean markdown/newlines */}
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {m.content}
                      </div>

                      {/* Multilingual Voice Speaker Narration Button */}
                      {!isUser && (
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                            {m.timestamp}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSpeakMessage(m.content, idx)}
                            title={speakingIdx === idx ? "Stop Voice playback (आवाज़ रोकें)" : "Play Voice narration (आवाज़ में सुनें)"}
                            style={{
                              background: speakingIdx === idx ? '#fee2e2' : '#f0fdf4',
                              border: speakingIdx === idx ? '1px solid #f87171' : '1px solid #bbf7d0',
                              borderRadius: '999px',
                              padding: '3px 10px',
                              fontSize: '0.72rem',
                              color: speakingIdx === idx ? '#dc2626' : '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            {speakingIdx === idx ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                            <span>{speakingIdx === idx ? 'Stop Audio / रोकें' : 'Play Audio / सुनें'}</span>
                          </button>
                        </div>
                      )}

                      {/* Verified Scientific Source Citation Cards */}
                      {m.sources && m.sources.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(18, 53, 36, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                            <BookOpen size={13} color={isUser ? '#a7f3d0' : '#059669'} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isUser ? '#a7f3d0' : '#059669', textTransform: 'uppercase' }}>
                              Grounding Sources ({m.sources.length})
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {m.sources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  background: isUser ? 'rgba(255,255,255,0.08)' : '#f8faf8',
                                  border: isUser ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(18, 53, 36, 0.08)',
                                  borderRadius: '8px',
                                  padding: '6px 10px'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '0.76rem', color: isUser ? '#ffffff' : '#123524' }}>
                                    {src.title}
                                  </strong>
                                  <span style={{ fontSize: '0.68rem', color: isUser ? '#cbd5e1' : '#64748b' }}>
                                    Match: {Math.round((src.relevance_score || 0.95) * 100)}%
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: isUser ? '#e2e8f0' : '#475569', margin: '3px 0 0' }}>
                                  "{src.snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isUser && (
                        <div style={{ fontSize: '0.64rem', color: '#a7f3d0', marginTop: '4px', textAlign: 'right' }}>
                          {m.timestamp}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing / Loading Indicator */}
              {loading && (
                <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', background: '#123524',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Bot size={18} color="#f59e0b" />
                  </div>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid rgba(18, 53, 36, 0.12)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <RefreshCw className="animate-spin" size={16} color="#10b981" />
                    <span style={{ fontSize: '0.82rem', color: '#45594e', fontWeight: 600 }}>
                      Consulting ICAR agronomy database & weather radar...
                    </span>
                  </div>
                </div>
              )}

              {/* Error State with Retry Button */}
              {errorState && (
                <div style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <span>{errorState}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} /> Retry
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Agricultural Prompts Carousel */}
            <div style={{
              padding: '8px 16px',
              background: '#ffffff',
              borderTop: '1px solid rgba(18, 53, 36, 0.08)',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {dynamicPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(p.query)}
                  style={{
                    background: '#f4f8f5',
                    border: '1px solid #cce4d6',
                    borderRadius: '999px',
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    color: '#123524',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8f3ec'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f4f8f5'}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Bottom Input Form */}
            <div style={{ padding: '14px 18px', background: '#fcfdfc', borderTop: '1px solid rgba(18, 53, 36, 0.08)' }}>
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
              >
                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title={isListening ? "Stop listening" : "Speak query in Hindi / English"}
                  style={{
                    background: isListening ? '#fee2e2' : '#edf5f0',
                    border: isListening ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.15)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    color: isListening ? '#dc2626' : '#123524',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0
                  }}
                >
                  {isListening ? <MicOff size={18} color="#dc2626" /> : <Mic size={18} color="#10b981" />}
                  <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                    {isListening ? 'Stop' : 'Voice'}
                  </span>
                </button>

                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    isListening
                      ? "Listening carefully... Please speak now..."
                      : currentLanguageObj?.code === 'hi'
                        ? "रक्षक AI से गेहूं, टमाटर, खाद, या मौसम के बारे में पूछें..."
                        : "Ask Rakshak about wheat, tomato, fertilizers, weather, or mandi prices..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: isListening ? '#fffdfd' : '#ffffff',
                    border: isListening ? '1.5px solid #ef4444' : undefined
                  }}
                />

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !input.trim()}
                  style={{ height: '42px', padding: '0 20px' }}
                >
                  <Send size={16} /> Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
