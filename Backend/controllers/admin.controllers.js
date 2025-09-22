import { query, queryOne, transaction } from "../db/utils.js";
import emailService from "../services/emailService.js";
import redisService from "../services/redis.js";

// Helper to convert DB timestamp values to ISO strings (null-safe)
const toISO = (val) => (val ? new Date(val).toISOString() : null);

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Admin email verification - sends OTP to admin email
const sendAdminOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        console.log('🔍 Sending OTP for admin email:', email);

        // Check if admin exists with the provided email
        const checkAdminQuery = `
            SELECT id, email, full_name, is_active
            FROM admins
            WHERE email = $1 AND is_active = true
        `;

        const adminResult = await queryOne(checkAdminQuery, [email.toLowerCase()]);

        if (!adminResult) {
            return res.status(401).json({
                success: false,
                message: "Admin not found or inactive"
            });
        }

        // Generate OTP
        const otp = emailService.generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP with expiry
        otpStore.set(email.toLowerCase(), {
            otp,
            expiry: otpExpiry,
            adminId: adminResult.id,
            attempts: 0
        });

        // Send OTP email
        const emailResult = await emailService.sendAdminOTP(email, otp);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email"
            });
        }

        console.log('✅ OTP sent successfully to admin:', email);

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email address",
            data: {
                email: email.toLowerCase(),
                expiresIn: 600 // 10 minutes in seconds
            }
        });

    } catch (error) {
        console.error('❌ Error sending admin OTP:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Verify OTP and complete admin login
const verifyAdminOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        console.log('🔍 Verifying OTP for admin email:', email);

        const emailKey = email.toLowerCase();
        const storedOTPData = otpStore.get(emailKey);

        if (!storedOTPData) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired. Please request a new one."
            });
        }

        // Check if OTP is expired
        if (new Date() > storedOTPData.expiry) {
            otpStore.delete(emailKey);
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // Check attempt limit
        if (storedOTPData.attempts >= 3) {
            otpStore.delete(emailKey);
            return res.status(400).json({
                success: false,
                message: "Too many failed attempts. Please request a new OTP."
            });
        }

        // Verify OTP
        if (storedOTPData.otp !== otp) {
            storedOTPData.attempts += 1;
            otpStore.set(emailKey, storedOTPData);
            
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${3 - storedOTPData.attempts} attempts remaining.`
            });
        }

        // OTP verified successfully, get admin data and clear OTP
        otpStore.delete(emailKey);

        const admin = await transaction(async (client) => {
            // Get admin data
            const getAdminQuery = `
                SELECT id, email, full_name, department, role, is_active, last_login, created_at
                FROM admins
                WHERE id = $1 AND is_active = true
            `;

            const adminResult = await client.query(getAdminQuery, [storedOTPData.adminId]);

            if (adminResult.rows.length === 0) {
                throw new Error('Admin not found or inactive');
            }

            const adminData = adminResult.rows[0];

            // Update last_login timestamp
            const updateLoginQuery = `
                UPDATE admins
                SET last_login = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;

            await client.query(updateLoginQuery, [adminData.id]);

            return adminData;
        });

        console.log('✅ Admin OTP verified and logged in successfully:', admin.id);

        // Return admin data (excluding sensitive information)
        const adminData = {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
            department: admin.department,
            role: admin.role,
            lastLogin: toISO(admin.last_login),
            createdAt: toISO(admin.created_at)
        };

        return res.status(200).json({
            success: true,
            message: "Admin login successful",
            data: adminData
        });

    } catch (error) {
        console.error('❌ Error verifying admin OTP:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Legacy admin login (kept for backward compatibility)
const adminLogin = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        console.log('🔍 Checking admin login for email:', email);

        const admin = await transaction(async (client) => {
            // Check if admin exists with the provided email
            const checkAdminQuery = `
                SELECT id, email, full_name, department, role, is_active, last_login, created_at
                FROM admins
                WHERE email = $1 AND is_active = true
            `;

            const adminResult = await client.query(checkAdminQuery, [email.toLowerCase()]);

            if (adminResult.rows.length === 0) {
                throw new Error('Admin not found or inactive');
            }

            const adminData = adminResult.rows[0];

            // Update last_login timestamp
            const updateLoginQuery = `
                UPDATE admins
                SET last_login = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;

            await client.query(updateLoginQuery, [adminData.id]);

            return adminData;
        });

        console.log('✅ Admin logged in successfully:', admin.id);

        // Return admin data (excluding sensitive information)
        const adminData = {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
            department: admin.department,
            role: admin.role,
            lastLogin: toISO(admin.last_login),
            createdAt: toISO(admin.created_at)
        };

        return res.status(200).json({
            success: true,
            message: "Admin login successful",
            data: adminData
        });

    } catch (error) {
        console.error('❌ Error in admin login:', error);
        
        if (error.message === 'Admin not found or inactive') {
            console.log('❌ Admin not found or inactive:', email);
            return res.status(401).json({
                success: false,
                message: "Invalid credentials or admin account is inactive"
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get admin profile by ID
const getAdminProfile = async (req, res) => {
    try {
        const { adminId } = req.params;

        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        console.log('🔍 Getting admin profile for ID:', adminId);

        const getAdminQuery = `
            SELECT id, email, full_name, department, role, is_active, last_login, created_at
            FROM admins
            WHERE id = $1 AND is_active = true
        `;

        const admin = await queryOne(getAdminQuery, [adminId]);

        if (!admin) {
            console.log('❌ Admin not found:', adminId);
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const adminData = {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
            department: admin.department,
            role: admin.role,
            lastLogin: admin.last_login,
            createdAt: admin.created_at
        };

        return res.status(200).json({
            success: true,
            message: "Admin profile retrieved successfully",
            data: adminData
        });

    } catch (error) {
        console.error('❌ Error getting admin profile:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get all active admins based on role hierarchy with flexible filtering
const getAllAdmins = async (req, res) => {
    try {
        const { requesterRole, requestedRoles } = req.body;

        if (!requesterRole) {
            return res.status(400).json({
                success: false,
                message: "Requester role is required"
            });
        }

        // Generate cache key based on requester role and requested roles
        const cacheKey = `admins:${requesterRole.toLowerCase()}:${requestedRoles ? requestedRoles.sort().join(',') : 'all'}`;

        // Try to get from cache first
        try {
            const cachedData = await redisService.getCachedReports(cacheKey);
            if (cachedData) {
                console.log('✅ Retrieved admins from cache for role:', requesterRole);
                return res.status(200).json({
                    success: true,
                    ...cachedData,
                    cached: true
                });
            }
        } catch (cacheError) {
            console.log('⚠️ Cache read failed, proceeding with database query:', cacheError.message);
        }

        console.log('🔍 Getting admins for role:', requesterRole, 'requested roles:', requestedRoles);
        console.log('🔍 requestedRoles type:', typeof requestedRoles);
        console.log('🔍 requestedRoles isArray:', Array.isArray(requestedRoles));
        if (requestedRoles) {
            console.log('🔍 requestedRoles length:', requestedRoles.length);
            console.log('🔍 requestedRoles values:', requestedRoles);
        }

        // Define role hierarchy and permissions
        let allowedRoles = [];
        let canFilterByRole = false;

        switch (requesterRole.toLowerCase()) {
            case 'super_admin':
                // Super admin can see all roles and can filter
                allowedRoles = ['viewer', 'admin', 'super_admin'];
                canFilterByRole = true;
                break;
            case 'admin':
                // Admin can only see viewers
                allowedRoles = ['viewer'];
                canFilterByRole = false;
                break;
            default:
                return res.status(403).json({
                    success: false,
                    message: "Invalid requester role or insufficient permissions"
                });
        }

        // If specific roles are requested, validate them against permissions
        let filterRoles = allowedRoles.map(role => role.toLowerCase()); // Default to all allowed roles (lowercase)

        if (requestedRoles && Array.isArray(requestedRoles)) {
            if (!canFilterByRole) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to filter by specific roles"
                });
            }

            console.log('🔍 Validating requested roles:', requestedRoles);
            console.log('🔍 Allowed roles:', allowedRoles);

            // Validate that all requested roles are within allowed roles
            const invalidRoles = requestedRoles.filter(role => !allowedRoles.includes(role.toLowerCase()));
            console.log('🔍 Invalid roles found:', invalidRoles);

            if (invalidRoles.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid roles requested: ${invalidRoles.join(', ')}. Allowed roles: ${allowedRoles.join(', ')}`
                });
            }

            filterRoles = requestedRoles.map(role => role.toLowerCase());
            console.log('🔍 Final filter roles:', filterRoles);
            console.log('🔍 Final filter roles:', filterRoles);
        }

        // First, let's see what roles actually exist in the database
        const checkRolesQuery = `SELECT DISTINCT role, LOWER(role) as lower_role FROM admins WHERE is_active = true`;
        const rolesResult = await query(checkRolesQuery);
        console.log('🔍 Available roles in database:', rolesResult.rows.map(r => `${r.role} -> ${r.lower_role}`));

        // Build placeholders for the IN clause
        const placeholders = filterRoles.map((_, index) => `$${index + 1}`).join(', ');

        // Test the IN operator with a simple query
        const testQuery = `SELECT COUNT(*) as count FROM admins WHERE is_active = true AND LOWER(role) IN (${placeholders})`;
        const testResult = await query(testQuery, filterRoles);
        console.log('🔍 Test query count with IN operator:', testResult.rows[0].count);
        
        const altQuery = `
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

        console.log('🔍 Alternative query:', altQuery);
        console.log('🔍 Alternative params:', filterRoles);

        const altResult = await query(altQuery, filterRoles);
        console.log('🔍 Alternative query returned:', altResult.rows.length, 'admins');

        // Use the alternative query result
        const admins = altResult.rows;

        console.log('🔍 Query executed with filterRoles:', filterRoles);
        console.log('🔍 Query parameters type:', typeof filterRoles, 'isArray:', Array.isArray(filterRoles));
        console.log('🔍 Query parameters:', filterRoles);
        console.log('🔍 Alternative query:', altQuery.replace(/\$\d+/g, (match) => {
            const index = parseInt(match.slice(1)) - 1;
            return `'${filterRoles[index]}'`;
        }));
        console.log('🔍 Number of admins returned from DB:', admins.length);
        console.log('🔍 Roles in result:', [...new Set(admins.map(a => a.role))]);
        
        // Also try a manual filter to double-check
        const manualFilteredAdmins = admins.filter(admin => filterRoles.includes(admin.role.toLowerCase()));
        console.log('🔍 Manual filter result:', manualFilteredAdmins.map(a => ({ email: a.email, role: a.role })));

        if (manualFilteredAdmins.length !== admins.length) {
            console.log('⚠️ WARNING: Database query returned more results than expected!');
            console.log('⚠️ Expected roles:', filterRoles);
            console.log('⚠️ Actual roles in result:', [...new Set(admins.map(a => a.role))]);
        }

        const adminsData = admins.map(admin => ({
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
            department: admin.department,
            role: admin.role,
            lastLogin: toISO(admin.last_login),
            createdAt: toISO(admin.created_at)
        }));

        console.log(`✅ Retrieved ${admins.length} admins for ${requesterRole} with filter: ${filterRoles.join(', ')}`);

        const responseData = {
            message: `Admins retrieved successfully for ${requesterRole}`,
            data: adminsData,
            meta: {
                requesterRole: requesterRole,
                requestedRoles: requestedRoles || null,
                filteredRoles: filterRoles,
                allowedRoles: allowedRoles,
                canFilterByRole: canFilterByRole,
                totalCount: admins.length
            }
        };

        // Cache the results for 10 minutes (admin data changes less frequently)
        try {
            await redisService.cacheReports(cacheKey, responseData, 600);
        } catch (cacheError) {
            console.log('⚠️ Failed to cache admin data:', cacheError.message);
        }

        return res.status(200).json({
            success: true,
            ...responseData
        });

    } catch (error) {
        console.error('❌ Error getting admins:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export { adminLogin, sendAdminOTP, verifyAdminOTP, getAdminProfile, getAllAdmins };
