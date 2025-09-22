import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getReportById, resolveReport } from "../api/user";
import { useAuth } from "../components/AuthContext";
import 'leaflet/dist/leaflet.css';

export default function ReportDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated, adminData } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvedPhotos, setResolvedPhotos] = useState([]);
  const [photoPreview, setPhotoPreview] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    if (id) {
      fetchReportDetails();
    }
  }, [isAuthenticated, id]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const result = await getReportById(id);

      if (result.success) {
        setReport(result.data);
      } else {
        setError(result.message || "Report not found");
      }
    } catch (err) {
      setError("Failed to load report details");
      console.error("Report details fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getFullDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      high: { color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
      low: { color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' }
    };
    
    const config = priorityConfig[priority?.toLowerCase()] || priorityConfig.medium;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
        {priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'}
      </span>
    );
  };

  const getStatusBadge = (isResolved) => {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${
        isResolved
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-orange-100 text-orange-800 border-orange-200'
      }`}>
        <span className={`w-2 h-2 rounded-full ${isResolved ? 'bg-green-500' : 'bg-orange-500'}`}></span>
        {isResolved ? 'Resolved' : 'Pending'}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'water': '💧',
      'electricity': '⚡',
      'roads': '🛣️',
      'waste': '🗑️',
      'streetlights': '💡',
      'park': '🌳',
      'traffic': '🚦',
      'noise': '🔊',
      'other': '📋'
    };
    return icons[category?.toLowerCase()] || icons.other;
  };

  const handlePhotoChange = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      // nothing selected
      event.target.value = '';
      return;
    }

    // Merge with existing selected photos, but enforce a maximum of 2
    const existing = resolvedPhotos || [];
    const available = Math.max(0, 2 - existing.length);
    const toAdd = files.slice(0, available);

    if (toAdd.length === 0) {
      alert('Maximum 2 photos allowed for resolution');
      // reset input so user can try again
      event.target.value = '';
      return;
    }

    const newResolved = existing.concat(toAdd);
    setResolvedPhotos(newResolved);

    // Create preview URLs and append
    const newPreviews = toAdd.map(file => URL.createObjectURL(file));
    setPhotoPreview(prev => (prev || []).concat(newPreviews));

    // Reset input value to allow selecting the same file again if needed
    event.target.value = '';
  };

  const removePhotoAt = (index) => {
    // remove from resolvedPhotos and photoPreview, revoke URL
    setResolvedPhotos(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setPhotoPreview(prev => {
      const next = [...prev];
      const removed = next.splice(index, 1);
      if (removed && removed[0]) {
        try { URL.revokeObjectURL(removed[0]); } catch (e) { /* ignore */ }
      }
      return next;
    });
  };

  const handleResolveReport = async () => {
    if (!adminData) {
      alert("Admin authentication required");
      return;
    }

    if (!resolutionNotes.trim()) {
      alert("Please add resolution notes");
      return;
    }

    setResolving(true);
    
    try {
      const result = await resolveReport(
        id,
        adminData.id,
        adminData.role,
        resolutionNotes,
        resolvedPhotos
      );

      if (result.success) {
        alert("Report resolved successfully!");
        setShowResolveModal(false);
        // Set flag to refresh reports list when navigating back using sessionStorage
        sessionStorage.setItem('shouldRefreshReports', 'true');
        // Refresh report data
        fetchReportDetails();
      } else {
        alert(`Failed to resolve report: ${result.message}`);
      }
    } catch (error) {
      console.error("Error resolving report:", error);
      alert("Failed to resolve report. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setResolutionNotes("");
    setResolvedPhotos([]);
    setPhotoPreview([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-300 mx-auto animate-ping"></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="font-medium">Error Loading Report</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <h3 className="font-medium">Report Not Found</h3>
                <p className="text-sm mt-1">The requested report could not be found.</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-2 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getCategoryIcon(report.category)}</div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
                  <p className="text-slate-600">
                    Reported by {
                      report.userName 
                        ? report.userName 
                        : report.userId 
                          ? `User #${report.userId}` 
                          : "Anonymous"
                    } • {formatDate(report.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getPriorityBadge(report.priority)}
              {getStatusBadge(report.isResolved)}
              {!report.isResolved && (
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Report Details</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <div className="bg-slate-50 rounded-lg p-4 min-h-[100px]">
                    <p className="text-slate-900 leading-relaxed">
                      {report.description || "No description provided"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getCategoryIcon(report.category)}</span>
                        <span className="text-slate-900 capitalize">{report.category || 'Other'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-slate-900">{report.department || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-900">{report.address || "No address provided"}</p>
                    {report.latitude && report.longitude && (
                      <p className="text-sm text-slate-500 mt-1">
                        Coordinates: {Number(report.latitude).toFixed(6)}, {Number(report.longitude).toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Created</label>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-slate-900">{getFullDate(report.createdAt)}</p>
                    </div>
                  </div>
                  
                  {report.isResolved && report.resolvedAt && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Resolved</label>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-green-900">{getFullDate(report.resolvedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Media Section */}
            {(report.mediaUrls?.length > 0 || report.audioUrl) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Media Attachments</h2>
                
                {report.mediaUrls?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-slate-700 mb-4">Photos ({report.mediaUrls.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.mediaUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Report photo ${index + 1}`}
                            className="w-full h-64 object-cover rounded-lg border border-slate-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => window.open(url, '_blank')}
                              className="opacity-0 group-hover:opacity-100 bg-white text-slate-900 px-3 py-1 rounded-md text-sm font-medium transition-all"
                            >
                              View Full Size
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.audioUrl && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-700 mb-4">Audio Recording</h3>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <audio controls className="w-full">
                        <source src={report.audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                      {report.audioTranscription && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Transcription</label>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {report.audioTranscription}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resolution Details */}
            {report.isResolved && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Resolution Details</h2>
                
                <div className="space-y-4">
                  {report.resolutionNotes && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Resolution Notes</label>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-green-900 leading-relaxed">{report.resolutionNotes}</p>
                      </div>
                    </div>
                  )}

                  {report.resolvedPhotos?.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Resolution Photos</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {report.resolvedPhotos.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Resolution photo ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border border-green-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                              <button
                                onClick={() => window.open(url, '_blank')}
                                className="opacity-0 group-hover:opacity-100 bg-white text-slate-900 px-3 py-1 rounded-md text-sm font-medium transition-all"
                              >
                                View Full Size
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(report.resolvedBy || report.resolvedAt) && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {report.resolvedBy && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Resolved By</label>
                            <p className="text-slate-900">{report.resolvedBy}</p>
                          </div>
                        )}
                        {report.resolvedAt && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Resolution Date</label>
                            <p className="text-slate-900">{getFullDate(report.resolvedAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Report ID</span>
                  <span className="text-slate-900 font-mono text-sm">{report.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Status</span>
                  {getStatusBadge(report.isResolved)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Priority</span>
                  {getPriorityBadge(report.priority)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Category</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(report.category)}</span>
                    <span className="text-slate-900 capitalize">{report.category || 'Other'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Map */}
            {(report.latitude && report.longitude) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Location</h3>
                <div className="h-64 rounded-lg overflow-hidden border border-slate-200">
                  <MapContainer 
                    center={[Number(report.latitude), Number(report.longitude)]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[Number(report.latitude), Number(report.longitude)]}>
                      <Popup>
                        <div className="text-center">
                          <strong>{report.title}</strong>
                          <br />
                          {report.address}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Actions */}
            {!report.isResolved && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Mark as Resolved
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      

      {/* Resolution Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Mark Report as Resolved</h2>
                <button
                  onClick={closeResolveModal}
                  className="text-slate-400 hover:text-slate-600 text-2xl p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Report Summary */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">{getCategoryIcon(report.category)}</span>
                    {report.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Report ID:</span>
                      <span className="ml-2 font-mono text-slate-900">{report.id?.slice(0, 8)}...</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Priority:</span>
                      <span className="ml-2">{getPriorityBadge(report.priority)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Category:</span>
                      <span className="ml-2 text-slate-900 capitalize">{report.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Created:</span>
                      <span className="ml-2 text-slate-900">{formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Resolution Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Resolution Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe how this issue was resolved, what actions were taken, and any additional details..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    rows={4}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Provide detailed information about the resolution for future reference
                  </p>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Resolution Photos <span className="text-slate-500">(Optional - Max 2 photos)</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="resolution-photos"
                    />
                    <label htmlFor="resolution-photos" className="cursor-pointer">
                      <div className="text-slate-400 mb-2">📷</div>
                      <p className="text-sm text-slate-600 mb-1">Click to upload resolution photos</p>
                      <p className="text-xs text-slate-500">
                        Upload before/after photos of the resolved issue (JPEG, PNG)
                      </p>
                    </label>
                  </div>
                </div>

                {/* Photo Previews */}
                {photoPreview.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Photo Previews ({photoPreview.length}/2)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {photoPreview.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Resolution photo ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            onClick={() => removePhotoAt(index)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-md transition-colors"
                            title="Remove photo"
                          >
                            Remove
                          </button>
                          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-md">
                            Photo {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Details */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                    ✅ Resolution Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Resolved by:</span>
                      <span className="text-green-900 font-medium">
                        {adminData?.name || adminData?.email || 'Current Admin'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Role:</span>
                      <span className="text-green-900 font-medium">{adminData?.role || 'Administrator'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Resolution time:</span>
                      <span className="text-green-900 font-medium">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={closeResolveModal}
                  className="px-6 py-2 text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors font-medium"
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveReport}
                  disabled={resolving || !resolutionNotes.trim()}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolving ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Resolving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      ✅ Mark as Resolved
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
