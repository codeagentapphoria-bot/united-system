import { useState, useRef, useCallback } from 'react';
import type { RefObject } from 'react';

export interface UseCameraCaptureReturn {
  isCameraOpen: boolean;
  preview: string | null;
  cameraRef: RefObject<any>;
  openCamera: () => void;
  closeCamera: () => void;
  capture: () => Promise<File | null>;
  setPreview: (preview: string | null) => void;
  reset: () => void;
}

/**
 * Custom hook for camera capture functionality
 * @returns Object containing camera state and methods
 */
export const useCameraCapture = (): UseCameraCaptureReturn => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  const openCamera = useCallback(() => {
    setIsCameraOpen(true);
  }, []);

  const closeCamera = useCallback(() => {
    setIsCameraOpen(false);
  }, []);

  const capture = useCallback(async (): Promise<File | null> => {
    if (cameraRef.current) {
      const imageSrc = cameraRef.current.getScreenshot();
      if (imageSrc) {
        try {
          // Convert base64 data URL to File object
          const response = await fetch(imageSrc);
          const blob = await response.blob();
          const file = new File([blob], `captured-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
          // Set preview
          setPreview(imageSrc);
          return file;
        } catch (error) {
          console.error('Error capturing image:', error);
          return null;
        }
      }
    }
    return null;
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setIsCameraOpen(false);
  }, []);

  return {
    isCameraOpen,
    preview,
    cameraRef,
    openCamera,
    closeCamera,
    capture,
    setPreview,
    reset,
  };
};

