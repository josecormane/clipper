'use client';

import { useState } from 'react';
import { downloadYouTubeVideo, getYouTubeVideoInfo } from '../lib/youtube-downloader/youtube-actions';

export default function SimpleYouTubeDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const response = await getYouTubeVideoInfo(url);
      
      if (response.success) {
        setVideoInfo(response.data);
      } else {
        setError(response.error || 'Failed to get video info');
      }
    } catch (err) {
      setError('Failed to get video info');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (quality: 'highest' | 'high' | 'medium' | 'low' = 'high') => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await downloadYouTubeVideo(url, { 
        quality,
        createProject: true 
      });
      
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || 'Download failed');
      }
    } catch (err) {
      setError('Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">Simple YouTube Downloader</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">
              YouTube URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleGetInfo}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Get Info'}
            </button>
            
            <button
              onClick={() => handleDownload('low')}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Downloading...' : 'Download (Low)'}
            </button>
            
            <button
              onClick={() => handleDownload('high')}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Downloading...' : 'Download (High)'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-md">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {videoInfo && (
          <div className="mt-6 p-4 bg-blue-900 border border-blue-700 rounded-md">
            <h3 className="font-semibold mb-2 text-blue-200">Video Information</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <p><strong className="text-white">Title:</strong> {videoInfo.title}</p>
              <p><strong className="text-white">Uploader:</strong> {videoInfo.uploader}</p>
              <p><strong className="text-white">Duration:</strong> {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}</p>
              <p><strong className="text-white">Formats:</strong> {videoInfo.formats.length} available</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-900 border border-green-700 rounded-md">
            <h3 className="font-semibold mb-2 text-green-200">✅ Download Completed!</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p><strong className="text-white">File:</strong> {result.videoInfo.title}</p>
              <p><strong className="text-white">Size:</strong> {result.fileSize} MB</p>
              <p><strong className="text-white">Path:</strong> {result.filePath}</p>
              {result.projectId && (
                <div className="mt-3 p-3 bg-green-800 border border-green-600 rounded-md">
                  <p className="text-green-200 font-medium mb-2">🎬 Video ready for analysis!</p>
                  <div className="flex gap-2">
                    <a 
                      href={`/local-project/${result.projectId}`}
                      className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      View Project & Analyze Video →
                    </a>
                    <a 
                      href="/local"
                      className="inline-block px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                    >
                      All Projects
                    </a>
                  </div>
                  <p className="text-xs text-green-300 mt-2">
                    Project ID: {result.projectId}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}