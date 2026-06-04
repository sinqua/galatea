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

const DEFAULT_VOLUME = 1.5; // 1.0 이상으로 부스트 가능

export function useLipsync(getVrm: () => VRM | null) {
  const lipsyncRef = useRef<Lipsync | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const debugRef = useRef({
    audioState: 'idle' as 'idle' | 'playing' | 'ended' | 'error',
    viseme: 'viseme_sil',
    blobSize: 0,
    expressionManager: false,
  });

  useEffect(() => {
    lipsyncRef.current = new Lipsync({ fftSize: 2048, historySize: 10 });
    console.log('[Lipsync] 초기화 완료');
    return () => { lipsyncRef.current = null; gainNodeRef.current = null; };
  }, []);

  const speak = useCallback(async (audioBlob: Blob) => {
    const vrm = getVrm();
    console.log('[Lipsync] speak 호출 —', {
      blobSize: audioBlob.size,
      blobType: audioBlob.type,
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

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio();
    audio.src = url;
    audioRef.current = audio;

    audio.onplay  = () => { debugRef.current.audioState = 'playing'; console.log('[Lipsync] 오디오 재생 시작'); };
    audio.onended = () => { debugRef.current.audioState = 'ended';   console.log('[Lipsync] 오디오 재생 완료'); };
    audio.onerror = (e) => { debugRef.current.audioState = 'error';  console.error('[Lipsync] 오디오 에러', e); };

    try {
      lipsyncRef.current.connectAudio(audio);

      // connectAudio가 analyser → destination을 연결한 뒤,
      // analyser와 destination 사이에 GainNode를 삽입해서 볼륨 부스트
      if (!gainNodeRef.current) {
        const ctx = (lipsyncRef.current as any).audioContext as AudioContext;
        const analyser = (lipsyncRef.current as any).analyser as AnalyserNode;
        analyser.disconnect(ctx.destination);
        const gain = ctx.createGain();
        gain.gain.value = DEFAULT_VOLUME;
        analyser.connect(gain);
        gain.connect(ctx.destination);
        gainNodeRef.current = gain;
        console.log('[Lipsync] GainNode 삽입 완료, volume =', DEFAULT_VOLUME);
      }

      await audio.play();
    } catch (e) {
      console.error('[Lipsync] audio.play() 실패 (autoplay 차단?)', e);
    }
  }, [getVrm]);

  const update = useCallback(() => {
    const vrm = getVrm();
    const lipsync = lipsyncRef.current;
    const audio = audioRef.current;
    if (!vrm || !lipsync || !audio || audio.paused) return;

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
  }, [getVrm]);

  return { speak, update, debugRef };
}
