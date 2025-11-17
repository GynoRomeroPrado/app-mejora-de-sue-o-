import { Request, Response, NextFunction } from 'express';
import { PrismaClient, SleepPhase, SleepEventType } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Validation schemas
const analyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('week'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const compareQuerySchema = z.object({
  userId: z.string().optional(),
  period: z.enum(['week', 'month']).default('week'),
});

/**
 * Get user analytics
 */
export const getUserAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const validatedQuery = analyticsQuerySchema.parse(req.query);

    const { startDate, endDate } = getDateRange(validatedQuery.period);

    // Fetch sleep sessions
    const sessions = await prisma.sleepSession.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        phases: true,
        events: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    if (sessions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'No data available for this period',
          sessions: [],
        },
      });
    }

    // Calculate analytics
    const analytics = await calculateAnalytics(userId, sessions, validatedQuery.period);

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }
    next(error);
  }
};

/**
 * Get sleep trends
 */
export const getSleepTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const validatedQuery = analyticsQuerySchema.parse(req.query);

    const { startDate, endDate } = getDateRange(validatedQuery.period);

    // Fetch sessions with key metrics
    const sessions = await prisma.sleepSession.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        startTime: true,
        duration: true,
        sleepScore: true,
        efficiency: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Format trends data
    const trends = {
      sleepScore: sessions.map(s => ({
        date: s.startTime,
        value: s.sleepScore || 0,
      })),
      duration: sessions.map(s => ({
        date: s.startTime,
        value: s.duration || 0,
      })),
      efficiency: sessions.map(s => ({
        date: s.startTime,
        value: s.efficiency || 0,
      })),
    };

    return res.status(200).json({
      success: true,
      data: { trends },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sleep insights
 */
export const getSleepInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    // Get recent sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await prisma.sleepSession.findMany({
      where: {
        userId,
        startTime: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
      },
      include: {
        phases: true,
        events: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Generate insights
    const insights = await generateInsights(userId, sessions);

    return res.status(200).json({
      success: true,
      data: { insights },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Compare with averages
 */
export const compareWithAverages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { sessionId } = req.params;

    // Get the session
    const session = await prisma.sleepSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: true,
        events: true,
      },
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
        },
      });
    }

    // Get user's average (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userSessions = await prisma.sleepSession.findMany({
      where: {
        userId,
        startTime: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
        id: { not: sessionId }, // Exclude current session
      },
    });

    const userAvg = calculateAverages(userSessions);

    // Get global average (all users, last 30 days)
    const globalSessions = await prisma.sleepSession.findMany({
      where: {
        startTime: { gte: thirtyDaysAgo },
        status: 'COMPLETED',
      },
      take: 10000, // Limit for performance
    });

    const globalAvg = calculateAverages(globalSessions);

    // Calculate differences
    const comparison = {
      session: {
        duration: session.duration,
        sleepScore: session.sleepScore,
        efficiency: session.efficiency,
      },
      userAverage: userAvg,
      globalAverage: globalAvg,
      differences: {
        durationVsUser: session.duration ? (session.duration - userAvg.duration) : null,
        scoreVsUser: session.sleepScore ? (session.sleepScore - userAvg.sleepScore) : null,
        efficiencyVsUser: session.efficiency ? (session.efficiency - userAvg.efficiency) : null,
        durationVsGlobal: session.duration ? (session.duration - globalAvg.duration) : null,
        scoreVsGlobal: session.sleepScore ? (session.sleepScore - globalAvg.sleepScore) : null,
        efficiencyVsGlobal: session.efficiency ? (session.efficiency - globalAvg.efficiency) : null,
      },
    };

    return res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export user data
 */
export const exportUserData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const format = req.query.format || 'json'; // json or csv

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sleepSessions: {
          include: {
            phases: true,
            events: true,
          },
        },
        healthMetrics: true,
        predictions: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Remove sensitive data
    const { passwordHash, ...userData } = user;

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(userData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sleepwise-data-${userId}.csv`);
      return res.send(csv);
    }

    // Return JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=sleepwise-data-${userId}.json`);
    return res.json(userData);
  } catch (error) {
    next(error);
  }
};

