import ThemeRegistry from '../src/components/ThemeRegistry';
import '../src/styles/global.css';

const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Baseball Scores',
    template: '%s',
  },
  description: 'ambient soundtracks for the national pastime',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    siteName: 'Baseball Scores',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1a2f16" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
