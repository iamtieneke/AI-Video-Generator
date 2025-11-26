import React from 'react';
import { VideoMode } from '../types';

interface ModeSelectorProps {
  selectedMode: VideoMode;
  onSelectMode: (mode: VideoMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onSelectMode, disabled = false }) => {
  const modes: { id: VideoMode; name: string; description: string }[] = [
    { id: 'textToVideo', name: 'Text to Video', description: 'Generate a video from a text prompt.' },
    { id: 'textAndImageToVideo', name: 'Text & Image to Video', description: 'Generate a video from a text prompt and a starting image.' },
    { id: 'imageToImageVideo', name: 'Start & End Image Video', description: 'Generate a video transitioning between a start and end image (optional prompt).' },
    { id: 'multiRefImageVideo', name: 'Multi-Reference Image Video', description: 'Generate a video using 1-3 reference images and a prompt.' },
    { id: 'extendVideo', name: 'Extend Video', description: 'Extend an existing generated video with a new prompt.' },
  ];

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-200">Select Video Generation Mode</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            disabled={disabled}
            className={`
              p-4 rounded-lg text-left transition-all duration-200
              ${selectedMode === mode.id
                ? 'bg-blue-600 border-2 border-blue-400 shadow-lg text-white'
                : 'bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-300'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <h3 className="text-lg font-semibold mb-1">{mode.name}</h3>
            <p className="text-sm">{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
