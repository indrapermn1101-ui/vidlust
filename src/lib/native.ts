// Wrapper aman untuk API native Electron.
// Di web/localhost biasa window.vidlustNative tidak ada → semua helper no-op/false.
export interface NativeInfo {
  isNative: boolean;
  platform: string;
  outputDir: string;
  ffmpeg: boolean;
  version: string;
}

type NativeBridge = {
  isNative: boolean;
  ready: () => void;
  getInfo: () => Promise<NativeInfo>;
  chooseDir: () => Promise<string>;
  openDir: (dir?: string) => Promise<boolean>;
  saveBuffer: (name: string, buffer: ArrayBuffer) => Promise<string>;
  convertMp4: (name: string, buffer: ArrayBuffer) => Promise<string>;
  convertProRes: (name: string, buffer: ArrayBuffer) => Promise<string>;
  makeGif: (name: string, buffer: ArrayBuffer) => Promise<string>;
  seqBegin: () => Promise<string>;
  seqFrame: (jobId: string, index: number, buffer: ArrayBuffer) => Promise<boolean>;
  seqFinish: (jobId: string, fps: number, outName: string) => Promise<string>;
  seqAbort: (jobId: string) => Promise<boolean>;
};

declare global {
  interface Window {
    vidlustNative?: NativeBridge;
  }
}

export function isNative(): boolean {
  return typeof window !== 'undefined' && !!window.vidlustNative?.isNative;
}

function bridge(): NativeBridge {
  const b = window.vidlustNative;
  if (!b) throw new Error('Fitur ini hanya tersedia di aplikasi desktop Vidlust.');
  return b;
}

export async function nativeInfo(): Promise<NativeInfo> {
  return bridge().getInfo();
}

export async function nativeChooseDir(): Promise<string> {
  return bridge().chooseDir();
}

export async function nativeOpenDir(dir?: string): Promise<boolean> {
  return bridge().openDir(dir);
}

/** Simpan Blob ke folder output native. Mengembalikan path file. */
export async function nativeSaveBlob(name: string, blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return bridge().saveBuffer(name, buf);
}

export async function nativeConvertMp4(name: string, blob: Blob): Promise<string> {
  return bridge().convertMp4(name, await blob.arrayBuffer());
}

export async function nativeConvertProRes(name: string, blob: Blob): Promise<string> {
  return bridge().convertProRes(name, await blob.arrayBuffer());
}

export async function nativeMakeGif(name: string, blob: Blob): Promise<string> {
  return bridge().makeGif(name, await blob.arrayBuffer());
}

export async function nativeSeqBegin(): Promise<string> {
  return bridge().seqBegin();
}

export async function nativeSeqFrame(jobId: string, index: number, buffer: ArrayBuffer): Promise<boolean> {
  return bridge().seqFrame(jobId, index, buffer);
}

export async function nativeSeqFinish(jobId: string, fps: number, outName: string): Promise<string> {
  return bridge().seqFinish(jobId, fps, outName);
}

export async function nativeSeqAbort(jobId: string): Promise<boolean> {
  return bridge().seqAbort(jobId);
}
