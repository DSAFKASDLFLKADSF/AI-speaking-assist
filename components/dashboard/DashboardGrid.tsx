"use client";



import { useEffect, useState } from "react";

import { TestSetCard } from "@/components/dashboard/TestSetCard";

import { useAuthSession } from "@/lib/auth/useAuthSession";

import { applyLocalProgressToTestSets } from "@/lib/testLibrary/applyLocalProgress";

import { MOCK_TEST_SETS } from "@/lib/testLibrary";

import type { TestSet } from "@/lib/testLibrary/types";



export function DashboardGrid() {

  const { ready, userId } = useAuthSession();

  const [sets, setSets] = useState<TestSet[]>(MOCK_TEST_SETS);



  useEffect(() => {

    if (!ready) return;

    setSets(applyLocalProgressToTestSets(MOCK_TEST_SETS, userId));

  }, [ready, userId]);



  return (

    <>

      <p className="mb-5 text-xs text-slate-500">

        Scores reflect practice on this device for the current session. Sign in

        to sync history to your account.

      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

        {sets.map((testSet) => (

          <TestSetCard key={testSet.id} testSet={testSet} />

        ))}

      </div>

    </>

  );

}

