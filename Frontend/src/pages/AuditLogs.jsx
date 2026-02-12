import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeletionAuditLogs } from '../api/user';
import { useAuth } from '../components/AuthContext';

export default function AuditLogs() {
    const navigate = useNavigate();
    const { isAuthenticated, adminData } = useAuth();
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false
    });
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Fetch audit logs
    const fetchAuditLogs = useCallback(async (offset = 0) => {
        try {
            setLoading(true);
            setError('');

            const result = await getDeletionAuditLogs(
                adminData.adminId,
                adminData.role,
                {
                    limit: 50,
                    offset: offset
                }
            );

            if (result.success) {
                setAuditLogs(result.data || []);
                setPagination(prev => ({
                    ...prev,
                    total: result.pagination?.total || 0,
                    offset: offset,
                    hasMore: result.pagination?.hasMore || false
                }));
            } else {
                setError(result.message || 'Failed to load audit logs');
            }
        } catch (err) {
            setError('Failed to load audit logs');
            console.error('Audit logs fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [adminData]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/', { replace: true });
            return;
        }

        if (adminData?.role !== 'super_admin') {
            navigate('/dashboard', { replace: true });
            return;
        }

        fetchAuditLogs(0);
    }, [isAuthenticated, adminData, navigate, fetchAuditLogs]);

    const handlePrevPage = () => {
        const newOffset = Math.max(0, pagination.offset - pagination.limit);
        fetchAuditLogs(newOffset);
    };

    const handleNextPage = () => {
        if (pagination.hasMore) {
            const newOffset = pagination.offset + pagination.limit;
            fetchAuditLogs(newOffset);
        }
    };

    const viewDetails = (log) => {
        setSelectedLog(log);
        setShowDetailsModal(true);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getSeverityBadge = (fraudIndicators) => {
        if (!fraudIndicators) return null;
        
        const severity = fraudIndicators.severity;
        const score = fraudIndicators.score || 0;
        
        const styles = {
            critical: 'bg-red-100 text-red-800 border-red-300',
            high: 'bg-orange-100 text-orange-800 border-orange-300',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            low: 'bg-blue-100 text-blue-800 border-blue-300'
        };

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[severity] || styles.low}`}>
                {severity?.toUpperCase()} ({score})
            </span>
        );
    };

    if (loading && auditLogs.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-7xl mx-auto">
            {/* Compact Header with Inline Stats */}
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Report Deletion Audit Logs</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Super Admin Only</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-gray-500 text-xs">Total</div>
                        <div className="font-bold text-gray-800">{pagination.total}</div>
                    </div>
                    <div className="text-center border-l border-gray-300 pl-4">
                        <div className="text-gray-500 text-xs">Page</div>
                        <div className="font-bold text-gray-800">
                            {Math.floor(pagination.offset / pagination.limit) + 1}
                        </div>
                    </div>
                    <div className="text-center border-l border-gray-300 pl-4">
                        <div className="text-gray-500 text-xs">Showing</div>
                        <div className="font-bold text-gray-800">
                            {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                    {error}
                </div>
            )}

            {/* Audit Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Deleted At
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Report ID
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Deleted By
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fraud Severity
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reason
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {auditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500 text-sm">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                auditLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(log.deleted_at)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                                            {log.report_id.substring(0, 8)}...
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{log.admin_full_name}</div>
                                            <div className="text-xs text-gray-500">{log.admin_email}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {getSeverityBadge(log.fraud_indicators)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            <div className="max-w-xs truncate" title={log.deletion_reason}>
                                                {log.deletion_reason || 'No reason provided'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => viewDetails(log)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-t border-gray-200">
                        <div className="text-xs text-gray-700">
                            Showing <span className="font-medium">{pagination.offset + 1}</span> to{' '}
                            <span className="font-medium">
                                {Math.min(pagination.offset + pagination.limit, pagination.total)}
                            </span>{' '}
                            of <span className="font-medium">{pagination.total}</span> results
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={pagination.offset === 0}
                                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={handleNextPage}
                                disabled={!pagination.hasMore}
                                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">Audit Log Details</h2>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Deletion Info */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-gray-800">Deletion Information</h3>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Deleted At:</span>
                                        <span className="font-medium">{formatDate(selectedLog.deleted_at)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Report ID:</span>
                                        <span className="font-mono text-sm">{selectedLog.report_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Deleted By:</span>
                                        <span className="font-medium">{selectedLog.admin_full_name} ({selectedLog.admin_role})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Admin Email:</span>
                                        <span>{selectedLog.admin_email}</span>
                                    </div>
                                    <div className="flex flex-col mt-3">
                                        <span className="text-gray-600 mb-1">Deletion Reason:</span>
                                        <span className="bg-white p-3 rounded border border-gray-200">
                                            {selectedLog.deletion_reason || 'No reason provided'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Fraud Analysis */}
                            {selectedLog.fraud_indicators && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Fraud Analysis</h3>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-gray-700 font-medium">Fraud Score:</span>
                                            {getSeverityBadge(selectedLog.fraud_indicators)}
                                        </div>
                                        {selectedLog.fraud_indicators.reasons && selectedLog.fraud_indicators.reasons.length > 0 && (
                                            <div className="mt-3">
                                                <span className="text-gray-700 font-medium mb-2 block">Detected Issues:</span>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {selectedLog.fraud_indicators.reasons.map((reason, index) => (
                                                        <li key={index} className="text-sm text-gray-700">{reason}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {selectedLog.fraud_indicators.recommendation && (
                                            <div className="mt-3 pt-3 border-t border-red-200">
                                                <span className="text-gray-700 font-medium">Recommendation:</span>
                                                <p className="text-sm text-gray-700 mt-1">
                                                    {selectedLog.fraud_indicators.recommendation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Report Snapshot */}
                            {selectedLog.report_snapshot && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Report Snapshot</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-gray-600">Title:</span>
                                                <p className="font-medium">{selectedLog.report_snapshot.title || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Category:</span>
                                                <p className="font-medium">{selectedLog.report_snapshot.category || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Priority:</span>
                                                <p className="font-medium">{selectedLog.report_snapshot.priority || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Status:</span>
                                                <p className="font-medium">
                                                    {selectedLog.report_snapshot.is_resolved ? 'Resolved' : 'Active'}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedLog.report_snapshot.description && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <span className="text-gray-600">Description:</span>
                                                <p className="mt-1">{selectedLog.report_snapshot.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Close Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
