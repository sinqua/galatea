interface SpeechBlendWEBGL {
    ac: AudioContext;
    a: AnalyserNode;
    fa: Uint8Array;
    la: Uint8Array;
}


interface Window {
    webkitAudioContext: typeof AudioContext;
    SpeechBlendWEBGL: SpeechBlendWEBGL;
  }