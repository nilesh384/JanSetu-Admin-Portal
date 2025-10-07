/**
 * REQUIRED BACKEND FIX
 * 
 * File: c:\Users\Nilesh\Desktop\JanSetu\Backend\controllers\admin.controllers.js
 * Function: getAllAdmins (around line 415)
 * 
 * CHANGE THIS QUERY:
 */

const getAdminsQuery = `
    SELECT id, email, full_name, department, role, is_active, last_login, created_at
    FROM admins
    WHERE is_active = true
    AND LOWER(role) IN (${placeholders})
    ORDER BY
        CASE
            WHEN LOWER(role) = 'super_admin' THEN 1
            WHEN LOWER(role) = 'admin' THEN 2
            WHEN LOWER(role) = 'viewer' THEN 3
            ELSE 4
        END,
        created_at DESC
`;

/**
 * TO THIS QUERY (removes is_active = true filter):
 */

const getAdminsQuery = `
    SELECT id, email, full_name, department, role, is_active, last_login, created_at
    FROM admins
    WHERE LOWER(role) IN (${placeholders})
    ORDER BY
        CASE
            WHEN LOWER(role) = 'super_admin' THEN 1
            WHEN LOWER(role) = 'admin' THEN 2
            WHEN LOWER(role) = 'viewer' THEN 3
            ELSE 4
        END,
        is_active DESC,
        created_at DESC
`;

/**
 * EXPLANATION:
 * 1. Removed "is_active = true" condition to show both active and inactive admins
 * 2. Added "is_active DESC" to sort active admins first, then inactive ones
 * 3. Frontend filtering will handle showing/hiding based on status filter
 */