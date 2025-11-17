import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import axios from 'axios';
import { uploadToS3, generatePresignedUrl } from '../utils/s3';
import { encryptAudio, decryptAudio } from '../utils/encryption';

const prisma = new PrismaClient();

// Validation schemas
const startSessionSchema = z.object({
  timezone: z.string().optional(),
  deviceInfo: z.object({
    platform: z.string(),
    model: z.string(),
    osVersion: z.string(),
  }).optional(),
});

const uploadAudioChunkSchema = z.object({
  chunkNumber: z.number().int().positive(),
  totalChunks: z.number().int().positive(),
  chunkData: z.string(), // Base64 encoded audio
  timestamp: z.string().datetime(),
});

const endSessionSchema = z.object({
  endTime: z.string().datetime(),
  manualStop: z.boolean().optional(),
});

/**
 * Start a new sleep session
 */
export const startSleepSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validatedData = startSessionSchema.parse(req.body);

    // Check if user has an active session
    const activeSession = await prisma.sleepSession.findFirst({
      where: {
        userId,
        status: 'recording',
      },
    });

    if (activeSession) {
      return res.status(400).json({
        success: false,
        error: 'ACTIVE_SESSION_EXISTS',
        message: 'Ya tienes una sesión de sueño activa',
        data: { sessionId: activeSession.id },
      });
    }

    // Create new session
    const session = await prisma.sleepSession.create({
      data: {
        userId,
        startTime: new Date(),
        status: 'recording',
        timezone: validatedData.timezone,
        deviceInfo: validatedData.deviceInfo as any,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        resource: 'SleepSession',
        resourceId: session.id,
        metadata: {
          timezone: validatedData.timezone,
          device: validatedData.deviceInfo,
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        startTime: session.startTime,
        status: session.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }

    console.error('Error starting sleep session:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al iniciar sesión de sueño',
    });
  }
};

/**
 * Upload audio chunk
 */
export const uploadAudioChunk = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { sessionId } = req.params;
    const validatedData = uploadAudioChunkSchema.parse(req.body);

    // Verify session belongs to user
    const session = await prisma.sleepSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
        message: 'Sesión no encontrada',
      });
    }

    if (session.status !== 'recording') {
      return res.status(400).json({
        success: false,
        error: 'SESSION_NOT_RECORDING',
        message: 'La sesión no está en grabación',
      });
    }

    // Decrypt and process audio chunk
    const audioBuffer = Buffer.from(validatedData.chunkData, 'base64');
    const encryptedBuffer = await encryptAudio(audioBuffer);

    // Upload to S3
    const s3Key = `sleep-audio/${userId}/${sessionId}/chunk-${validatedData.chunkNumber}.enc`;
    await uploadToS3(s3Key, encryptedBuffer, 'application/octet-stream');

    // Save chunk metadata
    await prisma.audioChunk.create({
      data: {
        sessionId,
        chunkNumber: validatedData.chunkNumber,
        s3Key,
        timestamp: new Date(validatedData.timestamp),
        size: audioBuffer.length,
        encrypted: true,
      },
    });

    // If this is the last chunk, trigger ML processing
    if (validatedData.chunkNumber === validatedData.totalChunks) {
      // Trigger async processing
      triggerMLProcessing(sessionId).catch(console.error);
    }

    return res.status(200).json({
      success: true,
      data: {
        chunkNumber: validatedData.chunkNumber,
        uploaded: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }

    console.error('Error uploading audio chunk:', error);
    return res.status(500).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: 'Error al subir fragmento de audio',
    });
  }
};

/**
 * End sleep session
 */
