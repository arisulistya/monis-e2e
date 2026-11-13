// Catalog availability can differ between environments. Keep these staging
// prerequisites together so a changed listing can be updated without changing test intent.
export const markets = {
  bali: { city: 'Bali', category: 'Furniture', product: 'Ergonomic Office Chair' },
  chiangMai: { city: 'Chiang Mai', category: 'Monitors', product: '24" Full HD Office Monitor MP251' },
  lisbon: { city: 'Lisbon', category: 'Monitors', product: 'Lisbon Monitor incom' },
};

// These real places are part of the MI-805 scenarios, not environment settings.
export const places = {
  seminyak: { query: 'Seminyak', result: /Seminyak Village.*Bali/ },
  chiangMai: { query: 'MAYA Lifestyle Shopping Center', result: /^MAYA Lifestyle Shopping Center.*Chiang Mai/i, name: 'MAYA Lifestyle Shopping Center' },
  lisbon: { query: 'Armazéns do Chiado', result: /^Armazéns do Chiado Rua do Carmo, Lisbon, Portugal$/i, name: 'Armazéns do Chiado' },
};

// Public place details observed on staging, used only to seed saved-address prerequisites.
export const savedPlaceDetails: Record<string, { label: string; address: string; lat: number; long: number; place_id: string }> = {
  'Seminyak': { label: 'Seminyak Village', address: 'Seminyak Village, Jl. Kayu Cendana No.8, Seminyak, Kec. Kuta, Kabupaten Badung, Bali 80361, Indonesia', lat: -8.6833565, long: 115.157134, place_id: 'ChIJR-PPjBBH0i0ROpxHpPPJp58' },
  'Kuta Beach': { label: 'Kuta Beach', address: 'Kuta Beach, Kuta, Badung Regency, Bali, Indonesia', lat: -8.7184926, long: 115.1686322, place_id: 'ChIJQw23KrxG0i0RjrRKL-Gq_oI' },
  'MAYA Lifestyle Shopping Center': { label: 'MAYA Lifestyle Shopping Center', address: 'MAYA Lifestyle Shopping Center, 55/5 Huay Kaew Rd, Tambon Chang Phueak, Amphoe Mueang Chiang Mai, Chang Wat Chiang Mai 50300, Thailand', lat: 18.8019077, long: 98.9675833, place_id: 'ChIJC1o2yWE62jARfjKPh-dUjiQ' },
};
