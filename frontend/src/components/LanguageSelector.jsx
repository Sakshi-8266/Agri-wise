import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Languages, Check, X } from 'lucide-react';

export default function LanguageSelector({ 
  variant = 'dropdown', // 'toggle' | 'dropdown' | 'modal' | 'compact'
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onSelected
}) {
  const { currentLang, currentLanguageObj, setLanguage, languages, t } = useLanguage();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsModalOpen = externalOnClose 
    ? (val) => { if (!val) externalOnClose(); } 
    : setInternalIsOpen;

  const handleSelect = (code) => {
    setLanguage(code);
    setIsModalOpen(false);
    if (externalOnClose) externalOnClose();
    if (onSelected) onSelected(code);
  };

  // 1. FAST 1-CLICK TOGGLE PILL (For Navbars, Topbars, and Headers)
  if (variant === 'toggle' || variant === 'dropdown' || variant === 'compact') {
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#eef4f0',
          border: '1px solid rgba(18, 53, 36, 0.14)',
          borderRadius: '999px',
          padding: '3px 4px',
          gap: '2px',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
          userSelect: 'none'
        }}
        title="Toggle English / हिन्दी"
      >
        <span style={{ 
          fontSize: '0.82rem', 
          padding: '0 4px 0 6px', 
          display: 'flex', 
          alignItems: 'center',
          color: '#556d5f' 
        }}>
          <Languages size={13} style={{ marginRight: '3px' }} />
        </span>

        <button
          type="button"
          onClick={() => handleSelect('en')}
          style={{
            background: currentLang === 'en' ? '#123524' : 'transparent',
            color: currentLang === 'en' ? '#ffffff' : '#33493c',
            border: 'none',
            borderRadius: '999px',
            padding: '3px 9px',
            fontSize: '0.74rem',
            fontWeight: currentLang === 'en' ? 800 : 600,
            cursor: 'pointer',
            transition: 'all 0.16s ease',
            boxShadow: currentLang === 'en' ? '0 1px 4px rgba(18, 53, 36, 0.25)' : 'none'
          }}
        >
          English
        </button>

        <button
          type="button"
          onClick={() => handleSelect('hi')}
          style={{
            background: currentLang === 'hi' ? '#123524' : 'transparent',
            color: currentLang === 'hi' ? '#ffffff' : '#33493c',
            border: 'none',
            borderRadius: '999px',
            padding: '3px 9px',
            fontSize: '0.74rem',
            fontWeight: currentLang === 'hi' ? 800 : 600,
            cursor: 'pointer',
            transition: 'all 0.16s ease',
            boxShadow: currentLang === 'hi' ? '0 1px 4px rgba(18, 53, 36, 0.25)' : 'none'
          }}
        >
          हिन्दी
        </button>
      </div>
    );
  }

  // 2. MODAL VARIANT (Clean 2-Choice English & Hindi Selector)
  if (variant === 'modal') {
    if (!isModalOpen) return null;

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 33, 25, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={() => {
          setIsModalOpen(false);
          if (externalOnClose) externalOnClose();
        }}
      >
        <div 
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '440px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 24px 60px rgba(16, 36, 27, 0.28)',
            border: '1px solid rgba(27, 56, 43, 0.12)',
            padding: '24px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Modal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>🇮🇳</span>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#163326', margin: 0 }}>
                  {t('common.selectLanguage', 'Select Language')}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#687e71' }}>
                  English & हिन्दी Localization
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                if (externalOnClose) externalOnClose();
              }}
              style={{
                background: '#f2f5f3',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#556d5f'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* 2 Language Options: English & Hindi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {languages.map(lang => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid #10b981' : '1px solid rgba(18, 53, 36, 0.12)',
                    background: isSelected ? '#f0fdf4' : '#fafcfb',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f2f8f4';
                      e.currentTarget.style.borderColor = '#10b981';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#fafcfb';
                      e.currentTarget.style.borderColor = 'rgba(18, 53, 36, 0.12)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: isSelected ? '#123524' : '#e8f0ec',
                      color: isSelected ? '#f59e0b' : '#123524',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.92rem',
                      fontWeight: 800
                    }}>
                      {lang.short}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#123524' }}>
                        {lang.nativeName} {lang.nativeName !== lang.name && `(${lang.name})`}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#687e71', marginTop: '2px' }}>
                        {lang.region}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#10b981',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
