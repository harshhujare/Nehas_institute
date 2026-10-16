import crypto from 'crypto';
import { VideoStatus } from '@prisma/client';

export interface VideoSignedUrlOptions {
  videoId: string;
  expiresInSeconds?: number; // default 14400 (4 hours)
}

export interface TusUploadAuth {
  uploadUrl: string;
  signature: string;
  expirationTime: number;
  libraryId: string;
  videoId: string;
}

export interface VideoProvider {
  isConfigured(): boolean;
  generateSignedEmbedUrl(options: VideoSignedUrlOptions): Promise<string>;
  createVideoRecord(title: string): Promise<{ videoId: string }>;
  generateTusUploadAuth(videoId: string): Promise<TusUploadAuth>;
  getVideoStatus(videoId: string): Promise<{ status: VideoStatus; durationSec: number }>;
}

// ─── Bunny Stream Production Provider ─────────────────────────────────────────

export class BunnyStreamProvider implements VideoProvider {
  private libraryId: string;
  private apiKey: string;
  private tokenAuthKey: string;
  private cdnHostname: string;

  constructor() {
    this.libraryId = process.env.BUNNY_LIBRARY_ID || '';
    this.apiKey = process.env.BUNNY_API_KEY || '';
    this.tokenAuthKey = process.env.BUNNY_TOKEN_AUTH_KEY || '';
    this.cdnHostname = process.env.BUNNY_CDN_HOSTNAME || '';
  }

  isConfigured(): boolean {
    return Boolean(this.libraryId && this.apiKey && this.tokenAuthKey);
  }

  /**
   * Generates a signed embed URL for the Bunny Stream iframe player.
   * Format: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token={hash}&expires={timestamp}
   * Token formula: sha256(tokenAuthKey + videoId + expires)
   */
  async generateSignedEmbedUrl(options: VideoSignedUrlOptions): Promise<string> {
    const { videoId, expiresInSeconds = 14400 } = options;
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const hashInput = `${this.tokenAuthKey}${videoId}${expires}`;
    const token = crypto.createHash('sha256').update(hashInput).digest('hex');

    return `https://iframe.mediadelivery.net/embed/${this.libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true&preload=true`;
  }

  /**
   * Creates a video placeholder in Bunny Stream library.
   * Call before uploading via TUS.
   */
  async createVideoRecord(title: string): Promise<{ videoId: string }> {
    const url = `https://video.bunnycdn.com/library/${this.libraryId}/videos`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        AccessKey: this.apiKey,
      },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create Bunny video record: ${res.status} ${errText}`);
    }

    const data = (await res.json()) as { guid: string };
    return { videoId: data.guid };
  }

  /**
   * Generates signature for browser-direct TUS upload.
   * Signature formula: sha256(libraryId + apiKey + expirationTime + videoId)
   */
  async generateTusUploadAuth(videoId: string): Promise<TusUploadAuth> {
    const expirationTime = Math.floor(Date.now() / 1000) + 3600 * 2; // 2 hours
    const hashInput = `${this.libraryId}${this.apiKey}${expirationTime}${videoId}`;
    const signature = crypto.createHash('sha256').update(hashInput).digest('hex');

    return {
      uploadUrl: 'https://video.bunnycdn.com/tusupload',
      signature,
      expirationTime,
      libraryId: this.libraryId,
      videoId,
    };
  }

  /**
   * Fetches real transcoding status from Bunny Stream API.
   * Bunny encode status codes:
   * 0 = Queued, 1 = Processing, 2 = Encoding, 3 = Finished, 4 = Resolution Finished, 5 = Failed
   */
  async getVideoStatus(videoId: string): Promise<{ status: VideoStatus; durationSec: number }> {
    const url = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        AccessKey: this.apiKey,
      },
    });

    if (!res.ok) {
      return { status: 'FAILED', durationSec: 0 };
    }

    const data = (await res.json()) as {
      encodeProgress?: number;
      status?: number;
      length?: number;
    };

    let status: VideoStatus = 'PROCESSING';
    if (data.status === 3 || data.status === 4 || (data.encodeProgress && data.encodeProgress >= 100)) {
      status = 'READY';
    } else if (data.status === 5) {
      status = 'FAILED';
    } else if (data.status === 0) {
      status = 'UPLOADING';
    }

    return {
      status,
      durationSec: data.length || 0,
    };
  }
}

// ─── Mock Video Provider (Local Dev / Fallback) ────────────────────────────────

export class MockVideoProvider implements VideoProvider {
  isConfigured(): boolean {
    return true;
  }

  async generateSignedEmbedUrl(options: VideoSignedUrlOptions): Promise<string> {
    const { videoId, expiresInSeconds = 14400 } = options;
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    // Embed a clean culinary video preview or test stream player
    return `https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mockVideoId=${encodeURIComponent(videoId)}&expires=${expires}`;
  }

  async createVideoRecord(title: string): Promise<{ videoId: string }> {
    const randomHex = crypto.randomBytes(8).toString('hex');
    return { videoId: `mock-video-${randomHex}` };
  }

  async generateTusUploadAuth(videoId: string): Promise<TusUploadAuth> {
    const expirationTime = Math.floor(Date.now() / 1000) + 7200;
    return {
      uploadUrl: 'http://localhost:4000/api/mock/tusupload',
      signature: 'mock_signature_dev_mode',
      expirationTime,
      libraryId: 'mock-library-id',
      videoId,
    };
  }

  async getVideoStatus(_videoId: string): Promise<{ status: VideoStatus; durationSec: number }> {
    return {
      status: 'READY',
      durationSec: 920,
    };
  }
}

// ─── Factory Export ────────────────────────────────────────────────────────────

const bunnyProvider = new BunnyStreamProvider();
const mockProvider = new MockVideoProvider();

export const videoProvider: VideoProvider = bunnyProvider.isConfigured()
  ? bunnyProvider
  : mockProvider;

if (!bunnyProvider.isConfigured() && process.env.NODE_ENV !== 'test') {
  console.log('ℹ️ Bunny Stream credentials not detected. Video streaming will run via MockVideoProvider in local dev.');
}
