import type { Metadata } from 'next';
import './globals.css';
import './session-controls.css';

export const metadata: Metadata = {
  title: { default: 'mattsapp', template: '%s | mattsapp' },
  description: 'Matt\'s private, auditable football card decision terminal',
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
