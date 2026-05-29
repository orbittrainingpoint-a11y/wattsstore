'use client';

import { use } from 'react';

export function useRouteParams<T>(params: Promise<T>): T {
  return use(params);
}
