import {

  formatDisplayScore,

  getScoreBand,

  progressPercent,

  SCORE_BAND_FILL,

  SCORE_BAND_TEXT,

  SCORE_MAX,

  toDisplayScore,

} from "@/lib/testLibrary/scores";

import type { TestQuestionProgress } from "@/lib/testLibrary/types";



export interface QuestionProgressRowProps {

  question: TestQuestionProgress;

}



const MIN_BAR_PCT = 10;



export function QuestionProgressRow({ question }: QuestionProgressRowProps) {

  const display = toDisplayScore(question.score);

  const hasScore = display != null;

  const band = getScoreBand(display);

  const textClass = SCORE_BAND_TEXT[band];



  const fillPct = hasScore

    ? Math.max(MIN_BAR_PCT, progressPercent(display, SCORE_MAX))

    : question.status === "in_progress"

      ? MIN_BAR_PCT

      : 0;



  return (

    <div className="grid grid-cols-[1.75rem_1fr_2.5rem] items-center gap-2">

      <span className="text-xs font-medium text-slate-500">{question.label}</span>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

        <div

          className="h-full rounded-full"

          style={{

            width: `${fillPct}%`,

            backgroundColor: SCORE_BAND_FILL[band],

          }}

        />

      </div>

      <span

        className={`text-right text-xs font-medium tabular-nums ${textClass}`}

      >

        {hasScore ? formatDisplayScore(question.score) : "—"}

      </span>

    </div>

  );

}


