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
  title: 'Foundators — Ideas. Connect. Build. Impact.',
  description: 'A social network for founders and entrepreneurs. Find co-founders, programmers, mentors, and funding opportunities.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Foundators',
  },
  icons: {
    icon: '/icon-32x32.png',
    apple: '/icon-192x192.png',
  },
  openGraph: {
    title: 'Foundators — Ideas. Connect. Build. Impact.',
    description: 'A social network for founders and entrepreneurs.',
    type: 'website',
    siteName: 'Foundators',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Foundators — Ideas. Connect. Build. Impact.',
    description: 'A social network for founders and entrepreneurs.',
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
