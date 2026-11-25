import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIT 3D — Siliguri Institute of Technology Campus Navigation & Digital Twin',
  description:
    'Interactive 3D campus navigation, building and floor explorer, walking route calculation, and fresher orientation tour for Siliguri Institute of Technology (SIT), West Bengal, India.',
  keywords: [
    'Siliguri Institute of Technology',
    'SIT Siliguri',
    '3D Campus Map',
    'Campus Navigation',
    'Digital Twin',
    'Techno India Group',
    'Sukna',
    'Salbari',
    'Engineering College Siliguri',
  ],
  icons: {
    icon: '/sit-logo.webp',
    shortcut: '/sit-logo.webp',
    apple: '/sit-logo.webp',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased overflow-hidden bg-slate-950">{children}</body>
    </html>
  );
}
