import { useRef, useCallback } from "react";
import { VRM } from "@pixiv/three-vrm";

// LipsyncSDK는 브라우저 전용이라 동적 import 사용
let sdkPromise: Promise<any> | null = null;
function getLipsyncSDK() {
  if (!sdkPromise) {
    sdkPromise = import("lipsync-sdk").then((m) => {
      const SDK = m.LipsyncSDK ?? m.default;
      return new SDK({ langs: ["en"] });
    });
  }
  return sdkPromise;
}

let vrmModPromise: Promise<any> | null = null;
function getVrmMod() {
  if (!vrmModPromise) {
    vrmModPromise = import("lipsync-sdk/vrm");
  }
  return vrmModPromise;
}

// 텍스트에서 단어별 타이밍 추정 (오디오 없이)
function estimateWordTimings(text: string) {
  // 특수문자 제거 후 단어 분리
  const words = text
    .replace(/[^a-zA-Z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const wtimes: number[] = [];
  const wdurations: number[] = [];
  let t = 0;

  for (const word of words) {
    // 단어 길이에 비례한 발화 시간 (한국어/영어 공통)
    const dur = Math.max(180, word.length * 65);
    wtimes.push(t);
    wdurations.push(dur);
    t += dur + 40; // 단어 사이 40ms 간격
  }

  return { words, wtimes, wdurations, totalDurationMs: t };
}

export function useLipsync(getVrm: () => VRM | null) {
  const trackRef = useRef<any[] | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const totalDurationRef = useRef<number>(0);
  const sdkRef = useRef<any>(null);
  const vrmModRef = useRef<any>(null);

  // SDK를 미리 로드
  const preload = useCallback(async () => {
    [sdkRef.current, vrmModRef.current] = await Promise.all([
      getLipsyncSDK(),
      getVrmMod(),
    ]);
  }, []);

  const speak = useCallback(async (text: string) => {
    const vrm = getVrm();
    if (!vrm) return;

    // SDK 아직 안 로드됐으면 로드
    if (!sdkRef.current || !vrmModRef.current) {
      [sdkRef.current, vrmModRef.current] = await Promise.all([
        getLipsyncSDK(),
        getVrmMod(),
      ]);
    }

    const sdk = sdkRef.current;
    const { totalDurationMs, ...speechData } = estimateWordTimings(text);

    sdk.resetSmoothing();
    const track = sdk.wordsToFrames({ ...speechData, lang: "en" });

    trackRef.current = track;
    startTimeRef.current = performance.now();
    totalDurationRef.current = totalDurationMs;
  }, [getVrm]);

  // useFrame에서 호출할 업데이트 함수
  const update = useCallback(() => {
    const vrm = getVrm();
    if (!vrm || !trackRef.current || startTimeRef.current === null) return;

    const sdk = sdkRef.current;
    const vrmMod = vrmModRef.current;
    if (!sdk || !vrmMod) return;

    const elapsedMs = performance.now() - startTimeRef.current;

    if (elapsedMs > totalDurationRef.current + 300) {
      // 재생 끝 — 표정 리셋
      vrm.expressionManager?.setValue("aa", 0);
      vrm.expressionManager?.setValue("ih", 0);
      vrm.expressionManager?.setValue("ou", 0);
      vrm.expressionManager?.setValue("ee", 0);
      vrm.expressionManager?.setValue("oh", 0);
      trackRef.current = null;
      startTimeRef.current = null;
      return;
    }

    const vec = sdk.sampleTrack(trackRef.current, elapsedMs);
    sdk.applySmoothing(vec);

    // vec → named blendshape 객체 → VRM viseme 값
    const named: Record<string, number> = {};
    sdk.constructor.BLENDSHAPE_NAMES.forEach((name: string, i: number) => {
      named[name] = vec[i];
    });

    const visemes = vrmMod.mapVisemes(named);
    vrm.expressionManager?.setValue("aa", visemes.aa);
    vrm.expressionManager?.setValue("ih", visemes.ih);
    vrm.expressionManager?.setValue("ou", visemes.ou);
    vrm.expressionManager?.setValue("ee", visemes.ee);
    vrm.expressionManager?.setValue("oh", visemes.oh);
  }, [getVrm]);

  return { speak, update, preload };
}
