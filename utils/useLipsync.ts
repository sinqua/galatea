import { useRef, useCallback, useEffect } from "react";
import { Lipsync, VISEMES } from "wawa-lipsync";
import { VRM } from "@pixiv/three-vrm";

const VISEME_TO_VRM: Partial<Record<VISEMES, { name: string; weight: number }[]>> = {
  [VISEMES.aa]: [{ name: "aa", weight: 1.0 }],
  [VISEMES.E]:  [{ name: "ee", weight: 1.0 }],
  [VISEMES.I]:  [{ name: "ih", weight: 1.0 }],
  [VISEMES.O]:  [{ name: "oh", weight: 1.0 }],
  [VISEMES.U]:  [{ name: "ou", weight: 1.0 }],
  [VISEMES.PP]: [{ name: "aa", weight: 0.3 }],
  [VISEMES.FF]: [{ name: "ih", weight: 0.4 }],
  [VISEMES.TH]: [{ name: "ih", weight: 0.3 }],
  [VISEMES.DD]: [{ name: "aa", weight: 0.5 }],
  [VISEMES.kk]: [{ name: "aa", weight: 0.4 }],
  [VISEMES.CH]: [{ name: "ih", weight: 0.5 }],
  [VISEMES.SS]: [{ name: "ih", weight: 0.3 }],
  [VISEMES.nn]: [{ name: "aa", weight: 0.2 }],
  [VISEMES.RR]: [{ name: "oh", weight: 0.4 }],
  [VISEMES.sil]: [],
};

const VRM_VISEME_NAMES = ["aa", "ih", "ou", "ee", "oh"] as const;

// 백엔드 emotion → VRM 1.0 expressionMap 키 변환
// (VRM 0.x presetName이 @pixiv/three-vrm 로드 시 자동 변환됨)
const EMOTION_TO_VRM: Record<string, string> = {
  joy:     "happy",
  angry:   "angry",
  sorrow:  "sad",
  fun:     "relaxed",
  neutral: "neutral",
};
const VRM_EMOTION_NAMES = ["happy", "angry", "sad", "relaxed", "neutral"] as const;
const EMOTION_WEIGHT = 1.0;
const EMOTION_DURATION_MS = 2000;

// 자동 눈 깜빡임 타이밍 설정
const BLINK_CLOSE_MS = 80;
const BLINK_OPEN_MS  = 80;
const BLINK_INTERVAL_MIN_MS = 2000;
const BLINK_INTERVAL_MAX_MS = 5000;


