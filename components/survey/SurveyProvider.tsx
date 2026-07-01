"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PostSurveyForm } from "@/components/survey/PostSurveyForm";
import { PreSurveyForm } from "@/components/survey/PreSurveyForm";
import { SurveyFAB } from "@/components/survey/SurveyFAB";
import { SurveyModal } from "@/components/survey/SurveyModal";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { getOrCreateSurveyClientId } from "@/lib/surveys/clientId";
import {
  fetchSurveyStatus,
  submitPostSurvey,
  submitPreSurvey,
} from "@/lib/surveys/api";
import {
  POST_SURVEY_COPY,
  PRE_SURVEY_COPY,
} from "@/lib/surveys/questions";
import {
  getViewerSurveyKey,
  readSurveyLocalState,
  SURVEY_PRACTICE_COMPLETE_EVENT,
  writeSurveyLocalState,
} from "@/lib/surveys/localState";
import type { SurveyStatus } from "@/lib/surveys/types";

type ModalKind = "pre" | "post" | null;

export function SurveyProvider() {
  const pathname = usePathname();
  const { user, ready } = useAuthSession();
  const clientId = getOrCreateSurveyClientId();
  const viewerKey = getViewerSurveyKey(user?.id ?? null, clientId);

  const [status, setStatus] = useState<SurveyStatus | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);
  const [postMinimized, setPostMinimized] = useState(false);

  const inLibrary =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/growth") ||
    pathname.startsWith("/test/");

  const refreshStatus = useCallback(async () => {
    try {
      const remote = await fetchSurveyStatus();
      const local = readSurveyLocalState(viewerKey);
      const merged: SurveyStatus = {
        preCompleted: remote.preCompleted || local.preCompleted,
        postCompleted: remote.postCompleted || local.postCompleted,
        postPending: local.postPending && !remote.postCompleted,
        preMinimized: local.preMinimized,
      };
      writeSurveyLocalState(viewerKey, merged);
      setStatus(merged);
      return merged;
    } catch {
      const local = readSurveyLocalState(viewerKey);
      setStatus(local);
      return local;
    }
  }, [viewerKey]);

  useEffect(() => {
    if (!ready || !inLibrary) return;
    void refreshStatus().then((s) => {
      if (!s.preCompleted && !s.preMinimized) {
        setModal("pre");
        setFabVisible(false);
      } else if (!s.preCompleted && s.preMinimized) {
        setFabVisible(true);
      } else if (s.postPending && !s.postCompleted) {
        if (postMinimized) {
          setFabVisible(true);
        } else {
          setModal("post");
          setFabVisible(false);
        }
      }
    });
  }, [ready, inLibrary, viewerKey, refreshStatus, postMinimized]);

  useEffect(() => {
    const onPracticeComplete = () => {
      void refreshStatus().then((s) => {
        if (s.preCompleted && s.postPending && !s.postCompleted) {
          setPostMinimized(false);
          setModal("post");
          setFabVisible(false);
        }
      });
    };
    window.addEventListener(SURVEY_PRACTICE_COMPLETE_EVENT, onPracticeComplete);
    return () =>
      window.removeEventListener(
        SURVEY_PRACTICE_COMPLETE_EVENT,
        onPracticeComplete
      );
  }, [refreshStatus]);

  const handleClosePre = () => {
    writeSurveyLocalState(viewerKey, { preMinimized: true });
    setModal(null);
    if (!status?.preCompleted) setFabVisible(true);
  };

  const handleClosePost = () => {
    setPostMinimized(true);
    setModal(null);
    if (status?.postPending && !status?.postCompleted) setFabVisible(true);
  };

  const handlePreSubmit = async (answers: Parameters<typeof submitPreSurvey>[0]) => {
    setSubmitting(true);
    try {
      const local = readSurveyLocalState(viewerKey);
      const result = await submitPreSurvey(
        answers,
        local.postPending && !local.postCompleted
      );
      writeSurveyLocalState(viewerKey, {
        preCompleted: true,
        preMinimized: false,
        preCompletedAt: new Date().toISOString(),
      });
      const updated = await refreshStatus();
      if (result.showPostImmediately && !updated.postCompleted) {
        setPostMinimized(false);
        setTimeout(() => {
          setModal("post");
          setFabVisible(false);
        }, 1200);
      } else {
        setTimeout(() => {
          setModal(null);
          setFabVisible(false);
        }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostSubmit = async (
    answers: Parameters<typeof submitPostSurvey>[0]
  ) => {
    setSubmitting(true);
    try {
      await submitPostSurvey(answers);
      writeSurveyLocalState(viewerKey, {
        postCompleted: true,
        postPending: false,
        postCompletedAt: new Date().toISOString(),
      });
      setPostMinimized(false);
      await refreshStatus();
      setTimeout(() => {
        setModal(null);
        setFabVisible(false);
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  const openFab = () => {
    if (!status?.preCompleted) {
      setModal("pre");
      writeSurveyLocalState(viewerKey, { preMinimized: false });
    } else if (status.postPending && !status.postCompleted) {
      setModal("post");
      setPostMinimized(false);
    }
    setFabVisible(false);
  };

  const showFab =
    fabVisible &&
    !modal &&
    (!status?.preCompleted ||
      (Boolean(status?.postPending) && !status?.postCompleted));

  if (!inLibrary) return null;

  return (
    <>
      {showFab && (
        <SurveyFAB
          variant={!status?.preCompleted ? "pre" : "post"}
          onClick={openFab}
        />
      )}

      <SurveyModal
        open={modal === "pre"}
        title={PRE_SURVEY_COPY.title}
        subtitle={PRE_SURVEY_COPY.subtitle}
        onClose={handleClosePre}
      >
        <PreSurveyForm onSubmit={handlePreSubmit} submitting={submitting} />
      </SurveyModal>

      <SurveyModal
        open={modal === "post"}
        title={POST_SURVEY_COPY.title}
        subtitle={POST_SURVEY_COPY.subtitle}
        onClose={handleClosePost}
      >
        <PostSurveyForm onSubmit={handlePostSubmit} submitting={submitting} />
      </SurveyModal>
    </>
  );
}
