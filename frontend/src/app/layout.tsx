import type { Metadata, Viewport } from 'next';
import { Montserrat, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'WattsStore — Industrial Electrical, Lighting & Solar', template: '%s | WattsStore' },
  description: 'Global industrial e-commerce: explosion-proof lighting, solar equipment, cables and power control. B2C retail + B2B bulk quotes.',
  applicationName: 'WattsStore',
  authors: [{ name: 'WattsStore FZE' }],
  keywords: ['industrial lighting','solar panels','ATEX','IECEx','MCB','cable gland','B2B','procurement','RFQ'],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/img/logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/img/logo.svg' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'WattsStore',
    title: 'WattsStore — Industrial Catalog',
    description: 'Industrial lighting, solar and power equipment with formal B2B quotations.',
    images: ['/img/banners/cms/industrial-hero.jpg'],
  },
  twitter: { card: 'summary_large_image', title: 'WattsStore', description: 'Live industrial catalog and B2B quotes', images: ['/img/banners/cms/industrial-hero.jpg'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#0b1f3d' }],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover', // enables safe-area inset on iOS
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${montserrat.variable} ${mono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
