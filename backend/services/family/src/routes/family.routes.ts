import { Router } from 'express';
import {
  createFamilyGroup,
  getFamilyGroup,
  inviteMember,
  acceptInvitation,
  removeMember,
  leaveFamilyGroup,
  updateMemberRole,
} from '../controllers/family.controller';
import { authenticate, requireSubscription } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/family/groups
 * @desc    Create a new family group
 * @access  Private (Requires FAMILY or CORPORATE subscription)
 */
router.post(
  '/groups',
  requireSubscription('FAMILY', 'CORPORATE'),
  createFamilyGroup
);

/**
 * @route   GET /api/family/groups/:groupId
 * @desc    Get family group details
 * @access  Private (Members only)
 */
router.get('/groups/:groupId', getFamilyGroup);

/**
 * @route   POST /api/family/groups/:groupId/invite
 * @desc    Invite a member to the family group
 * @access  Private (Admin only)
 */
router.post('/groups/:groupId/invite', inviteMember);

/**
 * @route   POST /api/family/invitations/accept
 * @desc    Accept a family group invitation
 * @access  Private
 */
router.post('/invitations/accept', acceptInvitation);

/**
 * @route   DELETE /api/family/groups/:groupId/members/:memberId
 * @desc    Remove a member from the family group
 * @access  Private (Admin only)
 */
router.delete('/groups/:groupId/members/:memberId', removeMember);

/**
 * @route   POST /api/family/groups/:groupId/leave
 * @desc    Leave a family group
 * @access  Private (Members only)
 */
router.post('/groups/:groupId/leave', leaveFamilyGroup);

/**
 * @route   PATCH /api/family/groups/:groupId/members/:memberId/role
 * @desc    Update member role
 * @access  Private (Admin only)
 */
router.patch('/groups/:groupId/members/:memberId/role', updateMemberRole);

export default router;
