import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { sendEmail } from '../utils/email';
import { generateToken } from '../utils/token';

const prisma = new PrismaClient();

// Validation schemas
const createFamilyGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

/**
 * Create a new family group
 */
export const createFamilyGroup = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validatedData = createFamilyGroupSchema.parse(req.body);

    // Check if user is already in a family group
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    if (user?.familyGroupId) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_IN_GROUP',
        message: 'Ya perteneces a un grupo familiar',
      });
    }

    // Create family group
    const familyGroup = await prisma.familyGroup.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        createdBy: userId,
      },
    });

    // Add creator as admin member
    await prisma.familyGroupMember.create({
      data: {
        familyGroupId: familyGroup.id,
        userId,
        role: 'ADMIN',
      },
    });

    // Update user's familyGroupId
    await prisma.user.update({
      where: { id: userId },
      data: { familyGroupId: familyGroup.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        resource: 'FamilyGroup',
        resourceId: familyGroup.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: familyGroup.id,
        name: familyGroup.name,
        description: familyGroup.description,
        createdAt: familyGroup.createdAt,
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

    console.error('Error creating family group:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al crear grupo familiar',
    });
  }
};

/**
 * Get family group details
 */
export const getFamilyGroup = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { groupId } = req.params;

    const familyGroup = await prisma.familyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!familyGroup) {
      return res.status(404).json({
        success: false,
        error: 'GROUP_NOT_FOUND',
      });
    }

    // Check if user is member
    const isMember = familyGroup.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'NOT_MEMBER',
        message: 'No eres miembro de este grupo',
      });
    }

    // Get sleep stats for each member
    const membersWithStats = await Promise.all(
      familyGroup.members.map(async (member) => {
        const latestSession = await prisma.sleepSession.findFirst({
          where: {
            userId: member.userId,
            status: 'completed',
          },
          orderBy: { startTime: 'desc' },
          select: {
            sleepScore: true,
          },
        });

        const avgStats = await prisma.sleepSession.aggregate({
          where: {
            userId: member.userId,
            status: 'completed',
            startTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          _avg: {
            duration: true,
            sleepScore: true,
          },
        });

        return {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          profileImage: member.user.profileImage,
          role: member.role,
          joinedAt: member.joinedAt,
          lastSleepScore: latestSession?.sleepScore,
          avgSleepHours: avgStats._avg.duration
            ? avgStats._avg.duration / 60
            : 0,
          avgSleepScore: avgStats._avg.sleepScore || 0,
        };
      })
    );

    // Calculate weekly trend
    const weeklyTrend = await calculateWeeklyTrend(groupId);

    return res.status(200).json({
      success: true,
      data: {
        id: familyGroup.id,
        name: familyGroup.name,
        description: familyGroup.description,
        createdAt: familyGroup.createdAt,
        members: membersWithStats,
        weeklyTrend,
      },
    });
  } catch (error) {
    console.error('Error fetching family group:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Invite member to family group
 */
export const inviteMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { groupId } = req.params;
    const validatedData = inviteMemberSchema.parse(req.body);

    // Verify user is admin of the group
    const membership = await prisma.familyGroupMember.findFirst({
      where: {
        familyGroupId: groupId,
        userId,
        role: 'ADMIN',
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'NOT_ADMIN',
        message: 'Solo los administradores pueden invitar miembros',
      });
    }

    // Check group size limit based on subscription tier
    const group = await prisma.familyGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    const maxMembers =
      admin?.subscriptionTier === 'FAMILY'
        ? 6
        : admin?.subscriptionTier === 'CORPORATE'
        ? 50
        : 2;

    if (group && group.members.length >= maxMembers) {
      return res.status(400).json({
        success: false,
        error: 'GROUP_FULL',
        message: `El grupo ha alcanzado el límite de ${maxMembers} miembros`,
      });
    }

    // Check if email is already invited or member
    const invitedUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (invitedUser?.familyGroupId === groupId) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_MEMBER',
        message: 'Este usuario ya es miembro del grupo',
      });
    }

    // Create invitation
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.familyGroupInvitation.create({
      data: {
        familyGroupId: groupId,
        email: validatedData.email,
        invitedBy: userId,
        token,
        expiresAt,
        role: validatedData.role,
      },
    });

    // Send invitation email
    await sendEmail({
      to: validatedData.email,
      subject: `Invitación al grupo familiar "${group?.name}"`,
      template: 'family-invitation',
      data: {
        groupName: group?.name,
        inviterName: (req as any).user.name,
        invitationUrl: `${process.env.APP_URL}/family/accept-invitation?token=${token}`,
        expiresAt,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        invitationId: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
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

    console.error('Error inviting member:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Accept family group invitation
 */
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_REQUIRED',
      });
    }

    // Find invitation
    const invitation = await prisma.familyGroupInvitation.findUnique({
      where: { token },
      include: {
        familyGroup: true,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'INVITATION_NOT_FOUND',
      });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'INVITATION_EXPIRED',
      });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'INVITATION_ALREADY_USED',
      });
    }

    // Verify user email matches invitation
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.email !== invitation.email) {
      return res.status(403).json({
        success: false,
        error: 'EMAIL_MISMATCH',
        message: 'Esta invitación no es para tu cuenta',
      });
    }

    // Add user to family group
    await prisma.familyGroupMember.create({
      data: {
        familyGroupId: invitation.familyGroupId,
        userId,
        role: invitation.role || 'MEMBER',
      },
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { familyGroupId: invitation.familyGroupId },
    });

    // Mark invitation as accepted
    await prisma.familyGroupInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    return res.status(200).json({
      success: true,
      data: {
        groupId: invitation.familyGroupId,
        groupName: invitation.familyGroup.name,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Remove member from family group
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { groupId, memberId } = req.params;

    // Verify user is admin
    const adminMembership = await prisma.familyGroupMember.findFirst({
      where: {
        familyGroupId: groupId,
        userId,
        role: 'ADMIN',
      },
    });

    if (!adminMembership) {
      return res.status(403).json({
        success: false,
        error: 'NOT_ADMIN',
      });
    }

    // Cannot remove yourself if you're the only admin
    if (memberId === userId) {
      const adminCount = await prisma.familyGroupMember.count({
        where: {
          familyGroupId: groupId,
          role: 'ADMIN',
        },
      });

      if (adminCount === 1) {
        return res.status(400).json({
          success: false,
          error: 'CANNOT_REMOVE_LAST_ADMIN',
          message: 'No puedes abandonar el grupo siendo el único administrador',
        });
      }
    }

    // Remove member
    await prisma.familyGroupMember.deleteMany({
      where: {
        familyGroupId: groupId,
        userId: memberId,
      },
    });

    // Update user
    await prisma.user.update({
      where: { id: memberId },
      data: { familyGroupId: null },
    });

    return res.status(200).json({
      success: true,
      message: 'Miembro eliminado correctamente',
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Leave family group
 */
export const leaveFamilyGroup = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { groupId } = req.params;

    // Check if user is member
    const membership = await prisma.familyGroupMember.findFirst({
      where: {
        familyGroupId: groupId,
        userId,
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: 'NOT_MEMBER',
      });
    }

    // If user is admin, check if they're the only admin
    if (membership.role === 'ADMIN') {
      const adminCount = await prisma.familyGroupMember.count({
        where: {
          familyGroupId: groupId,
          role: 'ADMIN',
        },
      });

      if (adminCount === 1) {
        const memberCount = await prisma.familyGroupMember.count({
          where: { familyGroupId: groupId },
        });

        if (memberCount > 1) {
          return res.status(400).json({
            success: false,
            error: 'ASSIGN_NEW_ADMIN',
            message:
              'Debes asignar otro administrador antes de abandonar el grupo',
          });
        }

        // Last member - delete the group
        await prisma.familyGroup.delete({
          where: { id: groupId },
        });
      }
    }

    // Remove membership
    await prisma.familyGroupMember.delete({
      where: { id: membership.id },
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { familyGroupId: null },
    });

    return res.status(200).json({
      success: true,
      message: 'Has abandonado el grupo familiar',
    });
  } catch (error) {
    console.error('Error leaving family group:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Update member role
 */
export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { groupId, memberId } = req.params;
    const validatedData = updateMemberRoleSchema.parse(req.body);

    // Verify user is admin
    const adminMembership = await prisma.familyGroupMember.findFirst({
      where: {
        familyGroupId: groupId,
        userId,
        role: 'ADMIN',
      },
    });

    if (!adminMembership) {
      return res.status(403).json({
        success: false,
        error: 'NOT_ADMIN',
      });
    }

    // Update role
    const updated = await prisma.familyGroupMember.updateMany({
      where: {
        familyGroupId: groupId,
        userId: memberId,
      },
      data: {
        role: validatedData.role,
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'MEMBER_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rol actualizado correctamente',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.errors,
      });
    }

    console.error('Error updating member role:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Calculate weekly sleep score trend for the group
 */
async function calculateWeeklyTrend(groupId: string): Promise<number[]> {
  const group = await prisma.familyGroup.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) return [];

  const userIds = group.members.map((m) => m.userId);
  const trend: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - i);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const avgScore = await prisma.sleepSession.aggregate({
      where: {
        userId: { in: userIds },
        status: 'completed',
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _avg: {
        sleepScore: true,
      },
    });

    trend.push(Math.round(avgScore._avg.sleepScore || 0));
  }

  return trend;
}
