'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { OwnerLogoutButton } from '@/features/auth/owner-logout-button';

const primary = [
  { href: '/', label: 'Analyze' }, { href: '/history', label: 'History' }, { href: '/watchlist', label: 'Watchlist' },
] as const;
const more = [
  { href: '/portfolio', label: 'Portfolio' }, { href: '/performance', label: 'Performance' }, { href: '/data', label: 'Import Data' }, { href: '/settings', label: 'Settings' },
] as const;

export function routeIsActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ variant }: { variant: 'desktop' | 'mobile' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = menuRef.current;
    const trigger = triggerRef.current;
    const background = [...document.querySelectorAll<HTMLElement>('.terminal-header, main, .mobile-nav')];
    const prior = background.map((element) => ({ element, ariaHidden: element.getAttribute('aria-hidden'), inert: element.inert }));
    background.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    closeRef.current?.focus();

    const containFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog?.addEventListener('keydown', containFocus);
    return () => {
      dialog?.removeEventListener('keydown', containFocus);
      prior.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden', ariaHidden);
      });
      trigger?.focus();
    };
  }, [open]);

  if (variant === 'desktop') return <nav className="desktop-nav" aria-label="Primary navigation">
    {[...primary, ...more].map((item) => { const current = routeIsActive(pathname, item.href); return <Link key={item.href} className={current ? 'active' : ''} aria-current={current ? 'page' : undefined} href={item.href}>{item.label}</Link>; })}
  </nav>;

  const moreActive = more.some((item) => routeIsActive(pathname, item.href));
  return <>
    {open ? <><button className="nav-scrim" aria-label="Close More menu" onClick={() => setOpen(false)} /><div id="mobile-more-menu" className="mobile-more open" ref={menuRef} role="dialog" aria-modal="true" aria-label="More navigation">
      <div className="mobile-more-heading"><strong>MORE</strong><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close More menu">×</button></div>
      {more.map((item) => { const current = routeIsActive(pathname, item.href); return <Link key={item.href} onClick={() => setOpen(false)} className={current ? 'active' : ''} aria-current={current ? 'page' : undefined} href={item.href}>{item.label}<span aria-hidden="true">→</span></Link>; })}
      <OwnerLogoutButton />
    </div></> : null}
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {primary.map((item) => { const current = routeIsActive(pathname, item.href); return <Link key={item.href} className={current ? 'active' : ''} aria-current={current ? 'page' : undefined} href={item.href}><span aria-hidden="true">{item.href === '/' ? '⌁' : item.href === '/history' ? '◷' : '☆'}</span>{item.label}</Link>; })}
      <button ref={triggerRef} type="button" className={moreActive || open ? 'active' : ''} aria-current={moreActive ? 'page' : undefined} aria-expanded={open} aria-controls="mobile-more-menu" onClick={() => setOpen((value) => !value)}><span aria-hidden="true">•••</span>More</button>
    </nav>
  </>;
}
