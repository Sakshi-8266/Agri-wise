import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Upload, CheckCircle2, AlertCircle, Sparkles, 
  MapPin, Calendar, Tag, DollarSign, Package, ShieldCheck, FileText, Image
} from 'lucide-react';
import { api } from '../api';
import { INDIAN_STATES, INDIAN_CITIES_DATABASE } from '../context/LocationContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function CreateProductView({ onNavigate }) {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    product_name: '',
    category: 'Cereals',
    farm_id: '',
    state: 'Uttar Pradesh',
    city: 'Meerut',
    mandi_location: 'Meerut Mandi (Sardhana Road)',
    harvest_date: '',
    available_quantity: '',
    unit: 'quintal',
    asking_price: '',
    description: '',
    is_organic: false,
    image_url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    certificate_file_name: '',
    certificate_number: ''
  });

  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Load registered farms
  useEffect(() => {
    async function loadFarms() {
      try {
        const farmList = await api.getFarms();
        setFarms(farmList || []);
        if (farmList && farmList.length > 0) {
          setForm(f => ({ ...f, farm_id: farmList[0].id }));
        }
      } catch (err) {
        console.warn('Could not load farms:', err);
      } finally {
        setLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  // Filter cities by selected state
  const citiesForState = INDIAN_CITIES_DATABASE.filter(c => c.state === form.state);

  // Handle State Change
  const handleStateChange = (newState) => {
    const matchingCities = INDIAN_CITIES_DATABASE.filter(c => c.state === newState);
    const firstCity = matchingCities.length > 0 ? matchingCities[0] : null;
    setForm(f => ({
      ...f,
      state: newState,
      city: firstCity ? firstCity.city : '',
      mandi_location: firstCity ? firstCity.mandiHub : ''
    }));
  };

  // Handle City Change
  const handleCityChange = (newCityName) => {
    const cityObj = INDIAN_CITIES_DATABASE.find(c => c.city === newCityName && c.state === form.state);
    setForm(f => ({
      ...f,
      city: newCityName,
      mandi_location: cityObj ? cityObj.mandiHub : f.mandi_location
    }));
  };

  // Handle Certificate File selection simulation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(f => ({
        ...f,
        certificate_file_name: file.name
      }));
      if (errors.certificate) {
        setErrors(prev => ({ ...prev, certificate: null }));
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!form.product_name.trim()) {
      newErrors.product_name = 'Product title / crop name is mandatory *';
    }
    if (!form.category) {
      newErrors.category = 'Category is mandatory *';
    }
    if (!form.state) {
      newErrors.state = 'State selection is mandatory *';
    }
    if (!form.city) {
      newErrors.city = 'City / District selection is mandatory *';
    }
    if (!form.mandi_location.trim()) {
      newErrors.mandi_location = 'Mandi / Hub location is mandatory *';
    }
    if (!form.harvest_date) {
      newErrors.harvest_date = 'Harvest availability date is mandatory *';
    }
    if (!form.available_quantity || parseFloat(form.available_quantity) <= 0) {
      newErrors.available_quantity = 'Valid available quantity (> 0) is mandatory *';
    }
    if (!form.asking_price || parseFloat(form.asking_price) <= 0) {
      newErrors.asking_price = 'Valid asking price per unit (₹ > 0) is mandatory *';
    }

    // Required certification proof validation if certified is checked
    if (form.is_organic) {
      if (!form.certificate_file_name && !form.certificate_number.trim()) {
        newErrors.certificate = 'Certification proof document or certificate number is mandatory for certified produce *';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateForm()) {
      showToast('Please fix all highlighted errors before submitting.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        product_name: form.product_name.trim(),
        category: form.category,
        farm_id: form.farm_id ? parseInt(form.farm_id) : null,
        region: `${form.state} (${form.city})`,
        location: `${form.city}, ${form.mandi_location}`,
        harvest_date: form.harvest_date,
        available_quantity: parseFloat(form.available_quantity),
        unit: form.unit,
        asking_price: parseFloat(form.asking_price),
        description: form.description.trim() || `Fresh harvest batch from ${form.city}, ${form.state}. Grade-A quality verified.`,
        is_organic: form.is_organic,
        image_url: form.image_url,
        certification_proof: form.is_organic 
          ? (form.certificate_file_name || `Cert# ${form.certificate_number}`)
          : null
      };

      await api.createProduct(payload);
      showToast(`" ${form.product_name}" created and listed successfully!`, 'success');
      onNavigate('listings');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to create product listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px 0', maxWidth: '880px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => onNavigate('listings')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            border: '1px solid rgba(18, 53, 36, 0.15)',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: '#123524',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f2f7f4'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
        >
          <ArrowLeft size={16} /> Back to Produce Listings
        </button>

        <span style={{ fontSize: '0.78rem', color: '#688273' }}>
          Produce Marketplace • Direct B2B Listing
        </span>
      </div>

      {/* Main Form Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(18, 53, 36, 0.12)',
        borderRadius: '20px',
        padding: '32px 36px',
        boxShadow: '0 4px 20px rgba(18, 53, 36, 0.05)'
      }}>
        <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(18, 53, 36, 0.08)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: '#eef6f1',
              color: '#123524',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              Marketplace Hub
            </span>
            <span style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 700 }}>
              ✓ Verified Wholesale Traceability
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#123524', margin: '6px 0 2px' }}>
            Create a Product
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#576c60', margin: 0 }}>
            List your harvest batches directly for verified wholesale buyers, food processors, and FPOs across India.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Details */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#123524', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={16} color="#10b981" /> 1. Crop & Product Identification
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  Crop Title / Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharbati Wheat (Grade-A Lokwan)"
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: errors.product_name ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.2)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.product_name && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                    {errors.product_name}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  Crop Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: errors.category ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.2)',
                    fontSize: '0.88rem',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Cereals">Cereals (Wheat, Rice, Maize, Millets)</option>
                  <option value="Pulses">Pulses (Chickpea, Moong, Urad, Tur)</option>
                  <option value="Vegetables">Vegetables (Tomato, Onion, Potato)</option>
                  <option value="Fruits">Fruits (Mango, Banana, Citrus, Grapes)</option>
                  <option value="Spices">Spices (Chilli, Turmeric, Cumin, Mustard)</option>
                  <option value="Oilseeds">Oilseeds (Soybean, Groundnut, Mustard)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Area / Location Selection */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#123524', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="#10b981" /> 2. Farm Location & Regional Mandi
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  Indian State *
                </label>
                <select
                  value={form.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(18, 53, 36, 0.2)',
                    fontSize: '0.88rem',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  City / District *
                </label>
                <select
                  value={form.city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(18, 53, 36, 0.2)',
                    fontSize: '0.88rem',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  {citiesForState.map(c => (
                    <option key={c.city} value={c.city}>{c.city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  Associated Mandi / APMC Hub *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meerut Mandi Samiti"
                  value={form.mandi_location}
                  onChange={(e) => setForm({ ...form, mandi_location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: errors.mandi_location ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.2)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Quantity, Harvest Date & Pricing */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#123524', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} color="#10b981" /> 3. Harvest Availability & Pricing
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  Harvest / Availability Date *
                </label>
                <input
                  type="date"
                  value={form.harvest_date}
                  onChange={(e) => setForm({ ...form, harvest_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: errors.harvest_date ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.2)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.harvest_date && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                    {errors.harvest_date}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  Available Quantity *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="e.g. 150"
                    value={form.available_quantity}
                    onChange={(e) => setForm({ ...form, available_quantity: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: errors.available_quantity ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.2)',
                      fontSize: '0.88rem'
                    }}
                  />
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    style={{
                      width: '100px',
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: '1px solid rgba(18, 53, 36, 0.2)',
                      background: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="quintal">Quintal</option>
                    <option value="kg">kg</option>
                    <option value="ton">Ton</option>
                    <option value="crates">Crates</option>
                  </select>
                </div>
                {errors.available_quantity && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                    {errors.available_quantity}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
                  Asking Price (₹ per {form.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 2750"
                  value={form.asking_price}
                  onChange={(e) => setForm({ ...form, asking_price: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: errors.asking_price ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.2)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.asking_price && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                    {errors.asking_price}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Organic Certification Toggle & Dynamic File Proof */}
          <div style={{
            background: form.is_organic ? '#f0fdf4' : '#fafcfb',
            border: form.is_organic ? '1.5px solid #10b981' : '1px solid rgba(18, 53, 36, 0.12)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: form.is_organic ? '#10b981' : '#e2e8e4',
                  color: form.is_organic ? '#ffffff' : '#687e71',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <label htmlFor="certified-toggle" style={{ fontSize: '0.92rem', fontWeight: 800, color: '#123524', cursor: 'pointer', display: 'block' }}>
                    Certified Organic / Quality Inspected Produce
                  </label>
                  <span style={{ fontSize: '0.78rem', color: '#576c60' }}>
                    Turn on if this produce holds NPOP, Jaivik Bharat, PGS-India, or APMC organic certification.
                  </span>
                </div>
              </div>

              {/* Toggle switch */}
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                <input
                  id="certified-toggle"
                  type="checkbox"
                  checked={form.is_organic}
                  onChange={(e) => setForm({ ...form, is_organic: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: form.is_organic ? '#10b981' : '#cbd5e1',
                  borderRadius: '34px',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: form.is_organic ? '24px' : '3px',
                    bottom: '3px',
                    background: 'white',
                    borderRadius: '50%',
                    transition: '0.2s'
                  }} />
                </span>
              </label>
            </div>

            {/* DYNAMIC CERTIFICATION PROOF UPLOAD FIELD (Rendered when Certified is checked) */}
            {form.is_organic && (
              <div style={{
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: '1px dashed #bbf7d0',
                animation: 'fadeIn 0.25s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <FileText size={16} color="#059669" />
                  <strong style={{ fontSize: '0.84rem', color: '#065f46' }}>
                    Required Certification Proof Document *
                  </strong>
                </div>
                <p style={{ fontSize: '0.76rem', color: '#047857', margin: '0 0 10px' }}>
                  Upload a scanned copy or PDF of your organic certification (NPOP / Jaivik Bharat / Soil Health Audit):
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{
                    background: '#ffffff',
                    border: errors.certificate ? '1.5px solid #ef4444' : '1.5px dashed #10b981',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.82rem',
                    color: '#123524',
                    fontWeight: 700
                  }}>
                    <Upload size={16} color="#10b981" />
                    <span>{form.certificate_file_name ? 'Change Document' : 'Upload Certificate (PDF / Image)'}</span>
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      onChange={handleFileChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  {form.certificate_file_name && (
                    <div style={{
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700
                    }}>
                      <CheckCircle2 size={14} color="#16a34a" />
                      <span>Attached: {form.certificate_file_name}</span>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Or enter Certificate / License #"
                    value={form.certificate_number}
                    onChange={(e) => {
                      setForm({ ...form, certificate_number: e.target.value });
                      if (errors.certificate) setErrors(prev => ({ ...prev, certificate: null }));
                    }}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: errors.certificate ? '1.5px solid #ef4444' : '1px solid rgba(18, 53, 36, 0.2)',
                      fontSize: '0.82rem',
                      background: '#ffffff'
                    }}
                  />
                </div>

                {errors.certificate && (
                  <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 600, display: 'block', marginTop: '6px' }}>
                    {errors.certificate}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Description & Image Preview */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#294133', marginBottom: '6px' }}>
              Batch Description & Quality Grade (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide crop variety details, moisture percentage, grading specifications, or delivery availability..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(18, 53, 36, 0.2)',
                fontSize: '0.86rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('listings')}
              style={{ padding: '10px 22px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ padding: '10px 28px', fontSize: '0.9rem' }}
            >
              {submitting ? 'Publishing Listing...' : 'Publish Product to Marketplace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
