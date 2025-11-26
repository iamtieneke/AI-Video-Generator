import React, { useState, useEffect, useCallback } from 'react';
import { VideoGenerator } from './components/VideoGenerator';
import { API_KEY_BILLING_LINK } from './constants';

function App() {
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean | null>(null);

  const checkApiKeyStatus = useCallback(async () => {
    try {
      // Assuming window.aistudio is globally available and typed externally
      const selected = await window.aistudio.hasSelectedApiKey();
      setIsApiKeySelected(selected);
    } catch (e) {
      console.error('Error checking API key status:', e);
      setIsApiKeySelected(false);
    }
  }, []);

  useEffect(() => {
    checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  const handleOpenApiKeySelection = useCallback(async () => {
    try {
      // Assuming window.aistudio is globally available and typed externally
      await window.aistudio.openSelectKey();
      // Assume success after opening the dialog, race condition addressed by documentation
      setIsApiKeySelected(true);
    } catch (e) {
      console.error('Error opening API key selection:', e);
      setIsApiKeySelected(false);
    }
  }, []);

  const handleApiKeyError = useCallback(() => {
    setIsApiKeySelected(false);
  }, []);

  if (isApiKeySelected === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-lg animate-pulse">Loading API key status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        AI Video Generator
      </h1>

      {!isApiKeySelected ? (
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md text-center space-y-4 border border-gray-700">
          <p className="text-lg font-semibold text-yellow-300">
            A paid API key is required for video generation models.
          </p>
          <p className="text-gray-300">
            Please select an API key from a paid GCP project.
          </p>
          <button
            onClick={handleOpenApiKeySelection}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Select API Key
          </button>
          <p className="text-sm text-gray-400">
            Need help?{' '}
            <a
              href={API_KEY_BILLING_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Learn about billing.
            </a>
          </p>
        </div>
      ) : (
        <VideoGenerator onApiKeyError={handleApiKeyError} />
      )}
    </div>
  );
}

export default App;
