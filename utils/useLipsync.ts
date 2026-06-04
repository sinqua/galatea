import { useRef, useCallback, useEffect } from "react";
import { Lipsync, VISEMES } from "wawa-lipsync";
import { VRM } from "@pixiv/three-vrm";

// Oculus viseme → VRM expression 매핑
// VRM은 aa/ih/ou/ee/oh 5개 모음 viseme를 지원
const VISEME_TO_VRM: Partial<Record<VISEMES, { name: string; weight: number }[]>> = {
  [VISEMES.aa]: [{ name: "aa", weight: 1.0 }],
  [VISEMES.E]:  [{ name: "ee", weight: 1.0 }],
  [VISEMES.I]:  [{ name: "ih", weight: 1.0 }],
  [VISEMES.O]:  [{ name: "oh", weight: 1.0 }],
  [VISEMES.U]:  [{ name: "ou", weight: 1.0 }],
  // 자음: 가장 가까운 모음 형태로 매핑
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

export function useLipsync(getVrm: () => VRM | null) {
  const lipsyncRef = useRef<Lipsync | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lipsync 인스턴스 초기화
  useEffect(() => {
    lipsyncRef.current = new Lipsync({ fftSize: 2048, historySize: 10 });
    return () => {
      lipsyncRef.current = null;
    };
  }, []);

  const speak = useCallback(async (audioBlob: Blob) => {
    const vrm = getVrm();
    if (!vrm || !lipsyncRef.current) return;

    // 이전 오디오 정리
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio();
    audio.src = url;
    audioRef.current = audio;

    lipsyncRef.current.connectAudio(audio);
    await audio.play();
  }, [getVrm]);

  // useFrame에서 호출할 업데이트 함수
  const update = useCallback(() => {
    const vrm = getVrm();
    const lipsync = lipsyncRef.current;
    const audio = audioRef.current;
    if (!vrm || !lipsync || !audio || audio.paused) return;

    lipsync.processAudio();
    const currentViseme = lipsync.viseme;

    // 모든 viseme 초기화 후 현재 viseme 적용
    VRM_VISEME_NAMES.forEach((name) => {
      vrm.expressionManager?.setValue(name, 0);
    });

    const targets = VISEME_TO_VRM[currentViseme];
    targets?.forEach(({ name, weight }) => {
      vrm.expressionManager?.setValue(name, weight);
    });
  }, [getVrm]);

  return { speak, update };
}
