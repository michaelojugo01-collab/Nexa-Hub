import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Store links are nexahub.app/{slug}. When universal / app links arrive (F3), those paths
 * open here and go to the store screen. Static routes (welcome, account…) always win, and
 * those names are reserved slugs.
 */
export default function SlugRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Redirect href={{ pathname: '/store/[slug]', params: { slug: slug ?? '' } }} />;
}
