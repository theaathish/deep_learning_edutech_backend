import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/password';
import { config } from '../src/config';

/**
 * Script to create a new admin user
 * Usage: npx ts-node scripts/create-admin.ts
 */
async function createAdmin() {
  try {
    console.log('Creating new admin user...');
    console.log('Email:', config.admin.email);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: config.admin.email },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with this email!');
      console.log('User details:', {
        id: existingAdmin.id,
        email: existingAdmin.email,
        name: `${existingAdmin.firstName} ${existingAdmin.lastName}`,
        role: existingAdmin.role,
        isVerified: existingAdmin.isVerified,
        isActive: existingAdmin.isActive,
      });
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        readline.question('\nDo you want to update the password? (yes/no): ', async (answer: string) => {
          readline.close();
          
          if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
            const hashedPassword = await hashPassword(config.admin.password);
            const updatedAdmin = await prisma.user.update({
              where: { email: config.admin.email },
              data: { password: hashedPassword },
            });
            console.log('✅ Admin password updated successfully!');
            console.log('Updated user:', {
              id: updatedAdmin.id,
              email: updatedAdmin.email,
              name: `${updatedAdmin.firstName} ${updatedAdmin.lastName}`,
            });
          } else {
            console.log('No changes made.');
          }
          resolve(undefined);
        });
      });
    }

    // Hash the password from config
    const hashedPassword = await hashPassword(config.admin.password);

    // Create new admin user
    const admin = await prisma.user.create({
      data: {
        email: config.admin.email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('Admin details:', {
      id: admin.id,
      email: admin.email,
      name: `${admin.firstName} ${admin.lastName}`,
      role: admin.role,
      isVerified: admin.isVerified,
      isActive: admin.isActive,
    });

    console.log('\n📝 You can now login with:');
    console.log('Email:', config.admin.email);
    console.log('Password: [from .env ADMIN_PASSWORD]');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdmin();
