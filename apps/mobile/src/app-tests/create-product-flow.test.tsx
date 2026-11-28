import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as DocumentPicker from 'expo-document-picker';

import { readLocalDraft } from '@/features/products/use-product-draft';
import { api, mockServer } from '@/lib/api/client';
import { useMockControl } from '@/mocks/mock-control';
import { useAuthStore } from '@/stores/auth-store';
import { resetAppState, signInAs } from '@/test/session-helpers';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.setTimeout(60_000);

// The photo picker, crop screen and image shrinking are native: stand-ins that hand back a
// cover file that exists in the in-memory file system.
jest.mock('@/features/stores/images/pick-image', () => ({
  pickImage: async () => ({
    status: 'picked',
    image: { uri: 'file:///cache/photo.jpg', width: 1600, height: 1200 },
  }),
}));
jest.mock('@/features/stores/images/prepare-image', () => ({
  outputSize: {},
  prepareImage: async () => ({
    uri: 'file:///cache/cover.jpg',
    width: 1200,
    height: 900,
    sizeBytes: 180_000,
    contentType: 'image/jpeg',
  }),
}));
jest.mock('@/features/stores/images/ImageCropper', () => {
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    ImageCropper: ({ onDone, testID }: { onDone: (r: unknown) => void; testID: string }) => (
      <MockPressable
        testID={`${testID}-done`}
        onPress={() => onDone({ originX: 0, originY: 0, width: 1600, height: 1200 })}>
        <MockText>Use photo</MockText>
      </MockPressable>
    ),
  };
});

const fs = () => (jest.requireMock('expo-file-system') as { __fs: Map<string, Uint8Array> }).__fs;
const ADAEZE = '+2348031234567';

async function openApp(url: string) {
  const rendered = await renderRouter('./src/app', { initialUrl: '/' });
  await waitFor(() => expect(useAuthStore.getState().status).not.toBe('restoring'));
  await act(async () => appRouter.push(url as never));
  return rendered;
}

describe('create a product', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
    fs().clear();
    fs().set('file:///cache/cover.jpg', new Uint8Array(180_000));
    await signInAs(ADAEZE);
  });

  afterEach(async () => {
    await act(async () => {});
  });

  it('goes from Add product to live: ebook with a PDF, cover and preview pages', async () => {
    const started = Date.now();
    const router = await openApp('/store');
    await fireEvent.press(await screen.findByTestId('products-add', {}, { timeout: 10_000 }));

    // Step 1: type (from GET /v1/product-types)
    await fireEvent.changeText(await screen.findByTestId('type-search-field'), 'ebook');
    await fireEvent.press(await screen.findByText('Ebooks and guides'));

    // Step 2: details
    await fireEvent.changeText(
      await screen.findByTestId('product-title-field', {}, { timeout: 10_000 }),
      'Ankara Sewing Guide',
    );
    await fireEvent.changeText(
      screen.getByTestId('product-description-field'),
      'Sew 10 Ankara styles at home.',
    );
    await fireEvent.changeText(screen.getByTestId('product-price-field'), '1,500.50');
    expect(
      await screen.findByText(/You’ll receive about ₦1,415\.47 per sale/, {}, { timeout: 5000 }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('product-tag-suggestion-ankara'));
    await fireEvent.press(screen.getByTestId('editor-next'));

    // Step 3: the PDF, uploaded in parts
    fs().set('file:///cache/guide.pdf', new Uint8Array(11 * 1024 * 1024));
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///cache/guide.pdf',
          name: 'guide.pdf',
          mimeType: 'application/pdf',
          size: 11 * 1024 * 1024,
          lastModified: 0,
        },
      ],
    } as never);
    await fireEvent.press(await screen.findByTestId('main-file-choose'));
    expect(
      await screen.findByText(/Ready · 11 MB · \d+ pages/, {}, { timeout: 10_000 }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('editor-next'));

    // Step 4: cover (4:3) and 2 sample pages
    await fireEvent.press(await screen.findByTestId('cover-choose'));
    await fireEvent.press(await screen.findByTestId('cover-cropper-done'));
    await waitFor(
      () => expect(screen.getByTestId('cover-choose')).toHaveTextContent('Change cover'),
      { timeout: 10_000 },
    );
    await fireEvent.press(screen.getByTestId('preview-pages-2'));
    await fireEvent.press(screen.getByTestId('editor-next'));

    // Step 5: visibility, buyer preview, publish
    await fireEvent.press(await screen.findByTestId('visibility-public'));
    await fireEvent.press(screen.getByTestId('open-buyer-preview'));
    expect(await screen.findByTestId('buyer-preview-view')).toHaveTextContent(
      /Ankara Sewing Guide/,
    );
    expect(screen.getByTestId('buyer-preview-view')).toHaveTextContent(/₦1,500\.50/);
    await fireEvent.press(screen.getByTestId('buyer-preview-close'));
    await fireEvent.press(screen.getByTestId('editor-publish'));

    expect(
      await screen.findByTestId('product-published', {}, { timeout: 10_000 }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('product-published-link')).toHaveTextContent(
      'nexahub.app/adaezeprints/ankara-sewing-guide',
    );
    expect(router.getPathname()).toMatch(/^\/seller\/products\/.+\/published$/);

    const pub = await api.getPublicProduct('adaezeprints', 'ankara-sewing-guide');
    expect(pub).toMatchObject({
      title: 'Ankara Sewing Guide',
      price: { amountKobo: 150050 },
      contentMode: 'DOWNLOAD_LIMITED',
      tags: [{ slug: 'ankara' }],
    });
    expect(pub.preview.pages).toHaveLength(2);
    expect(Date.now() - started).toBeLessThan(5 * 60_000);
  });

  it('a link product: the link is checked and only shown after purchase', async () => {
    const draft = await api.createProduct({ typeCode: 'A12', title: 'Notion study hub' });
    await openApp(`/seller/products/${draft.id}?step=content`);
    expect(
      await screen.findByText(/Only shown after purchase/, {}, { timeout: 10_000 }),
    ).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('product-link-field'), 'notion.so/x');
    expect(await screen.findByText('Enter a full link starting with https://')).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByTestId('product-link-field'),
      'https://www.notion.so/study-hub',
    );
    await waitFor(
      async () =>
        expect((await api.getOwnProduct(draft.id)).linkUrl).toBe('https://www.notion.so/study-hub'),
      { timeout: 5000 },
    );
  });

  it('shows why publishing is refused and goes to that step (rights not ticked)', async () => {
    const draft = await api.createProduct({ typeCode: 'A6', title: 'Gele masterclass' });
    await api.updateProduct(draft.id, { price: { amountKobo: 500000, currency: 'NGN' } });
    await openApp(`/seller/products/${draft.id}?step=publish`);
    expect(
      await screen.findByTestId('rights-declaration', {}, { timeout: 10_000 }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('editor-publish'));
    expect(await screen.findByTestId('editor-notice')).toHaveTextContent(
      /Upload the file buyers get\./,
    );
    expect(screen.getByTestId('step-content')).toBeOnTheScreen();
  });
});

