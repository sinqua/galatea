'use client'
import { useEffect } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import InputHistory from "./input-history";
import Link from "next/link";
import { BookOpenIcon, ClockIcon } from "@heroicons/react/24/outline";

interface ExtendedAudioContext extends AudioContext {
  actualDestination?: AudioNode;
}

export default function Home() {
  const { unityProvider, sendMessage } = useUnityContext({
    loaderUrl: "/experience/Build.loader.js",
    dataUrl: "/experience/Build.data",
    frameworkUrl: "/experience/Build.framework.js",
    codeUrl: "/experience/Build.wasm",
  });

  useEffect(() => {
    window.SpeechBlendWEBGL = {} as SpeechBlendWEBGL;

    window.AudioContext = (function(){
      const ACConsructor = window.AudioContext || window.webkitAudioContext;

      return function(){
        const ac = new ACConsructor() as ExtendedAudioContext;
        window.SpeechBlendWEBGL.ac = ac;
        window.SpeechBlendWEBGL.a = ac.createAnalyser();
        window.SpeechBlendWEBGL.a.smoothingTimeConstant = 0;
        window.SpeechBlendWEBGL.fa = new Uint8Array(window.SpeechBlendWEBGL.a.frequencyBinCount); 
        window.SpeechBlendWEBGL.la = new Uint8Array(window.SpeechBlendWEBGL.a.fftSize); 
        window.SpeechBlendWEBGL.a.connect(ac.destination); 
        
        ac.actualDestination = ac.destination;
        Object.defineProperty(ac, 'destination', { 
          value: window.SpeechBlendWEBGL.a,
          writable: false
        });   
        return ac; 
      }
    })() as any; 
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow w-full h-full">
        <div className="w-full min-h-screen" style={{ width: '100%', height: '100%'}} >
          <Unity unityProvider={unityProvider} matchWebGLToCanvasSize={true} className="w-full min-h-screen"/>
        </div>
        <div className="fixed top-4 right-4 flex gap-2 z-10">
          <Link 
            href="/history" 
            className="p-3 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-all"
            aria-label="View history"
          >
            <ClockIcon className="h-6 w-6 text-neutral-700" />
          </Link>
          <Link 
            href="/diary" 
            className="p-3 bg-white bg-opacity-80 rounded-full shadow-md hover:bg-opacity-100 transition-all"
            aria-label="Open diary"
          >
            <BookOpenIcon className="h-6 w-6 text-neutral-700" />
          </Link>
        </div>
        <InputHistory onSubmit={sendMessage}/>
      </main>
    </div>
  );
}
