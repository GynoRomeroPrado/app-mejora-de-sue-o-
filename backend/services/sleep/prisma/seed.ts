import { PrismaClient, SleepPhase, EventType, EventSeverity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting sleep service seed...');

  // Get test users from auth service (assuming they exist)
  const testUserIds = [
    'user-id-1', // Will need to be replaced with actual IDs
    'user-id-2',
    'user-id-3',
  ];

  console.log('💤 Creating sleep sessions...');

  // Create sleep sessions for the last 30 days
  const now = new Date();
  const sessionsData = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(22, 0, 0, 0); // Start at 10 PM

    const startTime = new Date(date);
    const endTime = new Date(date);
    endTime.setHours(6, 30, 0, 0); // End at 6:30 AM next day

    const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // minutes
    const qualityScore = Math.floor(Math.random() * 30) + 70; // 70-100

    // Randomly select a user for each session
    const userId = testUserIds[Math.floor(Math.random() * testUserIds.length)];

    const session = await prisma.sleepSession.create({
      data: {
        userId,
        startTime,
        endTime,
        duration,
        status: 'COMPLETED',
        qualityScore,
        deepSleepMinutes: Math.floor(duration * 0.25),
        remSleepMinutes: Math.floor(duration * 0.20),
        lightSleepMinutes: Math.floor(duration * 0.50),
        awakeMinutes: Math.floor(duration * 0.05),
        sleepEfficiency: 0.90 + Math.random() * 0.09,
        sleepLatency: Math.floor(Math.random() * 20) + 5,
        wakeAfterSleepOnset: Math.floor(Math.random() * 30),
        numberOfAwakenings: Math.floor(Math.random() * 5),
        averageHeartRate: 55 + Math.floor(Math.random() * 15),
        heartRateVariability: 40 + Math.floor(Math.random() * 30),
        averageBreathingRate: 12 + Math.floor(Math.random() * 6),
        movementCount: Math.floor(Math.random() * 50),
        snoringDuration: Math.floor(Math.random() * 60),
        environmentalScore: 70 + Math.floor(Math.random() * 30),
        notes: i % 5 === 0 ? 'Felt well rested' : null,
      },
    });

    sessionsData.push(session);
    console.log(`  ✓ Created session for ${startTime.toLocaleDateString()}`);

    // Create sleep phases
    await createSleepPhases(session.id, startTime, duration);

    // Create some events
    if (Math.random() > 0.5) {
      await createSleepEvents(session.id, startTime, duration);
    }
  }

  console.log('✅ Sleep service seed completed!');
  console.log(`📊 Created ${sessionsData.length} sleep sessions`);
}

async function createSleepPhases(sessionId: string, startTime: Date, totalDuration: number) {
  const phases: SleepPhase[] = ['AWAKE', 'LIGHT', 'DEEP', 'REM'];
  const phaseData = [];

  let currentTime = new Date(startTime);
  let remainingDuration = totalDuration;

  // Create realistic sleep cycles (90-120 minutes each)
  while (remainingDuration > 0) {
    const cycleDuration = Math.min(90 + Math.random() * 30, remainingDuration);

    // LIGHT sleep (30-40%)
    const lightDuration = cycleDuration * (0.30 + Math.random() * 0.10);
    phaseData.push({
      sessionId,
      phase: 'LIGHT' as SleepPhase,
      startTime: new Date(currentTime),
      endTime: new Date(currentTime.getTime() + lightDuration * 60 * 1000),
      duration: lightDuration,
      confidence: 0.85 + Math.random() * 0.14,
    });
    currentTime = new Date(currentTime.getTime() + lightDuration * 60 * 1000);

    // DEEP sleep (15-25%)
    if (remainingDuration > lightDuration) {
      const deepDuration = Math.min(cycleDuration * (0.15 + Math.random() * 0.10), remainingDuration - lightDuration);
      phaseData.push({
        sessionId,
        phase: 'DEEP' as SleepPhase,
        startTime: new Date(currentTime),
        endTime: new Date(currentTime.getTime() + deepDuration * 60 * 1000),
        duration: deepDuration,
        confidence: 0.80 + Math.random() * 0.19,
      });
      currentTime = new Date(currentTime.getTime() + deepDuration * 60 * 1000);

      // REM sleep (20-25%)
      if (remainingDuration > lightDuration + deepDuration) {
        const remDuration = Math.min(cycleDuration * (0.20 + Math.random() * 0.05), remainingDuration - lightDuration - deepDuration);
        phaseData.push({
          sessionId,
          phase: 'REM' as SleepPhase,
          startTime: new Date(currentTime),
          endTime: new Date(currentTime.getTime() + remDuration * 60 * 1000),
          duration: remDuration,
          confidence: 0.75 + Math.random() * 0.24,
        });
        currentTime = new Date(currentTime.getTime() + remDuration * 60 * 1000);
        remainingDuration -= (lightDuration + deepDuration + remDuration);
      } else {
        remainingDuration = 0;
      }
    } else {
      remainingDuration = 0;
    }
  }

  await prisma.sleepPhase.createMany({ data: phaseData });
}

async function createSleepEvents(sessionId: string, startTime: Date, totalDuration: number) {
  const eventTypes: EventType[] = ['SNORING', 'MOVEMENT', 'BREATHING_IRREGULARITY', 'ENVIRONMENT_CHANGE'];
  const severities: EventSeverity[] = ['LOW', 'MODERATE', 'HIGH'];

  const numEvents = Math.floor(Math.random() * 8) + 2;
  const events = [];

  for (let i = 0; i < numEvents; i++) {
    const eventTime = new Date(startTime.getTime() + Math.random() * totalDuration * 60 * 1000);
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    events.push({
      sessionId,
      type: eventType,
      timestamp: eventTime,
      confidence: 0.70 + Math.random() * 0.29,
      severity: severities[Math.floor(Math.random() * severities.length)],
      duration: eventType === 'SNORING' ? Math.floor(Math.random() * 120) + 30 : null,
      metadata: eventType === 'ENVIRONMENT_CHANGE' ? { temperature: 22, noise_level: 35 } : null,
    });
  }

  await prisma.sleepEvent.createMany({ data: events });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
