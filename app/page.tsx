import Link from "next/link";
import { HomeLoginPrompt } from "@/components/HomeLoginPrompt";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
        <section className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            TOEFL iBT · Speaking Section
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            TOEFL Speaking AI
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            Official ETS practice sets with exam-style flow: automated recording,
            single-play audio, and scores only at the end.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-full bg-slate-900 px-8 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open Test Library
          </Link>
        </section>

        <section className="mt-14 text-center">
          <HomeLoginPrompt />
        </section>
      </div>
    </main>
  );
}
