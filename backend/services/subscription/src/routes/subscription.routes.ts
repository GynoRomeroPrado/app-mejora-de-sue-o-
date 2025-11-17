import { Router } from 'express';
import {
  getCurrentSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  handleWebhook,
  getPricingPlans,
} from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import express from 'express';

const router = Router();

// Public routes
router.get('/plans', getPricingPlans);

// Webhook route (must be before express.json() middleware)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// Protected routes
router.use(authenticate);

router.get('/current', getCurrentSubscription);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);
router.post('/cancel', cancelSubscription);
router.post('/reactivate', reactivateSubscription);

export default router;
