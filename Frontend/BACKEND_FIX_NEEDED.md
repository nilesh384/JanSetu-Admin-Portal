// BACKEND FIX NEEDED in admin.controllers.js

// In the getAllAdmins function, around line 415, change this query:
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

// TO THIS (remove the is_active = true filter):
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

// This change will:
// 1. Show both active and inactive admins
// 2. Sort active admins first, then inactive ones
// 3. Allow the frontend filtering to work properly