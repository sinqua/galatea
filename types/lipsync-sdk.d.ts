declare module "lipsync-sdk" {
  export class LipsyncSDK {
    static BLENDSHAPE_NAMES: string[];
    constructor(options?: { langs?: string[] });
    resetSmoothing(): void;
    wordsToFrames(data: {
      words: string[];
      wtimes: number[];
      wdurations: number[];
      lang?: string;
    }): any[];
    sampleTrack(track: any[], elapsedMs: number): number[];
    applySmoothing(vec: number[]): void;
  }
  export default LipsyncSDK;
}

declare module "lipsync-sdk/vrm" {
  export function mapVisemes(named: Record<string, number>): {
    aa: number;
    ih: number;
    ou: number;
    ee: number;
    oh: number;
  };
}
