import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import { VideoOperation, VideoPart, GeneratedVideo } from '../types';

interface GenerateVideoParams {
  model: string;
  prompt?: string;
  image?: VideoPart;
  lastFrame?: VideoPart;
  referenceImages?: Array<{ image: VideoPart; referenceType: VideoGenerationReferenceType }>;
  video?: GeneratedVideo;
  config: {
    numberOfVideos: 1;
    resolution: '720p' | '1080p';
    aspectRatio: '16:9' | '9:16';
  };
}

// Helper to create a new GoogleGenAI instance before each call
const getGenAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const makeVideoGenerationCall = async (params: GenerateVideoParams): Promise<VideoOperation> => {
  const ai = getGenAI();
  try {
    const operation = await ai.models.generateVideos(params);
    return operation as VideoOperation;
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
};

export const videoService = {
  async generateVideoFromText(
    prompt: string,
    resolution: '720p' | '1080p',
    aspectRatio: '16:9' | '9:16'
  ): Promise<VideoOperation> {
    const model = resolution === '1080p' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    return makeVideoGenerationCall({
      model: model,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio,
      },
    });
  },

  async generateVideoFromTextAndImage(
    prompt: string,
    startImage: VideoPart,
    resolution: '720p' | '1080p',
    aspectRatio: '16:9' | '9:16'
  ): Promise<VideoOperation> {
    const model = resolution === '1080p' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    return makeVideoGenerationCall({
      model: model,
      prompt: prompt,
      image: startImage,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio,
      },
    });
  },

  async generateVideoFromStartAndEndImages(
    prompt: string | undefined,
    startImage: VideoPart,
    endImage: VideoPart,
    resolution: '720p' | '1080p',
    aspectRatio: '16:9' | '9:16'
  ): Promise<VideoOperation> {
    const model = resolution === '1080p' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    return makeVideoGenerationCall({
      model: model,
      prompt: prompt,
      image: startImage,
      lastFrame: endImage,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio,
      },
    });
  },

  async generateVideoFromMultipleReferenceImages(
    prompt: string,
    referenceImages: VideoPart[],
    resolution: '720p' | '1080p',
    aspectRatio: '16:9' | '9:16'
  ): Promise<VideoOperation> {
    // For multiple reference images, model must be 'veo-3.1-generate-preview'
    // and resolution '720p', aspect ratio '16:9' as per guidelines.
    // We'll enforce these here regardless of user input for consistency.
    const actualResolution: '720p' = '720p';
    const actualAspectRatio: '16:9' = '16:9';
    const model = 'veo-3.1-generate-preview';

    if (referenceImages.length === 0 || referenceImages.length > 3) {
      throw new Error('Please provide 1 to 3 reference images.');
    }

    const referenceImagesPayload = referenceImages.map((img) => ({
      image: img,
      referenceType: VideoGenerationReferenceType.ASSET,
    }));

    return makeVideoGenerationCall({
      model: model,
      prompt: prompt,
      referenceImages: referenceImagesPayload,
      config: {
        numberOfVideos: 1,
        resolution: actualResolution,
        aspectRatio: actualAspectRatio,
      },
    });
  },

  async extendVideo(
    prompt: string,
    previousVideo: GeneratedVideo,
    resolution: '720p' | '1080p',
    aspectRatio: '16:9' | '9:16'
  ): Promise<VideoOperation> {
    // Video extension currently requires 'veo-3.1-generate-preview' model
    // and only supports 720p videos.
    const actualResolution: '720p' = '720p';
    const model = 'veo-3.1-generate-preview';

    if (previousVideo.resolution !== '720p') {
      throw new Error('Only 720p videos can be extended.');
    }
    if (previousVideo.aspectRatio !== aspectRatio) {
      throw new Error('Extended video must have the same aspect ratio as the previous video.');
    }

    return makeVideoGenerationCall({
      model: model,
      prompt: prompt,
      video: previousVideo,
      config: {
        numberOfVideos: 1,
        resolution: actualResolution,
        aspectRatio: aspectRatio,
      },
    });
  },

  async getVideosOperation(operation: VideoOperation): Promise<VideoOperation> {
    const ai = getGenAI();
    try {
      const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
      return updatedOperation as VideoOperation;
    } catch (error) {
      console.error('Error polling video operation:', error);
      throw error;
    }
  },
};

// Utility function to convert File to base64 string
export const fileToBase64 = (file: File): Promise<VideoPart> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Get data part after "data:image/jpeg;base64,"
      // Fixed: Changed 'data' to 'imageBytes' to match VideoPart interface
      resolve({ imageBytes: base64Data, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
