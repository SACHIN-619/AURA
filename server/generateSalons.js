import fs from 'fs';

const HUBS = [
  // Original & First Expansion
  { name: 'Jubilee Hills', latMin: 17.41, latMax: 17.44, lonMin: 78.39, lonMax: 78.42 },
  { name: 'Banjara Hills', latMin: 17.40, latMax: 17.43, lonMin: 78.42, lonMax: 78.45 },
  { name: 'Madhapur', latMin: 17.43, latMax: 17.46, lonMin: 78.37, lonMax: 78.40 },
  { name: 'Gachibowli', latMin: 17.42, latMax: 17.45, lonMin: 78.34, lonMax: 78.37 },
  { name: 'Kukatpally', latMin: 17.48, latMax: 17.51, lonMin: 78.38, lonMax: 78.41 },
  { name: 'Secunderabad', latMin: 17.43, latMax: 17.46, lonMin: 78.49, lonMax: 78.52 },
  { name: 'Kondapur', latMin: 17.45, latMax: 17.48, lonMin: 78.35, lonMax: 78.38 },
  { name: 'Begumpet', latMin: 17.43, latMax: 17.45, lonMin: 78.45, lonMax: 78.47 },
  { name: 'Himayatnagar', latMin: 17.39, latMax: 17.41, lonMin: 78.47, lonMax: 78.49 },
  { name: 'Ameerpet', latMin: 17.43, latMax: 17.44, lonMin: 78.44, lonMax: 78.45 },
  { name: 'SR Nagar', latMin: 17.44, latMax: 17.45, lonMin: 78.44, lonMax: 78.45 },
  { name: 'Dilsukhnagar', latMin: 17.36, latMax: 17.38, lonMin: 78.52, lonMax: 78.54 },
  { name: 'LB Nagar', latMin: 17.34, latMax: 17.36, lonMin: 78.54, lonMax: 78.56 },
  { name: 'Malakpet', latMin: 17.37, latMax: 17.39, lonMin: 78.49, lonMax: 78.52 },
  { name: 'Tolichowki', latMin: 17.39, latMax: 17.41, lonMin: 78.40, lonMax: 78.42 },
  { name: 'Mehdipatnam', latMin: 17.38, latMax: 17.40, lonMin: 78.42, lonMax: 78.44 },
  { name: 'Uppal', latMin: 17.39, latMax: 17.41, lonMin: 78.55, lonMax: 78.57 },
  { name: 'Miyapur', latMin: 17.49, latMax: 17.51, lonMin: 78.35, lonMax: 78.37 },
  { name: 'Lingampally', latMin: 17.47, latMax: 17.49, lonMin: 78.31, lonMax: 78.33 },
  { name: 'KPHB Colony', latMin: 17.48, latMax: 17.50, lonMin: 78.38, lonMax: 78.40 },
  { name: 'Panjagutta', latMin: 17.42, latMax: 17.43, lonMin: 78.44, lonMax: 78.46 },
  { name: 'Khairatabad', latMin: 17.40, latMax: 17.42, lonMin: 78.45, lonMax: 78.47 },
  { name: 'MGBS', latMin: 17.37, latMax: 17.38, lonMin: 78.47, lonMax: 78.49 },
  { name: 'Durgam Cheruvu', latMin: 17.43, latMax: 17.44, lonMin: 78.38, lonMax: 78.40 },
  { name: 'Raidurg', latMin: 17.43, latMax: 17.45, lonMin: 78.37, lonMax: 78.39 },
  { name: 'Hitec City', latMin: 17.44, latMax: 17.46, lonMin: 78.37, lonMax: 78.39 },
  { name: 'Lakdikapul', latMin: 17.39, latMax: 17.41, lonMin: 78.45, lonMax: 78.47 },
  { name: 'Secunderabad East', latMin: 17.42, latMax: 17.44, lonMin: 78.49, lonMax: 78.51 },
  { name: 'JNTU College', latMin: 17.49, latMax: 17.51, lonMin: 78.38, lonMax: 78.40 },
  // Second Expansion (Student/College/High-Demand Hubs)
  { name: 'Ghatkesar', latMin: 17.43, latMax: 17.45, lonMin: 78.67, lonMax: 78.69 },
  { name: 'Jodimetla', latMin: 17.43, latMax: 17.45, lonMin: 78.63, lonMax: 78.65 },
  { name: 'Narapally', latMin: 17.42, latMax: 17.44, lonMin: 78.62, lonMax: 78.64 },
  { name: 'Boduppal', latMin: 17.40, latMax: 17.42, lonMin: 78.57, lonMax: 78.59 },
  { name: 'Medipally', latMin: 17.40, latMax: 17.42, lonMin: 78.60, lonMax: 78.62 },
  { name: 'Chengicherla', latMin: 17.42, latMax: 17.44, lonMin: 78.59, lonMax: 78.61 },
  { name: 'Pocharam', latMin: 17.42, latMax: 17.44, lonMin: 78.65, lonMax: 78.67 },
  { name: 'Tarnaka', latMin: 17.41, latMax: 17.43, lonMin: 78.52, lonMax: 78.54 },
  { name: 'Habsiguda', latMin: 17.40, latMax: 17.42, lonMin: 78.54, lonMax: 78.56 },
  { name: 'OU Campus', latMin: 17.40, latMax: 17.42, lonMin: 78.51, lonMax: 78.53 },
  { name: 'Kompally', latMin: 17.52, latMax: 17.54, lonMin: 78.47, lonMax: 78.49 },
  { name: 'Medchal', latMin: 17.61, latMax: 17.63, lonMin: 78.47, lonMax: 78.49 },
  { name: 'Bowenpally', latMin: 17.45, latMax: 17.47, lonMin: 78.47, lonMax: 78.49 },
  { name: 'Alwal', latMin: 17.49, latMax: 17.51, lonMin: 78.49, lonMax: 78.51 },
  { name: 'AS Rao Nagar', latMin: 17.47, latMax: 17.49, lonMin: 78.54, lonMax: 78.56 },
  { name: 'ECIL', latMin: 17.46, latMax: 17.48, lonMin: 78.56, lonMax: 78.58 },
  { name: 'Neredmet', latMin: 17.47, latMax: 17.49, lonMin: 78.52, lonMax: 78.54 },
  { name: 'Narsingi', latMin: 17.37, latMax: 17.39, lonMin: 78.33, lonMax: 78.35 },
  { name: 'Moinabad', latMin: 17.31, latMax: 17.33, lonMin: 78.26, lonMax: 78.28 },
  { name: 'Shamirpet', latMin: 17.58, latMax: 17.60, lonMin: 78.56, lonMax: 78.58 },
  { name: 'Somajiguda', latMin: 17.41, latMax: 17.43, lonMin: 78.44, lonMax: 78.46 },
  { name: 'Nampally', latMin: 17.37, latMax: 17.39, lonMin: 78.45, lonMax: 78.47 },
  { name: 'Abids', latMin: 17.37, latMax: 17.39, lonMin: 78.46, lonMax: 78.48 },
  { name: 'Koti', latMin: 17.37, latMax: 17.39, lonMin: 78.47, lonMax: 78.49 },
  { name: 'Narayanaguda', latMin: 17.38, latMax: 17.40, lonMin: 78.47, lonMax: 78.49 },
  { name: 'Basheerbagh', latMin: 17.38, latMax: 17.40, lonMin: 78.46, lonMax: 78.48 },
  { name: 'Chaderghat', latMin: 17.36, latMax: 17.38, lonMin: 78.48, lonMax: 78.50 },
  { name: 'Santoshnagar', latMin: 17.33, latMax: 17.35, lonMin: 78.49, lonMax: 78.51 },
  { name: 'Chandanagar', latMin: 17.48, latMax: 17.50, lonMin: 78.31, lonMax: 78.33 },
  { name: 'BHEL', latMin: 17.50, latMax: 17.52, lonMin: 78.29, lonMax: 78.31 },
  { name: 'Patancheru', latMin: 17.52, latMax: 17.54, lonMin: 78.25, lonMax: 78.27 },
  { name: 'Nallagandla', latMin: 17.45, latMax: 17.47, lonMin: 78.30, lonMax: 78.32 },
  { name: 'Tellapur', latMin: 17.44, latMax: 17.46, lonMin: 78.28, lonMax: 78.30 },
  { name: 'Gopanpally', latMin: 17.43, latMax: 17.45, lonMin: 78.30, lonMax: 78.32 }
];

