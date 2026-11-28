import Image from 'next/image';

function initials(name: string) {
  const letters = name
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .map((w) => Array.from(w)[0] ?? '')
    .filter((c) => c.toLowerCase() !== c.toUpperCase());
  return (
    ((letters[0] ?? '') + (letters.length > 1 ? (letters.at(-1) ?? '') : '')).toUpperCase() || '?'
  );
}

const sizes = { md: 48, lg: 96 } as const;

export function Avatar({
  name,
  src,
  size = 'md',
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  ring?: boolean;
}) {
  const px = sizes[size];
  const box = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-12 w-12 text-sm';
  const ringClass = ring ? 'ring-4 ring-accent' : 'ring-4 ring-bg';
  return src ? (
    <Image
      src={src}
      alt=""
      width={px}
      height={px}
      className={`${box} ${ringClass} rounded-full bg-surface-muted object-cover`}
    />
  ) : (
    <span
      aria-hidden
      className={`${box} ${ringClass} flex items-center justify-center rounded-full bg-primary font-bold text-text-inverse`}>
      {initials(name)}
    </span>
  );
}
