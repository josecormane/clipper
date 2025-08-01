import SimpleYouTubeDownloader from '../../components/simple-youtube-downloader';

export default function TestSimpleYouTubePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Test Simple YouTube Downloader
        </h1>
        <SimpleYouTubeDownloader />
      </div>
    </div>
  );
}