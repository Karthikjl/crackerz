// Records the canvas (plus optional audio) to a video file with MediaRecorder. Browser only.

const MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
];

export function recordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

export class CanvasRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }

  start(canvas: HTMLCanvasElement, audio: MediaStream | null): boolean {
    if (this.recording || !recordingSupported()) return false;
    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const stream = canvas.captureStream(30);
    audio?.getAudioTracks().forEach((track) => stream.addTrack(track));
    try {
      this.recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined);
    } catch {
      return false;
    }
    this.chunks = [];
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(250);
    return true;
  }

  stop(): Promise<Blob | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || "video/webm";
        recorder.stream.getVideoTracks().forEach((t) => t.stop());
        this.recorder = null;
        resolve(this.chunks.length ? new Blob(this.chunks, { type }) : null);
      };
      recorder.stop();
    });
  }
}
