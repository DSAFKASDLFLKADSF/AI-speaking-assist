"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
