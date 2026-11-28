import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { PriceText } from '../PriceText';

describe('PriceText', () => {
  it('renders integer kobo as naira with thousands separators', async () => {
    await renderWithProviders(<PriceText amountKobo={1250000} testID="price" />);
    expect(screen.getByTestId('price')).toHaveTextContent('₦12,500');
  });

  it('shows kobo only when the amount has kobo', async () => {
    await renderWithProviders(<PriceText amountKobo={1250050} testID="price" />);
    expect(screen.getByTestId('price')).toHaveTextContent('₦12,500.50');
  });

  it('shows the original price before a sale price', async () => {
    await renderWithProviders(
      <PriceText amountKobo={250000} compareAtKobo={350000} testID="price" />,
    );
    expect(screen.getByTestId('price')).toHaveTextContent('₦3,500 ₦2,500');
  });

  it('ignores a compare-at price that is not higher', async () => {
    await renderWithProviders(
      <PriceText amountKobo={250000} compareAtKobo={250000} testID="price" />,
    );
    expect(screen.getByTestId('price')).toHaveTextContent('₦2,500');
  });

  it('has a spoken label for screen readers', async () => {
    await renderWithProviders(
      <PriceText amountKobo={250000} compareAtKobo={350000} testID="price" />,
    );
    expect(screen.getByTestId('price')).toHaveAccessibleName('2,500 naira, was 3,500 naira');
  });
});
