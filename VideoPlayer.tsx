import React from 'react';

interface VideoPlayerProps {
  src: string;
  alt: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, alt }) => {
  return (
    <div className="w-full flex justify-center bg-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700">
      {src ? (
        <video
          controls
          src={src}
          className="max-w-full h-auto"
          aria-label={alt}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="flex items-center justify-center p-8 text-gray-400 text-lg">
          No video to display.
        </div>
      )}
    </div>
  );
};