const STYLES = [
  { prefixes: ['Toni & Guy', 'Mirrors', 'BBlunt', 'Envi', 'Juice', 'TrueFitt & Hill', 'JCB', 'Geetanjali', 'Lakme', 'Naturals'], type: 'Luxury', gender: 'unisex' },
  { prefixes: ['Glamour', 'Elegance', 'Radiance', 'Aura', 'Bliss', 'Serene', 'Glow', 'Chic', 'Diva', 'Venus'], type: 'Moderate', gender: 'female' },
  { prefixes: ['Royal', 'Classic', 'Urban', 'Metro', 'King', 'Gentlemen', 'Elite', 'Macho', 'Prime', 'Supreme'], type: 'Budget', gender: 'male' },
  { prefixes: ["Sri Sai", "Laxmi", "Balaji", "Venkateshwara", "Star", "Super", "New Look", "Smart", "Style", "Perfect"], type: 'Budget', gender: 'unisex' }
];

const SUFFIXES = ['Salon', 'Hair & Beauty', 'Spa & Salon', 'Barbershop', 'Beauty Parlour', 'Studio', 'Lounge'];

const SERVICES_DB = {
  'Luxury': [
    { name: 'Hair Botox', category: 'hair-therapy', priceMin: 4000, priceMax: 8000 },
    { name: 'Keratin Treatment', category: 'hair-therapy', priceMin: 3500, priceMax: 7000 },
    { name: 'Premium Balayage', category: 'hair-coloring', priceMin: 5000, priceMax: 10000 },
    { name: 'Bridal Makeup Pro', category: 'bridal', priceMin: 15000, priceMax: 30000 },
    { name: 'Luxury Facial', category: 'skincare', priceMin: 2000, priceMax: 5000 },
    { name: 'Director Cut', category: 'haircut', priceMin: 1000, priceMax: 2500 }
  ],
  'Moderate': [
    { name: 'Advanced Haircut', category: 'haircut', priceMin: 400, priceMax: 1000 },
    { name: 'Global Hair Color', category: 'hair-coloring', priceMin: 1500, priceMax: 3500 },
    { name: 'Bridal Makeup', category: 'bridal', priceMin: 5000, priceMax: 12000 },
    { name: 'O3+ Facial', category: 'skincare', priceMin: 1000, priceMax: 2000 },
    { name: 'Spa Pedicure', category: 'nails', priceMin: 500, priceMax: 1200 }
  ],
  'Budget': [
    { name: 'Basic Haircut', category: 'haircut', priceMin: 150, priceMax: 300 },
    { name: 'Beard Trim/Shave', category: 'grooming', priceMin: 100, priceMax: 200 },
    { name: 'Threading & Waxing', category: 'grooming', priceMin: 50, priceMax: 300 },
    { name: 'Fruit Facial', category: 'skincare', priceMin: 300, priceMax: 800 },
    { name: 'Root Touch Up', category: 'hair-coloring', priceMin: 400, priceMax: 800 }
  ]
};

