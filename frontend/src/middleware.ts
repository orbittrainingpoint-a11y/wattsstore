import { NextRequest, NextResponse } from 'next/server';
import { COUNTRY_TO_REGION } from '@/lib/utils';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') return NextResponse.next();

  const countryCode = (
    request.headers.get('x-geo-country-code') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    ''
  ).toUpperCase();
  const region = COUNTRY_TO_REGION[countryCode] ?? (countryCode.length === 2 ? countryCode.toLowerCase() : 'ae');
  const url = request.nextUrl.clone();
  url.pathname = `/${region}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/',
};
