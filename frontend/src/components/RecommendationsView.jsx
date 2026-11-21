import React, { useState } from 'react';
import { 
  CloudRain, AlertTriangle, ShieldCheck, Droplets, Wind, Sun, 
  MapPin, CheckCircle2, Calendar, Sparkles, ArrowRight, RefreshCw,
  TrendingUp, Thermometer, Info, ChevronRight, Layers, Sprout
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';

export default function RecommendationsView({ onNavigate }) {
  const { 
    location, 
    statesList, 
    selectedState, 
    citiesInSelectedState, 
    handleStateChange, 
    handleCityChange,
    detectLocation,
    detecting
  } = useLocation();

  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [activeTab, setActiveTab] = useState('overview');

  const farmerCrops = [
    { id: 'wheat', name: 'Sharbati Wheat', stage: 'Grain Filling (Stage 4)', sowingDate: 'Nov 15, 2025', area: '4.5 Acres', health: 'Optimal' },
    { id: 'tomato', name: 'Hybrid Tomato', stage: 'Fruit Setting / Maturation', sowingDate: 'Dec 05, 2025', area: '2.0 Acres', health: 'Requires Attention' },
    { id: 'mustard', name: 'Mustard (Sarson)', stage: 'Pod Formation', sowingDate: 'Oct 28, 2025', area: '1.5 Acres', health: 'Good' }
  ];

  const forecastDays = [
    { day: 'Today', date: '21 Nov', temp: '26°C / 14°C', rain: '0 mm', status: 'Clear & Sunny', icon: '☀️', safe: true },
    { day: 'Tomorrow', date: '22 Nov', temp: '25°C / 15°C', rain: '0.2 mm', status: 'Partly Cloudy', icon: '⛅', safe: true },
    { day: 'Day 3', date: '23 Nov', temp: '23°C / 16°C', rain: '2.5 mm', status: 'Overcast Skies', icon: '☁️', safe: true },
    { day: 'Day 4 (Warning)', date: '24 Nov', temp: '20°C / 13°C', rain: '19.4 mm', status: 'Moderate to Heavy Rain', icon: '🌧️', warning: true },
    { day: 'Day 5', date: '25 Nov', temp: '21°C / 12°C', rain: '8.2 mm', status: 'Scattered Showers', icon: '🌦️', warning: true },
    { day: 'Day 6', date: '26 Nov', temp: '24°C / 13°C', rain: '0.5 mm', status: 'Clearing Up', icon: '🌤️', safe: true },
    { day: 'Day 7', date: '27 Nov', temp: '25°C / 14°C', rain: '0 mm', status: 'Bright Sun', icon: '☀️', safe: true }
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '24px 0' }}>
      {/* Top Banner & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Smart Advisory Engine
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-Time Agro-Climatic Intelligence</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginTop: '6px', fontFamily: "'Fraunces', serif" }}>
            Crop & Weather Recommendations
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '780px' }}>
            Personalized protective alerts combining your registered crops, soil moisture, and live 7-day meteorological forecasts.
          </p>
        </div>

        {/* Location selector dropdowns pill */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '10px 16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} color="var(--forest-800)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Farm Location:</span>
          </div>

          <select
            className="form-select"
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '0.82rem', height: '34px', width: 'auto' }}
          >
            {statesList.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={location.city}
            onChange={(e) => handleCityChange(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '0.82rem', height: '34px', width: 'auto' }}
          >
            {citiesInSelectedState.map(c => (
              <option key={c.city} value={c.city}>{c.city}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn-secondary"
            onClick={detectLocation}
            disabled={detecting}
            style={{ padding: '4px 10px', fontSize: '0.78rem', height: '34px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={13} className={detecting ? 'animate-spin' : ''} />
            {detecting ? 'Locating...' : 'Auto GPS'}
          </button>
        </div>
      </div>

      {/* CRITICAL PROACTIVE RAIN ALERT (Meerut / Selected Location) */}
      <div style={{
        background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
        border: '1.5px solid #f87171',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: '0 8px 24px rgba(220, 38, 38, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-15px', right: '-15px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.06)', pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: '#dc2626', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)', flexShrink: 0
          }}>
            <CloudRain size={28} />
          </div>

          <div style={{ flex: '1 1 360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span style={{
                background: '#dc2626', color: '#ffffff',
                fontSize: '0.72rem', fontWeight: 800,
                padding: '2px 8px', borderRadius: '6px',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                Proactive Weather Alert
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b' }}>
                Impact Zone: {location.city}, {location.state}
              </span>
              <span style={{ fontSize: '0.78rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                Rainfall in 4 Days (24 Nov)
              </span>
            </div>

            <h3 style={{ fontSize: '1.35rem', color: '#7f1d1d', fontWeight: 800, margin: '4px 0 8px' }}>
              Upcoming Rainfall Warning (~19.4 mm) in 4 Days — Immediate Crop Protection Required
            </h3>
            <p style={{ color: '#991b1b', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '900px' }}>
              Weather satellites indicate a western disturbance triggering substantial precipitation (~19.4 mm) over <strong>{location.city}</strong> in four days. 
              Take proactive protective measures now for your standing crops to prevent waterlogging, nutrient leaching, and fungal spore outbreak.
            </p>

            {/* Actionable Protective Steps Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
              marginTop: '18px'
            }}>
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldCheck size={18} color="#dc2626" />
                  <strong style={{ fontSize: '0.88rem', color: '#163326' }}>Pause Fertilizer & Urea Spray</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#576c60', margin: 0, lineHeight: 1.45 }}>
                  Halt any planned broadcast of urea or top-dressing fertilizers. High rainfall will cause chemical run-off and root leaching.
                </p>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Droplets size={18} color="#dc2626" />
                  <strong style={{ fontSize: '0.88rem', color: '#163326' }}>Clear Drainage & Furrows</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#576c60', margin: 0, lineHeight: 1.45 }}>
                  Inspect plot drainage trenches immediately. Ensure field discharge gates are unblocked to prevent standing water in low-lying plots.
                </p>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Sprout size={18} color="#dc2626" />
                  <strong style={{ fontSize: '0.88rem', color: '#163326' }}>Tomato Trellising & Early Picking</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#576c60', margin: 0, lineHeight: 1.45 }}>
                  Support tomato plants with bamboo staking. Harvest all mature-green and pink-ripe tomatoes 24 hours prior to downpour.
                </p>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <AlertTriangle size={18} color="#dc2626" />
                  <strong style={{ fontSize: '0.88rem', color: '#163326' }}>Post-Rain Fungal Defense</strong>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#576c60', margin: 0, lineHeight: 1.45 }}>
                  High humidity (85%+) following rainfall creates yellow rust conditions in wheat. Keep prophylactic copper oxychloride ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Meteorological Outlook for Farmer's Location */}
      <div className="glass-card" style={{ padding: '22px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: "'Fraunces', serif" }}>
              7-Day Precipitation & Temperature Forecast ({location.city})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Open-Meteo calibrated weather telemetry showing the storm window peaking on Day 4.
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--forest-800)', fontWeight: 700, background: 'var(--forest-50)', padding: '4px 10px', borderRadius: '8px' }}>
            Updated: Just Now
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px'
        }}>
          {forecastDays.map((item, idx) => (
            <div 
              key={idx} 
              style={{
                background: item.warning ? '#fef2f2' : '#f9fafb',
                border: item.warning ? '1.5px solid #f87171' : '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '14px 10px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {item.warning && (
                <span style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: '#dc2626', width: '8px', height: '8px', borderRadius: '50%'
                }} />
              )}
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: item.warning ? '#991b1b' : 'var(--text-primary)' }}>
                {item.day}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {item.date}
              </div>
              <div style={{ fontSize: '1.8rem', margin: '4px 0' }}>
                {item.icon}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {item.temp}
              </div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                marginTop: '4px',
                color: item.warning ? '#dc2626' : 'var(--forest-800)'
              }}>
                Rain: {item.rain}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crop-Specific Action Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '22px', marginBottom: '28px' }}>
        {/* Wheat Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🌾
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>Sharbati Wheat</h4>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Grain Filling Stage • 4.5 Acres</span>
              </div>
            </div>
            <span className="badge badge-emerald">Active Plot</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
            <div style={{ background: '#f8faf9', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--forest-800)' }}>
              <strong>Irrigation Window:</strong> Turn off borewell pump. The 19.4 mm rainfall on Day 4 fulfills 100% of moisture needs for the next 9 days.
            </div>
            <div style={{ background: '#f8faf9', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
              <strong>Lodging Prevention:</strong> Do not irrigate before windy rainstorms to prevent stem breakage (lodging).
            </div>
            <div style={{ background: '#f8faf9', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              <strong>Post-Rain Spray:</strong> Apply Propiconazole 25% EC (1ml/L) on Day 6 if yellow rust pustules are noticed on lower leaves.
            </div>
          </div>
        </div>

        {/* Tomato Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🍅
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>Hybrid Tomato</h4>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Fruiting Stage • 2.0 Acres</span>
              </div>
            </div>
            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px' }}>
              High Vulnerability
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
            <div style={{ background: '#f8faf9', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #dc2626' }}>
              <strong>Fruit Cracking Risk:</strong> Sudden surge in soil moisture after dry period causes fruit split. Ensure raised beds have ditch pathways.
            </div>
            <div style={{ background: '#f8faf9', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
              <strong>Blight Prevention:</strong> Spray copper hydroxide prior to Day 3 evening to build an organic shield against early and late blight.
            </div>
            <div style={{ background: '#f8faf9', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              <strong>Immediate Harvest:</strong> Pick ready crates today and list on Agriwise Marketplace for wholesale buyers before rains disrupt roads.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Call to Actions */}
      <div style={{
        background: 'linear-gradient(135deg, #123524 0%, #1e4a34 100%)',
        borderRadius: '20px',
        padding: '24px 30px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h4 style={{ fontSize: '1.25rem', fontFamily: "'Fraunces', serif", margin: '0 0 6px', color: '#ffffff' }}>
            List Harvest Batches Before Rains
          </h4>
          <p style={{ fontSize: '0.84rem', color: '#d1fae5', margin: 0, maxWidth: '580px' }}>
            Protect your revenue. Move mature produce into verified buyer contracts before downpours affect Mandi logistics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate('create-product')}
            style={{ background: '#10b981', color: '#ffffff', border: 'none' }}
          >
            Create a Product Listing <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('weather')}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            View Weather Radar
          </button>
        </div>
      </div>
    </div>
  );
}
