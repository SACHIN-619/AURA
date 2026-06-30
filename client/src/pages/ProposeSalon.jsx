import { useState, useRef, useEffect } from 'react';
import { useAura, API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';
import { useNavigate } from 'react-router-dom';

export default function ProposeSalon() {
  const { pushToast, user } = useAura();
  const navigate = useNavigate();
  const token = localStorage.getItem('aura_token');

  if (!token) {
    return (
      <div style={S.pageWrapper}>
        <div style={S.container}>
          <button onClick={() => navigate(-1)} style={S.backBtn}>← Back</button>
          <h2 style={{ color: COLOR.textPrimary, fontFamily: FONT.display, marginTop: '2rem' }}>Please login first to propose a salon.</h2>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    name: '',
    hub: '',
    address: '',
    phone: '',
    whatsapp: '',
    category: '',
    servesGender: 'unisex',
    lat: '17.3850',
    lon: '78.4867',
    description: ''
  });
  const [images, setImages] = useState([]); // Array of base64 strings
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({}); // Per-field validation errors
  const mapRef = useRef(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (window.L) return initMap();

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    document.head.appendChild(script);

    function initMap() {
      if (!document.getElementById('map') || mapRef.current) return;
      const map = window.L.map('map').setView([17.3850, 78.4867], 12);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

      let marker = window.L.marker([17.3850, 78.4867], { draggable: true }).addTo(map);

      marker.on('dragend', function (e) {
        const pos = e.target.getLatLng();
        setFormData(prev => ({ ...prev, lat: pos.lat.toFixed(6), lon: pos.lng.toFixed(6) }));
      });

      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        setFormData(prev => ({ ...prev, lat: e.latlng.lat.toFixed(6), lon: e.latlng.lng.toFixed(6) }));
      });

      mapRef.current = { map, marker };
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }

    if ((name === 'lat' || name === 'lon') && mapRef.current) {
      const { map, marker } = mapRef.current;
      const lat = name === 'lat' ? parseFloat(value) : parseFloat(formData.lat);
      const lon = name === 'lon' ? parseFloat(value) : parseFloat(formData.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        marker.setLatLng([lat, lon]);
        map.setView([lat, lon], map.getZoom());
      }
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
    // Clear image error when files are added
    if (fieldErrors.images) {
      setFieldErrors(prev => ({ ...prev, images: '' }));
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // ── Client-side validation ───────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!formData.name.trim())    errors.name    = 'Salon name is required';
    if (!formData.hub.trim())     errors.hub     = 'Area/Hub is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.phone.trim())   errors.phone   = 'Contact phone is required';
    if (!formData.category)       errors.category = 'Service category is required';
    if (images.length < 3)        errors.images  = `Please add at least 3 photos (you have ${images.length})`;
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run client-side validation first
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      pushToast('Please fill in all required fields before submitting.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        hub: formData.hub.trim(),
        address: formData.address.trim(),
        location: { lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) },
        contact: { phone: formData.phone.trim(), whatsapp: formData.whatsapp.trim() },
        serviceCategories: [formData.category],
        servesGender: formData.servesGender,
        description: formData.description,
        images: { gallery: images }
      };

      const res = await fetch(`${API}/api/salons/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit shop listing');

      pushToast('✓ Shop proposed! An admin will review it soon.', 'success');
      navigate('/');
    } catch (err) {
      pushToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = Object.values(fieldErrors).some(Boolean);

  return (
    <div style={S.pageWrapper}>
      <div style={S.container}>
        <button onClick={() => navigate(-1)} style={S.backBtn}>← Back</button>
        <h1 style={{ fontFamily: FONT.display, color: COLOR.textPrimary, margin: '1rem 0 0.3rem 0' }}>List Your Shop</h1>
        <p style={{ fontFamily: FONT.body, color: COLOR.textMuted, marginBottom: '0.5rem' }}>
          Fill in your salon details. Once verified by our team, your shop will appear on AURA Marketplace.
        </p>

        {/* Ownership info — pre-fill prompt */}
        {user && (
          <div style={S.ownerBanner}>
            <span style={{ color: COLOR.gold, marginRight: '0.4rem' }}>✦</span>
            Submitting as <strong style={{ color: COLOR.textPrimary }}>{user.name}</strong> ({user.email}).
            Make sure all details belong to <em>your</em> salon.
          </div>
        )}

        {hasErrors && (
          <div style={S.errorSummary}>
            ⚠ Please correct the highlighted fields below before submitting.
          </div>
        )}

        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.grid}>
            {/* Basic Details */}
            <div style={S.card}>
              <h3 style={S.cardTitle}>1. Basic Details</h3>

              <label style={S.label}>Salon Name <span style={S.req}>*</span></label>
              <input
                style={{ ...S.input, ...(fieldErrors.name ? S.inputError : {}) }}
                name="name" value={formData.name} onChange={handleChange}
                placeholder="e.g. AAKAARAA SALON"
              />
              {fieldErrors.name && <div style={S.errMsg}>{fieldErrors.name}</div>}

              <label style={S.label}>Hub (Area) <span style={S.req}>*</span></label>
              <input
                style={{ ...S.input, ...(fieldErrors.hub ? S.inputError : {}) }}
                name="hub" value={formData.hub} onChange={handleChange}
                placeholder="e.g. Jubilee Hills"
              />
              {fieldErrors.hub && <div style={S.errMsg}>{fieldErrors.hub}</div>}

              <label style={S.label}>Address Line <span style={S.req}>*</span></label>
              <input
                style={{ ...S.input, ...(fieldErrors.address ? S.inputError : {}) }}
                name="address" value={formData.address} onChange={handleChange}
                placeholder="Street address"
              />
              {fieldErrors.address && <div style={S.errMsg}>{fieldErrors.address}</div>}

              <label style={S.label}>Description / Menu Bio</label>
              <textarea
                style={{ ...S.input, minHeight: '80px' }}
                name="description" value={formData.description} onChange={handleChange}
                placeholder="Tell us about your salon and services..."
              />
            </div>

            {/* Contact & Categorization */}
            <div style={S.card}>
              <h3 style={S.cardTitle}>2. Contact & Type</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Phone <span style={S.req}>*</span></label>
                  <input
                    style={{ ...S.input, ...(fieldErrors.phone ? S.inputError : {}) }}
                    name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="+91..."
                  />
                  {fieldErrors.phone && <div style={S.errMsg}>{fieldErrors.phone}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>WhatsApp</label>
                  <input style={S.input} name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="+91..." />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Primary Category <span style={S.req}>*</span></label>
                  <select
                    style={{ ...S.input, ...(fieldErrors.category ? S.inputError : {}) }}
                    name="category" value={formData.category} onChange={handleChange}
                  >
                    <option value="">Select...</option>
                    <option value="hairdresser">Hair Salon</option>
                    <option value="beauty">Beauty Parlour</option>
                    <option value="spa">Spa</option>
                    <option value="barber">Barbershop</option>
                    <option value="nails">Nail Studio</option>
                    <option value="bridal">Bridal Studio</option>
                  </select>
                  {fieldErrors.category && <div style={S.errMsg}>{fieldErrors.category}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Serves Gender</label>
                  <select style={S.input} name="servesGender" value={formData.servesGender} onChange={handleChange}>
                    <option value="unisex">Unisex</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Location / Map */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>3. Exact Location (Map Pin) <span style={S.req}>*</span></h3>
            <p style={{ fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textMuted, marginBottom: '1rem' }}>
              Click on the map or drag the marker to set your exact coordinates. This helps users navigate to you!
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={S.label}>Latitude</label>
                <input style={S.input} name="lat" value={formData.lat} onChange={handleChange} />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={S.label}>Longitude</label>
                <input style={S.input} name="lon" value={formData.lon} onChange={handleChange} />
              </div>
            </div>
            <div id="map" style={{ height: '300px', borderRadius: '8px', border: `1px solid rgba(212,175,55,0.3)` }}></div>
          </div>

          {/* Images */}
          <div style={{ ...S.card, ...(fieldErrors.images ? { border: '1px solid rgba(239,83,80,0.5)', background: 'rgba(239,83,80,0.04)' } : {}) }}>
            <h3 style={S.cardTitle}>4. Photos <span style={S.req}>* (Minimum 3 required)</span></h3>
            <p style={{ fontFamily: FONT.body, fontSize: '0.78rem', color: COLOR.textMuted, marginBottom: '1rem' }}>
              Your listing <strong>cannot be submitted without at least 3 photos</strong>. Photos are required for admin verification.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {images.map((img, idx) => (
                <div key={idx} style={S.imagePreview}>
                  <img src={img} alt={`Upload ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeImage(idx)} style={S.removeImgBtn}>✕</button>
                  {idx === 0 && <div style={S.imgLabel}>Banner</div>}
                </div>
              ))}
              <label style={S.uploadBox}>
                <span style={{ fontSize: '1.5rem', color: COLOR.gold }}>+</span>
                <span style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: COLOR.textGhost }}>Add Photo</span>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: '0.65rem', color: images.length >= 3 ? '#81C784' : '#EF9A9A' }}>
              {images.length >= 3
                ? `✓ ${images.length} photo${images.length > 1 ? 's' : ''} added — requirement met`
                : `${images.length}/3 photos — ${3 - images.length} more needed`
              }
            </div>
            {fieldErrors.images && <div style={{ ...S.errMsg, marginTop: '0.4rem' }}>{fieldErrors.images}</div>}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '⟳ Submitting...' : '✦ Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}

