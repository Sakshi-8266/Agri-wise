import React, { useState, useEffect } from 'react';
import { 
  CloudSun, Wind, Droplets, Thermometer, ShieldAlert, 
  AlertTriangle, CheckCircle, RefreshCw, MapPin
} from 'lucide-react';
import { api } from '../api';

export default function WeatherCenterView() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('Anand, Gujarat');

  const LOCATIONS = [
    { name: 'Anand, Gujarat', lat: 22.5645, lon: 72.9289 },
    { name: 'Nashik, Maharashtra', lat: 19.9975, lon: 73.7898 },
    { name: 'Ludhiana, Punjab', lat: 30.9010, lon: 75.8573 },
    { name: 'Guntur, Andhra Pradesh', lat: 16.3067, lon: 80.4365 }
  ];

  useEffect(() => {
    loadWeatherData();
  }, [selectedLocation]);

  const loadWeatherData = async () => {
    setLoading(true);
    const loc = LOCATIONS.find(l => l.name === selectedLocation) || LOCATIONS[0];
    try {
      const data = await api.getWeather(loc.lat, loc.lon, loc.name);
      setWeather(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px 0' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-sky">Weather Intelligence</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginTop: '6px', fontFamily: "'Fraunces', serif" }}>Agricultural Meteorological Intelligence</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Hyper-localized weather forecasts with agronomic decision rules for spray timings, frost mitigation, and evapotranspiration irrigation control.
          </p>
        </div>

        {/* Location selector */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <MapPin size={18} color="var(--forest-800)" />
          <select 
            className="form-select" 
            style={{ width: '220px' }}
            value={selectedLocation} 
            onChange={e => setSelectedLocation(e.target.value)}
          >
            {LOCATIONS.map(l => (
              <option key={l.name} value={l.name}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <RefreshCw className="animate-spin" size={32} color="var(--forest-800)" />
        </div>
      ) : weather ? (
        <div>
          {/* Main Weather Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TEMPERATURE</span>
                <Thermometer size={20} color="var(--forest-800)" />
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: "'Fraunces', serif" }}>
                {weather.temperature}°C
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Condition: {weather.condition}</p>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>RELATIVE HUMIDITY</span>
                <Droplets size={20} color="var(--sage-500)" />
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: "'Fraunces', serif" }}>
                {weather.humidity}%
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--sage-500)' }}>Canopy moisture index</p>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>WIND SPEED</span>
                <Wind size={20} color="var(--forest-800)" />
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: "'Fraunces', serif" }}>
                {weather.wind_speed} <span style={{ fontSize: '1rem', fontWeight: 500 }}>km/h</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: weather.wind_speed > 18 ? 'var(--amber-400)' : 'var(--forest-800)' }}>
                {weather.wind_speed > 18 ? 'Caution: Drift Risk' : 'Safe for spraying'}
              </p>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>24H RAINFALL</span>
                <CloudSun size={20} color="var(--sage-500)" />
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: "'Fraunces', serif" }}>
                {weather.rainfall} <span style={{ fontSize: '1rem', fontWeight: 500 }}>mm</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recorded precipitation</p>
            </div>
          </div>

          {/* 5-Day Agro Forecast */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: "'Fraunces', serif", marginBottom: '16px' }}>5-Day Agricultural Weather Outlook</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              {weather.forecast && weather.forecast.map((f, i) => (
                <div 
                  key={i} 
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.day}</span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{f.date}</p>
                  
                  <div style={{ margin: '12px 0' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--forest-800)', fontFamily: "'Fraunces', serif" }}>{f.temp_max}°</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '4px' }}>/ {f.temp_min}°</span>
                  </div>

                  <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                    {f.rain_chance}% Rain ({f.precipitation_mm}mm)
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{f.condition}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Agricultural Weather Advisories */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: "'Fraunces', serif", marginBottom: '16px' }}>
              Agronomic Action Advisories
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {weather.agricultural_advisories && weather.agricultural_advisories.map((adv, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `4px solid ${adv.type === 'URGENT' ? 'var(--rose-500)' : adv.type === 'WARNING' ? 'var(--amber-500)' : 'var(--forest-800)'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${adv.type === 'URGENT' ? 'badge-rose' : adv.type === 'WARNING' ? 'badge-amber' : 'badge-emerald'}`}>
                      {adv.type}
                    </span>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700 }}>{adv.title}</h4>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {adv.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
