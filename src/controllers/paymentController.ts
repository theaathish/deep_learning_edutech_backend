import { Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import Razorpay from 'razorpay';
import { config } from '../config';
import { sendSuccess, sendError } from '../utils/response';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.secret,
});

// Create Razorpay order for course enrollment
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const { courseId, amount } = req.body;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      sendError(res, 'Course not found', 404);
      return;
    }

    // Create Razorpay order (amount in paise for INR)
    const timestamp = Date.now().toString().slice(-8);
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `c_${courseId}_${timestamp}`,
      notes: {
        studentId: student.id,
        courseId,
        purpose: 'course_enrollment',
      },
    });

    // Save pending payment
    await prisma.payment.create({
      data: {
        studentId: student.id,
        amount,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: order.id,
        purpose: 'course_enrollment',
        metadata: { courseId },
      },
    });

    sendSuccess(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpay.keyId,
    }, 'Order created successfully');
  } catch (error) {
    console.error('Create order error:', error);
    sendError(res, 'Failed to create order', 500);
  }
};

// Verify Razorpay payment signature
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      sendError(res, 'Invalid payment signature', 400);
      return;
    }

    // Find payment by order ID
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!payment) {
      sendError(res, 'Payment not found', 404);
      return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // Create enrollment if payment is for course
    if (payment.purpose === 'course_enrollment' && payment.studentId) {
      const courseId = (payment.metadata as any)?.courseId;
      if (courseId) {
        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: {
            studentId: payment.studentId,
            courseId,
          },
        });

        if (!existingEnrollment) {
          await prisma.enrollment.create({
            data: {
              studentId: payment.studentId,
              courseId,
            },
          });

          // Increment enrollment count
          await prisma.course.update({
            where: { id: courseId },
            data: { totalEnrollments: { increment: 1 } },
          });

          // Create earning for teacher (85% to teacher, 15% platform fee)
          const course = await prisma.course.findUnique({
            where: { id: courseId },
          });

          if (course) {
            await prisma.earning.create({
              data: {
                teacherId: course.teacherId,
                amount: payment.amount * 0.85,
                source: 'course_sale',
                description: `Enrollment in ${course.title}`,
              },
            });
          }
        }
      }
    }

    sendSuccess(res, {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'succeeded',
    }, 'Payment verified successfully');
  } catch (error) {
    console.error('Verify payment error:', error);
    sendError(res, 'Failed to verify payment', 500);
  }
};

// Create order for Tutor Stand subscription
export const createSubscriptionOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    const { plan, amount } = req.body; // plan: 'monthly' | 'yearly'

    // Create Razorpay order for subscription
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `ts_${timestamp}`,
      notes: {
        teacherId: teacher.id,
        purpose: 'tutor_stand_subscription',
        plan,
      },
    });

    // Save pending payment
    await prisma.payment.create({
      data: {
        teacherId: teacher.id, // Use teacherId for teacher payments
        amount,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: order.id,
        purpose: 'tutor_stand',
        metadata: { teacherId: teacher.id, plan },
      },
    });

    sendSuccess(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpay.keyId,
    }, 'Subscription order created');
  } catch (error) {
    console.error('Create subscription order error:', error);
    sendError(res, 'Failed to create subscription order', 500);
  }
};

// Verify Tutor Stand subscription payment
export const verifySubscriptionPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      sendError(res, 'Invalid payment signature', 400);
      return;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
    });

    if (!teacher) {
      sendError(res, 'Teacher profile not found', 404);
      return;
    }

    // Find payment
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!payment) {
      sendError(res, 'Payment not found', 404);
      return;
    }

    const plan = (payment.metadata as any)?.plan || 'monthly';
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // Update or create Tutor Stand subscription
    await prisma.tutorStandSubscription.upsert({
      where: { teacherId: teacher.id },
      create: {
        teacherId: teacher.id,
        status: 'ACTIVE',
        amount: payment.amount,
        startDate,
        endDate,
        razorpayPaymentId: razorpay_payment_id,
      },
      update: {
        status: 'ACTIVE',
        amount: payment.amount,
        startDate,
        endDate,
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    sendSuccess(res, {
      subscriptionStatus: 'ACTIVE',
      startDate,
      endDate,
    }, 'Subscription activated successfully');
  } catch (error) {
    console.error('Verify subscription payment error:', error);
    sendError(res, 'Failed to verify subscription payment', 500);
  }
};

// Get payment history
export const getPaymentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'User not authenticated', 401);
      return;
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, payments, 'Payment history retrieved successfully');
  } catch (error) {
    console.error('Get payment history error:', error);
    sendError(res, 'Failed to retrieve payment history', 500);
  }
};

// Razorpay webhook handler
export const handleWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const webhookSecret = config.razorpay.webhookSecret;
    const signature = req.headers['x-razorpay-signature'] as string;

    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      sendError(res, 'Invalid webhook signature', 400);
      return;
    }

    const event = req.body;

    switch (event.event) {
      case 'payment.captured':
        console.log('Payment captured:', event.payload.payment.entity.id);
        break;
      case 'payment.failed':
        const failedPayment = await prisma.payment.findFirst({
          where: { razorpayOrderId: event.payload.payment.entity.order_id },
        });
        if (failedPayment) {
          await prisma.payment.update({
            where: { id: failedPayment.id },
            data: { status: 'failed' },
          });
        }
        break;
      case 'refund.created':
        console.log('Refund created:', event.payload.refund.entity.id);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    sendError(res, 'Webhook processing failed', 500);
  }
};
