import Ionicons from '@expo/vector-icons/Ionicons';
import {
  isValidProductLink,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_MIN_PRICE_KOBO,
  PRODUCT_TAGS_MAX,
  PRODUCT_TITLE_MAX,
  type OwnProduct,
  type ProductTypeDef,
} from '@nexa/api-contract';
import { formatKobo, parseNairaToKobo } from '@nexa/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, Input, Screen, Skeleton } from '@/components';
import { errorCode, errorMessage, isOfflineError } from '@/lib/api/error-message';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/use-online';
import { InlineNotice } from '@/features/auth/InlineNotice';
import { InterestChip } from '@/features/onboarding/InterestChip';
import { useCategories } from '@/features/onboarding/use-categories';
import { CategoryPicker } from '@/features/stores/StoreFormFields';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';

import { CoverField, MainFileField, PreviewClipField } from './ContentFields';
import { modeWords } from './product-ui';
import { ProductBuyerView } from './ProductBuyerView';
import { PreviewPages } from './PreviewPlayers';
import { usePublishProduct } from './use-product-actions';
import {
  clearLocalDraft,
  saveStatusText,
  useProductDraft,
  type DraftValues,
} from './use-product-draft';
import { useFeePreview } from './use-fee-preview';
import { useOwnProduct } from './use-own-product';
import { typeOf, useProductTypes } from './use-product-types';
import { useTagSuggestions } from './use-tags';

const STEPS = ['details', 'content', 'cover', 'publish'] as const;
type Step = (typeof STEPS)[number];
const STEP_TITLES: Record<Step, string> = {
  details: 'Details',
  content: 'Content',
  cover: 'Cover and preview',
  publish: 'Visibility and publish',
};
/** Where to send the seller when publishing is refused. */
const STEP_FOR_ERROR: Record<string, Step> = {
  PRICE_TOO_LOW: 'details',
  TITLE_TOO_LONG: 'details',
  CATEGORY_NOT_ALLOWED: 'details',
  VALIDATION_ERROR: 'details',
  ASSET_NOT_READY: 'content',
  LINK_INVALID: 'content',
  COVER_REQUIRED: 'cover',
  RIGHTS_DECLARATION_REQUIRED: 'publish',
};

/** Create (steps 2–5) and edit, for every product type. */
export function ProductEditorScreen() {
  const { id = '', step } = useLocalSearchParams<{ id: string; step?: Step }>();
  const product = useOwnProduct(id);
  const types = useProductTypes();
  const type = typeOf(types.data, product.data?.typeCode ?? '');

  if (product.isPending || types.isPending) {
    return (
      <Screen testID="editor-loading" edges={['top', 'bottom']}>
        <View className="gap-4 pt-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </View>
      </Screen>
    );
  }
  const error = product.error ?? types.error;
  if (error || !product.data || !type) {
    return (
      <Screen testID="editor-error" edges={['top', 'bottom']}>
        <ErrorState
          className="flex-1"
          variant={isOfflineError(error) ? 'offline' : 'error'}
          message={error ? errorMessage(error) : 'We couldn’t open this product.'}
          onRetry={() => void Promise.all([product.refetch(), types.refetch()])}
          testID="editor-error-state"
        />
      </Screen>
    );
  }
  return (
    <Editor
      key={product.data.id}
      product={product.data}
      type={type}
      initialStep={STEPS.includes(step as Step) ? (step as Step) : 'details'}
    />
  );
}

