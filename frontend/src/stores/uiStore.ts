import { create } from 'zustand';
import { CartView } from '@/types';

interface UiState {
  cartOpen: boolean;
  quoteOpen: boolean;
  cart: CartView | null;
  cartCount: number;
  quoteCount: number;
  setCartOpen: (open: boolean) => void;
  setQuoteOpen: (open: boolean) => void;
  setCart: (cart: CartView | null) => void;
  setQuoteCount: (n: number) => void;
}

/** Lightweight UI store for drawers + badge counts. Authoritative cart lives server-side. */
export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  quoteOpen: false,
  cart: null,
  cartCount: 0,
  quoteCount: 0,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setQuoteOpen: (quoteOpen) => set({ quoteOpen }),
  setCart: (cart) => set({ cart, cartCount: cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0 }),
  setQuoteCount: (quoteCount) => set({ quoteCount }),
}));
