import * as Clipboard from 'expo-clipboard';
import { fireEvent, screen } from '@testing-library/react-native';
import { Platform, Share } from 'react-native';

import { useToastStore } from '@/stores/toast-store';
import { renderWithProviders } from '@/test/render';

import { ShareStoreSheet } from '../ShareStoreSheet';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

describe('share sheet', () => {
  const store = { name: 'Adaeze Prints', slug: 'adaezeprints' };

  it('copies the link', async () => {
    await renderWithProviders(<ShareStoreSheet visible onClose={() => {}} store={store} />);
    expect(screen.getByTestId('share-copy')).toHaveTextContent(/nexahub\.app\/adaezeprints/);
    await fireEvent.press(screen.getByTestId('share-copy'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('https://nexahub.app/adaezeprints');
    expect(useToastStore.getState().current).toMatchObject({ message: 'Link copied' });
  });

  it('opens the OS share sheet with the link', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await renderWithProviders(<ShareStoreSheet visible onClose={() => {}} store={store} />);
    await fireEvent.press(screen.getByTestId('share-native'));
    const [content] = share.mock.calls[0]!;
    const text = JSON.stringify(content);
    expect(text).toContain('https://nexahub.app/adaezeprints');
    if (Platform.OS === 'ios')
      expect(content).toMatchObject({ url: 'https://nexahub.app/adaezeprints' });
    else
      expect(content).toMatchObject({
        message: expect.stringContaining('https://nexahub.app/adaezeprints'),
      });
  });

  it('shows a QR code of the link', async () => {
    await renderWithProviders(<ShareStoreSheet visible onClose={() => {}} store={store} />);
    expect(screen.getByLabelText('QR code for nexahub.app/adaezeprints')).toBeOnTheScreen();
    expect(screen.getByTestId('share-qr-image')).toBeOnTheScreen();
  });
});
