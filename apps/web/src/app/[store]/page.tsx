import { isValidSlug } from '@nexa/api-contract';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

import { AppActions } from '@/components/AppActions';
import { Avatar } from '@/components/Avatar';
import { JsonLd } from '@/components/JsonLd';
import { PageShell } from '@/components/PageShell';
import { ProductCard } from '@/components/ProductCard';
import { RefCodeBox } from '@/components/RefCodeBox';
import { getFeaturedStoreSlugs, getStorePage } from '@/lib/data';
import { storeJsonLd, storeMetadata, storePath } from '@/lib/seo';

type Props = { params: Promise<{ store: string }> };

/** Prerender featured stores at build time; others render on first visit, then are cached. */
export async function generateStaticParams() {
  return (await getFeaturedStoreSlugs()).map((store) => ({ store }));
}

async function load(slug: string) {
  if (!isValidSlug(slug)) notFound();
  const result = await getStorePage(slug);
  if (result.kind === 'redirect') permanentRedirect(result.to);
  if (result.kind === 'not-found') notFound();
  return result.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store } = await load((await params).store);
  return storeMetadata(store);
}

export default async function StorePage({ params }: Props) {
  const { store, products } = await load((await params).store);
  const path = storePath(store);
  const banner = store.banner?.large ?? store.coverUrl;

  return (
    <PageShell path={path} type="store">
      <JsonLd data={storeJsonLd(store, products)} />
      <div className="relative aspect-[3/1] w-full overflow-hidden bg-surface-muted sm:rounded-lg">
        {banner ? (
          <Image
            src={banner}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        ) : (
          <div className="chrome-bar h-full w-full" aria-hidden />
        )}
      </div>
      <section className="-mt-12 flex flex-col gap-3 px-4">
        <Avatar
          name={store.name}
          src={store.avatar?.medium ?? store.avatarUrl}
          size="lg"
          ring={store.verified}
        />
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-text">
            {store.name}
            {store.verified ? (
              <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-semibold text-text">
                Verified
              </span>
            ) : null}
          </h1>
          <p className="text-sm text-text-muted">@{store.slug}</p>
        </div>
        {store.bio ? <p className="text-base text-text">{store.bio}</p> : null}
        <p className="text-sm text-text-muted" data-testid="store-meta">
          {[store.category?.name, store.location].filter(Boolean).join(' · ')}
        </p>
        <p className="text-sm text-text-muted">
          <strong className="text-text">{store.followerCount.toLocaleString('en-NG')}</strong>{' '}
          followers ·{' '}
          <strong className="text-text">{store.productCount.toLocaleString('en-NG')}</strong>{' '}
          products
        </p>
        <RefCodeBox path={path} />
        <AppActions path={path} />
      </section>

      <section className="px-4 pt-8" aria-labelledby="products-heading">
        <h2 id="products-heading" className="pb-3 text-lg font-bold text-text">
          Products
        </h2>
        {products.length ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 2} />
            ))}
          </div>
        ) : (
          <p
            className="rounded-lg border border-border p-6 text-center text-sm text-text-muted"
            data-testid="store-empty">
            No products yet. Follow {store.name} in the app to hear when they add some.
          </p>
        )}
      </section>
    </PageShell>
  );
}
