'use client'
import React, { useRef } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

export default function UnityViewer({ className}: { className?: string }) {
  const { unityProvider, sendMessage } = useUnityContext({
    loaderUrl: "/experience/Build.loader.js",
    dataUrl: "/experience/Build.data",
    frameworkUrl: "/experience/Build.framework.js",
    codeUrl: "/experience/Build.wasm",
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Use when matchWebGLToCanvasSize is false
  // useEffect(() => {
  //   if (canvasRef.current) {
  //     const canvas = canvasRef.current.querySelector("canvas");
  //     if (canvas) {
  //       console.log('Resizing canvas to 720p');
  //       canvas.width = 720;
  //       canvas.height = 1280;
  //     }
  //   }
  // }, []);

  return (
    <div ref={canvasRef} className={className} style={{ width: '100%', height: '100%'}} >
      <Unity unityProvider={unityProvider} matchWebGLToCanvasSize={true} className={className}/>
    </div>
  );
}