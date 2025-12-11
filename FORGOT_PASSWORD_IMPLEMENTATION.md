# Forgot Password Implementation

## Overview
The forgot password functionality has been successfully implemented with email-based password reset tokens.

## Features Implemented

### 1. **Forgot Password Request** (`POST /api/auth/forgot-password`)
- User provides their email address
- System generates a secure 32-byte random token
- Token is hashed and stored in database with 1-hour expiration
- Reset link is sent to user's email
- Security: Returns success message even if email doesn't exist (prevents email enumeration)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link will be sent"
}
```

### 2. **Reset Password** (`POST /api/auth/reset-password`)
- User submits token, email, and new password
- Token is validated (must be unused and not expired)
- Password is hashed with bcrypt
- Token is marked as used
- All other unused tokens for the user are deleted (one-time use)
- User can then login with new password

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "email": "user@example.com",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password"
}
```

## Database Schema

### New `PasswordReset` Table
```sql
CREATE TABLE "PasswordReset" (
  id           String   PRIMARY KEY
  token        String   UNIQUE      (hashed token)
  userId       String   FOREIGN KEY
  expiresAt    DateTime             (1 hour from creation)
  isUsed       Boolean  DEFAULT false
  createdAt    DateTime DEFAULT now()
)
```

### Updated `User` Model
Added relation: `passwordResets PasswordReset[]`

## Email Template

The system sends a password reset email with:
- User's first name (personalized greeting)
- Clear password reset instructions
- A clickable reset link with token and email
- Security note: "If you didn't request this, please ignore"

**Reset Link Format:**
```
https://api.deeplearningedutech.com/api/auth/reset-password?token={resetToken}&email={userEmail}
```

## Security Features

✅ **Secure Token Generation**: 32-byte random tokens using `crypto.randomBytes()`
✅ **Token Hashing**: Tokens hashed with SHA256 before database storage
✅ **Time-based Expiration**: 1-hour token validity window
✅ **One-time Use**: Tokens marked as used after password reset
✅ **Token Cleanup**: Unused tokens deleted after reset (prevents multiple resets)
✅ **Email Validation**: Email format validated on both endpoints
✅ **Password Requirements**: Minimum 6 characters enforced
✅ **Email Enumeration Prevention**: No indication if email exists in system
✅ **Secure Storage**: Passwords hashed with bcrypt (10 salt rounds)

## Email Configuration

**Provider**: Gmail SMTP
**Host**: smtp.gmail.com
**Port**: 587
**From Address**: tagverse.iio@gmail.com
**Auth**: Using app-specific password from .env

**Configuration in .env:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tagverse.iio@gmail.com
EMAIL_PASSWORD=vckr qzcr uilw sfdp
```

## API Endpoints

### Forgot Password
- **Method**: `POST`
- **URL**: `/api/auth/forgot-password`
- **Auth Required**: No
- **Validation**: Valid email required
- **Response**: Always success (security)

### Reset Password
- **Method**: `POST`
- **URL**: `/api/auth/reset-password`
- **Auth Required**: No
- **Validation**: 
  - Token required
  - Valid email required
  - Password minimum 6 characters
- **Response**: Success if valid, Error if invalid/expired

## Frontend Integration

### Step 1: Request Password Reset
```javascript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userEmail })
});
```

### Step 2: User clicks email link or enters token manually
Extract token and email from URL query parameters:
```javascript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const email = params.get('email');
```

### Step 3: Reset Password
```javascript
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: resetToken,
    email: userEmail,
    newPassword: newPassword
  })
});
```

## Testing

### Test Forgot Password:
```bash
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Test Reset Password:
```bash
curl -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"actual_token_from_email","email":"test@example.com","newPassword":"NewPassword123"}'
```

## Error Handling

| Scenario | Status | Message |
|----------|--------|---------|
| Invalid email format | 400 | Valid email is required |
| Missing token in reset | 400 | Token, email, and new password are required |
| Invalid/expired token | 400 | Invalid or expired password reset token |
| Already used token | 400 | Invalid or expired password reset token |
| Short password | 400 | Password must be at least 6 characters |
| Database error | 500 | Failed to process password reset request |

## Production Checklist

✅ Database migration applied
✅ Email configuration verified
✅ Password hashing implemented
✅ Token expiration logic implemented
✅ Security headers included
✅ Input validation enabled
✅ Error messages secured (no info leaks)
✅ Rate limiting recommended (future: add to forgot-password endpoint)

## Future Enhancements

1. **Rate Limiting**: Limit forgot password requests per IP/email
2. **Token Customization**: Make expiration time configurable
3. **Multiple Reset Methods**: SMS or authenticator app options
4. **Reset History**: Track password reset attempts
5. **Notification**: Notify user of successful reset
6. **Session Invalidation**: Invalidate all existing sessions after reset

## Files Modified

1. **prisma/schema.prisma**
   - Added `PasswordReset` model
   - Added `passwordResets` relation to `User` model

2. **src/controllers/authController.ts**
   - Added `forgotPassword()` function
   - Added `resetPassword()` function
   - Added crypto import for token generation

3. **src/routes/authRoutes.ts**
   - Added `/forgot-password` POST endpoint
   - Added `/reset-password` POST endpoint
   - Added validations for both endpoints
   - Added imports for new functions