function Editor({
  product,
  type,
  initialStep,
}: {
  product: OwnProduct;
  type: ProductTypeDef;
  initialStep: Step;
}) {
  const { colors } = useTheme();
  const online = useOnline();
  const draft = useProductDraft(product, online);
  const { values, update } = draft;
  const [step, setStep] = useState<Step>(initialStep);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const publish = usePublishProduct();
  const index = STEPS.indexOf(step);
  const isDraft = product.state === 'draft';

  async function leave() {
    await draft.flush();
    if (router.canGoBack()) router.back();
    else router.replace('/store');
  }

  async function onPublish() {
    setNotice(null);
    await draft.flush();
    if (values.visibility === 'draft') {
      await leave();
      return;
    }
    publish.mutate(
      { id: product.id, visibility: values.visibility },
      {
        onSuccess: (published) => {
          clearLocalDraft(product.id);
          router.replace({
            pathname: '/seller/products/[id]/published',
            params: { id: published.id },
          });
        },
        onError: (error) => {
          const target = STEP_FOR_ERROR[errorCode(error) ?? ''];
          if (target) setStep(target);
          setNotice(
            isOfflineError(error)
              ? 'You’re offline. Publish again when you’re connected.'
              : errorMessage(error),
          );
        },
      },
    );
  }

  return (
    <Screen testID="product-editor" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 py-3">
        <Pressable
          onPress={() => (index === 0 ? void leave() : setStep(STEPS[index - 1]!))}
          accessibilityRole="button"
          accessibilityLabel={index === 0 ? 'Close' : 'Previous step'}
          hitSlop={12}
          testID="editor-back">
          <Ionicons name={index === 0 ? 'close' : 'arrow-back'} size={24} color={colors.text} />
        </Pressable>
        <View className="flex-1 gap-1">
          <View className="flex-row justify-between">
            <Text className="text-xs font-medium text-text-muted" testID="editor-step-label">
              {isDraft ? `Step ${index + 2} of 5 · ` : ''}
              {STEP_TITLES[step]}
            </Text>
            <Text
              className="text-xs text-text-muted"
              accessibilityLiveRegion="polite"
              testID="editor-save-status">
              {saveStatusText(draft.status, online)}
            </Text>
          </View>
          <View
            className="h-1 w-full overflow-hidden rounded-full bg-surface-muted"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: 5, now: index + 2 }}>
            <View className="h-full bg-primary" style={{ width: `${((index + 2) / 5) * 100}%` }} />
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-8 pt-2"
        keyboardShouldPersistTaps="handled">
        <Text className="text-xs font-semibold uppercase text-text-muted" testID="editor-type">
          {type.name}
        </Text>
        {draft.status === 'error' && draft.error ? (
          <InlineNotice tone="error" message={draft.error} testID="editor-save-error" />
        ) : null}
        {notice ? <InlineNotice tone="error" message={notice} testID="editor-notice" /> : null}
        {step === 'details' ? <DetailsStep values={values} update={update} /> : null}
        {step === 'content' ? (
          <ContentStep product={product} type={type} values={values} update={update} />
        ) : null}
        {step === 'cover' ? (
          <CoverStep product={product} type={type} values={values} update={update} />
        ) : null}
        {step === 'publish' ? (
          <PublishStep
            product={product}
            type={type}
            values={values}
            update={update}
            onPreview={() => setPreviewing(true)}
          />
        ) : null}
      </ScrollView>

      <View className="gap-2 py-3">
        {step !== 'publish' ? (
          <Button
            label="Next"
            onPress={() => setStep(STEPS[index + 1]!)}
            fullWidth
            testID="editor-next"
          />
        ) : isDraft ? (
          <Button
            label={values.visibility === 'draft' ? 'Save draft' : 'Publish'}
            onPress={() => void onPublish()}
            loading={publish.isPending}
            disabled={!online && values.visibility !== 'draft'}
            fullWidth
            testID="editor-publish"
          />
        ) : (
          <Button label="Done" onPress={() => void leave()} fullWidth testID="editor-done" />
        )}
        {!online && isDraft && step === 'publish' ? (
          <Text className="text-center text-xs text-text-muted">
            You’re offline. Your work is saved on this phone.
          </Text>
        ) : null}
      </View>

      <Modal visible={previewing} animationType="slide" onRequestClose={() => setPreviewing(false)}>
        <ThemeScope>
          <SafeAreaView className="flex-1 bg-bg" testID="buyer-preview">
            <View className="flex-row items-center justify-between px-4 py-2">
              <Text className="text-base font-semibold text-text">Preview as a buyer</Text>
              <Button
                label="Close"
                size="sm"
                variant="ghost"
                onPress={() => setPreviewing(false)}
                testID="buyer-preview-close"
              />
            </View>
            <PreviewAsBuyer product={product} type={type} values={values} />
          </SafeAreaView>
        </ThemeScope>
      </Modal>
    </Screen>
  );
}

