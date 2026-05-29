'use client';

import { useCallback } from 'react';
import { api } from './api';
import { CartView } from '@/types';
import { useUiStore } from '@/stores/uiStore';

/** Cart mutations that keep the UI store badge/drawer in sync with the server. */
export function useCart(region: string) {
  const setCart = useUiStore((s) => s.setCart);
  const setCartOpen = useUiStore((s) => s.setCartOpen);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<CartView>('/cart', { country: region });
      setCart(data);
      return data;
    } catch {
      setCart(null);
      return null;
    }
  }, [region, setCart]);

  const addItem = useCallback(
    async (variantId: number, quantity = 1) => {
      const { data } = await api.post<CartView>('/cart/items', { variantId, quantity }, { country: region });
      setCart(data);
      setCartOpen(true);
      return data;
    },
    [region, setCart, setCartOpen],
  );

  const updateItem = useCallback(
    async (variantId: number, quantity: number) => {
      const { data } = await api.put<CartView>(`/cart/items/${variantId}`, { quantity }, { country: region });
      setCart(data);
      return data;
    },
    [region, setCart],
  );

  const removeItem = useCallback(
    async (variantId: number) => {
      const { data } = await api.del<CartView>(`/cart/items/${variantId}`, { country: region });
      setCart(data);
      return data;
    },
    [region, setCart],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      const { data } = await api.post<CartView>('/cart/coupon', { code }, { country: region });
      setCart(data);
      return data;
    },
    [region, setCart],
  );

  const removeCoupon = useCallback(async () => {
    const { data } = await api.del<CartView>('/cart/coupon', { country: region });
    setCart(data);
    return data;
  }, [region, setCart]);

  return { refresh, addItem, updateItem, removeItem, applyCoupon, removeCoupon };
}
