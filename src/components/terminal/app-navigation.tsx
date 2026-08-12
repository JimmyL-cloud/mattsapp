'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { OwnerLogoutButton } from '@/features/auth/owner-logout-button';

const primary = [
  { href: '/', label: 'Analyze' },
  { href: '/history', label: 'History' },
  { href: '/watchlist', label: 'Watchlist' },
] as const;

const more = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/performance', label: 'Performance' },
  { href: '/data', label: 'Import Data' },
  { href: '/settings', label: 'Settings' },
] as const;

function active(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ variant }: { variant: 'desktop' | 'mobile' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  if (variant === 'desktop') {
    return <nav className="desktop-nav" aria-label="Primary navigation">
      {primary.map((item) => <Link key={item.href} className={active(pathname, item.href) ? 'active' : ''} href={item.href}>{item.label}</Link>)}
      {more.map((item) => <Link key={item.href} className={active(pathname, item.href) ? 'active' : ''} href={item.href}>{item.label}</Link>)}
    </nav>;
  }

  const moreActive = more.some((item) => active(pathname, item.href));
  return <>
    {open ? <button className="nav-scrim" aria-label="Close More menu" onClick={() => setOpen(false)} /> : null}
    <div id="mobile-more-menu" className={`mobile-more ${open ? 'open' : ''}`} ref={menuRef} role="dialog" aria-modal="true" aria-label="More navigation" aria-hidden={!open}>
      <div className="mobile-more-heading"><strong>MORE</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close More menu">×</button></div>
      {more.map((item) => <Link key={item.href} onClick={() => setOpen(false)} className={active(pathname, item.href) ? 'active' : ''} href={item.href}>{item.label}<span aria-hidden="true">→</span></Link>)}
      <OwnerLogoutButton />
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {primary.map((item) => <Link key={item.href} className={active(pathname, item.href) ? 'active' : ''} href={item.href}><span aria-hidden="true">{item.href === '/' ? '⌁' : item.href === '/history' ? '◷' : '☆'}</span>{item.label}</Link>)}
      <button type="button" className={moreActive || open ? 'active' : ''} aria-expanded={open} aria-controls="mobile-more-menu" onClick={() => setOpen((value) => !value)}><span aria-hidden="true">•••</span>More</button>
    </nav>
  </>;
}
