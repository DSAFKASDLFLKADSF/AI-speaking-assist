"use client";

import { useEffect, useState } from "react";
import { TestSetCard } from "@/components/dashboard/TestSetCard";
import { applyLocalProgressToTestSets } from "@/lib/testLibrary/applyLocalProgress";
import { MOCK_TEST_SETS } from "@/lib/testLibrary";
import type { TestSet } from "@/lib/testLibrary/types";

export function DashboardGrid() {
  const [sets, setSets] = useState<TestSet[]>(MOCK_TEST_SETS);

  useEffect(() => {
    setSets(applyLocalProgressToTestSets(MOCK_TEST_SETS));
  }, []);

  return (
    <>
      <p className="mb-5 text-xs text-slate-500">
        Scores reflect your practice on this device (saved locally). New sets
        start at 0.0 until you complete questions.
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {sets.map((testSet) => (
          <TestSetCard key={testSet.id} testSet={testSet} />
        ))}
      </div>
    </>
  );
}
