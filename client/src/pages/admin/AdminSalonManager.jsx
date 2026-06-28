import { useState, useRef, useEffect } from 'react';
import { useAura, API } from '../../context/AuraContext';
import { COLOR, FONT } from '../../utils/tokens';

export default function AdminSalonManager() {
  const { pushToast } = useAura();
  const token = localStorage.getItem('aura_token');
  
  const [formData, setFormData] = useState({
    name: '', hub: '', address: '', phone: '', whatsapp: '',
    category: '', servesGender: 'unisex', lat: '17.3850', lon: '78.4867',
    description: ''
  });
  const [images, setImages] = useState([]); // Array of base64 strings
  const [loading, setLoading] = useState(false);
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
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length < 3) {
      return pushToast('At least 3 images are required', 'error');
    }
    
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        hub: formData.hub,
        address: { street: formData.address, city: 'Hyderabad' },
        location: { lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) },
        contact: { phone: formData.phone, whatsapp: formData.whatsapp },
        serviceCategories: [formData.category],
        servesGender: formData.servesGender,
        description: formData.description,
        images: { gallery: images }
      };

      const res = await fetch(`${API}/api/admin/salons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create salon');
      
      pushToast('✓ Salon created successfully!', 'success');
      // Reset form
      setFormData({ name: '', hub: '', address: '', phone: '', whatsapp: '', category: '', servesGender: 'unisex', lat: '17.3850', lon: '78.4867', description: '' });
      setImages([]);
    } catch (err) {
      pushToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.container}>
      <h1 style={{ fontFamily: FONT.display, color: COLOR.textPrimary, margin: '0 0 2rem 0' }}>Add New Salon</h1>
      
      <form onSubmit={handleSubmit} style={S.form}>
        <div style={S.grid}>
          {/* Basic Details */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>1. Basic Details</h3>
            <label style={S.label}>Salon Name *</label>
            <input style={S.input} name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. AAKAARAA SALON" />
            
            <label style={S.label}>Hub (Area) *</label>
            <input style={S.input} name="hub" value={formData.hub} onChange={handleChange} required placeholder="e.g. Jubilee Hills" />
            
            <label style={S.label}>Address Line *</label>
            <input style={S.input} name="address" value={formData.address} onChange={handleChange} required placeholder="Street address" />
            
            <label style={S.label}>Description / Menu Bio</label>
            <textarea style={{...S.input, minHeight: '80px'}} name="description" value={formData.description} onChange={handleChange} placeholder="Details about this salon..." />
          </div>

          {/* Contact & Categorization */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>2. Contact & Type</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Phone *</label>
                <input style={S.input} name="phone" value={formData.phone} onChange={handleChange} required placeholder="+91..." />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>WhatsApp</label>
                <input style={S.input} name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="+91..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Primary Category</label>
                <select style={S.input} name="category" value={formData.category} onChange={handleChange}>
                  <option value="">Select...</option>
                  <option value="hairdresser">Hair Salon</option>
                  <option value="beauty">Beauty Parlour</option>
                  <option value="spa">Spa</option>
                  <option value="barber">Barbershop</option>
                </select>
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
          <h3 style={S.cardTitle}>3. Exact Location (Map Pin) *</h3>
          <p style={{ fontFamily: FONT.body, fontSize: '0.8rem', color: COLOR.textMuted, marginBottom: '1rem' }}>
            Click on the map or drag the marker to set the exact coordinates for routing.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexDirection: 'row', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={S.label}>Latitude</label>
              <input style={S.input} name="lat" value={formData.lat} onChange={handleChange} required />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={S.label}>Longitude</label>
              <input style={S.input} name="lon" value={formData.lon} onChange={handleChange} required />
            </div>
          </div>
          <div id="map" style={{ height: '300px', borderRadius: '8px', border: `1px solid rgba(212,175,55,0.3)` }}></div>
        </div>

        {/* Images */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>4. Photos (Min 3 required) *</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {images.map((img, idx) => (
              <div key={idx} style={S.imagePreview}>
                <img src={img} alt={`Upload ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => removeImage(idx)} style={S.removeImgBtn}>✕</button>
              </div>
            ))}
            <label style={S.uploadBox}>
              <span style={{ fontSize: '1.5rem', color: COLOR.gold }}>+</span>
              <span style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: COLOR.textGhost }}>Add Photo</span>
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <button type="submit" disabled={loading} style={S.submitBtn}>
          {loading ? '⟳ Creating Salon...' : '✦ Publish Salon'}
        </button>
      </form>
    </div>
  );
}

const S = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
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
    background: 'rgba(13,10,19,0.7)',
    border: '1px solid rgba(212,175,55,0.15)',
    borderRadius: '12px',
    padding: '1.5rem',
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
  },
  imagePreview: {
    width: '100px',
    height: '100px',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(212,175,55,0.3)',
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
  }
};
