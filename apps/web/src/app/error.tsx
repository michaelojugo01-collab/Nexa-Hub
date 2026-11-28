'use client';

/** Server or network problem (not a missing page). */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-4 px-4 pt-16">
      <h1 className="text-2xl font-bold text-text">Something went wrong</h1>
      <p className="text-base text-text-muted">Please check your connection and try again.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-3 text-base font-semibold text-text-inverse">
        Try again
      </button>
    </main>
  );
}
