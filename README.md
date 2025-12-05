# EduTech Education Platform - Backend

A comprehensive backend API for the EduTech education platform built with Node.js, Express, TypeScript, and Prisma.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control (Admin, Teacher, Student)
- 👥 **User Management**: Registration, login, profile management
- 📚 **Course Management**: Create, read, update, delete courses with modules and lessons
- 🎓 **Enrollment System**: Students can enroll in courses and track progress
- 👨‍🏫 **Teacher Portal**: Profile management, course creation, earnings tracking
- 💳 **Payment Integration**: Stripe integration for course payments and subscriptions
- 📧 **Email Notifications**: Automated emails for welcome, verification, etc.
- 📁 **File Upload**: Support for images, documents, and videos
- 🔍 **Advanced Filtering**: Search and filter courses by category, level, price, etc.
- 📊 **Analytics**: Track enrollments, earnings, and reviews

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Payment**: Stripe
- **Email**: Nodemailer
- **File Upload**: Multer
- **Validation**: Express-validator

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Stripe account (for payments)
- SMTP email service (Gmail, SendGrid, etc.)

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/edutech"
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=your-stripe-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

5. Generate Prisma client:
```bash
npm run prisma:generate
```

6. Run database migrations:
```bash
npm run prisma:migrate
```

7. Seed the database (optional):
```bash
npm run seed
```

## Running the Server

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000` by default.

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT",
  "phoneNumber": "+1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

### Course Endpoints

#### Get All Courses
```http
GET /api/courses?page=1&limit=10&category=Math&level=BEGINNER
```

#### Get Course by ID
```http
GET /api/courses/:id
```

#### Create Course (Teacher/Admin only)
```http
POST /api/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Introduction to Mathematics",
  "description": "Learn basic math concepts",
  "shortDescription": "Basic math course",
  "category": "Mathematics",
  "level": "BEGINNER",
  "price": 49.99,
  "duration": 20,
  "thumbnailImage": "url-to-image"
}
```

#### Update Course
```http
PUT /api/courses/:id
Authorization: Bearer <token>
Content-Type: application/json
```

#### Delete Course
```http
DELETE /api/courses/:id
Authorization: Bearer <token>
```

#### Publish Course
```http
POST /api/courses/:id/publish
Authorization: Bearer <token>
```

### Enrollment Endpoints

#### Enroll in Course (Student only)
```http
POST /api/enrollments
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-id"
}
```

#### Get My Enrollments
```http
GET /api/enrollments/my-enrollments
Authorization: Bearer <token>
```

#### Update Progress
```http
POST /api/enrollments/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-id",
  "completedLessonId": "lesson-id"
}
```

### Teacher Endpoints

#### Get Teacher Profile
```http
GET /api/teacher/profile
Authorization: Bearer <token>
```

#### Update Teacher Profile
```http
PUT /api/teacher/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Experienced teacher...",
  "specialization": ["Math", "Physics"],
  "experience": 10,
  "education": "PhD in Mathematics"
}
```

#### Upload Verification Document
```http
POST /api/teacher/verification-document
Authorization: Bearer <token>
Content-Type: multipart/form-data

document: <file>
```

#### Get My Courses
```http
GET /api/teacher/my-courses
Authorization: Bearer <token>
```

#### Get Earnings
```http
GET /api/teacher/earnings
Authorization: Bearer <token>
```

### Payment Endpoints

#### Create Payment Intent
```http
POST /api/payments/create-payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-id",
  "amount": 49.99
}
```

#### Confirm Payment
```http
POST /api/payments/confirm-payment
Content-Type: application/json

{
  "paymentIntentId": "pi_xxx"
}
```

#### Create Subscription (Teacher only)
```http
POST /api/payments/create-subscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "priceId": "price_xxx"
}
```

#### Get Payment History
```http
GET /api/payments/history
Authorization: Bearer <token>
```

## Database Schema

The database includes the following main models:

- **User**: Base user model with authentication
- **Teacher**: Teacher-specific profile and data
- **Student**: Student-specific profile and data
- **Course**: Course information and metadata
- **Module**: Course modules/sections
- **Lesson**: Individual lessons within modules
- **Enrollment**: Student course enrollments
- **Assignment**: Course assignments and submissions
- **Review**: Course and teacher reviews
- **Payment**: Payment records
- **Earning**: Teacher earnings
- **TutorStandSubscription**: Teacher subscription plans

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_xxx` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | Email username | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | Email password/app password | `your-app-password` |

## Default Credentials (After Seeding)

- **Admin**: admin@edutech.com / Admin@123
- **Teacher**: teacher@edutech.com / Teacher@123
- **Student**: student@edutech.com / Student@123

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── index.ts          # Configuration
│   │   └── database.ts       # Prisma client
│   ├── controllers/          # Request handlers
│   │   ├── authController.ts
│   │   ├── courseController.ts
│   │   ├── enrollmentController.ts
│   │   ├── teacherController.ts
│   │   └── paymentController.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts
│   │   ├── authorize.ts
│   │   ├── validate.ts
│   │   ├── upload.ts
│   │   └── errorHandler.ts
│   ├── routes/              # API routes
│   │   ├── authRoutes.ts
│   │   ├── courseRoutes.ts
│   │   ├── enrollmentRoutes.ts
│   │   ├── teacherRoutes.ts
│   │   └── paymentRoutes.ts
│   ├── services/            # Business logic
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── response.ts
│   │   ├── email.ts
│   │   └── seed.ts
│   └── index.ts             # App entry point
├── uploads/                 # File uploads
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Success responses:

```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

Paginated responses:

```json
{
  "success": true,
  "message": "Success message",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Security Features

- Password hashing with bcrypt
- JWT authentication
- Role-based access control
- Input validation
- File upload restrictions
- CORS configuration
- SQL injection prevention (Prisma)
- XSS protection

## Testing

```bash
# Run tests (when implemented)
npm test
```

## Deployment

1. Build the project:
```bash
npm run build
```

2. Set production environment variables

3. Run migrations:
```bash
npm run prisma:migrate
```

4. Start the server:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License

## Support

For support, email support@edutech.com or open an issue in the repository.