/**
 * Get corporate dashboard analytics
 */
export const getCorporateAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const validatedQuery = analyticsQuerySchema.parse(req.query);

    // Get user's organization
    const corporateMember = await prisma.corporateMember.findFirst({
      where: { userId },
      include: {
        organization: true,
      },
    });

    if (!corporateMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_CORPORATE_MEMBER',
          message: 'User is not part of a corporate organization',
        },
      });
    }

    const { startDate, endDate } = getDateRange(validatedQuery.period);

    // Get all organization members
    const orgMembers = await prisma.corporateMember.findMany({
      where: { organizationId: corporateMember.organizationId },
      select: { userId: true },
    });

    const memberIds = orgMembers.map(m => m.userId);

    // Aggregate sleep data (anonymized)
    const sessions = await prisma.sleepSession.findMany({
      where: {
        userId: { in: memberIds },
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
    });

    // Calculate aggregated metrics
    const analytics = {
      totalEmployees: memberIds.length,
      activeUsers: new Set(sessions.map(s => s.userId)).size,
      averageSleepScore: calculateAverage(sessions.map(s => s.sleepScore || 0)),
      averageDuration: calculateAverage(sessions.map(s => s.duration || 0)),
      averageEfficiency: calculateAverage(sessions.map(s => s.efficiency || 0)),
      burnoutRiskDistribution: {
        low: 0,
        medium: 0,
        high: 0,
      },
      trends: {
        sleepScore: [], // Implement time-based aggregation
        duration: [],
        efficiency: [],
      },
    };

    // Calculate burnout risk (simplified)
    for (const memberId of memberIds) {
      const memberSessions = sessions.filter(s => s.userId === memberId);
      const riskLevel = calculateBurnoutRisk(memberSessions);
      analytics.burnoutRiskDistribution[riskLevel]++;
    }

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }

  return { startDate, endDate };
}

