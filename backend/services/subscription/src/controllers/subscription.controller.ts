import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Price IDs from Stripe Dashboard
const STRIPE_PRICES = {
  PREMIUM_MONTHLY: process.env.STRIPE_PRODUCT_PREMIUM_MONTHLY!,
  PREMIUM_ANNUAL: process.env.STRIPE_PRODUCT_PREMIUM_ANNUAL!,
  FAMILY_MONTHLY: process.env.STRIPE_PRODUCT_FAMILY_MONTHLY!,
  FAMILY_ANNUAL: process.env.STRIPE_PRODUCT_FAMILY_ANNUAL!,
};

// Validation schemas
const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  tier: z.enum(['PREMIUM', 'FAMILY']),
  billingPeriod: z.enum(['monthly', 'annual']),
});

const createPortalSchema = z.object({
  returnUrl: z.string().url(),
});

/**
 * Get current subscription
 */
export const getCurrentSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription found',
        },
      });
    }

    // Get Stripe subscription details
    let stripeSubscription = null;
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );
      } catch (error) {
        logger.error('Failed to retrieve Stripe subscription:', error);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        stripeDetails: stripeSubscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create checkout session for subscription
 */
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const validatedData = createCheckoutSchema.parse(req.body);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    // Check if user already has active subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (existingSubscription && existingSubscription.status === SubscriptionStatus.ACTIVE) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_SUBSCRIBED',
          message: 'User already has an active subscription',
        },
      });
    }

    // Get or create Stripe customer
    let customerId = existingSubscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: validatedData.priceId,
          quantity: 1,
        },
      ],
      success_url: validatedData.successUrl,
      cancel_url: validatedData.cancelUrl,
      metadata: {
        userId: user.id,
        tier: validatedData.tier,
        billingPeriod: validatedData.billingPeriod,
      },
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: {
          userId: user.id,
          tier: validatedData.tier,
        },
      },
    });

    // Update or create subscription record
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: validatedData.tier as SubscriptionTier,
        status: SubscriptionStatus.TRIAL,
        stripeCustomerId: customerId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        stripeCustomerId: customerId,
      },
    });

    logger.info(`Checkout session created for user ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }
    next(error);
  }
};

/**
 * Create customer portal session
 */
export const createPortalSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const validatedData = createPortalSchema.parse(req.body);

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No subscription found',
        },
      });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: validatedData.returnUrl,
    });

    return res.status(200).json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }
    next(error);
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription found',
        },
      });
    }

    // Cancel at period end (don't cancel immediately)
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update database
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    logger.info(`Subscription cancelled for user ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        subscription: stripeSubscription,
        message: 'Subscription will be cancelled at the end of the billing period',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate cancelled subscription
 */
export const reactivateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No subscription found',
        },
      });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_CANCELLED',
          message: 'Subscription is not scheduled for cancellation',
        },
      });
    }

    // Reactivate subscription
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    // Update database
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false,
      },
    });

    logger.info(`Subscription reactivated for user ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        subscription: stripeSubscription,
        message: 'Subscription has been reactivated',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Webhook handler for Stripe events
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Webhook event handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  logger.info(`Checkout completed for user ${userId}`);

  // Subscription will be created by subscription.created event
  // Just log for now
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const tier = subscription.metadata?.tier as SubscriptionTier;

  await prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscription.id,
      status: SubscriptionStatus.ACTIVE,
      tier,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  // Update user subscription tier
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier,
    },
  });

  logger.info(`Subscription created for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const status = subscription.status === 'active'
    ? SubscriptionStatus.ACTIVE
    : subscription.status === 'canceled'
    ? SubscriptionStatus.CANCELED
    : subscription.status === 'past_due'
    ? SubscriptionStatus.PAST_DUE
    : SubscriptionStatus.ACTIVE;

  await prisma.subscription.update({
    where: { userId },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info(`Subscription updated for user ${userId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: SubscriptionStatus.CANCELED,
    },
  });

  // Downgrade user to free tier
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: SubscriptionTier.FREE,
    },
  });

  logger.info(`Subscription deleted for user ${userId}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) return;

  logger.info(`Invoice paid for subscription ${subscription.id}`);

  // Subscription is active, update if needed
  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) return;

  logger.error(`Payment failed for subscription ${subscription.id}`);

  // Update status to past due
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.PAST_DUE,
    },
  });

  // TODO: Send notification to user
}

/**
 * Get pricing plans
 */
export const getPricingPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        tier: 'FREE',
        price: {
          monthly: 0,
          annual: 0,
        },
        features: [
          'Basic sleep tracking',
          '7 days history',
          'Smart alarm',
          'Basic insights',
        ],
        limits: {
          historyDays: 7,
          aiPredictions: false,
          familyMembers: 0,
          healthIntegrations: false,
        },
      },
      {
        id: 'premium',
        name: 'Premium Individual',
        tier: 'PREMIUM',
        price: {
          monthly: 9.99,
          annual: 79.99,
        },
        priceIds: {
          monthly: STRIPE_PRICES.PREMIUM_MONTHLY,
          annual: STRIPE_PRICES.PREMIUM_ANNUAL,
        },
        features: [
          'Unlimited sleep history',
          'AI-powered predictions',
          'Advanced analytics',
          'Detailed insights',
          'Health integrations',
          'Priority support',
          'No ads',
        ],
        limits: {
          historyDays: -1, // unlimited
          aiPredictions: true,
          familyMembers: 0,
          healthIntegrations: true,
        },
      },
      {
        id: 'family',
        name: 'Premium Family',
        tier: 'FAMILY',
        price: {
          monthly: 14.99,
          annual: 119.99,
        },
        priceIds: {
          monthly: STRIPE_PRICES.FAMILY_MONTHLY,
          annual: STRIPE_PRICES.FAMILY_ANNUAL,
        },
        features: [
          'All Premium features',
          'Up to 5 family members',
          'Family dashboard',
          'Health alerts',
          'Privacy controls',
          'Shared insights',
        ],
        limits: {
          historyDays: -1,
          aiPredictions: true,
          familyMembers: 5,
          healthIntegrations: true,
        },
      },
    ];

    return res.status(200).json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    next(error);
  }
};
