type CaptureDetail = { resolve: (value: string | null) => void };
type RecordDetail = { seconds?: number; resolve: (value: { poster: string; blob?: Blob } | null) => void };

function once<T>(fn: (finish: (value: T) => void) => void, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: T) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    fn(finish);
    setTimeout(() => finish(fallback), ms);
  });
}

export function requestGlobeScreenshot(): Promise<string | null> {
  return once<string | null>((finish) => {
    window.dispatchEvent(new CustomEvent<CaptureDetail>('earth-capture', { detail: { resolve: finish } }));
  }, 2500, null);
}

export function requestGlobeRecording(seconds = 4): Promise<{ poster: string; blob?: Blob } | null> {
  return once<{ poster: string; blob?: Blob } | null>((finish) => {
    window.dispatchEvent(
      new CustomEvent<RecordDetail>('earth-record', { detail: { seconds, resolve: finish } })
    );
  }, (seconds + 3) * 1000, null);
}

export function toPngDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

export function isSupportedImage(file: File): boolean {
  const t = file.type.toLowerCase();
  return t === 'image/png' || t === 'image/jpeg' || t === 'image/jpg' || t === 'image/webp' || t === 'image/gif' || t === 'image/bmp';
}
