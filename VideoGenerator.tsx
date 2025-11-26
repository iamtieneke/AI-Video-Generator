import React, { useState, useCallback, useRef, useEffect } from 'react';
import { videoService, fileToBase64 } from '../services/videoService';
import { Button } from './Button';
import { Input } from './Input';
import { FileUpload } from './FileUpload';
import { VideoPlayer } from './VideoPlayer';
import { LoadingSpinner } from './LoadingSpinner';
import { ModeSelector } from './ModeSelector';
import { GeneratedVideo, VideoMode, VideoOperation, VideoResolution, VideoAspectRatio, VideoPart } from '../types';
import { VIDEO_LOADING_MESSAGES } from '../constants';

interface VideoGeneratorProps {
  onApiKeyError: () => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onApiKeyError }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [startImageFile, setStartImageFile] = useState<File | null>(null);
  const [endImageFile, setEndImageFile] = useState<File | null>(null);
  const [referenceImageFiles, setReferenceImageFiles] = useState<File[]>([]);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(VIDEO_LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<VideoMode>('textToVideo');
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');

  const activeVideoOperationRef = useRef<VideoOperation | null>(null);
  const loadingMessageIndexRef = useRef<number>(0);
  const loadingMessageIntervalRef = useRef<number | null>(null);

  const startLoadingMessages = useCallback(() => {
    loadingMessageIndexRef.current = 0;
    setLoadingMessage(VIDEO_LOADING_MESSAGES[0]);
    if (loadingMessageIntervalRef.current) {
      clearInterval(loadingMessageIntervalRef.current);
    }
    loadingMessageIntervalRef.current = window.setInterval(() => {
      loadingMessageIndexRef.current = (loadingMessageIndexRef.current + 1) % VIDEO_LOADING_MESSAGES.length;
      setLoadingMessage(VIDEO_LOADING_MESSAGES[loadingMessageIndexRef.current]);
    }, 5000); // Change message every 5 seconds
  }, []);

  const stopLoadingMessages = useCallback(() => {
    if (loadingMessageIntervalRef.current) {
      clearInterval(loadingMessageIntervalRef.current);
      loadingMessageIntervalRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setPrompt('');
    setStartImageFile(null);
    setEndImageFile(null);
    setReferenceImageFiles([]);
    setGeneratedVideoUrl(null);
    setGeneratedVideo(null);
    setIsLoading(false);
    setError(null);
    stopLoadingMessages();
    activeVideoOperationRef.current = null;
  }, [stopLoadingMessages]);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      stopLoadingMessages();
    };
  }, [stopLoadingMessages]);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (file: File | null) => {
    setter(file);
  };

  const handleReferenceFileChange = (index: number) => (file: File | null) => {
    setReferenceImageFiles((prev) => {
      const newFiles = [...prev];
      if (file) {
        newFiles[index] = file;
      } else {
        newFiles.splice(index, 1);
      }
      return newFiles.filter(Boolean); // Remove null/undefined entries
    });
  };

  const pollVideoOperation = useCallback(
    async (operation: VideoOperation) => {
      activeVideoOperationRef.current = operation;
      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Poll every 10 seconds
        try {
          operation = await videoService.getVideosOperation(operation);
          activeVideoOperationRef.current = operation;
          if (operation.error) {
            throw new Error(operation.error.message);
          }
        } catch (e: any) {
          console.error('Polling error:', e);
          const errorMessage = e instanceof Error ? e.message : String(e);
          if (errorMessage.includes("Requested entity was not found.")) {
            onApiKeyError();
            setError("API key issue detected. Please re-select your API key.");
          } else {
            setError(`Failed to retrieve video status: ${errorMessage}`);
          }
          setIsLoading(false);
          stopLoadingMessages();
          return;
        }
      }

      const video = operation.response?.generatedVideos?.[0]?.video;
      if (video?.uri) {
        // Append API key for download
        const finalVideoUrl = `${video.uri}&key=${process.env.API_KEY}`;
        setGeneratedVideoUrl(finalVideoUrl);
        setGeneratedVideo(video); // Store the full video object for extension
        setError(null);
      } else {
        setError('Video generation completed but no video URI was found.');
      }
      setIsLoading(false);
      stopLoadingMessages();
      activeVideoOperationRef.current = null;
    },
    [onApiKeyError, stopLoadingMessages]
  );

  const handleGenerateVideo = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setGeneratedVideoUrl(null);
    setGeneratedVideo(null);
    startLoadingMessages();

    try {
      let operation: VideoOperation;
      let startImageBase64: VideoPart | undefined;
      let endImageBase64: VideoPart | undefined;
      let referenceImagesBase64: VideoPart[] = [];

      if (startImageFile) {
        startImageBase64 = await fileToBase64(startImageFile);
      }
      if (endImageFile) {
        endImageBase64 = await fileToBase64(endImageFile);
      }
      if (referenceImageFiles.length > 0) {
        referenceImagesBase64 = await Promise.all(referenceImageFiles.map((file) => fileToBase64(file)));
      }

      switch (selectedMode) {
        case 'textToVideo':
          if (!prompt) throw new Error('Prompt is required for Text to Video.');
          operation = await videoService.generateVideoFromText(prompt, resolution, aspectRatio);
          break;
        case 'textAndImageToVideo':
          if (!prompt) throw new Error('Prompt is required for Text & Image to Video.');
          if (!startImageBase64) throw new Error('Starting image is required for Text & Image to Video.');
          operation = await videoService.generateVideoFromTextAndImage(prompt, startImageBase64, resolution, aspectRatio);
          break;
        case 'imageToImageVideo':
          if (!startImageBase64) throw new Error('Starting image is required for Start & End Image Video.');
          if (!endImageBase64) throw new Error('Ending image is required for Start & End Image Video.');
          operation = await videoService.generateVideoFromStartAndEndImages(prompt || undefined, startImageBase64, endImageBase64, resolution, aspectRatio);
          break;
        case 'multiRefImageVideo':
          if (!prompt) throw new Error('Prompt is required for Multi-Reference Image Video.');
          if (referenceImagesBase64.length === 0) throw new Error('At least one reference image is required.');
          operation = await videoService.generateVideoFromMultipleReferenceImages(prompt, referenceImagesBase64, resolution, aspectRatio);
          break;
        case 'extendVideo':
          if (!prompt) throw new Error('Prompt is required to extend the video.');
          if (!generatedVideo) throw new Error('No previous video found to extend. Generate a video first.');
          operation = await videoService.extendVideo(prompt, generatedVideo, resolution, aspectRatio);
          break;
        default:
          throw new Error('Invalid video generation mode selected.');
      }

      await pollVideoOperation(operation);
    } catch (e: any) {
      console.error('Generation request error:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("Requested entity was not found.")) {
        onApiKeyError();
        setError("API key issue detected. Please re-select your API key.");
      } else {
        setError(`Video generation failed: ${errorMessage}`);
      }
      setIsLoading(false);
      stopLoadingMessages();
    }
  }, [
    prompt,
    startImageFile,
    endImageFile,
    referenceImageFiles,
    generatedVideo,
    selectedMode,
    resolution,
    aspectRatio,
    pollVideoOperation,
    onApiKeyError,
    startLoadingMessages,
    stopLoadingMessages,
  ]);

  const canGenerate = useCallback(() => {
    switch (selectedMode) {
      case 'textToVideo':
        return !!prompt;
      case 'textAndImageToVideo':
        return !!prompt && !!startImageFile;
      case 'imageToImageVideo':
        return !!startImageFile && !!endImageFile;
      case 'multiRefImageVideo':
        return !!prompt && referenceImageFiles.length > 0 && referenceImageFiles.length <= 3;
      case 'extendVideo':
        return !!prompt && !!generatedVideo;
      default:
        return false;
    }
  }, [prompt, startImageFile, endImageFile, referenceImageFiles, generatedVideo, selectedMode]);

  return (
    <div className="w-full max-w-5xl bg-gray-800 p-8 rounded-xl shadow-2xl space-y-8 border border-gray-700">
      <ModeSelector selectedMode={selectedMode} onSelectMode={setSelectedMode} disabled={isLoading} />

      {selectedMode !== 'extendVideo' && (
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:w-1/2">
            <label htmlFor="resolution-select" className="block text-gray-300 text-sm font-semibold mb-2">Resolution:</label>
            <select
              id="resolution-select"
              value={resolution}
              onChange={(e) => setResolution(e.target.value as VideoResolution)}
              disabled={isLoading || (selectedMode === 'multiRefImageVideo')} // Multi-ref is 720p only
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
          <div className="w-full sm:w-1/2">
            <label htmlFor="aspect-ratio-select" className="block text-gray-300 text-sm font-semibold mb-2">Aspect Ratio:</label>
            <select
              id="aspect-ratio-select"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
              disabled={isLoading || (selectedMode === 'multiRefImageVideo')} // Multi-ref is 16:9 only
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
            </select>
          </div>
        </div>
      )}

      {(selectedMode !== 'multiRefImageVideo' && selectedMode !== 'extendVideo') && (
        <Input
          label="Prompt"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A robot exploring a futuristic city"
          disabled={isLoading}
        />
      )}

      {selectedMode === 'multiRefImageVideo' && (
        <>
          <Input
            label="Prompt (required for Multi-Reference Image Video)"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A fantastical creature with glowing eyes"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-400 -mt-4">
            (Multi-Reference Image mode uses 'veo-3.1-generate-preview' model, 720p resolution, and 16:9 aspect ratio automatically.)
          </p>
          {[0, 1, 2].map((index) => (
            <FileUpload
              key={index}
              label={`Reference Image ${index + 1} (optional, max 3)`}
              onFileChange={handleReferenceFileChange(index)}
              currentFileName={referenceImageFiles[index]?.name}
              disabled={isLoading}
              accept="image/png, image/jpeg"
            />
          ))}
        </>
      )}

      {selectedMode === 'textAndImageToVideo' && (
        <FileUpload
          label="Starting Image"
          onFileChange={handleFileChange(setStartImageFile)}
          currentFileName={startImageFile?.name}
          disabled={isLoading}
          accept="image/png, image/jpeg"
        />
      )}

      {selectedMode === 'imageToImageVideo' && (
        <>
          <Input
            label="Prompt (Optional)"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., The transition is smooth and ethereal"
            disabled={isLoading}
          />
          <FileUpload
            label="Starting Image"
            onFileChange={handleFileChange(setStartImageFile)}
            currentFileName={startImageFile?.name}
            disabled={isLoading}
            accept="image/png, image/jpeg"
          />
          <FileUpload
            label="Ending Image"
            onFileChange={handleFileChange(setEndImageFile)}
            currentFileName={endImageFile?.name}
            disabled={isLoading}
            accept="image/png, image/jpeg"
          />
        </>
      )}

      {selectedMode === 'extendVideo' && (
        <>
          <Input
            label="New Prompt to Extend Video"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., and then something unexpected happens"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-400">
            Current video to extend: {generatedVideoUrl ? 'Ready' : 'None. Generate a video first.'}
          </p>
          {generatedVideo && (
            <div className="bg-gray-700 p-4 rounded-md text-sm text-gray-300">
              <p>Resolution: {generatedVideo.resolution}</p>
              <p>Aspect Ratio: {generatedVideo.aspectRatio}</p>
              <p className="mt-2">The extended video will use the same resolution and aspect ratio.</p>
            </div>
          )}
          <p className="text-sm text-gray-400 -mt-4">
            (Video extension mode uses 'veo-3.1-generate-preview' model and only supports 720p videos automatically.)
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleGenerateVideo}
          disabled={isLoading || !canGenerate()}
          fullWidth
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
        >
          {isLoading ? 'Generating...' : 'Generate Video'}
        </Button>
        <Button onClick={resetState} disabled={isLoading} variant="secondary" fullWidth>
          Reset
        </Button>
      </div>

      {isLoading && <LoadingSpinner message={loadingMessage} />}

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 p-4 rounded-md text-center">
          {error}
        </div>
      )}

      {generatedVideoUrl && (
        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-200">Generated Video</h2>
          <VideoPlayer src={generatedVideoUrl} alt="Generated AI Video" />
          <p className="text-sm text-gray-400 text-center">
            You can now use the "Extend Video" mode to add more content.
          </p>
        </div>
      )}
    </div>
  );
};
