"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { Waveform } from "@/components/Waveform";

import {

  DEFAULT_PROMPT_ID,

  getPromptById,

  type ListenRepeatPrompt,

} from "@/lib/prompts";



export interface PromptPlayerProps {

  /** Built-in prompt ID from lib/prompts.ts */

  promptId?: string;

  /** Override with a custom prompt object */

  prompt?: ListenRepeatPrompt;

  className?: string;

  showTranscript?: boolean;

  onPlayStateChange?: (playing: boolean) => void;

}



function speakWithBrowserTts(text: string, onEnd: () => void): SpeechSynthesisUtterance | null {

  if (typeof window === "undefined" || !window.speechSynthesis) return null;



  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "en-US";

  utterance.rate = 0.95;

  utterance.onend = onEnd;

  utterance.onerror = onEnd;

  window.speechSynthesis.speak(utterance);

  return utterance;

}



export function PromptPlayer({

  promptId = DEFAULT_PROMPT_ID,

  prompt: promptOverride,

  className = "",

  showTranscript = true,

  onPlayStateChange,

}: PromptPlayerProps) {

  const prompt = promptOverride ?? getPromptById(promptId);

  const [audioFailed, setAudioFailed] = useState(false);

  const [ttsPlaying, setTtsPlaying] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);



  useEffect(() => {

    setAudioFailed(false);

  }, [prompt?.id, prompt?.audioSrc]);



  useEffect(() => {

    return () => {

      window.speechSynthesis?.cancel();

    };

  }, []);



  const handleTtsPlay = useCallback(() => {

    if (!prompt?.transcript) return;



    if (ttsPlaying) {

      window.speechSynthesis?.cancel();

      setTtsPlaying(false);

      onPlayStateChange?.(false);

      return;

    }



    const utterance = speakWithBrowserTts(prompt.transcript, () => {

      setTtsPlaying(false);

      onPlayStateChange?.(false);

    });



    if (utterance) {

      utteranceRef.current = utterance;

      setTtsPlaying(true);

      onPlayStateChange?.(true);

    }

  }, [prompt?.transcript, ttsPlaying, onPlayStateChange]);



  if (!prompt) {

    return (

      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">

        Prompt not found: {promptId}

      </div>

    );

  }



  return (

    <div className={className}>

      <div className="flex items-baseline justify-between gap-2">

        <h2 className="text-sm font-medium text-slate-900">{prompt.title}</h2>

        <span className="shrink-0 text-xs capitalize text-slate-500">

          {prompt.difficulty}

        </span>

      </div>

      <p className="mt-1 text-xs text-slate-500">{prompt.topic}</p>



      {!audioFailed ? (

        <Waveform

          url={prompt.audioSrc}

          className="mt-4"

          onPlayStateChange={onPlayStateChange}

          onError={() => setAudioFailed(true)}

        />

      ) : (

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">

          <p className="text-xs text-amber-800">

            Model audio file not found. Use browser voice to hear the prompt.

          </p>

          <button

            type="button"

            onClick={handleTtsPlay}

            className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"

          >

            {ttsPlaying ? "Stop" : "Play prompt (TTS)"}

          </button>

        </div>

      )}



      {showTranscript && (

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">

          {prompt.transcript}

        </p>

      )}

    </div>

  );

}


