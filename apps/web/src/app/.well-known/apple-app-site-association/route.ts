import { appleAppSiteAssociation, wellKnownResponse } from '@/lib/well-known';

export const dynamic = 'force-static';

export function GET() {
  return wellKnownResponse(appleAppSiteAssociation());
}
