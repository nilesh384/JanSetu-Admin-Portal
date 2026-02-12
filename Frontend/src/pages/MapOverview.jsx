import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import './MapOverview.css';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useNavigate } from 'react-router-dom';
import { getAdminReports, getCommunityStats, getDepartmentPerformance, getResponseTimeAnalytics, exportReports, generateAnalyticsReport } from '../api/user';
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
  const [mapView, setMapView] = useState('markers'); // 'markers' or 'cluster'
  const [mapLayer, setMapLayer] = useState('street'); // 'street', 'satellite', or 'terrain'
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showMapControls, setShowMapControls] = useState(true);
  const mapRef = useRef(null);
  const navigate = useNavigate();

  const { adminData } = useAuth();

  // Custom marker icons based on priority
  const createCustomIcon = (priority, isResolved) => {
    const colors = {
      critical: isResolved ? '#9ca3af' : '#dc2626',
      high: isResolved ? '#9ca3af' : '#f97316', 
      medium: isResolved ? '#9ca3af' : '#fbbf24',
      low: isResolved ? '#9ca3af' : '#10b981'
    };
    const color = colors[priority] || colors.low;
    const size = priority === 'critical' ? 16 : priority === 'high' ? 14 : 12;
    
    return L.divIcon({
      className: 'custom-marker-icon',
      html: `
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ${!isResolved ? 'animation: pulse 2s infinite;' : ''}
        "></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -size/2],
    });
  };

  // Fetch ALL reports for analytics (no filters applied)
  const fetchAllReports = useCallback(async () => {
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
  }, [adminData]);

  const fetchReports = useCallback(async () => {
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
  }, [adminData, filters]);

  const fetchAnalyticsData = useCallback(async () => {
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
  }, [adminData]);

  useEffect(() => {
    fetchAllReports(); // Fetch all reports for analytics
    fetchReports(); // Fetch filtered reports for map
    fetchAnalyticsData();
  }, [adminData, fetchAllReports, fetchReports, fetchAnalyticsData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAllReports();
      fetchReports();
      fetchAnalyticsData();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllReports, fetchReports, fetchAnalyticsData]);

  // Analytics calculations
  const totalReports = reports.length;
  const activeReports = reports.filter(r => !r.isResolved && r.status !== 'resolved').length;
  const inProgressReports = reports.filter(r => r.status === 'in_progress').length;
  const resolvedReports = reports.filter(r => r.isResolved || r.status === 'resolved').length;
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
    try { mapRef.current.fitBounds(bounds, { padding: [50, 50] }); } catch { /* ignore */ }
  };

  const exportMapAsImage = async () => {
    try {
      const mapElement = document.querySelector('.leaflet-container');
      if (!mapElement) return;
      
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#fff'
      });
      
      const link = document.createElement('a');
      link.download = `map-export-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting map:', error);
      alert('Failed to export map. Please try again.');
    }
  };

  const getTileLayerUrl = () => {
    switch(mapLayer) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
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

  // Filter by location search
  const searchFilteredPoints = locationSearch.trim() 
    ? mapPoints.filter(p => 
        p.title?.toLowerCase().includes(locationSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(locationSearch.toLowerCase())
      )
    : mapPoints;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  const PRIORITY_COLORS = {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#fbbf24',
    low: '#10b981'
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ title, value, subtitle, color = "blue", icon }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {icon && <div className={`p-2 bg-${color}-100 rounded-lg`}>{icon}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
            <StatCard
              title="Total Reports"
              value={totalReports}
              color="blue"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>}
            />
            <StatCard
              title="Pending"
              value={activeReports}
              color="orange"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>}
            />
            <StatCard
              title="In Progress"
              value={inProgressReports}
              color="blue"
              icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/></svg>}
            />
            <StatCard
              title="Resolved"
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
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-6 shadow-lg border border-blue-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Reports Timeline</h3>
                  <p className="text-sm text-gray-500 mt-1">30-day trend analysis</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">New Reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Resolved</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="reports" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#colorReports)" 
                    name="New Reports"
                    animationDuration={1000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fill="url(#colorResolved)" 
                    name="Resolved"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category and Priority Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl p-6 shadow-lg border border-purple-100">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Category Distribution</h3>
                  <p className="text-sm text-gray-500 mt-1">Breakdown by report type</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({name, value, percent}) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={90}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={1000}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                              <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Count: <span className="font-bold">{payload[0].value}</span>
                              </p>
                              <p className="text-xs text-gray-600">
                                Percentage: <span className="font-bold">{((payload[0].value / totalReports) * 100).toFixed(1)}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl p-6 shadow-lg border border-orange-100">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Priority Levels</h3>
                  <p className="text-sm text-gray-500 mt-1">Reports by urgency</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={priorityChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const priority = payload[0].payload.name;
                          const value = payload[0].value;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                              <p className="text-sm font-semibold text-gray-900 capitalize">{priority} Priority</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Reports: <span className="font-bold">{value}</span>
                              </p>
                              <p className="text-xs text-gray-600">
                                Percentage: <span className="font-bold">{((value / totalReports) * 100).toFixed(1)}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    >
                      {priorityChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PRIORITY_COLORS[entry.name] || '#3b82f6'}
                        />
                      ))}
                    </Bar>
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
                            report.status === 'resolved' || report.isResolved 
                              ? 'bg-green-700 text-white' 
                              : report.status === 'in_progress'
                              ? 'bg-blue-700 text-white'
                              : report.status === 'assigned'
                              ? 'bg-indigo-700 text-white'
                              : report.status === 'under_review'
                              ? 'bg-purple-700 text-white'
                              : 'bg-orange-700 text-white'
                          }`}>
                            {report.status === 'resolved' || report.isResolved 
                              ? 'Resolved' 
                              : report.status === 'in_progress'
                              ? 'In Progress'
                              : report.status === 'assigned'
                              ? 'Assigned'
                              : report.status === 'under_review'
                              ? 'Under Review'
                              : 'Pending'}
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
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900">Department Performance</h4>
                </div>
                {Object.keys(departmentPerformance).length > 0 ? (
                  Object.entries(departmentPerformance).slice(0, 3).map(([dept, stats], index) => {
                    const colorMap = [
                      { bg: 'bg-blue-500', from: '#3b82f6', to: '#1d4ed8' },
                      { bg: 'bg-green-500', from: '#10b981', to: '#059669' },
                      { bg: 'bg-purple-500', from: '#8b5cf6', to: '#6d28d9' }
                    ];
                    const colorScheme = colorMap[index] || { bg: 'bg-gray-500', from: '#6b7280', to: '#4b5563' };
                    const rate = stats.resolutionRate || 0;
                    
                    return (
                      <div key={dept} className="space-y-2 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 font-medium capitalize truncate" title={dept.toLowerCase()}>
                            {dept.toLowerCase().substring(0, 20)}
                          </span>
                          <span className="text-sm font-bold text-gray-900">{rate.toFixed(1)}%</span>
                        </div>
                        <div className="relative w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="h-2.5 rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.min(rate, 100)}%`,
                              background: `linear-gradient(to right, ${colorScheme.from}, ${colorScheme.to})`
                            }}
                          >
                            <div className="h-full w-full animate-pulse opacity-30 bg-white"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                    {analyticsLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </div>
                    ) : 'No department data available'}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl p-6 shadow-lg border border-indigo-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900">Response Time</h4>
                </div>
                <div className="space-y-4">
                  <div className="text-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-md">
                    <div className="text-4xl font-bold text-white">
                      {responseTimeData?.overall?.replace(' days', '') || '0.0'}
                    </div>
                    <div className="text-sm text-indigo-100 mt-1">Average Days to Resolve</div>
                  </div>
                  <div className="space-y-2">
                    {responseTimeData?.byPriority ? (
                      Object.entries(responseTimeData.byPriority).map(([priority, data]) => {
                        const priorityColors = {
                          critical: 'text-red-600 bg-red-50',
                          high: 'text-orange-600 bg-orange-50',
                          medium: 'text-yellow-600 bg-yellow-50',
                          low: 'text-green-600 bg-green-50'
                        };
                        return (
                          <div key={priority} className={`flex justify-between items-center text-sm px-3 py-2 rounded-lg ${priorityColors[priority] || 'text-gray-600 bg-gray-50'}`}>
                            <span className="capitalize font-medium">{priority}</span>
                            <span className="font-bold">{data.avgTime}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                        {analyticsLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                          </div>
                        ) : 'No response time data available'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-green-50 rounded-xl p-6 shadow-lg border border-green-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900">Monthly Trends</h4>
                </div>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-green-100">This Month</span>
                      <span className="text-sm font-bold text-white px-2 py-1 bg-white/20 rounded-lg">
                        {timelineData && timelineData.length > 0 ? 
                          (timelineData[timelineData.length - 1].reports > timelineData[0].reports ? '📈 ' : '📉 ') +
                          Math.abs(Math.round(((timelineData[timelineData.length - 1].reports - timelineData[0].reports) / Math.max(timelineData[0].reports, 1)) * 100)) + '%'
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-white">{totalReports}</div>
                    <div className="text-sm text-green-100 mt-1">Total Reports</div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-blue-100">Resolution Rate</span>
                      <span className="text-sm font-bold text-white px-2 py-1 bg-white/20 rounded-lg">
                        {communityStats ? 
                          `${Math.round(communityStats.resolutionRate) >= 75 ? '✨ ' : '⚡ '}${Math.abs(Math.round(communityStats.resolutionRate - 70))}%` 
                          : '⚡ +5%'
                        }
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-white">{resolutionRate}%</div>
                    <div className="text-sm text-blue-100 mt-1">Success Rate</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900">Export & Actions</h4>
                </div>
                <p className="text-xs text-gray-600 mb-4">Download comprehensive reports</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleExportReports('html')}
                      disabled={exportLoading || !adminData?.id}
                      className="group px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-xs font-medium flex items-center justify-center gap-2"
                    >
                      {exportLoading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </>
                      ) : (
                        <>
                          <span className="text-lg group-hover:scale-110 transition-transform">📋</span>
                          HTML
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => handleExportReports('excel')}
                      disabled={exportLoading || !adminData?.id}
                      className="group px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:from-green-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-xs font-medium flex items-center justify-center gap-2"
                    >
                      {exportLoading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </>
                      ) : (
                        <>
                          <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
                          Excel
                        </>
                      )}
                    </button>
                  </div>
                  <button 
                    onClick={handleGenerateReport}
                    disabled={generateLoading || !adminData?.id}
                    className="group w-full px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {generateLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                          <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                        </svg>
                        Generate Full Report
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleSendAlerts}
                    className="group w-full px-5 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 group-hover:animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                    </svg>
                    Send Priority Alerts
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Analytics */}
            <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl p-6 shadow-lg border border-indigo-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Performance Trend Analysis</h3>
                  <p className="text-sm text-gray-500 mt-1">Comparative view of reports vs resolutions</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">Success Rate</div>
                  <div className="text-lg font-bold text-green-600">{resolutionRate}%</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineBlue" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="lineGreen" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reports" 
                    stroke="url(#lineBlue)" 
                    strokeWidth={3} 
                    name="Total Reports"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={1500}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="url(#lineGreen)" 
                    strokeWidth={3} 
                    name="Resolved Reports"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={1500}
                  />
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

              {/* Location Search */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Search on Map</label>
                <div className="relative">
                  <input
                    value={locationSearch}
                    onChange={e => setLocationSearch(e.target.value)}
                    placeholder="Search location on map..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    📍
                  </div>
                  {locationSearch && (
                    <button
                      onClick={() => setLocationSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Map View Options */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Map View</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMapView('markers')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mapView === 'markers' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📌 Markers
                  </button>
                  <button
                    onClick={() => setMapView('cluster')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mapView === 'cluster' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🗂️ Cluster
                  </button>
                </div>
              </div>

              {/* Map Layer Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Map Layer</label>
                <select
                  value={mapLayer}
                  onChange={e => setMapLayer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="street">🗺️ Street Map</option>
                  <option value="satellite">🛰️ Satellite</option>
                  <option value="terrain">🏔️ Terrain</option>
                </select>
              </div>

              {/* Auto Refresh Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Auto Refresh</span>
                    <span className="text-xs text-gray-500">(30s)</span>
                  </div>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoRefresh ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
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
                <h4 className="text-sm font-medium mb-2">
                  {activeView === 'map' ? 'Active reports' : 'Visible reports'}: 
                  <span className="font-semibold"> {activeView === 'map' ? searchFilteredPoints.length : filteredPoints.length}</span>
                </h4>
                <div className="mt-2 max-h-48 overflow-auto">
                  {(activeView === 'map' ? searchFilteredPoints : filteredPoints).slice(0, 20).map(r => (
                    <div key={r.id} className="py-2 border-b last:border-b-0 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="text-sm">
                        <div className="font-medium truncate max-w-[12rem]">{r.title || 'Untitled'}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{r.category || '—'}</span>
                          <span>•</span>
                          <span className={`font-medium ${
                            r.priority === 'critical' ? 'text-red-600' :
                            r.priority === 'high' ? 'text-orange-600' :
                            r.priority === 'medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>{r.priority || 'low'}</span>
                        </div>
                      </div>
                      <div>
                        <button 
                          onClick={() => { 
                            mapRef.current?.setView([r.lat, r.lng], 13);
                            // Highlight the marker temporarily
                            setTimeout(() => {
                              mapRef.current?.setView([r.lat, r.lng], 15);
                            }, 300);
                          }} 
                          className="ml-2 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          Center
                        </button>
                      </div>
                    </div>
                  ))}
                  {(activeView === 'map' ? searchFilteredPoints : filteredPoints).length > 20 && (
                    <div className="py-2 text-center text-xs text-gray-500">
                      ... and {(activeView === 'map' ? searchFilteredPoints : filteredPoints).length - 20} more
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button 
                  onClick={zoomToFit} 
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  🎯 Zoom to Fit
                </button>
                <button 
                  onClick={exportMapAsImage} 
                  className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  📸 Export Map
                </button>
                <button 
                  onClick={() => setShowMapControls(!showMapControls)} 
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  {showMapControls ? '🙈 Hide' : '👁️ Show'} Controls
                </button>
              </div>
            </aside>

            {/* Map area */}
            <main className="flex-1 rounded-lg overflow-hidden border shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div>
                  <h2 className="text-lg font-bold">📍 Live Reports Map</h2>
                  <p className="text-xs text-blue-100">Real-time visualization of active reports</p>
                </div>
                <div className="flex items-center gap-3">
                  {autoRefresh && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs">
                      <span className="animate-pulse">🔄</span>
                      <span>Auto-refresh ON</span>
                    </div>
                  )}
                  <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                    {loading ? '⏳ Loading…' : `${searchFilteredPoints.length} markers`}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                  <p className="text-red-600 text-sm">⚠️ {error}</p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center p-16 bg-gray-50">
                  <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600 font-medium">Loading map data...</p>
                  </div>
                </div>
              ) : searchFilteredPoints.length === 0 ? (
                <div className="flex items-center justify-center p-16 bg-gray-50">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <p className="text-gray-600 font-medium">No report locations found</p>
                    <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search criteria</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <MapContainer 
                    center={center} 
                    zoom={6} 
                    style={{ height: '70vh', width: '100%' }} 
                    whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                  >
                    <TileLayer 
                      url={getTileLayerUrl()} 
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {mapView === 'cluster' ? (
                      <MarkerClusterGroup
                        chunkedLoading
                        maxClusterRadius={60}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={true}
                        zoomToBoundsOnClick={true}
                      >
                        {searchFilteredPoints.map(p => (
                          <Marker 
                            key={p.id} 
                            position={[p.lat, p.lng]} 
                            icon={createCustomIcon(p.priority, p.isResolved)}
                          >
                            <Popup maxWidth={300} className="custom-popup">
                              <div className="p-2">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-bold text-gray-900 text-base">{p.title || 'Untitled Report'}</h3>
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    p.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                    p.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    p.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {p.priority || 'low'}
                                  </span>
                                </div>
                                <div className="space-y-1 mb-3 text-sm">
                                  <p className="text-gray-600"><span className="font-medium">Category:</span> {p.category || 'N/A'}</p>
                                  <p className="text-gray-600"><span className="font-medium">Status:</span> {p.isResolved ? '✅ Resolved' : '⏳ Pending'}</p>
                                  <p className="text-gray-600"><span className="font-medium">Reported:</span> {new Date(p.createdAt).toLocaleDateString()}</p>
                                  <p className="text-gray-600"><span className="font-medium">Location:</span> {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    onClick={() => navigate(`/report/${p.id}`)}
                                  >
                                    📄 View Details
                                  </button>
                                  <button 
                                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                    onClick={() => { mapRef.current?.setView([p.lat, p.lng], 15); }}
                                  >
                                    🔍
                                  </button>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MarkerClusterGroup>
                    ) : (
                      searchFilteredPoints.map(p => (
                        <Marker 
                          key={p.id} 
                          position={[p.lat, p.lng]} 
                          icon={createCustomIcon(p.priority, p.isResolved)}
                        >
                          <Popup maxWidth={300} className="custom-popup">
                            <div className="p-2">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-bold text-gray-900 text-base">{p.title || 'Untitled Report'}</h3>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  p.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                  p.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  p.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {p.priority || 'low'}
                                </span>
                              </div>
                              <div className="space-y-1 mb-3 text-sm">
                                <p className="text-gray-600"><span className="font-medium">Category:</span> {p.category || 'N/A'}</p>
                                <p className="text-gray-600"><span className="font-medium">Status:</span> {p.isResolved ? '✅ Resolved' : '⏳ Pending'}</p>
                                <p className="text-gray-600"><span className="font-medium">Reported:</span> {new Date(p.createdAt).toLocaleDateString()}</p>
                                <p className="text-gray-600"><span className="font-medium">Location:</span> {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                  onClick={() => navigate(`/report/${p.id}`)}
                                >
                                  📄 View Details
                                </button>
                                <button 
                                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                  onClick={() => { mapRef.current?.setView([p.lat, p.lng], 15); }}
                                >
                                  🔍
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))
                    )}
                  </MapContainer>
                  
                  {/* Map Legend */}
                  {showMapControls && (
                    <div className="absolute bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
                      <h4 className="font-bold text-gray-900 mb-3 text-sm">🎨 Priority Legend</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-600"></div>
                          <span className="text-xs text-gray-700">Critical Priority</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="text-xs text-gray-700">High Priority</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                          <span className="text-xs text-gray-700">Medium Priority</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-700">Low Priority</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-xs text-gray-700">Resolved Reports</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                        <p><strong>View Mode:</strong> {mapView === 'cluster' ? '🗂️ Clustered' : '📌 Individual Markers'}</p>
                        <p className="mt-1"><strong>Layer:</strong> {mapLayer === 'street' ? '🗺️ Street' : mapLayer === 'satellite' ? '🛰️ Satellite' : '🏔️ Terrain'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}