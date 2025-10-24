import axios from "axios";
import { data } from "react-router-dom";
import * as XLSX from 'xlsx';

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

// Get community statistics for analytics
export const getCommunityStats = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/reports/community-stats`);

        return {
            success: true,
            data: response.data.stats,
            message: response.data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch community stats"
        };
    }
};

// Get department performance analytics (calculated from reports data)
export const getDepartmentPerformance = async (adminId) => {
    try {
        // Use admin reports to calculate department performance
        const reportsResponse = await getAdminReports(adminId, { limit: 10000 });
        
        if (!reportsResponse.success) {
            throw new Error(reportsResponse.message);
        }

        const reports = reportsResponse.data;
        
        // Calculate department performance
        const departmentStats = {};
        
        reports.forEach(report => {
            const dept = report.department || report.category || 'Other';
            
            if (!departmentStats[dept]) {
                departmentStats[dept] = {
                    total: 0,
                    resolved: 0,
                    avgResolutionTime: 0,
                    resolutionTimes: []
                };
            }
            
            departmentStats[dept].total += 1;
            
            if (report.isResolved) {
                departmentStats[dept].resolved += 1;
                
                // Calculate resolution time if available
                if (report.resolvedAt && report.createdAt) {
                    const resolutionTime = new Date(report.resolvedAt) - new Date(report.createdAt);
                    const resolutionDays = resolutionTime / (1000 * 60 * 60 * 24);
                    departmentStats[dept].resolutionTimes.push(resolutionDays);
                }
            }
        });
        
        // Calculate percentages and averages
        Object.keys(departmentStats).forEach(dept => {
            const stats = departmentStats[dept];
            stats.resolutionRate = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
            
            if (stats.resolutionTimes.length > 0) {
                stats.avgResolutionTime = stats.resolutionTimes.reduce((a, b) => a + b, 0) / stats.resolutionTimes.length;
            }
        });

        return {
            success: true,
            data: departmentStats
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || "Failed to calculate department performance"
        };
    }
};

// Get response time analytics by priority
export const getResponseTimeAnalytics = async (adminId) => {
    try {
        const reportsResponse = await getAdminReports(adminId, { limit: 10000 });
        
        if (!reportsResponse.success) {
            throw new Error(reportsResponse.message);
        }

        const reports = reportsResponse.data;
        
        // Calculate response times by priority
        const priorityStats = {
            critical: { times: [], avgTime: 0 },
            high: { times: [], avgTime: 0 },
            medium: { times: [], avgTime: 0 },
            low: { times: [], avgTime: 0 }
        };
        
        let totalResolutionTime = 0;
        let resolvedCount = 0;
        
        reports.forEach(report => {
            if (report.isResolved && report.resolvedAt && report.createdAt) {
                const resolutionTime = new Date(report.resolvedAt) - new Date(report.createdAt);
                const resolutionDays = resolutionTime / (1000 * 60 * 60 * 24);
                const resolutionHours = resolutionTime / (1000 * 60 * 60);
                
                const priority = (report.priority || 'low').toLowerCase();
                
                if (priorityStats[priority]) {
                    priorityStats[priority].times.push(resolutionHours);
                }
                
                totalResolutionTime += resolutionDays;
                resolvedCount += 1;
            }
        });
        
        // Calculate averages
        Object.keys(priorityStats).forEach(priority => {
            const stats = priorityStats[priority];
            if (stats.times.length > 0) {
                const avgHours = stats.times.reduce((a, b) => a + b, 0) / stats.times.length;
                
                if (avgHours < 24) {
                    stats.avgTime = `${avgHours.toFixed(1)} hrs`;
                } else {
                    stats.avgTime = `${(avgHours / 24).toFixed(1)} days`;
                }
            } else {
                stats.avgTime = 'N/A';
            }
        });
        
        const overallAvgDays = resolvedCount > 0 ? (totalResolutionTime / resolvedCount).toFixed(1) : '0.0';

        return {
            success: true,
            data: {
                byPriority: priorityStats,
                overall: `${overallAvgDays} days`
            }
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || "Failed to calculate response time analytics"
        };
    }
};

// Export all reports as comprehensive HTML table or Excel
export const exportReports = async (adminId, filters = {}, format = 'html') => {
    try {
        const reportsResponse = await getAdminReports(adminId, { ...filters, limit: 10000 });
        
        if (!reportsResponse.success) {
            throw new Error(reportsResponse.message);
        }

        const reports = reportsResponse.data;
        
        if (reports.length === 0) {
            throw new Error('No reports found to export');
        }

        // Calculate summary statistics
        const totalReports = reports.length;
        const resolvedReports = reports.filter(r => r.isResolved).length;
        const activeReports = reports.filter(r => !r.isResolved).length;
        const highPriorityReports = reports.filter(r => r.priority === 'critical' || r.priority === 'high').length;
        const resolutionRate = totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(1) : 0;

        // Category breakdown
        const categoryStats = {};
        const priorityStats = {};
        const departmentStats = {};

        reports.forEach(report => {
            // Category stats
            const category = report.category || 'Other';
            if (!categoryStats[category]) categoryStats[category] = { total: 0, resolved: 0 };
            categoryStats[category].total++;
            if (report.isResolved) categoryStats[category].resolved++;

            // Priority stats
            const priority = report.priority || 'low';
            if (!priorityStats[priority]) priorityStats[priority] = { total: 0, resolved: 0 };
            priorityStats[priority].total++;
            if (report.isResolved) priorityStats[priority].resolved++;

            // Department stats
            const department = report.department || report.category || 'General';
            if (!departmentStats[department]) departmentStats[department] = { total: 0, resolved: 0 };
            departmentStats[department].total++;
            if (report.isResolved) departmentStats[department].resolved++;
        });

        // Create comprehensive HTML report
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JanSetu Comprehensive Reports Export</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f8f9fa; 
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 20px; 
            background: #2c3e50; 
            color: white; 
            padding: 15px 20px; 
            border-radius: 6px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .header h1 { margin: 0; font-size: 1.6em; font-weight: 600; }
        .header p { margin: 5px 0; opacity: 0.9; font-size: 0.9em; }
        
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 15px; 
            margin-bottom: 25px; 
        }
        .summary-card { 
            background: white; 
            padding: 15px; 
            border-radius: 6px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
            border-left: 3px solid #2c3e50;
            text-align: center;
        }
        .summary-number { 
            font-size: 1.8em; 
            font-weight: 600; 
            color: #2c3e50; 
            margin: 0;
        }
        .summary-label { 
            color: #666; 
            font-size: 0.9em; 
            margin-top: 5px; 
            font-weight: 500;
        }
        
        .section { 
            background: white; 
            margin-bottom: 20px; 
            border-radius: 6px; 
            overflow: hidden; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .section-header { 
            background: #f8f9fa; 
            padding: 12px 20px; 
            border-bottom: 1px solid #e9ecef; 
            font-size: 1.1em; 
            font-weight: 600; 
            color: #495057;
        }
        
        table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 12px;
        }
        th, td { 
            padding: 8px 12px; 
            text-align: left; 
            border-bottom: 1px solid #e9ecef; 
        }
        th { 
            background-color: #f8f9fa; 
            font-weight: 600; 
            color: #495057; 
            position: sticky; 
            top: 0; 
        }
        tr:hover { 
            background-color: #f8f9fa; 
        }
        
        .status-resolved { 
            background: #d4edda; 
            color: #155724; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
        }
        .status-active { 
            background: #f8d7da; 
            color: #721c24; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
        }
        
        .priority-critical { 
            background: #f5c6cb; 
            color: #721c24; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
        }
        .priority-high { 
            background: #ffeeba; 
            color: #856404; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
        }
        .priority-medium { 
            background: #d1ecf1; 
            color: #0c5460; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
        }
        .priority-low { 
            background: #d4edda; 
            color: #155724; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
        }
        
        .description-cell { 
            max-width: 300px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap; 
        }
        
        .stats-table { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px; 
            margin-bottom: 20px; 
        }
        .stat-table { 
            background: white; 
            border-radius: 6px; 
            overflow: hidden; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .stat-table h3 { 
            background: #2c3e50; 
            color: white; 
            margin: 0; 
            padding: 10px 15px; 
            font-size: 0.95em; 
        }
        .stat-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 15px; 
            border-bottom: 1px solid #e9ecef; 
            font-size: 0.9em;
        }
        .stat-row:last-child { border-bottom: none; }
        
        .footer { 
            text-align: center; 
            margin-top: 25px; 
            padding: 15px; 
            background: white; 
            border-radius: 6px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
            color: #666; 
            font-size: 0.9em;
        }
        
        @media print { 
            body { margin: 0; padding: 10px; }
            .section { break-inside: avoid; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>JanSetu Reports Export</h1>
        <p>Generated: ${new Date().toLocaleDateString()} | Reports: ${totalReports.toLocaleString()}</p>
    </div>
    
    <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-number">${totalReports.toLocaleString()}</div>
            <div class="summary-label">Total Reports</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${resolvedReports.toLocaleString()}</div>
            <div class="summary-label">Resolved Reports</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${activeReports.toLocaleString()}</div>
            <div class="summary-label">Active Reports</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${resolutionRate}%</div>
            <div class="summary-label">Resolution Rate</div>
        </div>
    </div>

    <div class="stats-table">
        <div class="stat-table">
            <h3>Reports by Category</h3>
            ${Object.entries(categoryStats).map(([category, stats]) => `
                <div class="stat-row">
                    <span><strong>${category}</strong></span>
                    <span>${stats.resolved}/${stats.total} (${((stats.resolved/stats.total)*100).toFixed(1)}%)</span>
                </div>
            `).join('')}
        </div>
        
        <div class="stat-table">
            <h3>Reports by Priority</h3>
            ${Object.entries(priorityStats).map(([priority, stats]) => `
                <div class="stat-row">
                    <span><strong>${priority.toUpperCase()}</strong></span>
                    <span>${stats.resolved}/${stats.total} (${((stats.resolved/stats.total)*100).toFixed(1)}%)</span>
                </div>
            `).join('')}
        </div>
        
        <div class="stat-table">
            <h3>Reports by Department</h3>
            ${Object.entries(departmentStats).map(([department, stats]) => `
                <div class="stat-row">
                    <span><strong>${department}</strong></span>
                    <span>${stats.resolved}/${stats.total} (${((stats.resolved/stats.total)*100).toFixed(1)}%)</span>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            Detailed Reports Table (${totalReports.toLocaleString()} entries)
        </div>
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Reporter Info</th>
                        <th>Department</th>
                        <th>Location</th>
                        <th>Created Date</th>
                        <th>Resolved Date</th>
                        <th>Assigned Admin</th>
                        <th>Resolution Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(report => `
                        <tr>
                            <td><strong>#${report.id}</strong></td>
                            <td><strong>${report.title || 'Untitled Report'}</strong></td>
                            <td class="description-cell" title="${(report.description || 'No description provided').replace(/"/g, '&quot;')}">${report.description || 'No description provided'}</td>
                            <td>${report.category || 'Other'}</td>
                            <td><span class="priority-${(report.priority || 'low').toLowerCase()}">${(report.priority || 'Low').toUpperCase()}</span></td>
                            <td><span class="${report.isResolved ? 'status-resolved' : 'status-active'}">${report.isResolved ? 'Resolved' : 'Active'}</span></td>
                            <td>
                                <strong>${report.userName || 'Unknown'}</strong><br>
                                <small>${report.userPhone || 'No phone'}</small>
                            </td>
                            <td>${report.department || report.category || 'General'}</td>
                            <td>
                                ${report.address || 'Address not provided'}<br>
                                <small>${report.latitude && report.longitude ? `${report.latitude}, ${report.longitude}` : 'Coordinates not available'}</small>
                            </td>
                            <td>
                                <strong>${new Date(report.createdAt).toLocaleDateString()}</strong><br>
                                <small>${new Date(report.createdAt).toLocaleTimeString()}</small>
                            </td>
                            <td>
                                ${report.resolvedAt ? `
                                    <strong>${new Date(report.resolvedAt).toLocaleDateString()}</strong><br>
                                    <small>${new Date(report.resolvedAt).toLocaleTimeString()}</small>
                                ` : '<span style="color: #dc3545;">Not resolved</span>'}
                            </td>
                            <td>${report.assignedAdminName || '<em>Not assigned</em>'}</td>
                            <td class="description-cell" title="${(report.resolutionNotes || (report.isResolved ? 'Resolved without detailed notes' : 'N/A')).replace(/"/g, '&quot;')}">${report.resolutionNotes || (report.isResolved ? 'Resolved without detailed notes' : 'N/A')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Summary:</strong> ${totalReports.toLocaleString()} reports | ${resolvedReports.toLocaleString()} resolved (${resolutionRate}%) | ${activeReports.toLocaleString()} active</p>
        <p>JanSetu Admin Portal | Generated: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;

        if (format === 'excel') {
            // Create Excel workbook with multiple sheets
            const workbook = XLSX.utils.book_new();
            
            // Summary Sheet
            const summaryData = [
                ['JANSETU REPORTS EXPORT SUMMARY'],
                ['Generated on:', new Date().toLocaleString()],
                [''],
                ['OVERVIEW STATISTICS'],
                ['Metric', 'Value'],
                ['Total Reports', totalReports],
                ['Resolved Reports', resolvedReports],
                ['Active Reports', activeReports],
                ['Resolution Rate', `${resolutionRate}%`],
                [''],
                ['REPORTS BY CATEGORY'],
                ['Category', 'Total', 'Resolved', 'Resolution Rate'],
                ...Object.entries(categoryStats).map(([category, data]) => [
                    category,
                    data.total,
                    data.resolved,
                    `${((data.resolved / data.total) * 100).toFixed(1)}%`
                ]),
                [''],
                ['REPORTS BY PRIORITY'],
                ['Priority', 'Total', 'Resolved', 'Resolution Rate'],
                ...Object.entries(priorityStats).map(([priority, data]) => [
                    priority.toUpperCase(),
                    data.total,
                    data.resolved,
                    `${((data.resolved / data.total) * 100).toFixed(1)}%`
                ]),
                [''],
                ['REPORTS BY DEPARTMENT'],
                ['Department', 'Total', 'Resolved', 'Resolution Rate'],
                ...Object.entries(departmentStats).map(([department, data]) => [
                    department,
                    data.total,
                    data.resolved,
                    `${((data.resolved / data.total) * 100).toFixed(1)}%`
                ])
            ];
            
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
            
            // Detailed Reports Sheet
            const reportHeaders = [
                'Report ID', 'Title', 'Description', 'Category', 'Priority', 'Status',
                'Reporter Name', 'Reporter Phone', 'Department', 'Address',
                'Latitude', 'Longitude', 'Created Date', 'Created Time',
                'Resolved Date', 'Resolved Time', 'Assigned Admin', 'Resolution Notes'
            ];
            
            const reportData = [
                reportHeaders,
                ...reports.map(report => {
                    const createdDate = new Date(report.createdAt);
                    const resolvedDate = report.resolvedAt ? new Date(report.resolvedAt) : null;
                    
                    return [
                        `#${report.id}`,
                        report.title || 'Untitled Report',
                        report.description || 'No description provided',
                        report.category || 'Other',
                        (report.priority || 'Low').toUpperCase(),
                        report.isResolved ? 'Resolved' : 'Active',
                        report.userName || 'Unknown',
                        report.userPhone || 'No phone',
                        report.department || report.category || 'General',
                        report.address || 'Address not provided',
                        report.latitude || '',
                        report.longitude || '',
                        createdDate.toLocaleDateString(),
                        createdDate.toLocaleTimeString(),
                        resolvedDate ? resolvedDate.toLocaleDateString() : 'Not resolved',
                        resolvedDate ? resolvedDate.toLocaleTimeString() : '',
                        report.assignedAdminName || 'Not assigned',
                        report.resolutionNotes || (report.isResolved ? 'Resolved without detailed notes' : 'N/A')
                    ];
                })
            ];
            
            const reportsSheet = XLSX.utils.aoa_to_sheet(reportData);
            
            // Auto-fit column widths
            const colWidths = reportHeaders.map((header, i) => {
                const maxLength = Math.max(
                    header.length,
                    ...reportData.slice(1).map(row => String(row[i] || '').length)
                );
                return { wch: Math.min(maxLength + 2, 50) }; // Max width of 50 characters
            });
            reportsSheet['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(workbook, reportsSheet, 'Detailed Reports');
            
            // Generate and download Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `JanSetu_Reports_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            return {
                success: true,
                message: `Successfully exported ${totalReports} reports as Excel (.xlsx) file with summary and detailed sheets`,
                stats: {
                    totalReports,
                    resolvedReports,
                    activeReports,
                    resolutionRate: parseFloat(resolutionRate)
                }
            };
        } else {
            // Create and download HTML file
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `JanSetu_Comprehensive_Report_${new Date().toISOString().split('T')[0]}_${Date.now()}.html`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            return {
                success: true,
                message: `Successfully exported ${totalReports} reports as comprehensive HTML report`,
                stats: {
                    totalReports,
                    resolvedReports,
                    activeReports,
                    resolutionRate: parseFloat(resolutionRate)
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            message: error.message || "Failed to export reports"
        };
    }
};

