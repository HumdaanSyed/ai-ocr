const MAX_SIDE = 2000;

// Downscale and re-encode as JPEG: keeps uploads under the 5 MB API cap, cuts image tokens, strips EXIF.
export async function optimizeImage(file: Blob) {
  const bitmap = await createImageBitmap(file); // applies EXIF orientation
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/jpeg", 0.9),
  );
  return { blob, width, height, originalWidth: Math.round(width / scale), originalHeight: Math.round(height / scale) };
}