async function calculateAnalytics(userId: string, sessions: any[], period: string) {
  const totalSessions = sessions.length;

  // Calculate averages
  const avgSleepScore = calculateAverage(sessions.map(s => s.sleepScore || 0));
  const avgDuration = calculateAverage(sessions.map(s => s.duration || 0));
  const avgEfficiency = calculateAverage(sessions.map(s => s.efficiency || 0));

  // Phase distribution
  const allPhases = sessions.flatMap(s => s.phases);
  const phaseDistribution = {
    [SleepPhase.AWAKE]: 0,
    [SleepPhase.REM]: 0,
    [SleepPhase.LIGHT]: 0,
    [SleepPhase.DEEP]: 0,
  };

  for (const phase of allPhases) {
    phaseDistribution[phase.phase] += phase.duration;
  }

  const totalDuration = Object.values(phaseDistribution).reduce((a, b) => a + b, 0);
  for (const phase in phaseDistribution) {
    phaseDistribution[phase as SleepPhase] = totalDuration > 0
      ? (phaseDistribution[phase as SleepPhase] / totalDuration) * 100
      : 0;
  }

  // Event counts
  const allEvents = sessions.flatMap(s => s.events);
  const eventCounts: Record<string, number> = {};

  for (const event of allEvents) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  // Trends
  const trends = {
    sleepScore: sessions.map(s => ({ date: s.startTime, value: s.sleepScore || 0 })),
    duration: sessions.map(s => ({ date: s.startTime, value: s.duration || 0 })),
    efficiency: sessions.map(s => ({ date: s.startTime, value: s.efficiency || 0 })),
  };

  // Generate insights
  const insights = await generateInsights(userId, sessions);

  return {
    userId,
    period,
    totalSessions,
    averageSleepScore: Math.round(avgSleepScore),
    averageDuration: Math.round(avgDuration),
    averageEfficiency: Math.round(avgEfficiency),
    phaseDistribution,
    eventCounts,
    trends,
    insights,
  };
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function calculateAverages(sessions: any[]) {
  return {
    duration: calculateAverage(sessions.map(s => s.duration || 0)),
    sleepScore: calculateAverage(sessions.map(s => s.sleepScore || 0)),
    efficiency: calculateAverage(sessions.map(s => s.efficiency || 0)),
  };
}

async function generateInsights(userId: string, sessions: any[]) {
  const insights = [];

  if (sessions.length < 3) {
    return [{
      id: 'insufficient-data',
      type: 'neutral',
      title: 'Sigue registrando tu sueño',
      description: 'Necesitamos más datos para generar insights personalizados',
      actionable: false,
      priority: 'low',
      createdAt: new Date(),
    }];
  }

  const recent = sessions.slice(-7); // Last 7 sessions
  const avgScore = calculateAverage(recent.map(s => s.sleepScore || 0));

  // Sleep quality insight
  if (avgScore >= 80) {
    insights.push({
      id: 'good-sleep-quality',
      type: 'positive',
      title: '¡Excelente calidad de sueño!',
      description: `Tu puntuación promedio es ${Math.round(avgScore)}. Continúa con tus buenos hábitos.`,
      actionable: false,
      priority: 'low',
      createdAt: new Date(),
    });
  } else if (avgScore < 70) {
    insights.push({
      id: 'poor-sleep-quality',
      type: 'warning',
      title: 'Tu sueño necesita mejorar',
      description: `Tu puntuación promedio es ${Math.round(avgScore)}. Considera ajustar tu rutina nocturna.`,
      actionable: true,
      actions: [
        'Establece un horario regular de sueño',
        'Evita pantallas 1 hora antes de dormir',
        'Crea un ambiente oscuro y fresco',
      ],
      priority: 'high',
      createdAt: new Date(),
    });
  }

  // Consistency insight
  const durations = recent.map(s => s.duration || 0);
  const durationVariance = calculateVariance(durations);

  if (durationVariance > 60) { // More than 1 hour variance
    insights.push({
      id: 'inconsistent-schedule',
      type: 'negative',
      title: 'Horario de sueño inconsistente',
      description: 'Tu duración de sueño varía significativamente cada noche.',
      actionable: true,
      actions: [
        'Intenta acostarte y levantarte a la misma hora',
        'Establece una alarma de recordatorio',
      ],
      priority: 'medium',
      createdAt: new Date(),
    });
  }

  // Event detection insights
  const recentEvents = recent.flatMap(s => s.events || []);
  const apneaEvents = recentEvents.filter(e => e.type === 'APNEA').length;

  if (apneaEvents > 5) {
    insights.push({
      id: 'apnea-detected',
      type: 'warning',
      title: 'Eventos de apnea detectados',
      description: `Se detectaron ${apneaEvents} eventos de apnea en la última semana.`,
      actionable: true,
      actions: [
        'Consulta con un especialista del sueño',
        'Considera realizar un estudio del sueño',
      ],
      priority: 'high',
      createdAt: new Date(),
    });
  }

  return insights;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = calculateAverage(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(calculateAverage(squaredDiffs));
}

function calculateBurnoutRisk(sessions: any[]): 'low' | 'medium' | 'high' {
  if (sessions.length === 0) return 'low';

  const avgScore = calculateAverage(sessions.map(s => s.sleepScore || 0));
  const avgDuration = calculateAverage(sessions.map(s => s.duration || 0));

  if (avgScore < 60 || avgDuration < 360) return 'high'; // Less than 6 hours
  if (avgScore < 75 || avgDuration < 420) return 'medium'; // Less than 7 hours
  return 'low';
}

function convertToCSV(data: any): string {
  // Simplified CSV conversion
  // In production, use a proper CSV library
  return JSON.stringify(data);
}
