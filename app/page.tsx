'use client'
import { useEffect } from "react";
import UnityViewer from "./unity";
import InputField from "./input-field";

export default function Home() {

  useEffect(() => {
    // window.SpeechBlendWEBGL = {};

    // window.AudioContext = (function(){
    //   const ACConsructor = window.AudioContext || window.webkitAudioContext;

    //   return function(){
    //     const ac = new ACConsructor();
    //     window.SpeechBlendWEBGL.ac = ac;
    //     window.SpeechBlendWEBGL.a = ac.createAnalyser();
    //     window.SpeechBlendWEBGL.a.smoothingTimeConstant = 0;
    //     window.SpeechBlendWEBGL.fa = new Uint8Array(window.SpeechBlendWEBGL.a.frequencyBinCount); 
    //     window.SpeechBlendWEBGL.la = new Uint8Array(window.SpeechBlendWEBGL.a.fftSize); 
    //     window.SpeechBlendWEBGL.a.connect(ac.destination); 
        
    //     ac.actualDestination = ac.destination;
    //     Object.defineProperty(ac, 'destination', { 
    //       value: window.SpeechBlendWEBGL.a,
    //       writable: false
    //     });   
    //     return ac; 
    //   }
    // })();
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
