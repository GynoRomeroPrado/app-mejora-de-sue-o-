import { PrismaClient, UserRole, SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create test users
  console.log('👥 Creating users...');

  const users = [
    {
      email: 'admin@sleepwise.app',
      name: 'Admin User',
      password: 'Admin123!',
      role: UserRole.ADMIN,
      tier: SubscriptionTier.ENTERPRISE,
    },
    {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: 'Password123!',
      role: UserRole.USER,
      tier: SubscriptionTier.PREMIUM,
    },
    {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      password: 'Password123!',
      role: UserRole.USER,
      tier: SubscriptionTier.BASIC,
    },
    {
      email: 'mike.johnson@company.com',
      name: 'Mike Johnson',
      password: 'Password123!',
      role: UserRole.CORPORATE_ADMIN,
      tier: SubscriptionTier.CORPORATE,
    },
    {
      email: 'sarah.wilson@company.com',
      name: 'Sarah Wilson',
      password: 'Password123!',
      role: UserRole.USER,
      tier: SubscriptionTier.FREE,
    },
  ];

  const createdUsers = [];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        passwordHash,
        role: userData.role,
        subscriptionTier: userData.tier,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        timezone: 'America/New_York',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'prefer_not_to_say',
      },
    });

    createdUsers.push(user);
    console.log(`  ✓ Created user: ${user.email} (${user.role})`);
  }

  // Create audit logs for demonstration
  console.log('📝 Creating audit logs...');
  for (const user of createdUsers.slice(0, 3)) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resource: 'auth',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Seeder)',
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('-------------------');
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`Password: ${u.password}`);
    console.log(`Role: ${u.role}\n`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
