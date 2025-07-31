export interface DownloadOptions {
  format?: string;
  quality?: 'highest' | 'high' | 'medium' | 'low';
  maxFileSize?: number;
  audioOnly?: boolean;
  subtitles?: boolean;
}

export interface DownloadProgress {
  status: 'downloading' | 'processing' | 'complete' | 'error';
  bytes_downloaded?: number;
  total_bytes?: number;
  percentage?: number;
}