'use client'
import { useEffect } from "react";
import InputField from "./input-field";
import { Unity, useUnityContext } from "react-unity-webgl";

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
        <InputField onSubmit={sendMessage}/>
      </main>
    </div>
  );
}
