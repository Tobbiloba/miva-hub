/**
 * Shrink a photo in the browser before upload: longest edge at most
 * MAX_EDGE, re-encoded as JPEG. A 4–8 MB phone photo becomes ~300–600 KB,
 * which matters on mobile data and keeps the upload under the server limit.
 * Throws if the browser can't decode the file (e.g. HEIC outside Safari).
 */
const MAX_EDGE = 2048;
const QUALITY = 0.85;

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This photo format isn't supported. Use a JPG or PNG.");
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare the photo.");
  // White behind transparent PNGs (screenshots), so JPEG doesn't go black
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("Couldn't prepare the photo.");
  return blob;
}
