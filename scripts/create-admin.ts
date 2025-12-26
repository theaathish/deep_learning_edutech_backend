import '../src/config';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/password';

const args = process.argv.slice(2);
const getArg = (key: string) => {
  const prefix = `--${key}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
};

const email = getArg('email') || process.env.NEW_ADMIN_EMAIL;
const password = getArg('password') || process.env.NEW_ADMIN_PASSWORD;
const firstName = getArg('firstName') || 'Admin';
const lastName = getArg('lastName') || 'Assistant';

if (!email || !password) {
  console.error('Usage: ts-node scripts/create-admin.ts --email=<email> --password=<password> [--firstName=<first>] [--lastName=<last>]');
  process.exit(1);
}

(async () => {
  try {
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
        password: hashedPassword,
        firstName,
        lastName,
      },
      create: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
      },
    });

    console.log(`Admin user ready: ${user.email}`);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
