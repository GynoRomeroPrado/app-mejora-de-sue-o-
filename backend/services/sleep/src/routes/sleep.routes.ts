import { Router } from 'express';
import {
  startSleepSession,
  endSleepSession,
  uploadAudioChunk,
  getSleepSession,
  getSleepHistory,
  deleteSleepSession,
  getActiveSession,
} from '../controllers/sleep.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/sleep/sessions/start
 * @desc    Start a new sleep session
 * @access  Private
 */
router.post('/sessions/start', rateLimit({ maxRequests: 10, windowMs: 60000 }), startSleepSession);

/**
 * @route   POST /api/sleep/sessions/:sessionId/end
 * @desc    End a sleep session
 * @access  Private
 */
router.post('/sessions/:sessionId/end', endSleepSession);

/**
 * @route   POST /api/sleep/sessions/:sessionId/audio
 * @desc    Upload audio chunk for a session
 * @access  Private
 */
router.post(
  '/sessions/:sessionId/audio',
  rateLimit({ maxRequests: 200, windowMs: 60000 }), // Allow frequent uploads
  uploadAudioChunk
);

/**
 * @route   GET /api/sleep/sessions/active
 * @desc    Get current active session
 * @access  Private
 */
router.get('/sessions/active', getActiveSession);

/**
 * @route   GET /api/sleep/sessions/:sessionId
 * @desc    Get sleep session details
 * @access  Private
 */
router.get('/sessions/:sessionId', getSleepSession);

/**
 * @route   GET /api/sleep/history
 * @desc    Get user's sleep history
 * @access  Private
 * @query   period=week|month|year|all, limit=30, offset=0
 */
router.get('/history', getSleepHistory);

/**
 * @route   DELETE /api/sleep/sessions/:sessionId
 * @desc    Delete a sleep session
 * @access  Private
 */
router.delete('/sessions/:sessionId', deleteSleepSession);

export default router;