export const endSleepSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { sessionId } = req.params;
    const validatedData = endSessionSchema.parse(req.body);

    // Verify session
    const session = await prisma.sleepSession.findUnique({
      where: { id: sessionId },
      include: {
        audioChunks: true,
      },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (session.status !== 'recording') {
      return res.status(400).json({
        success: false,
        error: 'SESSION_NOT_RECORDING',
      });
    }

    const endTime = new Date(validatedData.endTime);
    const duration = Math.floor(
      (endTime.getTime() - session.startTime.getTime()) / 1000 / 60
    ); // Duration in minutes

    // Update session
    const updatedSession = await prisma.sleepSession.update({
      where: { id: sessionId },
      data: {
        endTime,
        duration,
        status: 'processing',
      },
    });

    // Trigger ML analysis
    triggerMLProcessing(sessionId).catch(console.error);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'SleepSession',
        resourceId: sessionId,
        metadata: {
          duration,
          chunksCount: session.audioChunks.length,
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        sessionId: updatedSession.id,
        duration: updatedSession.duration,
        status: updatedSession.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }

    console.error('Error ending sleep session:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Get sleep session details
 */
export const getSleepSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { sessionId } = req.params;

    const session = await prisma.sleepSession.findUnique({
      where: { id: sessionId },
      include: {
        sleepPhaseSegments: {
          orderBy: { startTime: 'asc' },
        },
        sleepEvents: {
          orderBy: { timestamp: 'asc' },
        },
        predictions: true,
      },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
      });
    }

    // Calculate phase distribution
    const phaseDistribution = {
      awake: 0,
      rem: 0,
      light: 0,
      deep: 0,
    };

    session.sleepPhaseSegments.forEach((segment) => {
      const duration =
        (segment.endTime.getTime() - segment.startTime.getTime()) / 1000 / 60;
      phaseDistribution[segment.phase.toLowerCase()] += duration;
    });

    // Group events by type
    const eventsSummary = session.sleepEvents.reduce((acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = 0;
      }
      acc[event.type]++;
      return acc;
    }, {} as Record<string, number>);

    return res.status(200).json({
      success: true,
      data: {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        sleepScore: session.sleepScore,
        efficiency: session.efficiency,
        status: session.status,
        phaseDistribution,
        phases: session.sleepPhaseSegments.map((s) => ({
          phase: s.phase,
          startTime: s.startTime,
          endTime: s.endTime,
          confidence: s.confidence,
        })),
        events: Object.entries(eventsSummary).map(([type, count]) => ({
          type,
          count,
        })),
        predictions: session.predictions,
      },
    });
  } catch (error) {
    console.error('Error fetching sleep session:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Get user's sleep history
 */
export const getSleepHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { period = 'month', limit = 30, offset = 0 } = req.query;

    let startDate: Date | undefined;
    const now = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = undefined;
    }

    const sessions = await prisma.sleepSession.findMany({
      where: {
        userId,
        status: 'completed',
        ...(startDate && {
          startTime: {
            gte: startDate,
          },
        }),
      },
      include: {
        sleepPhaseSegments: true,
        sleepEvents: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    // Transform sessions
    const transformedSessions = sessions.map((session) => {
      const phaseDistribution = {
        awake: 0,
        rem: 0,
        light: 0,
        deep: 0,
      };

      session.sleepPhaseSegments.forEach((segment) => {
        const duration =
          (segment.endTime.getTime() - segment.startTime.getTime()) / 1000 / 60;
        phaseDistribution[segment.phase.toLowerCase()] += duration;
      });

      const eventsSummary = session.sleepEvents.reduce((acc, event) => {
        if (!acc[event.type]) {
          acc[event.type] = 0;
        }
        acc[event.type]++;
        return acc;
      }, {} as Record<string, number>);

      return {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        sleepScore: session.sleepScore,
        efficiency: session.efficiency,
        phases: phaseDistribution,
        events: Object.entries(eventsSummary).map(([type, count]) => ({
          type,
          count,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        sessions: transformedSessions,
        total: sessions.length,
        hasMore: sessions.length === Number(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching sleep history:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Delete sleep session
 */
export const deleteSleepSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { sessionId } = req.params;

    // Verify session
    const session = await prisma.sleepSession.findUnique({
      where: { id: sessionId },
      include: {
        audioChunks: true,
      },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
      });
    }

    // Delete audio files from S3
    const deletePromises = session.audioChunks.map((chunk) =>
      deleteFromS3(chunk.s3Key)
    );
    await Promise.all(deletePromises);

    // Delete session (cascade deletes will handle related records)
    await prisma.sleepSession.delete({
      where: { id: sessionId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'SleepSession',
        resourceId: sessionId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Sesión eliminada correctamente',
    });
  } catch (error) {
    console.error('Error deleting sleep session:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Get active sleep session
 */
export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const session = await prisma.sleepSession.findFirst({
      where: {
        userId,
        status: 'recording',
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'NO_ACTIVE_SESSION',
        message: 'No hay sesión activa',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        startTime: session.startTime,
        duration: Math.floor(
          (Date.now() - session.startTime.getTime()) / 1000 / 60
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Trigger ML processing for a session
 */
async function triggerMLProcessing(sessionId: string): Promise<void> {
  try {
    const ML_INFERENCE_URL =
      process.env.ML_INFERENCE_URL || 'http://ml-inference:8000';

    await axios.post(`${ML_INFERENCE_URL}/analyze/session`, {
      sessionId,
    });

    console.log(`ML processing triggered for session ${sessionId}`);
  } catch (error) {
    console.error('Error triggering ML processing:', error);
    // Update session status to failed
    await prisma.sleepSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
      },
    });
  }
}

/**
 * Delete file from S3
 */
async function deleteFromS3(key: string): Promise<void> {
  // Implementation depends on your S3 setup
  // This is a placeholder
  console.log(`Deleting ${key} from S3`);
}
