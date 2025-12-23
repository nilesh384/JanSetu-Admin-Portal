import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useNavigate } from 'react-router-dom';
import { getAllReportCoords, getAdminReports, getCommunityStats, getDepartmentPerformance, getResponseTimeAnalytics, exportReports, generateAnalyticsReport } from '../api/user';
import { useAuth } from '../components/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// Fix default icon paths for some bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});

export default function AdminDashboard() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: '', priority: '', isResolved: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [communityStats, setCommunityStats] = useState(null);
  const [departmentPerformance, setDepartmentPerformance] = useState({});
  const [responseTimeData, setResponseTimeData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const mapRef = useRef(null);
  const navigate = useNavigate();

  const { adminData } = useAuth();

  const blinkingDotIcon = L.divIcon({
    className: "blinking-dot-icon",
    html: `<span class="blinking-dot" />`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });

  // Fetch ALL reports for analytics (no filters applied)
  const fetchAllReports = async () => {
    try {
      const adminId = adminData?.id;
      if (!adminId) {
        setReports([]);
        return;
      }

      const resp = await getAdminReports(adminId, {
        limit: 10000, // Get all reports for analytics
        offset: 0
      });

      const data = resp.success ? resp.data : [];
      setReports(data);
    } catch (err) {
      console.error('Error loading all reports for analytics', err);
    }
  };

  const fetchReports = async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const adminId = adminData?.id;
      if (!adminId) {
        setPoints([]);
        return;
      }

      const resp = await getAdminReports(adminId, {
        category: filters.category || undefined,
        priority: filters.priority || undefined,
        isResolved: filters.isResolved !== '' ? filters.isResolved : undefined,
        limit: 1000,
        offset: 0
      });

      const data = resp.success ? resp.data : [];

      const coords = data
        .filter(r => r.latitude !== undefined && r.longitude !== undefined && r.latitude !== null && r.longitude !== null)
        .map(r => ({
          id: r.id,
          title: r.title,
          lat: Number(r.latitude),
          lng: Number(r.longitude),
          category: r.category,
          priority: r.priority,
          isResolved: r.isResolved,
          createdAt: r.createdAt
        }));

      setPoints(coords);
    } catch (err) {
      console.error('Error loading reports for dashboard', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!adminData?.id) return;
    
    setAnalyticsLoading(true);
    
    try {
      // Fetch community stats
      const communityStatsResponse = await getCommunityStats();
      if (communityStatsResponse.success) {
        setCommunityStats(communityStatsResponse.data);
      }

      // Fetch department performance
      const deptPerformanceResponse = await getDepartmentPerformance(adminData.id);
      if (deptPerformanceResponse.success) {
        setDepartmentPerformance(deptPerformanceResponse.data);
      }

      // Fetch response time analytics
      const responseTimeResponse = await getResponseTimeAnalytics(adminData.id);
      if (responseTimeResponse.success) {
        setResponseTimeData(responseTimeResponse.data);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports(); // Fetch all reports for analytics
    fetchReports(); // Fetch filtered reports for map
    fetchAnalyticsData();
  }, [adminData]);

  // Analytics calculations
  const totalReports = reports.length;
  const activeReports = reports.filter(r => !r.isResolved).length;
  const resolvedReports = reports.filter(r => r.isResolved).length;
  const highPriorityReports = reports.filter(r => r.priority === 'high' || r.priority === 'critical').length;

  // Category distribution
  const categoryData = reports.reduce((acc, report) => {
    const cat = report.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  
  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  // Priority distribution
  const priorityData = reports.reduce((acc, report) => {
    const priority = report.priority || 'low';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});
  
  const priorityChartData = Object.entries(priorityData).map(([name, value]) => ({ name, value }));

  // Timeline data (last 30 days)
  const getTimelineData = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        reports: 0,
        resolved: 0
      });
    }

    reports.forEach(report => {
      const reportDate = new Date(report.createdAt).toISOString().split('T')[0];
      const dayIndex = days.findIndex(day => day.date === reportDate);
      if (dayIndex !== -1) {
        days[dayIndex].reports += 1;
        if (report.isResolved) {
          days[dayIndex].resolved += 1;
        }
      }
    });

    return days.map(day => ({
      ...day,
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  };

  const timelineData = getTimelineData();

  // Resolution rate - use community stats if available, otherwise calculate from reports
  const resolutionRate = communityStats ? 
    communityStats.resolutionRate.toFixed(1) : 
    (totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(1) : 0);

  // Average resolution time - use real data from community stats or response time analytics
  const avgResolutionTime = communityStats ? 
    `${communityStats.avgResponseTime} days` : 
    (responseTimeData?.overall || "0.0 days");

  const center = points.length ? [points[0].lat, points[0].lng] : [20, 77];

  const handleApplyFilters = () => {
    fetchReports(); // Only refresh filtered reports for map display
    // Analytics always use all reports, so no need to refresh
  };

  const handleReset = () => {
    setFilters({ category: '', priority: '', isResolved: '' });
    setSearch('');
    fetchReports(); // Only refresh filtered reports for map display
    // Analytics always use all reports, so no need to refresh
  };

  const handleExportReports = async (format = 'html') => {
    if (!adminData?.id) return;
    
    setExportLoading(true);
    try {
      const result = await exportReports(adminData.id, filters, format);
      if (result.success) {
        // File download is handled in the API function
        console.log('✅ Reports exported successfully');
        const formatName = format === 'excel' ? 'Excel CSV' : 'HTML table';
        alert(`Successfully exported ${result.stats?.totalReports || 'all'} reports as ${formatName}!`);
      } else {
        console.error('❌ Export failed:', result.message);
        alert('Failed to export reports: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Error exporting reports: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!adminData?.id) return;
    
    setGenerateLoading(true);
    try {
      const result = await generateAnalyticsReport(adminData.id);
      if (result.success) {
        // File download is handled in the API function
        console.log('✅ Analytics report generated successfully');
        alert('Analytics report generated successfully! The comprehensive HTML report has been downloaded.');
      } else {
        console.error('❌ Report generation failed:', result.message);
        alert('Failed to generate report: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Report generation error:', error);
      alert('Error generating report: ' + error.message);
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleSendAlerts = async () => {
    // TODO: Implement alert functionality
    alert('Alert functionality will be implemented soon. This will send notifications to relevant administrators about high-priority reports.');
  };

  const zoomToFit = () => {
    if (!mapRef.current || mapPoints.length === 0) return;
    const bounds = L.latLngBounds(mapPoints.map(p => [p.lat, p.lng]));
    try { mapRef.current.fitBounds(bounds, { padding: [50, 50] }); } catch (e) { /* ignore */ }
  };

  const filteredPoints = points.filter(p => {
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (filters.priority && p.priority !== filters.priority) return false;
    if (filters.isResolved !== '' && String(p.isResolved) !== String(filters.isResolved)) return false;
    return true;
  });

  // For map view, filter out resolved reports to show only active dots
  const mapPoints = activeView === 'map' ? filteredPoints.filter(p => !p.isResolved) : filteredPoints;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const StatCard = ({ title, value, subtitle, color = "blue", icon }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className={`p-3 bg-${color}-100 rounded-lg`}>{icon}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-0">JanSetu Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'overview' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'analytics' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveView('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'map' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Map View
              </button>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <StatCard
              title="Total Reports"
              value={totalReports}
              color="blue"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>}
            />
            <StatCard
              title="Active Reports"
              value={activeReports}
              color="orange"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>}
            />
            <StatCard
              title="Resolved Reports"
              value={resolvedReports}
              color="green"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
            />
            <StatCard
              title="High Priority"
              value={highPriorityReports}
              color="red"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd"/></svg>}
            />
            <StatCard
              title="Resolution Rate"
              value={`${resolutionRate}%`}
              color="purple"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>}
            />
            <StatCard
              title="Avg Resolution"
              value={avgResolutionTime}
              color="indigo"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>}
            />
          </div>
        </div>

        {/* Content based on active view */}
        {activeView === 'overview' && (
          <div className="space-y-8">
            {loading ? (
              <div className="bg-white rounded-xl p-16 shadow-sm border border-gray-200">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-700">Loading Dashboard Data...</p>
                    <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the latest reports</p>
                  </div>
                </div>
              </div>
            ) : (
            <>
            {/* Timeline Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Reports Timeline (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="reports" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="New Reports" />
                  <Area type="monotone" dataKey="resolved" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="Resolved" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category and Priority Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Reports by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Reports by Priority</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Reports Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Reports</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Priority</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 10).map((report) => (
                      <tr key={report.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{report.title || 'Untitled'}</td>
                        <td className="px-6 py-4">{report.category || 'Other'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            report.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            report.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {report.priority || 'Low'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.isResolved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {report.isResolved ? 'Resolved' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{new Date(report.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/report/${report.id}`)}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="space-y-8">
            {/* Loading State */}
            {analyticsLoading ? (
              <div className="bg-white rounded-xl p-16 shadow-sm border border-gray-200">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-700">Loading Analytics Data...</p>
                    <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the latest statistics</p>
                  </div>
                </div>
              </div>
            ) : error ? (
              /* Error State */
              <div className="bg-red-50 border border-red-200 rounded-xl p-8">
                <div className="flex flex-col items-center text-center">
                  <svg className="h-12 w-12 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-lg font-semibold text-red-700 mb-2">{error}</p>
                  <button 
                    onClick={() => {setError(null); fetchAnalyticsData();}} 
                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry Loading Analytics
                  </button>
                </div>
              </div>
            ) : (
              /* Performance Metrics */
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Department Performance</h4>
                {Object.keys(departmentPerformance).length > 0 ? (
                  Object.entries(departmentPerformance).slice(0, 3).map(([dept, stats], index) => {
                    const colorMap = {
                      0: '#2563eb', // blue-600
                      1: '#16a34a', // green-600  
                      2: '#9333ea'  // purple-600
                    };
                    const color = colorMap[index] || '#6b7280'; // gray-500 fallback
                    const rate = stats.resolutionRate || 0;
                    
                    return (
                      <div key={dept} className="space-y-3 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 capitalize">{dept.toLowerCase()}</span>
                          <span className="text-sm font-medium">{rate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(rate, 100)}%`,
                              backgroundColor: color
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">
                    {analyticsLoading ? 'Loading department performance...' : 'No department data available'}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Response Time</h4>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {responseTimeData?.overall?.replace(' days', '') || '0.0'}
                    </div>
                    <div className="text-sm text-gray-600">Average Days</div>
                  </div>
                  <div className="space-y-2">
                    {responseTimeData?.byPriority ? (
                      Object.entries(responseTimeData.byPriority).map(([priority, data]) => (
                        <div key={priority} className="flex justify-between text-sm">
                          <span className="capitalize">{priority}</span>
                          <span className="font-medium">{data.avgTime}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">
                        {analyticsLoading ? 'Loading response times...' : 'No response time data available'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Monthly Trends</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="text-sm font-medium text-green-600">
                        {timelineData && timelineData.length > 0 ? 
                          (timelineData[timelineData.length - 1].reports > timelineData[0].reports ? '+' : '') +
                          Math.round(((timelineData[timelineData.length - 1].reports - timelineData[0].reports) / Math.max(timelineData[0].reports, 1)) * 100) + '%'
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="text-2xl font-bold">{totalReports}</div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Resolution Rate</span>
                      <span className="text-sm font-medium text-blue-600">
                        {communityStats ? 
                          `${Math.round(communityStats.resolutionRate) >= 75 ? '+' : ''}${Math.round(communityStats.resolutionRate - 70)}%` 
                          : '+5%'
                        }
                      </span>
                    </div>
                    <div className="text-2xl font-bold">{resolutionRate}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Export & Actions</h4>
                <p className="text-xs text-gray-600 mb-3">Export reports in different formats</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleExportReports('html')}
                      disabled={exportLoading || !adminData?.id}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs flex items-center justify-center"
                    >
                      {exportLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Exporting...
                        </>
                      ) : (
                        <>
                          📋 HTML
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => handleExportReports('excel')}
                      disabled={exportLoading || !adminData?.id}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs flex items-center justify-center"
                    >
                      {exportLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Exporting...
                        </>
                      ) : (
                        <>
                          📊 Excel
                        </>
                      )}
                    </button>
                  </div>
                  <button 
                    onClick={handleGenerateReport}
                    disabled={generateLoading || !adminData?.id}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center"
                  >
                    {generateLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Analytics Report
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleSendAlerts}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center justify-center"
                  >
                    Send Alerts
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Analytics */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Detailed Performance Analytics</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" stroke="#8884d8" strokeWidth={3} name="Total Reports" />
                  <Line type="monotone" dataKey="resolved" stroke="#82ca9d" strokeWidth={3} name="Resolved Reports" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </>
            )}
          </div>
        )}

        {activeView === 'map' && (
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className={`w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all ${sidebarOpen ? 'block' : 'hidden'} md:block`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Map Controls</h3>
                <div className="flex items-center gap-2">
                  <button title="Refresh" onClick={() => { fetchAllReports(); fetchReports(); fetchAnalyticsData(); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Refresh">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a1 1 0 011-1h2a1 1 0 110 2H6v1a7 7 0 101.757 4.243 1 1 0 11-1.414-1.414A5 5 0 1111 6V4a1 1 0 112 0v2a1 1 0 01-1 1H10a1 1 0 110-2h.586A7 7 0 004 4z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button title="Toggle sidebar" onClick={() => setSidebarOpen(s => !s)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Toggle sidebar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 5a1 1 0 011-1h12a1 1 0 01.8 1.6L12 11.4V16a1 1 0 01-1.447.894L7 15v-3.6L3.2 6.6A1 1 0 013 6V5z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search Section */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Search Reports</label>
                <div className="relative">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by title, description..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Filters</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={filters.category}
                      onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
                    >
                      <option value="">All Categories</option>
                      <option value="other">Other</option>
                      <option value="safety">Safety</option>
                      <option value="infrastructure">Infrastructure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={filters.priority}
                      onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
                    >
                      <option value="">All Priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="resolved-only"
                      checked={filters.isResolved === 'true'}
                      onChange={e => setFilters(f => ({ ...f, isResolved: e.target.checked ? 'true' : '' }))}
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                    />
                    <label htmlFor="resolved-only" className="ml-2 block text-sm text-gray-700">
                      Show only resolved reports
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-lg hover:bg-slate-900 transition-colors font-medium"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Reset
                </button>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium">
                  {activeView === 'map' ? 'Active reports' : 'Visible reports'}: 
                  <span className="font-semibold"> {activeView === 'map' ? mapPoints.length : filteredPoints.length}</span>
                </h4>
                <div className="mt-2 max-h-48 overflow-auto">
                  {(activeView === 'map' ? mapPoints : filteredPoints).slice(0, 20).map(r => (
                    <div key={r.id} className="py-2 border-b last:border-b-0 flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium truncate max-w-[12rem]">{r.title || 'Untitled'}</div>
                        <div className="text-xs text-gray-500">{r.category || '—'} • {r.priority || '—'}</div>
                      </div>
                      <div>
                        <button onClick={() => { mapRef.current?.setView([r.lat, r.lng], 13); }} className="ml-2 text-sm text-blue-600">Center</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <button onClick={zoomToFit} className="w-full px-3 py-2 bg-green-600 text-white rounded">Zoom to fit</button>
              </div>
            </aside>

            {/* Map area */}
            <main className="flex-1 rounded-lg overflow-hidden border">
              <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
                <h2 className="text-lg font-semibold">Reports Map</h2>
                <div className="text-sm text-gray-600">{loading ? 'Loading…' : `${mapPoints.length} active reports`}</div>
              </div>

              {error && <div className="p-4 text-red-600">{error}</div>}

              {loading ? (
                <div className="p-8">Loading map...</div>
              ) : mapPoints.length === 0 ? (
                <div className="p-8">No active report locations available.</div>
              ) : (
                <MapContainer center={center} zoom={6} style={{ height: '70vh', width: '100%' }} whenCreated={mapInstance => { mapRef.current = mapInstance; }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {mapPoints.map(p => (
                    <Marker key={p.id} position={[p.lat, p.lng]} icon={blinkingDotIcon} eventHandlers={{ click: () => navigate(`/report/${p.id}`) }}>
                      <Popup>
                        <div>
                          <strong>{p.title}</strong>
                          <div className="text-xs text-gray-500">{p.category} • {p.priority}</div>
                          <div>ID: {p.id}</div>
                          <div className="mt-2 flex gap-2">
                            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => navigate(`/report/${p.id}`)}>View</button>
                            <button className="px-2 py-1 border rounded" onClick={() => { mapRef.current?.setView([p.lat, p.lng], 15); }}>Zoom</button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}