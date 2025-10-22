import axios from "axios";
import { data } from "react-router-dom";

const API_BASE_URL = "http://localhost:4000/api/v1"; // Adjust this to your backend URL

// Send OTP to admin email
export const sendAdminOTP = async (email) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/send-otp`, {
            email: email.toLowerCase()
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to send OTP"
        };
    }
};

// Verify admin OTP and complete login
export const verifyAdminOTP = async (email, otp) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/verify-otp`, {
            email: email.toLowerCase(),
            otp: otp
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "OTP verification failed"
        };
    }
};

// Admin login function (legacy - kept for backward compatibility)
export const adminLogin = async (email) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/login`, {
            email: email.toLowerCase()
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Login failed"
        };
    }
};

// Get admin profile by ID
export const getAdminProfile = async (adminId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/admin/profile/${adminId}`);
        
        // Get the admin data from response and ensure proper field mapping
        let adminData = response.data.data || response.data.admin || response.data;
        
        // Map snake_case fields from backend to camelCase for frontend
        if (adminData && typeof adminData === 'object') {
            adminData = {
                adminId: adminData.admin_id || adminData.adminId,
                fullName: adminData.full_name || adminData.fullName,
                email: adminData.email,
                phoneNumber: adminData.phone_number || adminData.phoneNumber,
                department: adminData.department,
                role: adminData.role,
                isActive: adminData.is_active !== undefined ? adminData.is_active : adminData.isActive,
                createdAt: adminData.created_at || adminData.createdAt,
                updatedAt: adminData.updated_at || adminData.updatedAt
            };
        }

        return {
            success: true,
            data: adminData,
            message: response.data.message || "Profile fetched successfully"
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch profile"
        };
    }
};

// Get all admins based on requester role
export const getAllAdmins = async (requesterRole, requestedRoles = null) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/all`, {
            requesterRole: requesterRole,
            requestedRoles: requestedRoles
        });

        // Map backend field names to frontend expected names
        const mappedData = (response.data.data || []).map(admin => ({
            ...admin,
            // Essential field mappings
            adminId: admin.admin_id || admin.id,
            fullName: admin.full_name || admin.fullName,
            phoneNumber: admin.phone_number || admin.phoneNumber,
            isActive: admin.is_active !== undefined ? admin.is_active : admin.isActive,
            createdAt: admin.created_at || admin.createdAt,
            updatedAt: admin.updated_at || admin.updatedAt,
            lastLogin: admin.last_login || admin.lastLogin
        }));

        return {
            success: true,
            data: mappedData,
            meta: response.data.meta,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch admins"
        };
    }
};

// Get admin reports based on admin role and permissions
export const getAdminReports = async (adminId, filters = {}) => {
    try {
        const queryParams = new URLSearchParams();

        // Add filters to query params
        if (filters.isResolved !== undefined) queryParams.append('isResolved', filters.isResolved);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.priority) queryParams.append('priority', filters.priority);
        if (filters.department) queryParams.append('department', filters.department);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.offset) queryParams.append('offset', filters.offset);
        if (filters.status) queryParams.append('status', filters.status);

        const url = `${API_BASE_URL}/reports/admin/${adminId}?${queryParams.toString()}`;

        const response = await axios.get(url);

        return {
            success: true,
            data: response.data.reports,
            pagination: response.data.pagination,
            adminInfo: response.data.adminInfo,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch reports"
        };
    }
};

// Get a single report by ID
export const getReportById = async (reportId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/reports/${reportId}`);

        return {
            success: true,
            data: response.data.report,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch report"
        };
    }
};

