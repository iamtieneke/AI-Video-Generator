import React, { useRef } from 'react';
import { Button } from './Button';

interface FileUploadProps {
  label: string;
  onFileChange: (file: File | null) => void;
  accept?: string;
  currentFileName?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onFileChange,
  accept = 'image/*',
  currentFileName,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileChange(file);
    // Reset the input to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the parent click from re-opening file dialog
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <label className="block text-gray-300 text-sm font-semibold mb-2">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          accept={accept}
          className="hidden"
          disabled={disabled}
        />
        <Button
          onClick={handleClick}
          disabled={disabled}
          variant="secondary"
          className="flex-shrink-0"
        >
          {currentFileName ? 'Change File' : 'Choose File'}
        </Button>
        <span className="flex-grow text-gray-400 text-sm truncate">
          {currentFileName || 'No file selected'}
        </span>
        {currentFileName && (
          <Button
            onClick={handleClearFile}
            disabled={disabled}
            variant="danger"
            className="flex-shrink-0 px-3 py-1 text-sm"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
