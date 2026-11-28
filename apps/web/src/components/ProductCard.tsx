import type { ProductSummary } from '@nexa/api-contract';
import Image from 'next/image';
import Link from 'next/link';

import { productPath } from '@/lib/seo';

import { Price } from './Price';

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  return (
    <Link
      href={productPath(product)}
      prefetch={false}
      className="block overflow-hidden rounded-lg border border-border bg-surface"
      data-testid={`product-card-${product.slug}`}>
      <div className="relative aspect-square w-full bg-surface-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 300px"
            priority={priority}
            className="object-cover"
          />
        ) : null}
        {product.featured ? (
          <span className="absolute left-2 top-2 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-text">
            Featured
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="text-xs font-medium uppercase text-text-muted">{product.typeName}</span>
        <span className="line-clamp-2 text-sm font-semibold text-text">{product.title}</span>
        <Price price={product.price} compareAt={product.compareAtPrice} />
      </div>
    </Link>
  );
}
