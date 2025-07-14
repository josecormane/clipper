import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const timeStringToSeconds = (time: string): number => {
  const parts = time.split(':');
  let seconds = 0;
  
  if (parts.length === 3) {
    seconds += Number(parts[0]) * 3600;
    seconds += Number(parts[1]) * 60;
    seconds += Number(parts[2]);
  } else if (parts.length === 2) {
    seconds += Number(parts[0]) * 60;
    seconds += Number(parts[1]);
  } else if (parts.length === 1) {
    seconds += Number(parts[0]);
  }
  
  return seconds;
};

export const secondsToTimeString = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
};

export async function captureFrame(videoElement: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('error', onError);

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

     const onError = (e: Event) => {
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('error', onError);
      console.error('Video seeking error:', e);
      reject(new Error('Error seeking video to capture frame.'));
    }

    videoElement.addEventListener('seeked', onSeeked);
    videoElement.addEventListener('error', onError);
    videoElement.currentTime = time;
  });
}