type StepProps = { values: DraftValues; update: (patch: Partial<DraftValues>) => void };

// ── Step 2: details ─────────────────────────────────────────────────────────

function DetailsStep({ values, update }: StepProps) {
  const titleLength = values.title.trim().length;
  const descLength = values.description.trim().length;
  const kobo = parseNairaToKobo(values.priceText);
  const priceError =
    values.priceText === ''
      ? undefined
      : kobo === null
        ? 'Enter a price in naira, like 1500 or 1,500.50'
        : kobo < PRODUCT_MIN_PRICE_KOBO
          ? 'The minimum price is ₦100'
          : undefined;

  return (
    <View className="gap-5" testID="step-details">
      <Input
        label="Title"
        placeholder="What buyers see first"
        value={values.title}
        onChangeText={(title) => update({ title })}
        error={
          titleLength > PRODUCT_TITLE_MAX
            ? `${titleLength}/${PRODUCT_TITLE_MAX} · Too long`
            : undefined
        }
        helper={`${titleLength}/${PRODUCT_TITLE_MAX}`}
        testID="product-title"
      />
      <Input
        label="Description"
        placeholder="What’s inside, who it’s for, what they’ll get"
        multiline
        textAlignVertical="top"
        value={values.description}
        onChangeText={(description) => update({ description })}
        error={
          descLength > PRODUCT_DESCRIPTION_MAX
            ? `${descLength}/${PRODUCT_DESCRIPTION_MAX} · Too long`
            : undefined
        }
        helper={`${descLength}/${PRODUCT_DESCRIPTION_MAX}`}
        testID="product-description"
      />
      <CategoryPicker
        value={values.categorySlug}
        onChange={(categorySlug) => update({ categorySlug })}
        testID="product-category"
      />
      <TagsField tags={values.tags} onChange={(tags) => update({ tags })} />
      <View className="gap-1">
        <Input
          label="Price"
          prefix="₦"
          placeholder="1500"
          keyboardType="decimal-pad"
          value={values.priceText}
          onChangeText={(priceText) => update({ priceText: priceText.replace(/[^\d.,]/g, '') })}
          error={priceError}
          helper="Minimum ₦100"
          testID="product-price"
        />
        <FeeLine priceKobo={priceError ? null : kobo} />
      </View>
    </View>
  );
}

/** "You'll receive about ₦X per sale": the server's number, never computed here. */
function FeeLine({ priceKobo }: { priceKobo: number | null }) {
  const online = useOnline();
  const fee = useFeePreview(priceKobo);
  if (priceKobo === null || priceKobo <= 0) return null;
  let text: string;
  if (!online) text = 'We’ll show what you receive when you’re online.';
  else if (fee.isError) text = 'Couldn’t work out what you receive. Try again in a moment.';
  else if (!fee.data || fee.data.price.amountKobo !== priceKobo)
    text = 'Working out what you receive…';
  else
    text = `You’ll receive about ${formatKobo(fee.data.youReceive.amountKobo)} per sale (fee: ${fee.data.label}).`;
  return (
    <Text className="text-sm text-text-muted" accessibilityLiveRegion="polite" testID="product-fee">
      {text}
    </Text>
  );
}

