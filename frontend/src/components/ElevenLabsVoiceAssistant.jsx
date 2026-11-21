import React, { useState, useEffect, useRef } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { 
  Mic, MicOff, PhoneOff, Volume2, VolumeX, Sparkles, 
  MessageSquare, Send, CheckCircle2, AlertCircle, RefreshCw,
  Settings, Radio, Bot, User, CloudSun, Leaf, ShieldCheck, ChevronRight,
  Play, Square, Pause
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { useLocation } from '../context/LocationContext';
import CustomAgriLogo from './CustomAgriLogo';

function ElevenLabsVoiceAssistantInner({
  variant = 'compact', // 'compact' (for popup/FAB widget) or 'full' (for main view)
  onClose,
  initialLanguage = 'hi'
}) {
  const { t, currentLanguageObj } = useLanguage();
  const { location } = useLocation();

  // Voice Assistant Connection State
  const [elevenConfig, setElevenConfig] = useState(null);
  const [farmerContext, setFarmerContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [customAgentId, setCustomAgentId] = useState('');
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(
    currentLanguageObj?.code === 'hi' ? 'hi' : 'en'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [localVoiceActive, setLocalVoiceActive] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [liveSpeechText, setLiveSpeechText] = useState('');
  const [lastAiResponseText, setLastAiResponseText] = useState('');

  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const currentAudioRef = useRef(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load ElevenLabs configuration & live farmer context on mount
  useEffect(() => {
    loadConfigAndContext();
  }, [location.city]);

  const loadConfigAndContext = async () => {
    try {
      const [cfg, ctx] = await Promise.all([
        api.getElevenLabsConfig().catch(() => ({ has_api_key: false, has_agent_id: false })),
        api.getElevenLabsFarmerContext(
          location.city ? `${location.city}, ${location.state}` : 'Meerut, Uttar Pradesh',
          location.latitude,
          location.longitude
        ).catch(() => null)
      ]);

      setElevenConfig(cfg);
      setFarmerContext(ctx);
      if (cfg?.agent_id) {
        setCustomAgentId(cfg.agent_id);
      }

      // Add welcoming introductory greeting in farmer's preferred language
      const farmerName = ctx?.farmer_name || 'Ramesh Patel';
      const isHindi = selectedLanguage === 'hi';
      const greetingMsg = isHindi
        ? `नमस्ते ${farmerName} जी! मैं आपका रक्षक AI कृषि वॉयस विशेषज्ञ हूँ। आप मुझसे अपनी गेहूं और टमाटर की फसल, खाद, कीट नियंत्रण या मेरठ में आने वाली 4-दिन की बारिश के बारे में हिंदी में कुछ भी पूछ सकते हैं।`
        : `Hello ${farmerName}! I am your Rakshak AI Agricultural Voice Assistant. Feel free to speak with me in Hindi or English about your standing crops, weather protection, or mandi prices.`;

      setMessages([
        {
          id: 'welcome-1',
          sender: 'agent',
          text: greetingMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.warn('Error loading voice assistant config:', err);
    }
  };

  // ElevenLabs Official React SDK useConversation hook
  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      setConnectionError(null);
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `🟢 Live ElevenLabs Voice Agent connected (${selectedLanguage === 'hi' ? 'हिंदी' : 'English'}). Speak into your microphone!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    },
    onDisconnect: () => {
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: 'Call disconnected. Tap the microphone anytime to start speaking again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    },
    onMessage: (messageEvent) => {
      if (!messageEvent) return;
      const text = messageEvent.message || messageEvent.text;
      const source = messageEvent.source || (messageEvent.role === 'user' ? 'user' : 'agent');
      if (text && text.trim()) {
        if (source !== 'user') {
          setLastAiResponseText(text.trim());
        }
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}-${Math.random()}`,
            sender: source === 'user' ? 'user' : 'agent',
            text: text.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    },
    onError: (err) => {
      console.error('ElevenLabs conversation error:', err);
      const errText = typeof err === 'string' ? err : (err?.message || 'Connection error with ElevenLabs');
      setConnectionError(errText);
    }
  });

  const { status, isSpeaking } = conversation;
  const isConnected = status === 'connected' || localVoiceActive;
  const isConnecting = status === 'connecting';
  const isSpeakingEffective = isSpeaking || isSpeakingLocal;

  // Start ElevenLabs Conversational Voice Session or Native Multilingual Voice Engine
  const handleStartCall = async () => {
    setConnectionError(null);

    // Check microphone permission first
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (micErr) {
      setConnectionError('Microphone permission denied. Please allow microphone access in your browser settings.');
      return;
    }

    try {
      // 1. First attempt: fetch signed URL securely from backend
      const signedUrlRes = await api.getElevenLabsSignedUrl(customAgentId || undefined).catch(() => null);

      if (signedUrlRes && signedUrlRes.success && signedUrlRes.signed_url) {
        try {
          await conversation.startSession({
            signedUrl: signedUrlRes.signed_url,
            dynamicVariables: farmerContext?.dynamic_variables || {
              farmer_name: farmerContext?.farmer_name || 'Ramesh Patel',
              location: location.city || 'Meerut, Uttar Pradesh'
            }
          });
          return;
        } catch (webrtcErr) {
          console.warn('ElevenLabs signed WebSocket connection failed, starting interactive voice mode:', webrtcErr);
        }
      }

      // 2. Second attempt: direct Agent ID if configured and not placeholder
      const activeAgentId = customAgentId || elevenConfig?.agent_id;
      if (activeAgentId && activeAgentId.trim() && !activeAgentId.startsWith('agent_agriwise')) {
        try {
          await conversation.startSession({
            agentId: activeAgentId.trim(),
            dynamicVariables: farmerContext?.dynamic_variables || {
              farmer_name: farmerContext?.farmer_name || 'Ramesh Patel',
              location: location.city || 'Meerut, Uttar Pradesh'
            }
          });
          return;
        } catch (e) {
          console.warn('ElevenLabs agentId direct connect failed, starting interactive voice mode:', e);
        }
      }

      // 3. Start Seamless Multilingual Interactive Voice Session (Continuous Voice + AI + Speech)
      startLocalVoiceSession();
    } catch (err) {
      console.warn('Starting interactive voice session fallback:', err);
      startLocalVoiceSession();
    }
  };

  // Continuous speech recognition session in Hindi / English with Live Feedback
  const startLocalVoiceSession = () => {
    setConnectionError(null);
    setLocalVoiceActive(true);
    setLiveSpeechText('');
    sessionActiveRef.current = true;
    isSpeakingRef.current = false;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: selectedLanguage === 'hi'
            ? '🟢 वॉइस मोड सक्रिय। आप नीचे त्वरित प्रश्न चुन सकते हैं या बोल/लिख सकते हैं।'
            : '🟢 Voice mode active. You can speak or use quick prompt chips below.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }

      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-IN';

      let accumulated = '';

      rec.onstart = () => {
        setMessages(prev => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: selectedLanguage === 'hi'
              ? '🟢 रक्षक AI लाइव वॉइस कनेक्टेड। बोलिए, मैं ध्यानपूर्वक सुन रहा हूँ!'
              : '🟢 Rakshak AI Voice Connected. Speak into your microphone!',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      };

      rec.onresult = (event) => {
        // Discard any incoming speech if AI assistant is currently speaking aloud
        if (isSpeakingRef.current) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        const currentLive = (final || interim).trim();
        if (currentLive) {
          setLiveSpeechText(currentLive);
        }

        if (final && final.trim()) {
          accumulated = (accumulated + ' ' + final.trim()).trim();
        }

        // Debounce silence detection (1.3 seconds of silence automatically submits question)
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(() => {
          const textToSubmit = (accumulated || currentLive).trim();
          if (textToSubmit && textToSubmit.length >= 2 && !isSpeakingRef.current) {
            setLiveSpeechText('');
            accumulated = '';
            handleSendTextMessage(textToSubmit);
          }
        }, 1300);
      };

      rec.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition event:', event.error);
        }
      };

      rec.onend = () => {
        if (sessionActiveRef.current && recognitionRef.current && !isSpeakingRef.current) {
          try { rec.start(); } catch {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.warn('Could not start speech recognition:', e);
    }
  };

  // End voice call session cleanly
  const handleEndCall = async () => {
    sessionActiveRef.current = false;
    isSpeakingRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setLiveSpeechText('');

    try {
      if (conversation.status === 'connected') {
        await conversation.endSession();
      }
    } catch (err) {
      console.warn('Error ending session:', err);
    }

    if (recognitionRef.current) {
      try {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        r.stop();
        r.abort();
      } catch {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setLocalVoiceActive(false);
    setIsSpeakingLocal(false);

    setMessages(prev => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: selectedLanguage === 'hi' 
          ? 'कॉल समाप्त हो गई। फिर से बात करने के लिए माइक्रोफ़ोन पर क्लिक करें।' 
          : 'Call disconnected. Tap the microphone anytime to start speaking again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Fallback text/voice query when ElevenLabs live agent is being configured
  const handleSendTextMessage = async (queryText = textInput) => {
    const q = (queryText || '').trim();
    if (!q) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setTextInput('');
    setFallbackLoading(true);

    try {
      // Call Agriwise RAG assistant with farmer context
      const res = await api.chatAssistant(q);
      const replyText = res?.response || res?.reply || 'I have checked your farm records. Let me know if you need more details.';

      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        sources: res?.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
      setLastAiResponseText(replyText);

      // Play voice reply: either via ElevenLabs TTS or Browser Native Speech
      let audioPlayed = false;
      if (elevenConfig?.has_api_key && !elevenConfig?.agent_id?.startsWith('agent_agriwise')) {
        try {
          const ttsRes = await api.synthesizeElevenLabsSpeech(replyText.substring(0, 300));
          if (ttsRes?.audio_base64 && !isMuted) {
            const audio = new Audio(ttsRes.audio_base64);
            currentAudioRef.current = audio;
            isSpeakingRef.current = true;
            setIsSpeakingLocal(true);
            audio.onended = () => {
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              setIsSpeakingLocal(false);
              if (sessionActiveRef.current && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch {}
              }
            };
            audio.onerror = () => {
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              setIsSpeakingLocal(false);
            };
            await audio.play();
            audioPlayed = true;
          }
        } catch {
          audioPlayed = false;
        }
      }

      if (!audioPlayed) {
        speakWithBrowser(replyText);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'system',
          text: 'Error processing question. Please check backend connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setFallbackLoading(false);
    }
  };

  // Dedicated instant stop for AI voice narration
  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    isSpeakingRef.current = false;
    setIsSpeakingLocal(false);

    if (sessionActiveRef.current && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch {}
    }
  };

  // Dedicated play / replay for AI voice advice
  const handlePlaySpeaking = (text) => {
    handleStopSpeaking();
    const t = text || lastAiResponseText;
    if (t) {
      speakWithBrowser(t);
    }
  };

  // Browser speech synthesis fallback with active state management
  const speakWithBrowser = (text) => {
    if (!('speechSynthesis' in window) || isMuted) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeakingLocal(true);
    };
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeakingLocal(false);
      if (sessionActiveRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setIsSpeakingLocal(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  // Preset quick questions tailored to Meerut & Standing Crops
  const QUICK_QUESTIONS = [
    { label: '🌧️ 4-Day Rain Alert & Crop Protection', q: selectedLanguage === 'hi' ? 'मेरठ में 4 दिन बाद बारिश आने वाली है, मेरी गेहूं और टमाटर की फसल को कैसे बचाएं?' : 'Rain is forecast in Meerut in 4 days. How should I protect my wheat and tomato crops?' },
    { label: '🌾 Wheat Nutrient & Fungus Care', q: selectedLanguage === 'hi' ? 'शरबती गेहूं में बालियां निकलने से पहले कौन सा जैविक स्प्रे करना चाहिए?' : 'What organic foliar spray is best for Sharbati Wheat before earhead emergence?' },
    { label: '🍅 Tomato Blight Management', q: selectedLanguage === 'hi' ? 'टमाटर की पत्तियों पर भूरे धब्बे दिखाई दे रहे हैं, इसका क्या उपचार है?' : 'Brown spots are visible on tomato leaves. What is the organic remedy for early blight?' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: variant === 'full' ? '780px' : '620px',
      background: '#ffffff',
      borderRadius: variant === 'full' ? '20px' : '16px',
      overflow: 'hidden',
      border: '1px solid rgba(18, 53, 36, 0.12)',
      boxShadow: 'var(--shadow-lg)',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    }}>
      {/* 1. Header Bar with ElevenLabs Badge & Controls */}
      <div style={{
        background: 'linear-gradient(135deg, #123524 0%, #1c4d36 100%)',
        color: '#ffffff',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.16)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Rakshak AI Voice Assistant
              </h3>
              <span style={{
                background: '#f59e0b',
                color: '#123524',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                ElevenLabs
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#b9dcc8', margin: '2px 0 0' }}>
              Natural Multilingual Speech • Hindi (हिंदी) & English
            </p>
          </div>
        </div>

        {/* Right header controls: Language toggle, settings, close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Language Selector Pill */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '999px',
            padding: '2px 3px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <button
              type="button"
              onClick={() => setSelectedLanguage('hi')}
              style={{
                background: selectedLanguage === 'hi' ? '#f59e0b' : 'transparent',
                color: selectedLanguage === 'hi' ? '#123524' : '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: selectedLanguage === 'hi' ? 800 : 500,
                cursor: 'pointer'
              }}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('en')}
              style={{
                background: selectedLanguage === 'en' ? '#f59e0b' : 'transparent',
                color: selectedLanguage === 'en' ? '#123524' : '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: selectedLanguage === 'en' ? 800 : 500,
                cursor: 'pointer'
              }}
            >
              EN
            </button>
          </div>

          {/* Config Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            title="Configure ElevenLabs Agent ID"
            style={{
              background: showConfigDrawer ? '#f59e0b' : 'rgba(255, 255, 255, 0.12)',
              color: showConfigDrawer ? '#123524' : '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Settings size={16} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Farmer Telemetry & Weather Context Ribbon */}
      <div style={{
        background: '#f4f8f5',
        borderBottom: '1px solid rgba(18, 53, 36, 0.08)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.74rem',
        color: '#2a4436',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📍 <strong>{farmerContext?.location || 'Meerut, Uttar Pradesh'}</strong></span>
          <span style={{ color: '#889e91' }}>•</span>
          <span>🌱 <strong>Sharbati Wheat & Tomato</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 700 }}>
          <span>🌧️ 4-Day Rain Alert Synced (~19.4 mm)</span>
        </div>
      </div>

      {/* 3. ElevenLabs Agent Settings Drawer (Collapsible) */}
      {showConfigDrawer && (
        <div style={{
          background: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '12px 18px',
          fontSize: '0.78rem',
          color: '#92400e',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 800 }}>⚡ ElevenLabs Voice Agent:</span>
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} color="#059669" />
              Backend .env Active
            </span>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: '0.74rem', color: '#78350f' }}>
            Loaded from <code>backend/.env</code>. To connect your personal live ElevenLabs Agent, enter your Agent ID below:
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. agent_7101k5zvyjhmfg983brhmhkd98n6"
              value={customAgentId}
              onChange={(e) => setCustomAgentId(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                background: '#ffffff',
                fontSize: '0.76rem',
                fontFamily: 'monospace'
              }}
            />
            <button
              type="button"
              onClick={() => {
                setShowConfigDrawer(false);
                handleStartCall();
              }}
              style={{
                background: '#123524',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Save & Connect
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Voice Call Visualizer & Microphone Center */}
      <div style={{
        background: isConnected 
          ? 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)' 
          : 'linear-gradient(180deg, #f8faf8 0%, #ffffff 100%)',
        padding: '18px 20px',
        borderBottom: '1px solid rgba(18, 53, 36, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}>
        {/* Animated Sound Wave Equalizer (Compact & Responsive) */}
        <div style={{
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3.5px',
          marginBottom: '10px',
          width: '100%',
          maxWidth: '240px'
        }}>
          {[...Array(14)].map((_, i) => {
            const isWaveActive = isConnected && (isSpeakingEffective || Boolean(liveSpeechText) || !isMuted);
            // Compact heights for balanced durable UI
            const heights = [8, 14, 22, 12, 18, 26, 16, 22, 14, 24, 16, 20, 10, 8];
            const baseH = heights[i % heights.length];
            const activeH = (isSpeakingEffective || Boolean(liveSpeechText))
              ? baseH 
              : (isConnected ? Math.max(6, baseH * 0.45) : 5);

            return (
              <div
                key={i}
                style={{
                  width: '3.5px',
                  height: `${activeH}px`,
                  borderRadius: '999px',
                  background: isSpeakingEffective 
                    ? 'linear-gradient(180deg, #f59e0b 0%, #ef4444 100%)' 
                    : Boolean(liveSpeechText)
                      ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                      : isConnected 
                        ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' 
                        : '#cbd5e1',
                  transition: 'height 0.12s ease',
                  animation: (isSpeakingEffective || Boolean(liveSpeechText))
                    ? `pulseWave ${0.5 + (i % 5) * 0.1}s infinite ease-in-out alternate` 
                    : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Live Speech Subtitle Chip (Farmer speaking feedback) */}
        {isConnected && liveSpeechText && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '999px',
            padding: '3px 12px',
            marginBottom: '8px',
            fontSize: '0.74rem',
            color: '#1d4ed8',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            maxWidth: '90%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: 'ping 1s infinite' }} />
            <span>"{liveSpeechText}"</span>
          </div>
        )}

        {/* Center Control Dock: Play AI Button - Microphone Call Toggle - Stop AI Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', position: 'relative' }}>
          {/* Play / Listen Button */}
          <button
            type="button"
            onClick={() => handlePlaySpeaking()}
            disabled={!lastAiResponseText || isSpeakingEffective}
            title={selectedLanguage === 'hi' ? "AI की सलाह फिर से सुनें (Play Voice)" : "Play AI Voice Response"}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: !lastAiResponseText || isSpeakingEffective ? '#e2e8f0' : '#10b981',
              color: '#ffffff',
              border: '2px solid #ffffff',
              boxShadow: !lastAiResponseText || isSpeakingEffective ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
              cursor: !lastAiResponseText || isSpeakingEffective ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <Play size={18} fill="currentColor" />
          </button>

          {/* Main Microphone Button with Glowing Halo */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Animated Ripples when Connected or Speaking */}
            {isConnected && (
              <div style={{
                position: 'absolute',
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: isSpeakingEffective 
                  ? 'rgba(245, 158, 11, 0.22)' 
                  : Boolean(liveSpeechText)
                    ? 'rgba(59, 130, 246, 0.22)'
                    : 'rgba(16, 185, 129, 0.18)',
                animation: 'ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
                pointerEvents: 'none'
              }} />
            )}

            <button
              type="button"
              onClick={isConnected ? handleEndCall : handleStartCall}
              disabled={isConnecting}
              title={isConnected ? "End Voice Call" : "Start Voice Call (Hindi & English)"}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: isConnected 
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: '3px solid #ffffff',
                boxShadow: isConnected 
                  ? '0 6px 18px rgba(239, 68, 68, 0.35)' 
                  : '0 6px 18px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isConnecting ? 'wait' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                zIndex: 2
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isConnecting ? (
                <RefreshCw size={20} color="#ffffff" className="animate-spin" />
              ) : isConnected ? (
                <PhoneOff size={20} color="#ffffff" />
              ) : (
                <Mic size={22} color="#ffffff" />
              )}
            </button>
          </div>

          {/* Stop AI Speaking Button */}
          <button
            type="button"
            onClick={handleStopSpeaking}
            disabled={!isSpeakingEffective}
            title={selectedLanguage === 'hi' ? "AI की आवाज़ तुरंत रोकें (Stop AI Speaking)" : "Stop AI Speaking Immediately"}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isSpeakingEffective ? '#ef4444' : '#e2e8f0',
              color: '#ffffff',
              border: '2px solid #ffffff',
              boxShadow: isSpeakingEffective ? '0 4px 14px rgba(239, 68, 68, 0.45)' : 'none',
              cursor: isSpeakingEffective ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              animation: isSpeakingEffective ? 'pulse 1s infinite' : 'none'
            }}
          >
            <Square size={17} fill="currentColor" />
          </button>
        </div>

        {/* Live Status Indicators */}
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          {isConnecting ? (
            <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
              ⏳ Connecting to Rakshak Voice Agent...
            </span>
          ) : isConnected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{
                fontSize: '0.82rem',
                color: isSpeakingEffective ? '#b45309' : Boolean(liveSpeechText) ? '#1d4ed8' : '#059669',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isSpeakingEffective ? '#f59e0b' : Boolean(liveSpeechText) ? '#3b82f6' : '#10b981',
                  boxShadow: `0 0 8px ${isSpeakingEffective ? '#f59e0b' : Boolean(liveSpeechText) ? '#3b82f6' : '#10b981'}`
                }} />
                {isSpeakingEffective 
                  ? '🗣️ Rakshak AI is speaking...' 
                  : Boolean(liveSpeechText)
                    ? '🔴 Listening carefully (सुन रहा हूँ)...'
                    : selectedLanguage === 'hi'
                      ? '🎙️ ध्यान से सुन रहा हूँ... हिंदी या अंग्रेजी में बोलें'
                      : '🎙️ Listening carefully... Speak in Hindi or English'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#576c60' }}>
                Tap red button to end call • Auto-processes on pause
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '0.84rem', color: '#123524', fontWeight: 800 }}>
                {selectedLanguage === 'hi' ? 'रक्षक AI से बात करने के लिए माइक दबाएं' : 'Tap to Start Speaking with Rakshak AI'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#576c60' }}>
                Natural speech in Hindi & English • Continuous farming advice
              </span>
            </div>
          )}
        </div>

        {/* Connection Error Banner if any */}
        {connectionError && (
          <div style={{
            marginTop: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.74rem',
            maxWidth: '92%',
            textAlign: 'center'
          }}>
            {connectionError}
          </div>
        )}
      </div>

      {/* 5. Chat Transcript Feed (Continuous Multilingual Conversation) */}
      <div 
        ref={chatScrollRef}
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 16px',
          background: '#fafcfa',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {messages.map((m) => {
          if (m.sender === 'system') {
            return (
              <div key={m.id} style={{
                textAlign: 'center',
                fontSize: '0.7rem',
                color: '#657c70',
                background: '#eef5f1',
                padding: '4px 10px',
                borderRadius: '999px',
                alignSelf: 'center',
                maxWidth: '90%'
              }}>
                {m.text}
              </div>
            );
          }

          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '8px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {!isUser && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#123524',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Bot size={16} color="#f59e0b" />
                </div>
              )}

              <div style={{
                background: isUser ? '#123524' : '#ffffff',
                color: isUser ? '#ffffff' : '#1e293b',
                padding: '10px 14px',
                borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                border: isUser ? 'none' : '1px solid rgba(18, 53, 36, 0.1)',
                boxShadow: 'var(--shadow-sm)',
                fontSize: '0.84rem',
                lineHeight: 1.45,
                position: 'relative'
              }}>
                <div>{m.text}</div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '6px',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '0.64rem',
                    color: isUser ? '#b9dcc8' : '#94a3b8'
                  }}>
                    {m.timestamp}
                  </span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => isSpeakingEffective ? handleStopSpeaking() : handlePlaySpeaking(m.text)}
                      title={isSpeakingEffective ? "Stop AI Voice" : "Play Advice in Voice"}
                      style={{
                        background: isSpeakingEffective ? '#fee2e2' : '#f0fdf4',
                        border: isSpeakingEffective ? '1px solid #f87171' : '1px solid #86efac',
                        color: isSpeakingEffective ? '#dc2626' : '#15803d',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {isSpeakingEffective ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                      <span>{isSpeakingEffective ? (selectedLanguage === 'hi' ? 'रोकें' : 'Stop') : (selectedLanguage === 'hi' ? 'सुनें' : 'Play')}</span>
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#123524',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                  fontWeight: 800,
                  fontSize: '0.76rem'
                }}>
                  👨‍🌾
                </div>
              )}
            </div>
          );
        })}

        {fallbackLoading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#123524', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="#f59e0b" />
            </div>
            <div style={{ background: '#ffffff', padding: '8px 14px', borderRadius: '12px', border: '1px solid #c8dfd1', fontSize: '0.8rem', color: '#576c60' }}>
              Thinking and synthesizing voice response...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 6. Quick Prompts Suggestion Chips */}
      <div style={{
        padding: '6px 12px',
        background: '#ffffff',
        borderTop: '1px solid rgba(18, 53, 36, 0.06)',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}>
        {QUICK_QUESTIONS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendTextMessage(item.q)}
            style={{
              background: '#f4f8f5',
              border: '1px solid #cce4d6',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              color: '#123524',
              cursor: 'pointer',
              fontWeight: 600,
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e8f3ec'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f4f8f5'}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 7. Bottom Text Input Fallback (Allows typing or asking follow-ups) */}
      <div style={{
        padding: '10px 14px',
        background: '#ffffff',
        borderTop: '1px solid rgba(18, 53, 36, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        <input
          type="text"
          placeholder={
            selectedLanguage === 'hi' 
              ? 'यहाँ पूछें या ऊपर माइक दबाकर बोलें...' 
              : 'Ask a question or tap microphone above to speak...'
          }
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendTextMessage()}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(18, 53, 36, 0.18)',
            fontSize: '0.84rem',
            outline: 'none',
            color: '#123524',
            background: '#fbfdfb'
          }}
        />

        <button
          type="button"
          onClick={() => handleSendTextMessage()}
          disabled={!textInput.trim() || fallbackLoading}
          style={{
            background: '#123524',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '9px 14px',
            cursor: !textInput.trim() ? 'not-allowed' : 'pointer',
            opacity: !textInput.trim() ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={16} />
        </button>
      </div>

      {/* CSS Animation Keyframes for Sound Waves & Glow */}
      <style>{`
        @keyframes pulseWave {
          0% { transform: scaleY(0.4); opacity: 0.6; }
          100% { transform: scaleY(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/**
 * Standard Export wrapped in ElevenLabs ConversationProvider
 * Ensures official SDK context hooks are available anywhere in the app
 */
export default function ElevenLabsVoiceAssistant(props) {
  return (
    <ConversationProvider>
      <ElevenLabsVoiceAssistantInner {...props} />
    </ConversationProvider>
  );
}

