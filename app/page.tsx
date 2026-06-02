import Link from "next/link";
import { HomeLoginPrompt } from "@/components/HomeLoginPrompt";

const modes = [
  {
    title: "Listen & Repeat",
    description:
      "Section mock runs all prompts with topic visuals, or drill one item. Transcript can be hidden like the real test.",
    href: "/listen-repeat",
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
        />
      </svg>
    ),
  },
  {
    title: "Virtual Interview",
    description:
      "Section mock: four questions, examiner image, audio-only questions. Single-item drill with optional text.",
    href: "/interview",
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
  },
  {
    title: "Full Mock Exam",
    description:
      "Complete a timed TOEFL-style run: Listen & Repeat plus a full four-question interview. Scores appear only at the end, like the real test.",
    href: "/mock-exam",
    icon: (
      <svg
        className="h-7 w-7"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.072C9.116 3.64 8.25 4.604 8.25 5.658v8.892m0 0H5.375c-.621 0-1.125.504-1.125 1.125v4.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-4.5c0-.621-.504-1.125-1.125-1.125H8.25Z"
        />
      </svg>
    ),
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
          {/* Hero */}
          <section className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              TOEFL iBT · Speaking Section
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
              TOEFL Speaking AI
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Structured practice aligned with official task formats. Choose a
              mode to begin your session.
            </p>
          </section>

          {/* Mode cards */}
          <section className="mt-12 grid flex-1 gap-5 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {modes.map((mode) => (
              <Link
                key={mode.href}
                href={mode.href}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:p-8"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors group-hover:bg-slate-800">
                  {mode.icon}
                </div>
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  {mode.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {mode.description}
                </p>
                <span className="mt-6 inline-flex items-center text-sm font-medium text-slate-900">
                  Start practice
                  <svg
                    className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </Link>
            ))}
          </section>

          {/* Login prompt */}
          <section className="mt-10 text-center sm:mt-14">
            <HomeLoginPrompt />
          </section>
        </div>
      </main>
  );
}
