import { jsonLdString } from '@/lib/seo';

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Escaped by jsonLdString: no "</script>" can break out.
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
