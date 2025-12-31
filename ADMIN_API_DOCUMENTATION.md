# Admin Panel API Documentation

This document provides a comprehensive guide to the Admin Panel API for the Deep Learning Edutech Backend.

## Table of Contents
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Standard Response Formats](#standard-response-formats)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-1)
  - [Dashboard & Stats](#dashboard--stats)
  - [Management](#management)

---

## Base URL
All API requests should be made to:
`https://api.deeplearningedutech.com/api` (Production)
`http://localhost:5000/api` (Local Development)

## Authentication
Protected admin routes require a Bearer Token in the `Authorization` header.
```http
Authorization: Bearer <your_access_token>
```
Only users with the role `ADMIN` can access these endpoints.

---

## Standard Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "pagination": { // Optional: only for paginated results
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "message": "Error description"
}
```

---

## API Endpoints

### Authentication

#### Admin Login
Authenticates an admin user and returns access and refresh tokens.

- **URL:** `/admin/login`
- **Method:** `POST`
- **Auth Required:** No
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "yourpassword"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "uuid",
        "email": "admin@example.com",
        "firstName": "Admin",
        "lastName": "User",
        "role": "ADMIN",
        "isActive": true
      },
      "token": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
  ```

---

### Dashboard & Stats

#### Get Dashboard Stats
Quick overview of the platform's key metrics.

- **URL:** `/admin/dashboard/stats`
- **Method:** `GET`
- **Auth Required:** Yes (ADMIN)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Dashboard stats retrieved",
    "data": {
      "totalStudents": 150,
      "totalTeachers": 20,
      "totalCourses": 45,
      "totalEnrollments": 300,
      "totalRevenue": 25000.50
    }
  }
  ```

#### Get System Stats
Detailed system-wide performance and engagement metrics.

- **URL:** `/admin/system/stats`
- **Method:** `GET`
- **Auth Required:** Yes (ADMIN)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "System stats retrieved",
    "data": {
      "totalUsers": 170,
      "activeUsers": 165,
      "totalPayments": 350,
      "successfulPayments": 300,
      "failedPayments": 50,
      "totalRevenue": 25000.50,
      "averageRating": 4.7
    }
  }
  ```

---

### Management

All management endpoints support pagination via query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

#### Get All Courses
- **URL:** `/admin/courses`
- **Method:** `GET`
- **Auth Required:** Yes (ADMIN)
- **Query Params:** `?page=1&limit=20`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Courses retrieved",
    "data": {
      "courses": [...],
      "pagination": { ... }
    }
  }
  ```

#### Get All Teachers
- **URL:** `/admin/teachers`
- **Method:** `GET`
- **Auth Required:** Yes (ADMIN)
- **Query Params:** `?page=1&limit=20`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Teachers retrieved",
    "data": {
      "teachers": [...],
      "pagination": { ... }
    }
  }
  ```

#### Get All Students
- **URL:** `/admin/students`
- **Method:** `GET`
- **Auth Required:** Yes (ADMIN)
- **Query Params:** `?page=1&limit=20`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Students retrieved",
    "data": {
      "students": [...],
      "pagination": { ... }
    }
  }
  ```

#### Get All Payments
- **URL:** `/admin/payments`
- **Method:** `GET`
- **Auth Required:** Yes (ADMIN)
- **Query Params:** `?page=1&limit=20`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Payments retrieved",
    "data": {
      "payments": [...],
      "pagination": { ... }
    }
  }
  ```
