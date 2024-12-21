'use client'
import React from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

export default function UnityViewer() {
  const { unityProvider } = useUnityContext({
    loaderUrl: "/experience/Build.loader.js",
    dataUrl: "/experience/Build.data",
    frameworkUrl: "/experience/Build.framework.js",
    codeUrl: "/experience/Build.wasm",
  });

  return <Unity unityProvider={unityProvider} className="w-full h-full"/>;
}