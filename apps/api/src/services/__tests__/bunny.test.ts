import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { BunnyStreamProvider, MockVideoProvider } from '../bunny';

describe('BunnyStreamProvider', () => {
  test('generates valid signed embed URL with correct SHA-256 token hash', async () => {
    // Set test environment variables
    const originalEnv = { ...process.env };
    process.env.BUNNY_LIBRARY_ID = 'test-lib-123';
    process.env.BUNNY_API_KEY = 'test-api-key-456';
    process.env.BUNNY_TOKEN_AUTH_KEY = 'super-secret-token-key';

    const provider = new BunnyStreamProvider();
    assert.equal(provider.isConfigured(), true);

    const videoId = 'vid-abc-789';
    const expiresInSeconds = 3600;
    const nowSec = Math.floor(Date.now() / 1000);

    const url = await provider.generateSignedEmbedUrl({ videoId, expiresInSeconds });

    // Validate URL structure
    assert.match(url, /^https:\/\/iframe\.mediadelivery\.net\/embed\/test-lib-123\/vid-abc-789\?/);
    assert.match(url, /token=[a-f0-9]{64}/);
    assert.match(url, /expires=\d+/);

    // Verify token hash math
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    const expires = urlObj.searchParams.get('expires');

    assert.ok(token);
    assert.ok(expires);
    assert.ok(Number(expires) >= nowSec + expiresInSeconds);

    const expectedHash = crypto
      .createHash('sha256')
      .update(`super-secret-token-key${videoId}${expires}`)
      .digest('hex');

    assert.equal(token, expectedHash);

    // Restore env
    process.env = originalEnv;
  });

  test('generateTusUploadAuth produces valid TUS upload auth object', async () => {
    const originalEnv = { ...process.env };
    process.env.BUNNY_LIBRARY_ID = 'test-lib-123';
    process.env.BUNNY_API_KEY = 'test-api-key-456';
    process.env.BUNNY_TOKEN_AUTH_KEY = 'super-secret-token-key';

    const provider = new BunnyStreamProvider();
    const videoId = 'vid-upload-101';
    const auth = await provider.generateTusUploadAuth(videoId);

    assert.equal(auth.uploadUrl, 'https://video.bunnycdn.com/tusupload');
    assert.equal(auth.libraryId, 'test-lib-123');
    assert.equal(auth.videoId, videoId);
    assert.match(auth.signature, /^[a-f0-9]{64}$/);

    process.env = originalEnv;
  });
});

describe('MockVideoProvider', () => {
  test('returns functioning fallback embed URL in local development mode', async () => {
    const mock = new MockVideoProvider();
    assert.equal(mock.isConfigured(), true);

    const embedUrl = await mock.generateSignedEmbedUrl({ videoId: 'sample-culinary-video' });
    assert.ok(embedUrl.includes('sample-culinary-video'));

    const uploadAuth = await mock.generateTusUploadAuth('mock-video-id');
    assert.equal(uploadAuth.libraryId, 'mock-library-id');

    const status = await mock.getVideoStatus('mock-video-id');
    assert.equal(status.status, 'READY');
    assert.ok(status.durationSec > 0);
  });
});
