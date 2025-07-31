import SimpleYouTubeDownloader from '../../components/simple-youtube-downloader';

export default function YouTubeTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          YouTube Downloader Test
        </h1>
        <SimpleYouTubeDownloader />
      </div>
    </div>
  );
}