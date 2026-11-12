/** Start a browser download and release its object URL after the browser has consumed it. */
export function downloadBlobFile(filename: string, blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Revoking synchronously can interrupt downloads in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  downloadBlobFile(filename, new Blob([content], { type: mimeType }));
}
