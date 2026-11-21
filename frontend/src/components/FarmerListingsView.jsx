import React, { useState, useEffect } from 'react';
import { 
  Plus, Tag, ShoppingBag, Edit, Trash2, CheckCircle2, 
  MapPin, X, Leaf, DollarSign, Calendar, Compass, AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { formatDate } from '../utils/dateFormatter';

export default function FarmerListingsView({ onNavigate }) {
  const [listings, setListings] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = api.getUser();
      const [prods, farmList] = await Promise.all([
        api.getProducts({ seller_id: user?.id }),
        api.getFarms()
      ]);
      setListings(prods || []);
      setFarms(farmList || []);
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
            <span className="badge badge-emerald">Produce Marketplace</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Direct B2B & Wholesale Trading</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginTop: '6px', fontFamily: "'Fraunces', serif" }}>
            My Agricultural Produce Listings
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            List harvest batches directly for verified wholesale buyers with regional traceability and harvest date verification.
          </p>
        </div>

        <button className="btn-primary" onClick={() => onNavigate ? onNavigate('create-product') : null}>
          <Plus size={16} /> Create a Product
        </button>
      </div>

      {/* Grid of Listings */}
      {listings.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <ShoppingBag size={40} color="var(--forest-800)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: "'Fraunces', serif" }}>No Active Listings Posted</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            List your wheat, pulses, vegetables, or fruits to receive direct purchase orders.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {listings.map(item => (
            <div key={item.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '170px', position: 'relative', overflow: 'hidden' }}>
                <img 
                  src={item.image_url || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80'} 
                  alt={item.product_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-emerald">{item.category}</span>
                  {item.is_organic && <span className="badge badge-sky">Certified Organic</span>}
                </div>
                <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                  <span style={{ 
                    background: '#163326', color: '#fff', padding: '4px 10px', 
                    borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 
                  }}>
                    {item.status}
                  </span>
                </div>
              </div>

              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontFamily: "'Fraunces', serif" }}>{item.product_name}</h3>
                  
                  {/* Region & Mandi Location */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', background: '#eef4f0', color: '#2d6a4f', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      📍 {item.region || 'Western Plain Zone'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {item.location}
                    </span>
                  </div>

                  {/* Harvest / Availability Date */}
                  <div style={{ fontSize: '0.75rem', color: '#687e72', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} color="#b47818" />
                    <span>
                      Harvest Date: <strong style={{ color: '#163326' }}>{formatDate(item.harvest_date || item.created_at, 'readable')}</strong> ({formatDate(item.harvest_date || item.created_at, 'regional')})
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                    {item.description || 'Premium farm-fresh harvest batch meeting APMC export and domestic quality standards.'}
                  </p>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PRICE PER {item.unit?.toUpperCase()}</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--forest-800)' }}>
                      ₹{item.asking_price}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AVAILABLE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.available_quantity} {item.unit}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>
  );
}
