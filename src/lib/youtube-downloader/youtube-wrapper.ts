import { spawn } from 'child_process';
import path from 'path';

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  vcodec: string;
  acodec: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  upload_date: string;
  formats: VideoFormat[];
}

export interface DownloadProgress {
  status: 'downloading' | 'processing' | 'complete' | 'error';
  downloaded_bytes?: number;
  total_bytes?: number;
  percentage?: number;
}

export interface DownloadOptions {
  format?: string;
  quality?: 'highest' | 'high' | 'medium' | 'low';
  maxFileSize?: number;
  audioOnly?: boolean;
  subtitles?: boolean;
}

/**
 * Simple YouTube wrapper using yt-dlp
 * Provides a clean interface for YouTube video operations
 */
export class YouTubeWrapper {
  private static async ensureYtDlp(): Promise<string> {
    // Check if yt-dlp is available
    const commands = ['yt-dlp', 'python3 -m yt_dlp'];
    
    for (const cmd of commands) {
      try {
        await this.runCommand(cmd.split(' ')[0], ['--version']);
        return cmd;
      } catch {
        continue;
      }
    }
    
    throw new Error('yt-dlp not found. Please install it with: pip3 install yt-dlp');
  }

  static async getVideoInfo(url: string): Promise<VideoInfo> {
    const ytDlpCmd = await this.ensureYtDlp();
    const [command, ...baseArgs] = ytDlpCmd.split(' ');
    
    const args = [
      ...baseArgs,
      '--dump-json',
      '--no-warnings',
      url
    ];

    try {
      const output = await this.runCommand(command, args);
      const data = JSON.parse(output);
      
      // Convert yt-dlp format to our format
      const videoInfo: VideoInfo = {
        id: data.id,
        title: data.title,
        duration: data.duration || 0,
        thumbnail: data.thumbnail || '',
        uploader: data.uploader || data.channel || '',
        upload_date: data.upload_date || '',
        formats: (data.formats || []).map((f: any) => ({
          format_id: f.format_id,
          ext: f.ext,
          resolution: f.resolution || f.height ? `${f.height}p` : 'unknown',
          filesize: f.filesize,
          vcodec: f.vcodec,
          acodec: f.acodec
        }))
      };
      
      return videoInfo;
    } catch (error) {
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async downloadVideo(
    url: string,
    outputPath: string,
    options: DownloadOptions = {},
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const ytDlpCmd = await this.ensureYtDlp();
    const [command, ...baseArgs] = ytDlpCmd.split(' ');
    
    // Determine format based on quality
    let formatSelector = 'best';
    if (options.quality) {
      switch (options.quality) {
        case 'highest':
          formatSelector = 'best';
          break;
        case 'high':
          formatSelector = 'best[height<=1080]';
          break;
        case 'medium':
          formatSelector = 'best[height<=720]';
          break;
        case 'low':
          formatSelector = 'best[height<=480]';
          break;
      }
    }
    
    const outputDir = path.dirname(outputPath);
    const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');
    
    const args = [
      ...baseArgs,
      '--format', formatSelector,
      '--output', outputTemplate,
      '--no-warnings',
      '--progress',
      url
    ];

    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';
      let downloadedFile = '';

      process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        
        for (const line of lines) {
          if (line.includes('[download]') && line.includes('%')) {
            // Parse progress from yt-dlp output
            const match = line.match(/(\d+\.?\d*)%.*?(\d+\.?\d*\w+)\/(\d+\.?\d*\w+)/);
            if (match) {
              const percentage = parseFloat(match[1]);
              onProgress?.({
                status: 'downloading',
                percentage: percentage
              });
            }
          } else if (line.includes('[download] Destination:')) {
            // Extract the destination file path
            downloadedFile = line.replace('[download] Destination:', '').trim();
          } else if (line.includes('[download] 100%')) {
            onProgress?.({
              status: 'complete',
              percentage: 100
            });
          }
          
          output += line + '\n';
        }
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Try to find the downloaded file
          if (downloadedFile) {
            resolve(downloadedFile);
          } else {
            // Fallback: look for the most recent file in output directory
            resolve(outputPath);
          }
        } else {
          const error = errorOutput || output || 'Download failed';
          reject(new Error(error));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  static async validateUrl(url: string): Promise<boolean> {
    try {
      await this.getVideoInfo(url);
      return true;
    } catch {
      return false;
    }
  }

  private static async runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}