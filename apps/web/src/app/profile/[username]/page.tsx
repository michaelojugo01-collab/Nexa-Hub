import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { AppActions } from '@/components/AppActions';
import { Avatar } from '@/components/Avatar';
import { JsonLd } from '@/components/JsonLd';
import { PageShell } from '@/components/PageShell';
import { RefCodeBox } from '@/components/RefCodeBox';
import { getProfilePage } from '@/lib/data';
import { profileJsonLd, profileMetadata, profilePath, storePath } from '@/lib/seo';

// Reached through the /@:username rewrite in next.config.ts; canonical is /@username.
type Props = { params: Promise<{ username: string }> };

export async function generateStaticParams() {
  return [];
}

async function load(params: Props['params']) {
  const username = decodeURIComponent((await params).username).toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(username)) notFound();
  const result = await getProfilePage(username);
  if (result.kind !== 'found') notFound();
  return result.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata(await load(params));
}

export default async function ProfilePage({ params }: Props) {
  const profile = await load(params);
  const path = profilePath(profile);
  const name = profile.displayName ?? `@${profile.username}`;
  const joined = new Date(profile.createdAt).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <PageShell path={path} type="profile">
      <JsonLd data={profileJsonLd(profile)} />
      <section className="flex flex-col items-start gap-3 px-4 pt-6">
        <Avatar name={name} src={profile.avatarUrl} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-text">{name}</h1>
          <p className="text-sm text-text-muted">
            @{profile.username} · Joined {joined}
          </p>
        </div>
        {profile.bio ? <p className="text-base text-text">{profile.bio}</p> : null}
        {profile.store ? (
          <Link
            href={storePath(profile.store)}
            prefetch={false}
            className="flex w-full items-center gap-3 rounded-lg border border-border p-3"
            data-testid="profile-store-card">
            <Avatar
              name={profile.store.name}
              src={profile.store.avatarUrl}
              ring={profile.store.verified}
            />
            <span className="flex-1">
              <span className="block text-base font-semibold text-text">{profile.store.name}</span>
              <span className="block text-sm text-text-muted">Visit store</span>
            </span>
          </Link>
        ) : null}
        <RefCodeBox path={path} />
        <div className="w-full">
          <AppActions path={path} />
        </div>
      </section>
    </PageShell>
  );
}
