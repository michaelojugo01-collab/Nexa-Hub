import { isValidSlug } from '@nexa/api-contract';
import { site } from '@nexa/config/site';

/**
 * Maps a link that opened the app to an app route. Public web links (F3) use the site's paths:
 *   https://nexahub.app/{store}            → /store/{store}
 *   https://nexahub.app/{store}/{product}  → /product/{store}/{product}
 *   https://nexahub.app/@{username}        → /user/{username}
 * The same paths work with the app scheme (nexahub://adaezeprints). App routes such as
 * nexahub://store/{slug} pass through. Anything else opens Home. Development-client and
 * Expo Go URLs are left alone. The query string (e.g. ?ref=CODE) is kept.
 */

/** First path segments that are app routes, not store slugs (all are reserved slugs). */
const APP_ROUTES = new Set([
  'store',
  'product',
  'user',
  'seller',
  'account',
  'dev',
  'welcome',
  'phone',
  'verify',
  'email-sign-in',
  'add-email',
  'username',
  'photo',
  'interests',
  'discover',
  'messages',
  'profile',
]);

const PRODUCT_SLUG = /^(?!.*--)[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
const USERNAME = /^[a-z][a-z0-9_]{2,19}$/;
const HOME = '/';

function splitUrl(url: string): { scheme: string | null; host: string; rest: string } {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(.*)$/i.exec(url);
  if (!match) return { scheme: null, host: '', rest: url };
  return { scheme: match[1]!.toLowerCase(), host: match[2]!.toLowerCase(), rest: match[3] ?? '' };
}

/** Path (and query) inside our domain or scheme, or null for URLs that aren't ours. */
function ownPath(url: string): string | null {
  const { scheme, host, rest } = splitUrl(url);
  if (scheme === null) return url.startsWith('/') ? url : `/${url}`;
  if (scheme === 'https' || scheme === 'http') {
    return host === site.domain || host === `www.${site.domain}` ? rest || '/' : null;
  }
  // nexahub://adaezeprints/product: the "host" is the first path segment.
  if (scheme === site.scheme) return `/${host}${rest}`;
  return null;
}

export function mapIncomingLink(url: string): string {
  const path = ownPath(url);
  if (path === null) return url; // dev client, Expo Go, other apps' links: not ours to change

  const [pathname = '/', ...queryParts] = path.split('?');
  const query = queryParts.length ? `?${queryParts.join('?')}` : '';
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });

  if (segments.length === 0) return HOME;
  const [first, second] = segments as [string, string | undefined];

  if (APP_ROUTES.has(first)) return `${pathname}${query}`;

  if (first.startsWith('@') && segments.length === 1) {
    const username = first.slice(1).toLowerCase();
    return USERNAME.test(username) ? `/user/${username}${query}` : HOME;
  }

  const store = first.toLowerCase();
  if (!isValidSlug(store)) return HOME;
  if (segments.length === 1) return `/store/${store}${query}`;
  if (segments.length === 2 && second && PRODUCT_SLUG.test(second.toLowerCase())) {
    return `/product/${store}/${second.toLowerCase()}${query}`;
  }
  return HOME;
}
