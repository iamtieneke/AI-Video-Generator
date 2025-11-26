export interface VideoPart {
  imageBytes: string; // Base64 encoded string
  mimeType: string;
}

export interface GeneratedVideo {
  uri: string;
  resolution: string;
  aspectRatio: string;
}

export interface VideoOperation {
  name: string;
  done: boolean;
  response?: {
    generatedVideos?: Array<{
      video?: GeneratedVideo;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

export type VideoMode =
  | 'textToVideo'
  | 'textAndImageToVideo'
  | 'imageToImageVideo'
  | 'multiRefImageVideo'
  | 'extendVideo';

export type VideoResolution = '720p' | '1080p';
export type VideoAspectRatio = '16:9' | '9:16';