const CATEGORIES = ['hairdresser', 'beauty', 'spa', 'barber', 'nails'];

const IMAGES = [
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1521590832167-7bfc17484d20?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1516975080661-460d3d52c10b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=800&q=80'
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return (Math.random() * (max - min) + min);
}

function generateName(style) {
  const prefix = randomItem(style.prefixes);
  const suffix = randomItem(SUFFIXES);
  return `${prefix} ${suffix}`;
}

const salons = [];

for (const hub of HUBS) {
  // Generate 4 to 5 salons per hub
  const numSalons = randomInt(4, 5);
  for (let i = 0; i < numSalons; i++) {
    const style = randomItem(STYLES);
    
    const lat = randomFloat(hub.latMin, hub.latMax);
    const lon = randomFloat(hub.lonMin, hub.lonMax);
  
  const isPremium = style.type === 'Luxury';
  
  // Choose services based on type
  const numServices = randomInt(4, 8);
  const availableServices = SERVICES_DB[style.type];
  const selectedServices = [];
  
  // Avoid duplicates in selected services
  const shuffledAvailable = [...availableServices].sort(() => 0.5 - Math.random());
  for(let j=0; j < Math.min(numServices, shuffledAvailable.length); j++) {
      const s = shuffledAvailable[j];
      selectedServices.push({
          name: s.name,
          category: s.category,
          price: Math.round(randomInt(s.priceMin, s.priceMax) / 50) * 50
      });
  }

  const badgeType = isPremium && Math.random() > 0.3 ? 'AURA_VERIFIED' : 'NONE';
  const claimStatus = badgeType === 'AURA_VERIFIED' ? 'approved' : randomItem(['none', 'pending']);
  
  let priceTier = 'Budget';
  if (style.type === 'Luxury') priceTier = randomItem(['Luxury', 'Premium Luxury']);
  else if (style.type === 'Moderate') priceTier = 'Moderate';
  
  const tier = isPremium ? randomItem(['platinum', 'gold']) : randomItem(['silver', 'unrated']);

  const uid = salons.length + 1;
  const contact = {
    phone: Math.random() > 0.3 ? `+91 ${randomInt(6000000000, 9999999999)}` : null,
    whatsapp: Math.random() > 0.5 ? `+91 ${randomInt(6000000000, 9999999999)}` : null,
    website: Math.random() > 0.7 ? `https://www.example.com/salon${uid}` : null,
    email: Math.random() > 0.7 ? `contact@salon${uid}.com` : null
  };

  const doc = {
    osmId: `node_${randomInt(100000000, 999999999)}`,
    name: generateName(style) + (Math.random() > 0.8 ? ` ${hub.name}` : ''),
    hub: hub.name,
    location: {
      type: 'Point',
      coordinates: [parseFloat(lon.toFixed(6)), parseFloat(lat.toFixed(6))]
    },
    address: {
      street: `Road No. ${randomInt(1, 92)}`,
      suburb: hub.name,
      city: 'Hyderabad',
      postcode: `5000${randomInt(10, 99)}`,
      state: 'Telangana'
    },
    contact: contact,
    description: `A ${style.type.toLowerCase()} grooming destination located in the heart of ${hub.name}.`,
    openingHours: "Mo-Su 10:00-21:00",
    proximityLandmarks: [
      { name: `${hub.name} Metro Station`, distanceKm: parseFloat(randomFloat(0.5, 3.0).toFixed(2)) },
      { name: `${hub.name} Central Mall`, distanceKm: parseFloat(randomFloat(0.2, 2.0).toFixed(2)) }
    ],
    images: {
      banner: randomItem(IMAGES),
      thumbnail: randomItem(IMAGES),
      gallery: [randomItem(IMAGES), randomItem(IMAGES), randomItem(IMAGES)],
      aiMediaUrl: randomItem(IMAGES),
      aiFallbackUrl: null,
      aiTags: `${style.gender}, ${style.type.toLowerCase()}, haircut, skincare, trending`,
      lastAiEnrichedAt: new Date().toISOString()
    },
    serviceCategories: [randomItem(CATEGORIES), randomItem(CATEGORIES)],
    servesGender: style.gender,
    luxuryRating: randomFloat(3.5, 5.0),
    reviewCount: randomInt(10, 500),
    ratingSource: Math.random() > 0.5 ? 'real' : 'synthetic_placeholder',
    tier: tier,
    isFeatured: isPremium && Math.random() > 0.7,
    lastSyncedAt: new Date().toISOString(),
    priceTier: priceTier,
    aiResearchData: {
      summary: `AI analyzed reviews suggest high satisfaction for ${style.gender} grooming services.`,
      estimatedBasePrice: `₹${selectedServices[0]?.price || 500}`
    },
    listingVerified: claimStatus === 'approved',
    listingVerifiedAt: claimStatus === 'approved' ? new Date().toISOString() : null,
    badgeType: badgeType,
    owner: null,
    services: selectedServices,
    claimPending: null,
    claimPendingAt: null,
    claimPendingName: null,
    claimStatus: claimStatus,
    claimAdminMessage: null,
    claimResolvedAt: null,
    reports: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  salons.push(doc);
  }
}

fs.writeFileSync('AURA.salons.json', JSON.stringify(salons, null, 2));
console.log('Successfully generated AURA.salons.json with ' + salons.length + ' documents.');
