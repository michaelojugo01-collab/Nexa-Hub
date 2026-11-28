import { describe, expect, it, vi } from 'vitest';

import { setAnalyticsSender, track } from '../analytics';

describe('analytics', () => {
  it('logs events to the console in mock mode', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    track('get_app_click', { platform: 'android', path: '/adaezeprints', ref: 'ADA25' });
    expect(info).toHaveBeenCalledWith('[analytics]', 'get_app_click', {
      platform: 'android',
      path: '/adaezeprints',
      ref: 'ADA25',
    });
  });

  it('never throws, even if the sender fails', () => {
    setAnalyticsSender(() => {
      throw new Error('down');
    });
    expect(() => track('ref_code_copied', { ref: 'X1', path: '/' })).not.toThrow();
  });
});
