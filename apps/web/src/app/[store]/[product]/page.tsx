import { isValidSlug } from '@nexa/api-contract';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

import { AppActions } from '@/components/AppActions';
import { Avatar } from '@/components/Avatar';
import { JsonLd } from '@/components/JsonLd';
import { PageShell } from '@/components/PageShell';
import { Price } from '@/components/Price';
import { RefCodeBox } from '@/components/RefCodeBox';
import { getProductPage } from '@/lib/data';
import {
  productJsonLd,
  productMetadata,
  productPath,
  productPriceTags,
  storePath,
} from '@/lib/seo';

type Props = { params: Promise<{ store: string; product: string }> };

function productFacts(product: Awaited<ReturnType<typeof load>>) {
  const mb = product.content.fileSizeBytes ? product.content.fileSizeBytes / (1024 * 1024) : null;
  const minutes = product.content.durationSeconds
    ? Math.round(product.content.durationSeconds / 60)
    : null;
  return [
    product.typeName,
    product.content.fileLabel,
    product.content.pageCount ? `${product.content.pageCount} pages` : null,
    minutes ? `${minutes} min` : null,
    mb ? `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB` : null,
  ].filter(Boolean);
}

/** Every product renders on its first visit, then is cached (ISR). */
export async function generateStaticParams() {
  return [];
}

async function load(params: Props['params']) {
  const { store, product } = await params;
  if (!isValidSlug(store) || !/^[a-z0-9-]{3,60}$/.test(product)) notFound();
  const result = await getProductPage(store, product);
  if (result.kind === 'redirect') permanentRedirect(result.to);
  if (result.kind === 'not-found') notFound();
  return result.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return productMetadata(await load(params));
}

export default async function ProductPage({ params }: Props) {
  const product = await load(params);
  const path = productPath(product);
  const cover = product.images[0] ?? product.imageUrl;
  const store = product.storeInfo;

  return (
    <PageShell path={path} type="product">
      {productPriceTags(product).map((tag) => (
        <meta key={tag.property} property={tag.property} content={tag.content} />
      ))}
      <JsonLd data={productJsonLd(product)} />
      <div className="relative aspect-square w-full overflow-hidden bg-surface-muted sm:rounded-lg">
        {cover ? (
          <Image
            src={cover}
            alt={product.title}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        ) : (
          <div className="chrome-bar h-full w-full" aria-hidden />
        )}
      </div>
      <section className="flex flex-col gap-3 px-4 pt-5">
        <span className="text-xs font-medium uppercase text-text-muted" data-testid="product-facts">
          {productFacts(product).join(' · ')}
        </span>
        <h1 className="text-2xl font-bold text-text">{product.title}</h1>
        <Price price={product.price} compareAt={product.compareAtPrice} large />
        {product.description ? <p className="text-base text-text">{product.description}</p> : null}
        {product.preview.pages.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Sample pages">
            {product.preview.pages.map((page, i) => (
              <Image
                key={page}
                src={page}
                alt={`Sample page ${i + 1}`}
                width={128}
                height={160}
                className="h-40 w-32 flex-none rounded-md border border-border object-cover"
              />
            ))}
          </div>
        ) : null}
        <RefCodeBox path={path} />
        <AppActions path={path} primaryLabel="Buy in the app" />
        <p className="text-xs text-text-subtle">
          Payment happens securely in the Nexa Hub app. This page never asks for card details.
        </p>
      </section>

      <section className="px-4 pt-6" aria-label="Sold by">
        <Link
          href={storePath(store)}
          prefetch={false}
          className="flex items-center gap-3 rounded-lg border border-border p-3"
          data-testid="product-store-card">
          <Avatar name={store.name} src={store.avatarUrl} ring={store.verified} />
          <span className="flex-1">
            <span className="block text-base font-semibold text-text">{store.name}</span>
            <span className="block text-sm text-text-muted">
              {[store.location, `${store.followerCount.toLocaleString('en-NG')} followers`]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <span className="text-sm font-semibold text-text">Visit store</span>
        </Link>
      </section>
    </PageShell>
  );
}
