/**
 * Drop-off measurement for the public pages (spec F3: "measure it from week one").
 * Mock mode logs to the console. To add PostHog later, implement `send` with
 * posthog.capture(event, props): call sites stay the same.
 */
export type PageType = 'store' | 'product' | 'profile' | 'home' | 'not_found';

export type AnalyticsEvent =
  | { event: 'page_view'; props: { type: PageType; path: string; ref: string | null } }
  | { event: 'open_in_app_click'; props: { platform: string; path: string; ref: string | null } }
  | { event: 'get_app_click'; props: { platform: string; path: string; ref: string | null } }
  | { event: 'ref_code_copied'; props: { ref: string; path: string } };

type Sender = (event: string, props: Record<string, unknown>) => void;

const mode = process.env.NEXT_PUBLIC_ANALYTICS ?? 'mock';

let send: Sender = (event, props) => {
  if (mode === 'mock') console.info('[analytics]', event, props);
};

export function track<K extends AnalyticsEvent['event']>(
  event: K,
  props: Extract<AnalyticsEvent, { event: K }>['props'],
) {
  try {
    send(event, props);
  } catch {
    // Analytics must never break the page.
  }
}

/** Tests and a future PostHog adapter replace the sender. */
export function setAnalyticsSender(sender: Sender) {
  send = sender;
}
