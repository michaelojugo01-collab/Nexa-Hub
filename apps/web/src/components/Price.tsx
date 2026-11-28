import type { Money } from '@nexa/api-contract';
import { formatKobo } from '@nexa/ui';

/** Shows what the server sent; no price maths on the web either. */
export function Price({
  price,
  compareAt,
  large = false,
}: {
  price: Money;
  compareAt?: Money | null;
  large?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-2">
      <span
        className={large ? 'text-2xl font-bold text-text' : 'text-base font-semibold text-text'}>
        {formatKobo(price.amountKobo)}
      </span>
      {compareAt ? (
        <s className="text-sm text-text-subtle">{formatKobo(compareAt.amountKobo)}</s>
      ) : null}
    </span>
  );
}
