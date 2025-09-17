import axios from "axios";
import { data } from "react-router-dom";

const API_BASE_URL = "http://localhost:4000/api/v1"; // Adjust this to your backend URL

// Admin login function
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

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
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

        return {
            success: true,
            data: response.data.data,
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

