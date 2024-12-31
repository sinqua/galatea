'use client'
import { useEffect } from "react";
import UnityViewer from "./unity";
import InputField from "./input-field";

interface ExtendedAudioContext extends AudioContext {
  actualDestination?: AudioNode;
}

export default function Home() {

  useEffect(() => {
    window.SpeechBlendWEBGL = {} as SpeechBlendWEBGL;

    const ACConstructor = window.AudioContext || window.webkitAudioContext;

    if (ACConstructor) {
      const ac = new ACConstructor() as ExtendedAudioContext;
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
    }
  }, []);



  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow w-full h-full">
        <UnityViewer className="w-full min-h-screen"/>
        <InputField onSubmit={(value) => console.log(value)}/>
      </main>
    </div>
  );
}
