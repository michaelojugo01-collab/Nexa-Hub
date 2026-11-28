/** Joins class names, skipping falsy values: cn('p-4', isActive && 'bg-primary'). */
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