// Helper function to create Excel-compatible CSV content
const createExcelCSVContent = (reports, stats) => {
    const { totalReports, resolvedReports, activeReports, resolutionRate, categoryStats, priorityStats, departmentStats } = stats;
    
    let csvContent = '';
    
    // Add summary section with Excel-friendly formatting
    csvContent += '="JANSETU REPORTS EXPORT SUMMARY"\n';
    csvContent += `="Generated on:","${new Date().toLocaleString()}"\n`;
    csvContent += '=""\n';
    
    csvContent += 'OVERVIEW STATISTICS\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Reports,${totalReports}\n`;
    csvContent += `Resolved Reports,${resolvedReports}\n`;
    csvContent += `Active Reports,${activeReports}\n`;
    csvContent += `Resolution Rate,${resolutionRate}%\n`;
    csvContent += '\n';
    
    // Add category breakdown
    csvContent += 'REPORTS BY CATEGORY\n';
    csvContent += 'Category,Total,Resolved,Resolution Rate\n';
    Object.entries(categoryStats).forEach(([category, data]) => {
        const rate = data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0;
        csvContent += `"${category}",${data.total},${data.resolved},${rate}%\n`;
    });
    csvContent += '\n';
    
    // Add priority breakdown
    csvContent += 'REPORTS BY PRIORITY\n';
    csvContent += 'Priority,Total,Resolved,Resolution Rate\n';
    Object.entries(priorityStats).forEach(([priority, data]) => {
        const rate = data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0;
        csvContent += `"${priority.toUpperCase()}",${data.total},${data.resolved},${rate}%\n`;
    });
    csvContent += '\n';
    
    // Add department breakdown
    csvContent += 'REPORTS BY DEPARTMENT\n';
    csvContent += 'Department,Total,Resolved,Resolution Rate\n';
    Object.entries(departmentStats).forEach(([department, data]) => {
        const rate = data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0;
        csvContent += `"${department}",${data.total},${data.resolved},${rate}%\n`;
    });
    csvContent += '\n';
    
    // Add detailed reports data
    csvContent += '="DETAILED REPORTS DATA"\n';
    csvContent += '=""\n';
    csvContent += 'Report ID,Title,Description,Category,Priority,Status,Reporter Name,Reporter Phone,Department,Address,Latitude,Longitude,Created Date,Created Time,Resolved Date,Resolved Time,Assigned Admin,Resolution Notes\n';
    
    reports.forEach(report => {
        const createdDate = new Date(report.createdAt);
        const resolvedDate = report.resolvedAt ? new Date(report.resolvedAt) : null;
        
        const row = [
            `#${report.id}`,
            `"${(report.title || 'Untitled Report').replace(/"/g, '""')}"`,
            `"${(report.description || 'No description provided').replace(/"/g, '""')}"`,
            `"${report.category || 'Other'}"`,
            `"${(report.priority || 'Low').toUpperCase()}"`,
            `"${report.isResolved ? 'Resolved' : 'Active'}"`,
            `"${(report.userName || 'Unknown').replace(/"/g, '""')}"`,
            `"${report.userPhone || 'No phone'}"`,
            `"${report.department || report.category || 'General'}"`,
            `"${(report.address || 'Address not provided').replace(/"/g, '""')}"`,
            `"${report.latitude || ''}"`,
            `"${report.longitude || ''}"`,
            `"${createdDate.toLocaleDateString()}"`,
            `"${createdDate.toLocaleTimeString()}"`,
            `"${resolvedDate ? resolvedDate.toLocaleDateString() : 'Not resolved'}"`,
            `"${resolvedDate ? resolvedDate.toLocaleTimeString() : ''}"`,
            `"${report.assignedAdminName || 'Not assigned'}"`,
            `"${(report.resolutionNotes || (report.isResolved ? 'Resolved without detailed notes' : 'N/A')).replace(/"/g, '""')}"`
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
};

// Generate comprehensive analytics report
export const generateAnalyticsReport = async (adminId) => {
    try {
        console.log('📊 Generating comprehensive analytics report...');
        
        // Fetch all necessary data
        const [reportsResponse, communityStats, departmentPerf, responseTime] = await Promise.all([
            getAdminReports(adminId, { limit: 10000 }),
            getCommunityStats(),
            getDepartmentPerformance(adminId),
            getResponseTimeAnalytics(adminId)
        ]);

        if (!reportsResponse.success) {
            throw new Error('Failed to fetch reports data');
        }

        const reports = reportsResponse.data;
        const currentDate = new Date();
        
        // Calculate comprehensive statistics
        const stats = {
            overview: {
                totalReports: reports.length,
                activeReports: reports.filter(r => !r.isResolved).length,
                resolvedReports: reports.filter(r => r.isResolved).length,
                resolutionRate: reports.length > 0 ? ((reports.filter(r => r.isResolved).length / reports.length) * 100).toFixed(1) : 0,
                generatedAt: currentDate.toISOString()
            },
            
            byCategory: {},
            byPriority: {},
            byDepartment: {},
            monthlyTrends: [],
            
            performance: {
                avgResponseTime: responseTime.success ? responseTime.data.overall : 'N/A',
                departmentPerformance: departmentPerf.success ? departmentPerf.data : {},
                responseTimeByPriority: responseTime.success ? responseTime.data.byPriority : {}
            }
        };

        // Category analysis
        reports.forEach(report => {
            const category = report.category || 'Other';
            if (!stats.byCategory[category]) {
                stats.byCategory[category] = { total: 0, resolved: 0, active: 0 };
            }
            stats.byCategory[category].total += 1;
            if (report.isResolved) {
                stats.byCategory[category].resolved += 1;
            } else {
                stats.byCategory[category].active += 1;
            }
        });

        // Priority analysis
        reports.forEach(report => {
            const priority = report.priority || 'Low';
            if (!stats.byPriority[priority]) {
                stats.byPriority[priority] = { total: 0, resolved: 0, active: 0 };
            }
            stats.byPriority[priority].total += 1;
            if (report.isResolved) {
                stats.byPriority[priority].resolved += 1;
            } else {
                stats.byPriority[priority].active += 1;
            }
        });

        // Department analysis
        reports.forEach(report => {
            const department = report.department || report.category || 'Other';
            if (!stats.byDepartment[department]) {
                stats.byDepartment[department] = { total: 0, resolved: 0, active: 0 };
            }
            stats.byDepartment[department].total += 1;
            if (report.isResolved) {
                stats.byDepartment[department].resolved += 1;
            } else {
                stats.byDepartment[department].active += 1;
            }
        });

        // Monthly trends (last 12 months)
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const monthReports = reports.filter(report => {
                const reportDate = new Date(report.createdAt);
                const reportMonthKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
                return reportMonthKey === monthKey;
            });

            stats.monthlyTrends.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                total: monthReports.length,
                resolved: monthReports.filter(r => r.isResolved).length,
                active: monthReports.filter(r => !r.isResolved).length
            });
        }

        // Generate PDF/HTML report content
        const reportContent = generateReportHTML(stats);
        
        // Create and download HTML report
        const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics_report_${currentDate.toISOString().split('T')[0]}.html`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return {
            success: true,
            data: stats,
            message: 'Analytics report generated successfully'
        };

    } catch (error) {
        console.error('❌ Error generating analytics report:', error);
        return {
            success: false,
            message: error.message || "Failed to generate analytics report"
        };
    }
};

// Helper function to generate HTML report
const generateReportHTML = (stats) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JanSetu Analytics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
        .header h1 { color: #1f2937; margin: 0; }
        .header p { color: #6b7280; margin: 5px 0; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #1f2937; border-left: 4px solid #3b82f6; padding-left: 15px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .stat-card h3 { margin: 0 0 10px 0; color: #475569; font-size: 14px; text-transform: uppercase; }
        .stat-card .value { font-size: 32px; font-weight: bold; color: #1e40af; margin: 0; }
        .stat-card .subtitle { color: #64748b; font-size: 14px; margin: 5px 0 0 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
        .progress-bar { width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background-color: #3b82f6; border-radius: 4px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 JanSetu Analytics Report</h1>
            <p>Generated on ${new Date(stats.overview.generatedAt).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'long', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            })}</p>
        </div>

        <div class="section">
            <h2>📈 Overview Statistics</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Reports</h3>
                    <p class="value">${stats.overview.totalReports}</p>
                </div>
                <div class="stat-card">
                    <h3>Active Reports</h3>
                    <p class="value">${stats.overview.activeReports}</p>
                </div>
                <div class="stat-card">
                    <h3>Resolved Reports</h3>
                    <p class="value">${stats.overview.resolvedReports}</p>
                </div>
                <div class="stat-card">
                    <h3>Resolution Rate</h3>
                    <p class="value">${stats.overview.resolutionRate}%</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Reports by Category</h2>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total</th>
                        <th>Resolved</th>
                        <th>Active</th>
                        <th>Resolution Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(stats.byCategory).map(([category, data]) => `
                        <tr>
                            <td><strong>${category}</strong></td>
                            <td>${data.total}</td>
                            <td style="color: #059669;">${data.resolved}</td>
                            <td style="color: #dc2626;">${data.active}</td>
                            <td>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${data.total > 0 ? (data.resolved / data.total * 100) : 0}%"></div>
                                </div>
                                ${data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>⚡ Reports by Priority</h2>
            <table>
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Total</th>
                        <th>Resolved</th>
                        <th>Active</th>
                        <th>Avg Response Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(stats.byPriority).map(([priority, data]) => `
                        <tr>
                            <td><strong style="color: ${
                                priority === 'critical' ? '#dc2626' : 
                                priority === 'high' ? '#ea580c' :
                                priority === 'medium' ? '#d97706' : '#16a34a'
                            };">${priority.toUpperCase()}</strong></td>
                            <td>${data.total}</td>
                            <td style="color: #059669;">${data.resolved}</td>
                            <td style="color: #dc2626;">${data.active}</td>
                            <td>${stats.performance.responseTimeByPriority[priority]?.avgTime || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📋 Monthly Trends</h2>
            <table>
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Total Reports</th>
                        <th>Resolved</th>
                        <th>Active</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.monthlyTrends.map(trend => `
                        <tr>
                            <td><strong>${trend.month}</strong></td>
                            <td>${trend.total}</td>
                            <td style="color: #059669;">${trend.resolved}</td>
                            <td style="color: #dc2626;">${trend.active}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>This report was automatically generated by the JanSetu Admin Portal</p>
            <p>For more information, contact the system administrator</p>
        </div>
    </div>
</body>
</html>`;
};