describe('draft autosave', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
    fs().clear();
    await signInAs(ADAEZE);
  });

  afterEach(async () => {
    await act(async () => {});
  });

  it('keeps what was typed after the app closes before it reached the server', async () => {
    const draft = await api.createProduct({ typeCode: 'A1', title: 'First title' });
    const first = await openApp(`/seller/products/${draft.id}`);
    await fireEvent.changeText(
      await screen.findByTestId('product-title-field', {}, { timeout: 10_000 }),
      'Typed before the crash',
    );
    expect(readLocalDraft(draft.id)?.values.title).toBe('Typed before the crash');
    first.unmount(); // app killed before the 1.5 s server save

    expect((await api.getOwnProduct(draft.id)).title).toBe('First title');
    await openApp(`/seller/products/${draft.id}`);
    expect(
      await screen.findByDisplayValue('Typed before the crash', {}, { timeout: 10_000 }),
    ).toBeOnTheScreen();
    // …and it reaches the server once the app is back.
    await act(async () => {
      await fireEvent.changeText(screen.getByTestId('product-description-field'), 'More');
    });
    await waitFor(
      async () => expect((await api.getOwnProduct(draft.id)).title).toBe('Typed before the crash'),
      { timeout: 5000 },
    );
  });

  it('says it is saved on the phone while offline, then saves to the server', async () => {
    const draft = await api.createProduct({ typeCode: 'A1', title: 'Offline test' });
    await openApp(`/seller/products/${draft.id}`);
    useMockControl.setState({ offline: true });
    await fireEvent.changeText(
      await screen.findByTestId('product-title-field', {}, { timeout: 10_000 }),
      'Written offline',
    );
    await waitFor(
      () =>
        expect(screen.getByTestId('editor-save-status')).toHaveTextContent(
          'Offline, saved on this phone',
        ),
      { timeout: 5000 },
    );
    useMockControl.setState({ offline: false });
    await fireEvent.changeText(screen.getByTestId('product-title-field'), 'Written offline!');
    await waitFor(
      () => expect(screen.getByTestId('editor-save-status')).toHaveTextContent('Saved'),
      { timeout: 5000 },
    );
    expect((await api.getOwnProduct(draft.id)).title).toBe('Written offline!');
  });
});
