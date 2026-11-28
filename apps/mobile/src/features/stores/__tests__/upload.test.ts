import { act, renderHook, waitFor } from '@testing-library/react-native';

import { mockServer } from '@/lib/api/client';
import { useMockControl } from '@/mocks/mock-control';
import { resetAppState, signInAs } from '@/test/session-helpers';

import { uploadStoreImage } from '../images/upload-store-image';
import { useImageUpload } from '../images/use-image-upload';

jest.mock('@/lib/config', () => require('@/test/mock-config'));
jest.mock('../images/prepare-image', () => ({
  prepareImage: jest.fn(async (uri: string) => ({
    uri: `${uri}#prepared`,
    width: 800,
    height: 800,
    sizeBytes: 150_000,
    contentType: 'image/jpeg',
  })),
}));

const image = (sizeBytes: number) => ({
  uri: 'file:///cache/a.jpg',
  width: 800,
  height: 800,
  sizeBytes,
  contentType: 'image/jpeg' as const,
});
const crop = { originX: 0, originY: 0, width: 800, height: 800 };

describe('store image upload', () => {
  beforeEach(async () => {
    await resetAppState();
    await mockServer!.reset();
    await signInAs('+2348031234567'); // seller
  });

  it('refuses a file over the limit before uploading', async () => {
    await expect(
      uploadStoreImage({ kind: 'avatar', image: image(5 * 1024 * 1024 + 1) }),
    ).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
      message: 'Profile pictures can be up to 5 MB.',
    });
    // The same size is fine for a banner.
    await expect(
      uploadStoreImage({ kind: 'banner', image: image(5 * 1024 * 1024 + 1) }),
    ).resolves.toMatch(/^upl_/);
  });

  it('reports progress and returns the upload id', async () => {
    const progress: number[] = [];
    const id = await uploadStoreImage({
      kind: 'avatar',
      image: image(100_000),
      onProgress: (p) => progress.push(p),
    });
    expect(id).toMatch(/^upl_/);
    expect(progress.at(-1)).toBe(1);
  });

  it('fails, then succeeds on retry without preparing the image again', async () => {
    const { prepareImage } = jest.requireMock('../images/prepare-image') as {
      prepareImage: jest.Mock;
    };
    prepareImage.mockClear();
    useMockControl.setState({ uploadsFail: true });
    const { result } = await renderHook(() => useImageUpload('banner'));

    await act(() => result.current.start('file:///picked.jpg', crop));
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    expect(result.current.state).toMatchObject({
      canRetry: true,
      message: 'The upload didn’t finish. Check your connection and try again.',
    });

    useMockControl.setState({ uploadsFail: false });
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe('uploaded'));
    expect(result.current.state).toMatchObject({ localUri: 'file:///picked.jpg#prepared' });
    expect(prepareImage).toHaveBeenCalledTimes(1);

    await act(async () => result.current.remove());
    expect(result.current.state.status).toBe('empty');
  });
});
