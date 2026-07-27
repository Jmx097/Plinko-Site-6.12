import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata = {
  metadataBase: new URL('https://plinko.solutions'),
  title: 'Plinko Solutions | In-House AI Operating Systems for Business',
  description:
    'Only ~0.04% of the world runs a real AI agent harness. Plinko builds private AI operating systems for growing businesses — one-time setup, no subscriptions, you own it.',
  keywords:
    'Claude Cowork setup, OpenClaw harness, Hermes AI agent, AI harness for business, private AI coworker, done for you AI setup, AI agent business automation, mid market AI',
  openGraph: {
    title: 'Plinko Solutions | Be the Red Dot',
    description:
      'Of 8.1 billion people, ~0.04% run an AI agent harness. Plinko puts your business in that sliver — private, owned, no subscriptions.',
    url: 'https://plinko.solutions/',
    type: 'website',
  },
  robots: 'index, follow, max-snippet:-1, max-image-preview:large',
};

export const viewport = {
  themeColor: '#3e9c63',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
