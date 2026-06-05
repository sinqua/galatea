'use client'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useReducer } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MToonMaterial, MToonMaterialLoaderPlugin, VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";
import Link from "next/link";
import { ClockIcon, HomeIcon } from "@heroicons/react/24/outline";
import InputHistory from "../input-history";
import { LoadMixamoAnimation } from "@/utils/LoadMixamoAnimation";
import { useLipsync } from "@/utils/useLipsync";

interface VRMAvatarProps {
  onReady?: (speak: (audioBlob: Blob, emotion?: string) => void) => void;
  debugRef?: React.MutableRefObject<any>;
}

function VRMAvatar({ onReady, debugRef: externalDebugRef }: VRMAvatarProps) {
  const { scene } = useThree();
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [clips, setClips] = useState<Record<string, THREE.AnimationClip>>({});
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const clipsRef = useRef<Record<string, THREE.AnimationClip>>({});

  const mixer = useMemo(() => {
    if (!vrm) return null;
    const m = new THREE.AnimationMixer(vrm.scene);
    mixerRef.current = m;
    return m;
  }, [vrm]);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new MToonMaterialLoaderPlugin(parser));

    loader.load(
      "/experience/hero.vrm",
      (gltf) => {
        const loaded: VRM = gltf.userData.vrm;
        VRMUtils.removeUnnecessaryJoints(loaded.scene);
        VRMUtils.removeUnnecessaryVertices(loaded.scene);

        (loaded.materials as MToonMaterial[]).forEach((mat) => {
          mat.toneMapped = false;
        });

        loaded.scene.traverse((obj) => { obj.frustumCulled = false; });
        loaded.scene.rotation.y = Math.PI;
        loaded.scene.visible = false;
        scene.add(loaded.scene);
        vrmRef.current = loaded;
        setVrm(loaded);
      },
      undefined,
      (error) => console.error("VRM 로드 실패:", error)
    );

    return () => {
      setVrm((prev) => {
        if (prev) {
          scene.remove(prev.scene);
          VRMUtils.deepDispose(prev.scene);
        }
        return null;
      });
    };
  }, [scene]);

  // FBX 애니메이션 로드
  useEffect(() => {
    if (!vrm) return;
    const load = async () => {
      const [landing, idle, talk] = await Promise.all([
        LoadMixamoAnimation("/animation/Landing.fbx", vrm),
        LoadMixamoAnimation("/animation/Idle.fbx", vrm),
        LoadMixamoAnimation("/animation/Talk.fbx", vrm),
      ]);
      landing.name = "Landing";
      idle.name = "Idle";
      talk.name = "Talk";
      const loaded = { Landing: landing, Idle: idle, Talk: talk };
      clipsRef.current = loaded;
      setClips(loaded);
    };

    load();
  }, [vrm]);

  // Landing → Idle 순서로 재생
  useEffect(() => {
    if (!mixer || !clips.Landing || !clips.Idle) return;

    const landingAction = mixer.clipAction(clips.Landing);
    const idleAction = mixer.clipAction(clips.Idle);

    landingAction.loop = THREE.LoopOnce;
    landingAction.clampWhenFinished = true;
    if (vrmRef.current) vrmRef.current.scene.visible = true;
    landingAction.play();

    const onFinished = (e: any) => {
      if (e.action._clip.name === "Landing") {
        landingAction.fadeOut(0.5);
        idleAction.reset().fadeIn(0.5).play();
        activeActionRef.current = idleAction;
      }
    };

    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer, clips]);

  const getVrm = useCallback(() => vrmRef.current, []);

  const handleSpeakStart = useCallback(() => {
    const m = mixerRef.current;
    const c = clipsRef.current;
    if (!m || !c.Talk) return;
    const talkAction = m.clipAction(c.Talk);
    talkAction.loop = THREE.LoopRepeat;
    activeActionRef.current?.fadeOut(0.3);
    talkAction.reset().fadeIn(0.3).play();
    activeActionRef.current = talkAction;
  }, []);

  const handleSpeakEnd = useCallback(() => {
    const m = mixerRef.current;
    const c = clipsRef.current;
    if (!m || !c.Idle) return;
    const idleAction = m.clipAction(c.Idle);
    idleAction.loop = THREE.LoopRepeat;
    activeActionRef.current?.fadeOut(0.5);
    idleAction.reset().fadeIn(0.5).play();
    activeActionRef.current = idleAction;
  }, []);

  const { speak, update: lipsyncUpdate, debugRef } = useLipsync(getVrm, handleSpeakStart, handleSpeakEnd);

  // 디버그 ref를 부모에 전달
  useEffect(() => {
    if (externalDebugRef) externalDebugRef.current = debugRef.current;
  });

  // VRM 준비되면 speak 함수를 부모에 노출
  useEffect(() => {
    if (vrm) onReady?.(speak);
  }, [vrm, speak, onReady]);

  useFrame((_, delta) => {
    mixer?.update(delta);
    vrm?.update(delta);
    lipsyncUpdate();
  });

  return null;
}

export default function AvatarPage() {
  const speakRef = useRef<((audioBlob: Blob, emotion?: string) => void) | null>(null);
  const lipsyncDebugRef = useRef<any>({});
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const handleReady = useCallback((speak: (audioBlob: Blob, emotion?: string) => void) => {
    speakRef.current = speak;
  }, []);

  // 디버그 오버레이 1초마다 갱신
  useEffect(() => {
    const id = setInterval(forceUpdate, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow w-full h-full">
        <div className="w-full min-h-screen">
          <Canvas
            camera={{ position: [0, 1.2, 1.5], fov: 40 }}
            style={{ width: "100%", height: "100vh", backgroundColor: "#FAF9F6" }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[1, 2, 2]} intensity={2.2} />
            <Suspense fallback={null}>
              <VRMAvatar onReady={handleReady} debugRef={lipsyncDebugRef} />
            </Suspense>
            <OrbitControls
              target={[0, 1, 0]}
              enablePan={false}
              minDistance={1}
              maxDistance={5}
            />
          </Canvas>
        </div>

        <div className="fixed top-4 right-4 flex gap-2 z-10">
          <Link
            href="/"
            className="p-3 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-all"
            aria-label="Home"
          >
            <HomeIcon className="h-6 w-6 text-neutral-700" />
          </Link>
          <Link
            href="/history"
            className="p-3 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-all"
            aria-label="View history"
          >
            <ClockIcon className="h-6 w-6 text-neutral-700" />
          </Link>
        </div>
      {/* 디버그 오버레이
      <div className="fixed top-4 left-4 z-20 bg-black bg-opacity-70 text-white text-xs font-mono p-3 rounded-lg space-y-1 pointer-events-none">
        <div>🎙 audio: <span className="text-yellow-300">{lipsyncDebugRef.current?.audioState ?? 'idle'}</span></div>
        <div>👄 viseme: <span className="text-green-300">{lipsyncDebugRef.current?.viseme ?? '-'}</span></div>
        <div>📦 blob: <span className="text-blue-300">{lipsyncDebugRef.current?.blobSize ?? 0} bytes</span></div>
        <div>🎭 exprMgr: <span className="text-purple-300">{lipsyncDebugRef.current?.expressionManager ? 'OK' : 'null'}</span></div>
      </div> */}

      <InputHistory onAIResponse={(audioBlob, _text, emotion) => speakRef.current?.(audioBlob, emotion)} />
      </main>
    </div>
  );
}
