'use client';

import { useState } from 'react';

import { track } from '@/lib/analytics';

import { useRefCode } from './client-state';

/**
 * ?ref=CODE → "Use code CODE when you sign up" with Copy. Referral codes can't reliably
 * survive an app install without a deep-link vendor (spec F3), so people carry it themselves.
 */
export function RefCodeBox({ path }: { path: string }) {
  const ref = useRefCode();
  const [copied, setCopied] = useState(false);
  if (!ref) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(ref!);
      setCopied(true);
      track('ref_code_copied', { ref: ref!, path });
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="flex items-center gap-3 rounded-md border border-accent bg-accent-muted px-4 py-3"
      data-testid="ref-box">
      <p className="flex-1 text-sm text-text">
        Use code <strong data-testid="ref-code">{ref}</strong> when you sign up
      </p>
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-text bg-surface px-3 py-1 text-sm font-semibold text-text"
        data-testid="ref-copy">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
