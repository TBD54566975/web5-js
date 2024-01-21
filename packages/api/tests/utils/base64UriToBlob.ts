export default function (base64, mimeType) {
  const bytes = atob(base64.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(bytes.length);
  const uintArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < bytes.length; i++) {
    uintArray[i] = bytes.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mimeType });
}