export function useLipsync(
  getVrm: () => VRM | null,
  onSpeakStart?: () => void,
  onSpeakEnd?: () => void,
) {
  const lipsyncRef = useRef<Lipsync | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const emotionRef = useRef<string | null>(null);
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkRef = useRef({
    phase: 'idle' as 'idle' | 'closing' | 'opening',
    phaseStartTime: 0,
    nextBlinkTime: performance.now() + 1000 + Math.random() * 3000,
  });
  const debugRef = useRef({
    audioState: 'idle' as 'idle' | 'playing' | 'ended' | 'error',
    viseme: 'viseme_sil',
    emotion: 'none',
    blobSize: 0,
    expressionManager: false,
  });

  useEffect(() => {
    lipsyncRef.current = new Lipsync({ fftSize: 2048, historySize: 10 });
    console.log('[Lipsync] 초기화 완료');

    const unlock = () => {
      const ctx = (lipsyncRef.current as any)?.audioContext as AudioContext | undefined;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => console.log('[Lipsync] AudioContext 사전 unlock 완료'));
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock);

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
      lipsyncRef.current = null;
    };
  }, []);

  const clearExpressions = useCallback(() => {
    const vrm = getVrm();
    if (!vrm) return;
    VRM_VISEME_NAMES.forEach((name) => vrm.expressionManager?.setValue(name, 0));
    VRM_EMOTION_NAMES.forEach((name) => vrm.expressionManager?.setValue(name, 0));
    emotionRef.current = null;
    debugRef.current.emotion = 'none';
  }, [getVrm]);

  const speak = useCallback(async (audioBlob: Blob, emotion?: string) => {
    const vrm = getVrm();
    console.log('[Lipsync] speak 호출 —', {
      blobSize: audioBlob.size,
      blobType: audioBlob.type,
      emotion,
      vrmReady: !!vrm,
      lipsyncReady: !!lipsyncRef.current,
    });

    if (!vrm || !lipsyncRef.current) {
      console.warn('[Lipsync] vrm 또는 lipsync 인스턴스 없음');
      return;
    }

    debugRef.current.blobSize = audioBlob.size;
    debugRef.current.expressionManager = !!vrm.expressionManager;

    if (audioBlob.size === 0) {
      console.error('[Lipsync] audioBlob이 비어있음 — 백엔드 응답 확인 필요');
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }

    // 이전 emotion 타이머 취소 후 새 emotion 설정 (VRM 1.0 키로 변환)
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    clearExpressions();
    const vrmEmotion = emotion ? (EMOTION_TO_VRM[emotion] ?? null) : null;
    emotionRef.current = vrmEmotion;
    debugRef.current.emotion = vrmEmotion ?? 'none';
    console.log(`[Lipsync] emotion 매핑: "${emotion}" → "${vrmEmotion}"`);

    if (vrmEmotion) {
      emotionTimerRef.current = setTimeout(() => {
        VRM_EMOTION_NAMES.forEach((name) => getVrm()?.expressionManager?.setValue(name, 0));
        emotionRef.current = null;
        debugRef.current.emotion = 'none';
      }, EMOTION_DURATION_MS);
    }

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio();
    audio.src = url;
    audioRef.current = audio;

    audio.onplay  = () => { debugRef.current.audioState = 'playing'; onSpeakStart?.(); console.log('[Lipsync] 오디오 재생 시작'); };
    audio.onended = () => {
      debugRef.current.audioState = 'ended';
      onSpeakEnd?.();
      console.log('[Lipsync] 오디오 재생 완료');
      clearExpressions();
    };
    audio.onerror = (e) => { debugRef.current.audioState = 'error';  console.error('[Lipsync] 오디오 에러', e); };

    const ctx = (lipsyncRef.current as any).audioContext as AudioContext | undefined;
    console.log('[Lipsync] AudioContext:', ctx ? `state=${ctx.state}` : 'undefined');

    try {
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
        console.log('[Lipsync] AudioContext resumed →', ctx.state);
      }
    } catch (e) {
      console.warn('[Lipsync] ctx.resume() 실패 (무시하고 계속):', e);
    }

    try {
      lipsyncRef.current.connectAudio(audio);
      console.log('[Lipsync] connectAudio 완료');
    } catch (e) {
      console.error('[Lipsync] connectAudio 실패:', e);
    }

    try {
      await audio.play();
      console.log('[Lipsync] audio.play() 성공');
    } catch (e) {
      console.error('[Lipsync] audio.play() 실패:', e);
    }
  }, [getVrm, clearExpressions]);

  const update = useCallback(() => {
    const vrm = getVrm();
    if (!vrm) return;

    // 자동 눈 깜빡임 — 오디오 상태와 무관하게 매 프레임 실행
    const blink = blinkRef.current;
    const now = performance.now();
    if (blink.phase === 'idle') {
      if (now >= blink.nextBlinkTime) {
        blink.phase = 'closing';
        blink.phaseStartTime = now;
      }
    } else if (blink.phase === 'closing') {
      const t = Math.min((now - blink.phaseStartTime) / BLINK_CLOSE_MS, 1);
      vrm.expressionManager?.setValue('blink', t);
      if (t >= 1) {
        blink.phase = 'opening';
        blink.phaseStartTime = now;
      }
    } else if (blink.phase === 'opening') {
      const t = Math.min((now - blink.phaseStartTime) / BLINK_OPEN_MS, 1);
      vrm.expressionManager?.setValue('blink', 1 - t);
      if (t >= 1) {
        vrm.expressionManager?.setValue('blink', 0);
        blink.phase = 'idle';
        blink.nextBlinkTime = now + BLINK_INTERVAL_MIN_MS + Math.random() * (BLINK_INTERVAL_MAX_MS - BLINK_INTERVAL_MIN_MS);
      }
    }

    // 립싱크 — 오디오 재생 중에만 실행
    const lipsync = lipsyncRef.current;
    const audio = audioRef.current;
    if (!lipsync || !audio || audio.paused) return;

    lipsync.processAudio();
    const currentViseme = lipsync.viseme;
    debugRef.current.viseme = currentViseme;

    VRM_VISEME_NAMES.forEach((name) => {
      vrm.expressionManager?.setValue(name, 0);
    });
    const targets = VISEME_TO_VRM[currentViseme];
    targets?.forEach(({ name, weight }) => {
      vrm.expressionManager?.setValue(name, weight);
    });

    const emotion = emotionRef.current;
    if (emotion) {
      vrm.expressionManager?.setValue(emotion, EMOTION_WEIGHT);
    }
  }, [getVrm]);

  return { speak, update, debugRef };
}
