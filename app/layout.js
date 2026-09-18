import { Montserrat, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Providers from './Providers';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'Foundators — Social Network for Founders',
    template: '%s | Foundators',
  },
  description: 'Connect with founders, builders, and creators. Share ideas, find co-founders, and build the future.',
  keywords: ['founders', 'startup', 'builder', 'co-founder', 'entrepreneur', 'network'],
  authors: [{ name: 'Foundators' }],
  creator: 'Foundators',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://foundators.app',
    siteName: 'Foundators',
    title: 'Foundators — Social Network for Founders',
    description: 'Connect with founders, builders, and creators.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Foundators — Social Network for Founders',
    description: 'Connect with founders, builders, and creators.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  themeColor: '#d9ac3d',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Foundators',
  },
  icons: {
    icon: '/icon-32x32.png',
    apple: '/icon-192x192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020202',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="font-body antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:bg-gold focus:px-4 focus:py-2 focus:text-[#1a1300] focus:font-bold">
          Skip to main content
        </a>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