const S = {
  pageWrapper: {
    minHeight: '100vh',
    background: COLOR.voidDeep,
    padding: '2rem 1rem',
    overflowY: 'auto'
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: COLOR.gold,
    fontFamily: FONT.mono,
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0 0 1rem 0'
  },
  ownerBanner: {
    padding: '0.6rem 1rem',
    background: 'rgba(212,175,55,0.06)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: '8px',
    fontFamily: FONT.body,
    fontSize: '0.82rem',
    color: COLOR.textMuted,
    marginBottom: '1.5rem',
  },
  errorSummary: {
    padding: '0.7rem 1rem',
    background: 'rgba(239,83,80,0.08)',
    border: '1px solid rgba(239,83,80,0.3)',
    borderRadius: '8px',
    fontFamily: FONT.body,
    fontSize: '0.82rem',
    color: '#EF9A9A',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'border-color 0.2s',
  },
  cardTitle: {
    fontFamily: FONT.display,
    fontSize: '1.1rem',
    color: COLOR.gold,
    margin: '0 0 1rem 0',
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    color: COLOR.textGhost,
    display: 'block',
    marginBottom: '0.4rem',
    marginTop: '1rem',
  },
  req: {
    color: '#EF9A9A',
    fontStyle: 'normal',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: COLOR.textPrimary,
    fontFamily: FONT.body,
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputError: {
    border: '1px solid rgba(239,83,80,0.6)',
    background: 'rgba(239,83,80,0.05)',
  },
  errMsg: {
    fontFamily: FONT.mono,
    fontSize: '0.62rem',
    color: '#EF9A9A',
    marginTop: '0.3rem',
    letterSpacing: '0.04em',
  },
  imagePreview: {
    width: '100px',
    height: '100px',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(212,175,55,0.3)',
  },
  imgLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.7)',
    fontFamily: FONT.mono,
    fontSize: '0.5rem',
    color: COLOR.gold,
    textAlign: 'center',
    padding: '2px',
    letterSpacing: '0.06em',
  },
  removeImgBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '0.7rem',
  },
  uploadBox: {
    width: '100px',
    height: '100px',
    borderRadius: '8px',
    border: '1px dashed rgba(212,175,55,0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: 'rgba(212,175,55,0.05)',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    padding: '1rem',
    background: 'linear-gradient(135deg,#D4AF37,#AA8A2A)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontFamily: FONT.mono,
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'opacity 0.2s',
  }
};
