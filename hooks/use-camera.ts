import { useRef, useState, useCallback } from 'react';

export interface CameraHook {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isStreaming: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureImage: () => string | null;
  // Zoom
  zoomRange: { min: number; max: number; step: number } | null;
  currentZoom: number;
  setZoom: (z: number) => Promise<void>;
  // Torch
  torchSupported: boolean;
  torchOn: boolean;
  toggleTorch: () => Promise<void>;
}

export const useCamera = (): CameraHook => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const torchOnRef = useRef(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsStreaming(false);

      // --- Fix stream-orphan bug: stop any existing stream before requesting a new one ---
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }

          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  console.log('Camera started successfully');
                  setIsStreaming(true);
                  resolve();
                })
                .catch(reject);
            }
          };

          videoRef.current.onerror = () => {
            reject(new Error('Video element error'));
          };
        });
      }

      // --- Detect zoom and torch capabilities ---
      try {
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities() as any;

          if (capabilities.zoom) {
            setZoomRange({
              min: capabilities.zoom.min,
              max: capabilities.zoom.max,
              step: capabilities.zoom.step ?? 0.1,
            });
            setCurrentZoom(capabilities.zoom.min);
          } else {
            setZoomRange(null);
          }

          if (capabilities.torch) {
            setTorchSupported(true);
          } else {
            setTorchSupported(false);
          }
        }
      } catch {
        // getCapabilities() not available on this browser — degrade silently
        setZoomRange(null);
        setTorchSupported(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      setIsStreaming(false);
      console.error('Camera error:', err);
      throw err;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);

    // Reset capability state so controls hide when camera stops
    setZoomRange(null);
    setCurrentZoom(1);
    setTorchSupported(false);
    setTorchOn(false);
    torchOnRef.current = false;
  }, []);

  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      console.log('Capture failed: missing refs or not streaming', {
        video: !!videoRef.current,
        canvas: !!canvasRef.current,
        streaming: isStreaming
      });
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.log('Capture failed: no canvas context');
      return null;
    }

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Capture failed: video dimensions are 0', {
        width: video.videoWidth,
        height: video.videoHeight
      });
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = dataUrl.split(',')[1]; // Remove data:image/jpeg;base64, prefix

    console.log('Image captured successfully', {
      width: canvas.width,
      height: canvas.height,
      dataSize: base64.length
    });

    return base64;
  }, [isStreaming]);

  const setZoom = useCallback(async (z: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: z } as any] });
      setCurrentZoom(z);
    } catch {
      // zoom not supported or constraint rejected — ignore silently
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOnRef.current;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      torchOnRef.current = next;
      setTorchOn(next);
    } catch {
      // torch not supported or constraint rejected — ignore silently
    }
  }, []);

  return {
    videoRef,
    canvasRef,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureImage,
    zoomRange,
    currentZoom,
    setZoom,
    torchSupported,
    torchOn,
    toggleTorch,
  };
};
