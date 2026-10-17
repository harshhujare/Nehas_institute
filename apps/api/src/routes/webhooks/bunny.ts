import { Router, Request, Response } from 'express';
import { prisma, withRetry } from '../../lib/prisma';
import { videoProvider } from '../../services/bunny';

export const bunnyWebhookRouter = Router();

/**
 * POST /api/webhooks/bunny
 * Handles Bunny Stream encoding status webhooks.
 *
 * System Design Doc Specs:
 * - FR-Y1: Verified Bunny webhook updates lecture status and duration idempotently.
 * - Section 6.2: Verifies signature against rawBody, re-fetches from Bunny API for canonical state.
 * - Section 7.1: Monotonic state transitions (never downgrade READY to PROCESSING).
 * - Section 6.7: If VideoGuid matches pendingVideoId and status is READY, swaps videoId and cleans up old video.
 * - Unknown VideoGuid returns 200 (avoids webhook retries).
 */
bunnyWebhookRouter.post('/', async (req: Request, res: Response) => {
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const signature = (req.headers['webhook-signature'] ||
    req.headers['bunnycdn-signature'] ||
    req.headers['x-bunny-signature'] ||
    '') as string;

  const payload = req.body || {};
  const videoGuid = payload.VideoGuid || payload.videoId || payload.guid;

  if (!videoGuid) {
    // Malformed webhook payload, return 200 so vendor doesn't spam retries
    console.warn('[BunnyWebhook] Missing VideoGuid in payload:', payload);
    res.status(200).json({ received: true, ignored: true, reason: 'missing_guid' });
    return;
  }

  // 1. Signature check
  const isValid = videoProvider.verifyWebhookSignature(rawBody, signature, videoGuid);
  if (!isValid && process.env.NODE_ENV === 'production') {
    console.error('[BunnyWebhook] Invalid webhook signature for video:', videoGuid);
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  // Respond 200 immediately to prevent vendor webhook timeout
  res.status(200).json({ received: true });

  // 2. Out-of-band processing (Section 6.2 #3)
  try {
    // Find lecture with either primary videoId or pendingVideoId
    const lecture = await withRetry(() =>
      prisma.lecture.findFirst({
        where: {
          OR: [{ videoId: videoGuid }, { pendingVideoId: videoGuid }],
        },
      })
    );

    if (!lecture) {
      console.log(`[BunnyWebhook] VideoGuid ${videoGuid} does not belong to any lecture. Ignored.`);
      return;
    }

    // Belt and braces: query Bunny API for ground truth
    const { status, durationSec } = await videoProvider.getVideoStatus(videoGuid);

    const isPending = lecture.pendingVideoId === videoGuid;

    if (isPending) {
      if (status === 'READY') {
        const oldVideoId = lecture.videoId;
        console.log(`[BunnyWebhook] Pending video ${videoGuid} for lecture ${lecture.id} is READY. Swapping...`);

        await withRetry(() =>
          prisma.lecture.update({
            where: { id: lecture.id },
            data: {
              videoId: videoGuid,
              pendingVideoId: null,
              status: 'READY',
              durationSec,
            },
          })
        );

        if (oldVideoId) {
          videoProvider.deleteVideo(oldVideoId).catch((err) => {
            console.warn(`[BunnyWebhook] Error deleting old video ${oldVideoId}:`, err);
          });
        }
      }
      return;
    }

    // Monotonic update for primary videoId:
    // If current DB status is READY, do not regress to PROCESSING or UPLOADING
    if (lecture.status === 'READY' && status !== 'READY') {
      console.log(`[BunnyWebhook] Monotonic guard: lecture ${lecture.id} is already READY. Ignoring transition to ${status}.`);
      return;
    }

    await withRetry(() =>
      prisma.lecture.update({
        where: { id: lecture.id },
        data: {
          status,
          ...(durationSec > 0 ? { durationSec } : {}),
        },
      })
    );

    console.log(`[BunnyWebhook] Updated lecture ${lecture.id} status to ${status} (duration: ${durationSec}s)`);
  } catch (err: any) {
    console.error('[BunnyWebhook] Error processing webhook asynchronously:', err.message);
  }
});