function TagsField({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState('');
  const suggestions = useTagSuggestions(text);
  const full = tags.length >= PRODUCT_TAGS_MAX;

  function add(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/^#/, '');
    if (!tag || tags.includes(tag) || full) return;
    onChange([...tags, tag.slice(0, 30)]);
    setText('');
  }

  return (
    <View className="gap-2" testID="product-tags">
      <Input
        label={`Tags (up to ${PRODUCT_TAGS_MAX})`}
        placeholder={full ? 'You’ve added 5 tags' : 'e.g. ankara'}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => add(text)}
        autoCapitalize="none"
        autoCorrect={false}
        disabled={full}
        returnKeyType="done"
        testID="product-tag-input"
      />
      {tags.length ? (
        <View className="flex-row flex-wrap gap-2">
          {tags.map((t) => (
            <InterestChip
              key={t}
              label={`#${t} ×`}
              selected
              onPress={() => onChange(tags.filter((x) => x !== t))}
              testID={`product-tag-${t}`}
            />
          ))}
        </View>
      ) : null}
      {!full && suggestions.data?.length ? (
        <View className="flex-row flex-wrap gap-2">
          {suggestions.data
            .filter((s) => !tags.includes(s.slug))
            .slice(0, 6)
            .map((s) => (
              <InterestChip
                key={s.slug}
                label={`#${s.name}`}
                selected={false}
                onPress={() => add(s.slug)}
                testID={`product-tag-suggestion-${s.slug}`}
              />
            ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Step 3: content ─────────────────────────────────────────────────────────

function ContentStep({
  product,
  type,
  values,
  update,
}: StepProps & { product: OwnProduct; type: ProductTypeDef }) {
  const { colors } = useTheme();
  const canChooseMode = type.modes.length > 1 && product.state === 'draft';
  const linkProblem =
    values.linkUrl && !isValidProductLink(values.linkUrl)
      ? 'Enter a full link starting with https://'
      : undefined;
  return (
    <View className="gap-5" testID="step-content">
      {canChooseMode ? (
        <View className="gap-2">
          <Text className="text-sm font-medium text-text">How do buyers get it?</Text>
          <View className="flex-row flex-wrap gap-2">
            {type.modes.map((mode) => (
              <InterestChip
                key={mode}
                label={modeWords[mode].short}
                selected={values.contentMode === mode}
                onPress={() => update({ contentMode: mode })}
                testID={`product-mode-${mode}`}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Text className="text-sm text-text-muted" testID="product-mode-words">
        {modeWords[values.contentMode].buyer}
      </Text>
      {values.contentMode === 'LINK' ? (
        <View className="gap-2">
          <Input
            label="Link buyers get"
            placeholder="https://"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={values.linkUrl}
            onChangeText={(linkUrl) => update({ linkUrl })}
            error={linkProblem}
            testID="product-link"
          />
          <View className="flex-row items-center gap-2">
            <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
            <Text className="text-xs text-text-muted">
              Only shown after purchase. Never on your public page.
            </Text>
          </View>
        </View>
      ) : values.contentMode !== product.contentMode ? (
        <Text className="text-sm text-text-muted">Saving your choice…</Text>
      ) : (
        <MainFileField product={product} type={type} />
      )}
    </View>
  );
}

// ── Step 4: cover and preview ───────────────────────────────────────────────

function CoverStep({
  product,
  type,
  values,
  update,
}: StepProps & { product: OwnProduct; type: ProductTypeDef }) {
  return (
    <View className="gap-5" testID="step-cover">
      <CoverField product={product} />
      <View className="gap-2">
        <Text accessibilityRole="header" className="text-base font-semibold text-text">
          Free preview (optional)
        </Text>
        {type.preview === 'pages' && values.contentMode !== 'LINK' ? (
          <>
            <Text className="text-sm text-text-muted">
              Show the first pages of your file as a sample.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <InterestChip
                  key={n}
                  label={n === 0 ? 'None' : `${n} page${n > 1 ? 's' : ''}`}
                  selected={values.previewPages === n}
                  onPress={() => update({ previewPages: n })}
                  testID={`preview-pages-${n}`}
                />
              ))}
            </View>
            {product.preview.pages.length ? (
              <PreviewPages pages={product.preview.pages} />
            ) : values.previewPages > 0 ? (
              <Text className="text-xs text-text-muted">
                Pages appear here once your file is processed.
              </Text>
            ) : null}
          </>
        ) : type.preview === 'video_clip' || type.preview === 'audio_clip' ? (
          <PreviewClipField
            product={product}
            kind={type.preview === 'video_clip' ? 'video' : 'audio'}
          />
        ) : (
          <Text className="text-sm text-text-muted">
            Buyers see your cover and description for this type.
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Step 5: visibility, rights, preview, publish ────────────────────────────

const VISIBILITY: { key: DraftValues['visibility']; title: string; line: string }[] = [
  { key: 'public', title: 'Public', line: 'In your store, on Nexa Hub and in search.' },
  {
    key: 'unlisted',
    title: 'Unlisted',
    line: 'Only people with the link can find it. Not in your store or search.',
  },
  { key: 'draft', title: 'Draft', line: 'Not for sale yet. Only you can see it.' },
];

function PublishStep({
  product,
  type,
  values,
  update,
  onPreview,
}: StepProps & { product: OwnProduct; type: ProductTypeDef; onPreview: () => void }) {
  const { colors } = useTheme();
  const options =
    product.state === 'draft' ? VISIBILITY : VISIBILITY.filter((v) => v.key !== 'draft');
  return (
    <View className="gap-5" testID="step-publish">
      <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel="Visibility">
        {options.map((v) => (
          <Pressable
            key={v.key}
            onPress={() => update({ visibility: v.key })}
            accessibilityRole="radio"
            accessibilityState={{ checked: values.visibility === v.key }}
            testID={`visibility-${v.key}`}
            className={cn(
              'flex-row items-start gap-3 rounded-lg border p-3',
              values.visibility === v.key ? 'border-primary' : 'border-border',
            )}>
            <Ionicons
              name={values.visibility === v.key ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={colors.text}
            />
            <View className="flex-1">
              <Text className="text-base font-semibold text-text">{v.title}</Text>
              <Text className="text-sm text-text-muted">{v.line}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {type.rightsRequired ? (
        <Pressable
          onPress={() => update({ rightsDeclared: !values.rightsDeclared })}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.rightsDeclared }}
          testID="rights-declaration"
          className="flex-row items-start gap-3 rounded-lg border border-border p-3">
          <Ionicons
            name={values.rightsDeclared ? 'checkbox' : 'square-outline'}
            size={22}
            color={colors.text}
          />
          <Text className="flex-1 text-sm text-text">
            I own the rights to this content, or have permission to sell it (including any samples
            or music in it). Nexa Hub removes content within 48 hours of a valid claim.
          </Text>
        </Pressable>
      ) : null}
      <Button
        label="Preview as a buyer"
        variant="secondary"
        onPress={onPreview}
        testID="open-buyer-preview"
      />
    </View>
  );
}

function PreviewAsBuyer({
  product,
  type,
  values,
}: {
  product: OwnProduct;
  type: ProductTypeDef;
  values: DraftValues;
}) {
  const categories = useCategories();
  const main = product.assets.find((a) => a.id === product.mainAssetId);
  const kobo = parseNairaToKobo(values.priceText);
  return (
    <ProductBuyerView
      product={{
        title: values.title,
        typeName: type.name,
        contentMode: values.contentMode,
        price: kobo !== null ? { amountKobo: kobo, currency: 'NGN' } : null,
        compareAtPrice: null,
        coverUrl: product.coverUrl,
        description: values.description || null,
        preview: product.preview,
        category: categories.data?.find((c) => c.slug === values.categorySlug) ?? null,
        tags: values.tags.map((slug) => ({ slug, name: slug })),
        content: {
          pageCount: main?.pageCount ?? null,
          durationSeconds: main?.durationSeconds ?? null,
          fileSizeBytes:
            values.contentMode === 'DOWNLOAD_LIMITED' ? (main?.sizeBytes ?? null) : null,
          fileLabel:
            values.contentMode === 'DOWNLOAD_LIMITED' && main
              ? (main.fileName.split('.').pop() ?? '').toUpperCase()
              : null,
        },
        store: {
          slug: product.store.slug,
          name: product.store.name,
          avatarUrl: null,
          verified: false,
          location: null,
        },
      }}
      buyDisabled
      testID="buyer-preview-view"
    />
  );
}