// Resolve a report (Admin only)
export const resolveReport = async (reportId, adminId, adminRole, resolutionNotes, resolvedPhotos = []) => {
    try {
        const formData = new FormData();
        formData.append('adminId', adminId);
        formData.append('adminRole', adminRole);
        
        if (resolutionNotes) {
            formData.append('resolutionNotes', resolutionNotes);
        }

        // Append photos if any (max 2)
        if (resolvedPhotos && resolvedPhotos.length > 0) {
            resolvedPhotos.forEach((photo, index) => {
                formData.append('resolvedPhotos', photo);
            });
        }

        const response = await axios.post(`${API_BASE_URL}/reports/${reportId}/resolve`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return {
            success: true,
            data: response.data.report,
            message: response.data.message,
            uploadedPhotos: response.data.uploadedPhotos
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to resolve report"
        };
    }
};

// Get simplified coordinates for all reports (used by maps)
export const getAllReportCoords = async (adminId, limit = 1000) => {
    // The backend in this workspace does not expose a global /reports/coords endpoint.
    // To avoid hitting the parameterized route `/:reportId` with the literal 'coords' (which
    // causes a UUID parse error), we only fetch coordinates via the admin-scoped endpoint
    // when a valid adminId is provided. If adminId is missing or explicitly 'all', return
    // an empty list so the frontend can render an empty map safely.
    if (!adminId || adminId === 'all') {
        console.warn('getAllReportCoords: adminId missing or "all" - backend has no global coords route; returning empty list');
        return { success: true, data: [] };
    }

    try {
        // Use the admin reports endpoint which exists on the backend and returns full reports
        const url = `${API_BASE_URL}/reports/admin/${adminId}?limit=${limit}&offset=0`;
        const response = await axios.get(url);

        const reports = response?.data?.reports || [];

        const coords = reports
            .filter(p => p.latitude !== undefined && p.longitude !== undefined && p.latitude !== null && p.longitude !== null)
            .map(p => ({ id: p.id, lat: Number(p.latitude), lng: Number(p.longitude), title: p.title }));

        return { success: true, data: coords };
    } catch (error) {
        console.error('getAllReportCoords: failed to fetch admin reports', error?.response?.data || error.message || error);
        return { success: false, data: [] };
    }
};

// Admin Management Functions

// Create new admin (Super Admin only)
export const createAdmin = async (requesterRole, adminData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/create`, {
            requesterRole,
            ...adminData
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to create admin"
        };
    }
};

// Update admin details (Super Admin only)
export const updateAdmin = async (adminId, requesterRole, updates) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/admin/${adminId}`, {
            requesterRole,
            ...updates
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to update admin"
        };
    }
};

// Delete admin (Super Admin only)
export const deleteAdmin = async (adminId, requesterRole, requesterId) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/admin/${adminId}`, {
            data: {
                requesterRole,
                requesterId
            }
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to delete admin"
        };
    }
};

// Restore deleted admin (Super Admin only)
export const restoreAdmin = async (adminId, requesterRole) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/admin/${adminId}/restore`, {
            requesterRole
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to restore admin"
        };
    }
};

// Get admin activity logs (Super Admin only)
export const getAdminActivityLogs = async (requesterRole, filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        
        if (filters.adminId) queryParams.append('adminId', filters.adminId);
        if (filters.limit) queryParams.append('limit', filters.limit);
        if (filters.offset) queryParams.append('offset', filters.offset);

        const url = `${API_BASE_URL}/admin/activity-logs?${queryParams.toString()}`;
        
        const response = await axios.post(url, {
            requesterRole
        });

        return {
            success: true,
            data: response.data.data,
            pagination: response.data.pagination,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch admin activity logs"
        };
    }
};

// Social Media Functions (Placeholder implementations)

// Get social stats for a report
export const getReportSocialStats = async (reportId) => {
    try {
        console.log('Fetching social stats for report:', reportId);
        
        const response = await axios.get(`${API_BASE_URL}/social/reports/${reportId}/stats`);
        
        return {
            success: true,
            message: "Social stats fetched successfully",
            data: response.data.stats
        };
    } catch (error) {
        console.error('Error fetching social stats:', error);
        
        // If it's a 404 or the report has no social post, return default stats
        if (error.response?.status === 404 || error.response?.data?.message?.includes('no social post')) {
            return {
                success: true,
                message: "No social post found for this report",
                data: {
                    reportId: reportId,
                    hasSocialPost: false,
                    upvotes: 0,
                    downvotes: 0,
                    totalScore: 0,
                    commentCount: 0,
                    shareCount: 0,
                    viewCount: 0,
                    isTrending: false,
                    isFeatured: false,
                    socialPostCreatedAt: null
                }
            };
        }
        
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch social stats"
        };
    }
};

// Get comments for a social post
export const getPostComments = async (postId) => {
    try {
        console.log('Fetching comments for post:', postId);
        
        const response = await axios.get(`${API_BASE_URL}/social/posts/${postId}/comments`);
        
        return {
            success: true,
            message: "Comments fetched successfully",
            data: response.data.comments || []
        };
    } catch (error) {
        console.error('Error fetching comments:', error);
        
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch comments",
            data: []
        };
    }
};

// Get field admins for assignment
export const getFieldAdmins = async () => {
    try {
        const response = await axios.post(`${API_BASE_URL}/admin/all`, {
            requesterRole: "super_admin",
            requestedRoles: ["viewer"]
        });

        return {
            success: true,
            data: response.data.data || [],
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch field admins"
        };
    }
};

// Assign report to field admin
export const assignReportToAdmin = async (reportId, assignedAdminId, assignedBy) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/reports/${reportId}/assign`, {
            assignedAdminId,
            assignedBy
        });

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to assign report"
        };
    }
};
