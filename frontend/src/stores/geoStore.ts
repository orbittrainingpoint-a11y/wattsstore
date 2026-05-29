import { create } from 'zustand';

interface GeoState {
  region: string; // url slug: ae | ke | de | global
  countryCode: string;
  currencyCode: string;
  setRegion: (region: string, countryCode: string, currencyCode: string) => void;
}

export const useGeoStore = create<GeoState>((set) => ({
  region: 'ae',
  countryCode: 'AE',
  currencyCode: 'AED',
  setRegion: (region, countryCode, currencyCode) => set({ region, countryCode, currencyCode }),
}));
