# Admin Management API Documentation

## Overview
This document outlines the admin management functionality for super_admins in the JanSetu platform. Super admins have full control over admin accounts including creating, updating, deleting, and restoring admin users.

## Authentication
All admin management endpoints require:
- Valid super_admin role
- Include `requesterRole: "super_admin"` in request body
- For delete operations, also include `requesterId` to prevent self-deletion

## API Endpoints

### 1. Create New Admin
**POST** `/api/v1/admin/create`

Creates a new admin account. Only super_admins can perform this action.

**Request Body:**
```json
{
  "requesterRole": "super_admin",
  "email": "newadmin@example.com",
  "fullName": "John Doe",
  "department": "IT Department",
  "role": "admin"
}
```

**Valid Roles:**
- `viewer` - Can view reports and basic information
- `admin` - Can manage reports and resolve issues  
- `super_admin` - Full system access and admin management

**Response:**
```json
{
  "success": true,
  "message": "Admin created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "newadmin@example.com",
    "fullName": "John Doe",
    "department": "IT Department",
    "role": "admin",
    "isActive": true,
    "createdAt": "2025-10-03T10:30:00.000Z"
  }
}
```

### 2. Update Admin
**PUT** `/api/v1/admin/:adminId`

Updates existing admin details. Only super_admins can perform this action.

**Request Body:**
```json
{
  "requesterRole": "super_admin",
  "fullName": "John Smith",
  "department": "Security Department",
  "role": "super_admin",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin updated successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@example.com",
    "fullName": "John Smith",
    "department": "Security Department",
    "role": "super_admin",
    "isActive": true,
    "updatedAt": "2025-10-03T10:35:00.000Z"
  }
}
```

### 3. Delete Admin (Soft Delete)
**DELETE** `/api/v1/admin/:adminId`

Soft deletes an admin by setting `is_active` to false. Only super_admins can perform this action.

**Request Body:**
```json
{
  "requesterRole": "super_admin",
  "requesterId": "current-super-admin-id"
}
```

**Security Features:**
- Cannot delete your own admin account
- Cannot delete the last active super_admin
- Soft delete preserves data for potential restoration

**Response:**
```json
{
  "success": true,
  "message": "Admin deleted successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "department": "IT Department",
    "role": "admin",
    "isActive": false
  }
}
```

### 4. Restore Admin
**PUT** `/api/v1/admin/:adminId/restore`

Restores a soft-deleted admin by setting `is_active` to true. Only super_admins can perform this action.

**Request Body:**
```json
{
  "requesterRole": "super_admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin restored successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@example.com",
    "fullName": "John Doe",
    "department": "IT Department",
    "role": "admin",
    "isActive": true
  }
}
```

### 5. Get Admin Activity Logs
**GET** `/api/v1/admin/activity-logs`

Retrieves admin activity and statistics. Only super_admins can perform this action.

**Query Parameters:**
- `adminId` (optional) - Filter by specific admin ID
- `limit` (optional, default: 50) - Number of records per page
- `offset` (optional, default: 0) - Pagination offset

**Request Body:**
```json
{
  "requesterRole": "super_admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin activity logs retrieved successfully",
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "admin@example.com",
      "fullName": "John Doe",
      "department": "IT Department",
      "role": "admin",
      "isActive": true,
      "lastLogin": "2025-10-03T09:15:00.000Z",
      "createdAt": "2025-09-01T08:00:00.000Z",
      "updatedAt": "2025-10-03T10:30:00.000Z",
      "reportsHandled": 25
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

## Features

### 🔐 Security Features
- **Role-based access control** - Only super_admins can manage other admins
- **Self-deletion prevention** - Admins cannot delete their own accounts
- **Last super_admin protection** - Cannot delete the last active super_admin
- **Email validation** - Validates email format and checks for duplicates
- **Role validation** - Ensures only valid roles are assigned

### 📧 Email Notifications
- **Welcome emails** - New admins receive welcome emails with account details
- **Beautiful HTML templates** - Professional email design with JanSetu branding
- **Role descriptions** - Clear explanation of access levels

### ⚡ Performance Features
- **Redis caching** - Automatic cache invalidation on admin changes
- **Transaction support** - Database operations wrapped in transactions
- **Soft deletes** - Preserves data integrity while allowing restoration
- **Pagination** - Efficient handling of large admin lists

### 🔄 Cache Management
All admin management operations automatically invalidate relevant Redis cache patterns:
- `admins:*` - All admin-related cache entries

### 📊 Activity Tracking
The activity logs provide insights into:
- Admin login frequency
- Reports handled by each admin
- Account status and role changes
- Creation and modification timestamps

## Error Handling

### Common Error Responses

**403 Forbidden - Insufficient Permissions**
```json
{
  "success": false,
  "message": "Only super admins can create new admins"
}
```

**400 Bad Request - Validation Error**
```json
{
  "success": false,
  "message": "Email, full name, department, and role are required"
}
```

**409 Conflict - Duplicate Email**
```json
{
  "success": false,
  "message": "Admin with this email already exists"
}
```

**404 Not Found - Admin Not Found**
```json
{
  "success": false,
  "message": "Admin not found"
}
```

## Usage Examples

### Creating an Admin with cURL
```bash
curl -X POST http://localhost:4000/api/v1/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "requesterRole": "super_admin",
    "email": "newadmin@jansetu.org",
    "fullName": "Jane Doe",
    "department": "Operations",
    "role": "admin"
  }'
```

### Updating an Admin
```bash
curl -X PUT http://localhost:4000/api/v1/admin/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "requesterRole": "super_admin",
    "department": "Security",
    "role": "super_admin"
  }'
```

### Getting Activity Logs
```bash
curl -X GET "http://localhost:4000/api/v1/admin/activity-logs?limit=10&offset=0" \
  -H "Content-Type: application/json" \
  -d '{
    "requesterRole": "super_admin"
  }'
```

## Database Schema

The admin management functions work with the following database structure:

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('viewer', 'admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Environment Variables
```env
# Email configuration for welcome emails
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_PORTAL_URL=https://admin.jansetu.org

# Redis configuration for caching
REDIS_URL=redis://127.0.0.1:6379
```

This comprehensive admin management system provides super_admins with full control over admin accounts while maintaining security, performance, and user experience standards.