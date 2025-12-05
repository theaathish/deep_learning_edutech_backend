import prisma from '../config/database';
import { hashPassword } from './password';
import { config } from '../config';

async function seed() {
  try {
    console.log('Starting database seed...');

    // Create admin user
    const adminPassword = await hashPassword(config.admin.password);
    const admin = await prisma.user.upsert({
      where: { email: config.admin.email },
      update: {},
      create: {
        email: config.admin.email,
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
      },
    });

    console.log('Admin user created:', admin.email);

    // Create sample teacher
    const teacherPassword = await hashPassword('Teacher@123');
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@edutech.com' },
      update: {},
      create: {
        email: 'teacher@edutech.com',
        password: teacherPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'TEACHER',
        isVerified: true,
        isActive: true,
        teacher: {
          create: {
            bio: 'Experienced educator with 10 years of teaching experience',
            specialization: ['Mathematics', 'Physics'],
            experience: 10,
            education: 'PhD in Mathematics',
            verificationStatus: 'APPROVED',
          },
        },
      },
    });

    console.log('Sample teacher created:', teacher.email);

    // Create sample student
    const studentPassword = await hashPassword('Student@123');
    const student = await prisma.user.upsert({
      where: { email: 'student@edutech.com' },
      update: {},
      create: {
        email: 'student@edutech.com',
        password: studentPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'STUDENT',
        isVerified: true,
        isActive: true,
        student: {
          create: {
            grade: '10th Grade',
            school: 'Springfield High School',
            interests: ['Mathematics', 'Science'],
          },
        },
      },
    });

    console.log('Sample student created:', student.email);

    console.log('Database seed completed successfully!');
    console.log('\nDefault credentials:');
    console.log('Admin:', config.admin.email, '/', config.admin.password);
    console.log('Teacher: teacher@edutech.com / Teacher@123');
    console.log('Student: student@edutech.com / Student@123');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
