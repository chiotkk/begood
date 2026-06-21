import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NourishTrack',
  description: 'Fitness tracker logging diet, macros, and physiological experiences.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
