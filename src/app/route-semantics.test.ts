import { describe, expect, it, vi } from 'vitest';
import { metadata } from './layout';
import ScannerPage from './scanner/page';

const permanentRedirect = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ permanentRedirect }));

describe('Task 2 route semantics', () => {
  it('permanently redirects scanner to history', () => {
    ScannerPage();
    expect(permanentRedirect).toHaveBeenCalledWith('/history');
  });

  it('marks the authenticated app noindex and nofollow', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false, nocache: true });
  });
});
