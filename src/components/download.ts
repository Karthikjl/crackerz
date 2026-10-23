/** Saves a blob as a file via a temporary link. */
export function downloadBlob(blob: Blob, baseName: string): void {
  const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("webm") ? "webm" : blob.type.includes("png") ? "png" : "bin";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}-${stamp}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function saveScreenshot(take: () => Promise<Blob | null>): Promise<void> {
  const blob = await take();
  if (blob) downloadBlob(blob, "crackerz");
}
