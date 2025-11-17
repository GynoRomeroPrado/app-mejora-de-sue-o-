import { PrismaClient, FamilyMemberRole, InvitationStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting family service seed...');

  // Test user IDs (these should match users from auth service)
  const testUserIds = [
    'user-id-1', // John Doe
    'user-id-2', // Jane Smith
    'user-id-3', // Mike Johnson
    'user-id-4', // Sarah Wilson
  ];

  console.log('👨‍👩‍👧‍👦 Creating family groups...');

  // Create Family Group 1: "Doe Family"
  const doeFamily = await prisma.familyGroup.create({
    data: {
      name: 'Doe Family',
      adminId: testUserIds[0],
      description: 'Our family sleep tracking group',
      settings: {
        allowMemberInvites: false,
        dataSharing: 'summary',
        notifications: true,
      },
    },
  });

  console.log(`  ✓ Created family group: ${doeFamily.name}`);

  // Add members to Doe Family
  await prisma.familyMember.createMany({
    data: [
      {
        familyGroupId: doeFamily.id,
        userId: testUserIds[0],
        role: FamilyMemberRole.ADMIN,
        nickname: 'Dad',
      },
      {
        familyGroupId: doeFamily.id,
        userId: testUserIds[1],
        role: FamilyMemberRole.MEMBER,
        nickname: 'Mom',
      },
    ],
  });

  console.log('  ✓ Added 2 members to Doe Family');

  // Create pending invitation
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.familyGroupInvitation.create({
    data: {
      familyGroupId: doeFamily.id,
      email: 'child@example.com',
      invitedBy: testUserIds[0],
      token: invitationToken,
      status: InvitationStatus.PENDING,
      expiresAt,
    },
  });

  console.log('  ✓ Created pending invitation');

  // Create Family Group 2: "Corporate Wellness Team"
  const corporateGroup = await prisma.familyGroup.create({
    data: {
      name: 'Corporate Wellness Team',
      adminId: testUserIds[2],
      description: 'Company sleep wellness program participants',
      settings: {
        allowMemberInvites: true,
        dataSharing: 'detailed',
        notifications: true,
      },
    },
  });

  console.log(`  ✓ Created family group: ${corporateGroup.name}`);

  // Add members to Corporate group
  await prisma.familyMember.createMany({
    data: [
      {
        familyGroupId: corporateGroup.id,
        userId: testUserIds[2],
        role: FamilyMemberRole.ADMIN,
        nickname: 'Team Lead',
      },
      {
        familyGroupId: corporateGroup.id,
        userId: testUserIds[3],
        role: FamilyMemberRole.MEMBER,
        nickname: 'Team Member',
      },
    ],
  });

  console.log('  ✓ Added 2 members to Corporate Wellness Team');

  // Create some accepted invitations (for history)
  await prisma.familyGroupInvitation.create({
    data: {
      familyGroupId: corporateGroup.id,
      email: 'sarah.wilson@company.com',
      invitedBy: testUserIds[2],
      token: crypto.randomBytes(32).toString('hex'),
      status: InvitationStatus.ACCEPTED,
      expiresAt: new Date(),
      acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  // Create group activities/logs
  console.log('📊 Creating group activity logs...');

  const activities = [
    {
      groupId: doeFamily.id,
      userId: testUserIds[0],
      action: 'MEMBER_INVITED',
      details: { email: 'child@example.com' },
    },
    {
      groupId: doeFamily.id,
      userId: testUserIds[1],
      action: 'MEMBER_JOINED',
      details: { nickname: 'Mom' },
    },
    {
      groupId: corporateGroup.id,
      userId: testUserIds[2],
      action: 'GROUP_CREATED',
      details: { name: 'Corporate Wellness Team' },
    },
    {
      groupId: corporateGroup.id,
      userId: testUserIds[3],
      action: 'MEMBER_JOINED',
      details: { nickname: 'Team Member' },
    },
  ];

  for (const activity of activities) {
    await prisma.groupActivity.create({
      data: {
        familyGroupId: activity.groupId,
        userId: activity.userId,
        action: activity.action,
        metadata: activity.details,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
      },
    });
  }

  console.log(`  ✓ Created ${activities.length} activity logs`);

  console.log('✅ Family service seed completed!');
  console.log(`\n📋 Created Groups:`);
  console.log(`  - ${doeFamily.name} (${doeFamily.id})`);
  console.log(`  - ${corporateGroup.name} (${corporateGroup.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
