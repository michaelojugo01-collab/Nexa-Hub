import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ListItem,
  PriceText,
  ProductCard,
  Screen,
  Sheet,
  Skeleton,
  StoreHeader,
  Toast,
} from '@/components';
import { toast } from '@/stores/toast-store';
import { useTheme } from '@/theme/ThemeProvider';

const SAMPLE_IMAGE = 'https://picsum.photos/seed/nexa-ankara/600/600';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3 border-b border-border py-6">
      <Text accessibilityRole="header" className="text-lg font-bold text-text">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="text-xs font-medium uppercase text-text-subtle">{children}</Text>;
}

/** Dev-only gallery: every component in every state. Not reachable in production builds. */
export default function ComponentsGallery() {
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen scroll edges={[]} testID="components-gallery">
      <Section title="Button">
        <Label>Variants</Label>
        <Button label="Primary" testID="btn-primary" />
        <Button label="Secondary" variant="secondary" testID="btn-secondary" />
        <Button label="Ghost" variant="ghost" testID="btn-ghost" />
        <Label>Loading</Label>
        <Button label="Primary" loading />
        <Button label="Secondary" variant="secondary" loading />
        <Label>Disabled</Label>
        <Button label="Primary" disabled />
        <Button label="Secondary" variant="secondary" disabled />
        <Button label="Ghost" variant="ghost" disabled />
        <Label>Small, with icon</Label>
        <View className="flex-row gap-2">
          <Button
            label="Share store"
            size="sm"
            icon={<Ionicons name="share-outline" size={16} color={colors.textInverse} />}
          />
          <Button label="Small" size="sm" variant="secondary" />
        </View>
      </Section>

      <Section title="Input">
        <Input label="Store name" placeholder="e.g. Adaeze Prints" testID="input-default" />
        <Input
          label="Username"
          defaultValue="adaeze"
          helper="This is your store link: nexahub.ng/adaeze"
          testID="input-helper"
        />
        <Input
          label="Phone number"
          defaultValue="0803 123"
          keyboardType="phone-pad"
          error="Enter an 11-digit Nigerian number"
          testID="input-error"
        />
        <Input label="Email" defaultValue="locked@nexahub.ng" disabled testID="input-disabled" />
      </Section>

      <Section title="Card">
        <Card>
          <Text className="text-base font-semibold text-text">Static card</Text>
          <Text className="text-sm text-text-muted">Content grouped on a surface.</Text>
        </Card>
        <Card onPress={() => toast.show('Card pressed')} accessibilityLabel="Pressable card">
          <Text className="text-base font-semibold text-text">Pressable card</Text>
          <Text className="text-sm text-text-muted">Tap me.</Text>
        </Card>
      </Section>

      <Section title="Badge">
        <View className="flex-row flex-wrap gap-2">
          <Badge label="Neutral" />
          <Badge label="Featured" variant="chrome" />
          <Badge label="Seller" variant="inverse" />
          <Badge label="Paid" variant="success" />
          <Badge label="Pending" variant="warning" />
          <Badge label="Failed" variant="error" />
        </View>
      </Section>

      <Section title="Avatar">
        <View className="flex-row items-end gap-3">
          <Avatar name="Tunde Bakare" size="sm" />
          <Avatar name="Tunde Bakare" size="md" />
          <Avatar name="Tunde Bakare" size="lg" uri="https://picsum.photos/seed/nexa-tunde/200" />
          <Avatar name="Chiamaka Obi" size="xl" ring />
        </View>
      </Section>

      <Section title="PriceText">
        <PriceText amountKobo={450000} testID="price-whole" />
        <PriceText amountKobo={1250050} size="lg" />
        <PriceText amountKobo={2500000} compareAtKobo={3500000} size="xl" />
        <PriceText amountKobo={0} alwaysShowKobo />
        <PriceText amountKobo={-25000} />
      </Section>

      <Section title="Skeleton">
        <View className="flex-row gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </View>
        </View>
        <Skeleton className="h-40 w-full rounded-lg" />
      </Section>

      <Section title="ListItem">
        <Card flush className="px-4">
          <ListItem title="Plain row" />
          <ListItem title="With subtitle" subtitle="Secondary text" icon="document-text-outline" />
          <ListItem
            title="Pressable"
            icon="wallet-outline"
            onPress={() => toast.show('Row pressed')}
          />
          <ListItem
            title="Custom left and right"
            left={<Avatar name="Ngozi Eze" size="md" />}
            right={<Badge label="New" variant="chrome" />}
          />
          <ListItem title="Disabled" icon="lock-closed-outline" onPress={() => {}} disabled last />
        </Card>
      </Section>

      <Section title="ProductCard">
        <View className="flex-row gap-3">
          <ProductCard
            className="flex-1"
            title="Ankara Print Pattern Pack (40 designs)"
            storeName="Adaeze Prints"
            priceKobo={450000}
            imageUrl={SAMPLE_IMAGE}
            typeLabel="Digital"
            featured
            onPress={() => toast.show('Product pressed')}
          />
          <ProductCard
            className="flex-1"
            title="JAMB Physics Past Questions 2015–2025"
            storeName="StudySmart Abuja"
            priceKobo={150000}
            compareAtKobo={250000}
            typeLabel="Ebook"
            onPress={() => {}}
          />
        </View>
        <ProductCard
          layout="row"
          title="Logo design — 3 concepts"
          storeName="Kola Creates"
          priceKobo={2500000}
          typeLabel="Service"
          onPress={() => {}}
        />
      </Section>

      <Section title="StoreHeader">
        <View className="-mx-4">
          <StoreHeader
            name="Adaeze Prints"
            slug="adaezeprints"
            location="Yaba, Lagos"
            bio="Hand-drawn Ankara patterns and print-ready textile designs."
            followerCount={12480}
            productCount={36}
            verified
            following={following}
            onFollowPress={() => setFollowing((f) => !f)}
          />
        </View>
        <View className="-mx-4">
          <StoreHeader name="New Store" slug="newstore" followerCount={0} productCount={0} />
        </View>
      </Section>

      <Section title="EmptyState">
        <Card>
          <EmptyState
            title="No products yet"
            description="Add your first product to start selling."
            actionLabel="Add product"
            onAction={() => toast.show('Action pressed')}
          />
        </Card>
      </Section>

      <Section title="ErrorState">
        <Card>
          <ErrorState onRetry={() => toast.show('Retrying…')} />
        </Card>
        <Card>
          <ErrorState variant="offline" />
        </Card>
        <Card>
          <ErrorState onRetry={() => {}} retrying message="Retrying now…" />
        </Card>
      </Section>

      <Section title="Toast">
        <Toast message="Info toast" />
        <Toast message="Product published" variant="success" />
        <Toast message="Payment failed. Try again." variant="error" />
        <View className="flex-row flex-wrap gap-2">
          <Button
            label="Show info"
            size="sm"
            variant="secondary"
            onPress={() => toast.show('Link copied')}
          />
          <Button
            label="Show success"
            size="sm"
            variant="secondary"
            onPress={() => toast.show('Saved', 'success')}
          />
          <Button
            label="Show error"
            size="sm"
            variant="secondary"
            onPress={() => toast.show('Something went wrong', 'error')}
          />
        </View>
      </Section>

      <Section title="Sheet">
        <Button label="Open sheet" onPress={() => setSheetOpen(true)} testID="open-sheet" />
        <Sheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Share your store"
          testID="demo-sheet">
          <ListItem icon="link-outline" title="Copy link" onPress={() => setSheetOpen(false)} />
          <ListItem
            icon="logo-whatsapp"
            title="WhatsApp"
            onPress={() => setSheetOpen(false)}
            last
          />
        </Sheet>
      </Section>

      <Section title="Screen">
        <Text className="text-sm text-text-muted">
          This page is itself a Screen (safe-area wrapper with scroll).
        </Text>
      </Section>
    </Screen>
  );
}
