import React, { useState, useEffect } from 'react';
import { Download, Filter, Calendar, ChevronDown, AlertCircle, RefreshCw, Power } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Mock Devices Data ---
const MOCK_DEVICES = [
  {
    id: 'FC:01:2C:2D:B2:E8',
    name: 'Device 1',
    location: 'Environmental Monitoring Station 1',
    type: 'Weather Sensor',
    icon: '1️⃣',
    color: 'blue',
    status: 'online'
  },
  {
    id: 'ESP32_DEVICE_002', 
    name: 'Device 2',
    location: 'Environmental Monitoring Station 2',
    type: 'Weather Sensor',
    icon: '2️⃣',
    color: 'green',
    status: 'offline'
  },
  {
    id: 'ESP32_DEVICE_003',
    name: 'Device 3',
    location: 'Environmental Monitoring Station 3',
    type: 'Weather Sensor',
    icon: '3️⃣',
    color: 'purple',
    status: 'offline'
  },
  {
    id: 'ESP32_DEVICE_004',
    name: 'Device 4',
    location: 'Environmental Monitoring Station 4',
    type: 'Weather Sensor',
    icon: '4️⃣',
    color: 'orange',
    status: 'offline'
  },
  {
    id: 'ESP32_DEVICE_005',
    name: 'Device 5',
    location: 'Environmental Monitoring Station 5',
    type: 'Weather Sensor',
    icon: '5️⃣',
    color: 'red',
    status: 'offline'
  }
];

const Historical = () => {
  // State management
  const [dateRange, setDateRange] = useState('24'); // Hours
  const [sensorType, setSensorType] = useState('temperature');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(MOCK_DEVICES[0].id);

  // Backend API base URL
  const API_BASE_URL = 'https://enviromon-api.liara.run';

  // Date range options
  const dateRangeOptions = [
    { value: '1', label: 'Last Hour' },
    { value: '6', label: 'Last 6 Hours' },
    { value: '24', label: 'Last 24 Hours' },
    { value: '168', label: 'Last Week' },
    { value: '720', label: 'Last Month' },
    { value: '2160', label: 'Last 3 Months' }
  ];

  // Sensor type options
  const sensorTypeOptions = [
    { value: 'temperature', label: 'Temperature (°C)' },
    { value: 'humidity', label: 'Humidity (%)' },
    { value: 'pressure', label: 'Pressure (hPa)' },
    { value: 'air_quality', label: 'Air Quality (ppm)' },
    { value: 'light_level', label: 'Light Level (lux)' }
  ];

  // Process time format for chart display
  const processTimeForChart = (timestamp, hours) => {
    if (!timestamp) return 'Invalid';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid';
      
      if (hours <= 24) {
        return date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        });
      } else if (hours <= 168) {
        return date.toLocaleDateString([], { 
          month: 'short', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleDateString([], { 
          month: 'short', 
          day: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error processing time:', error);
      return 'Invalid';
    }
  };

  // Check if selected device is offline
  const isDeviceOffline = () => {
    const device = MOCK_DEVICES.find(d => d.id === selectedDevice);
    return device && device.status === 'offline';
  };

  // Fetch historical data from backend
  const fetchHistoricalData = async () => {
    // Check if device is offline
    if (isDeviceOffline()) {
      setError('Device is offline and unavailable');
      setChartData([]);
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching historical data with filters:', {
        hours: dateRange,
        sensorType,
        selectedDevice
      });

      // Only Device 1 can get real data
      if (selectedDevice === 'FC:01:2C:2D:B2:E8') {
        const params = new URLSearchParams();
        params.append('hours', dateRange);
        params.append('limit', '1000');
        params.append('sensor_type', sensorType);
        params.append('device_id', selectedDevice);

        const response = await fetch(`${API_BASE_URL}/api/dashboard/data?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Backend response:', result);
        
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          // Transform real data for chart component
          const transformedData = result.data
            .filter(item => {
              return item && 
                     typeof item.value === 'number' && 
                     !isNaN(item.value) && 
                     isFinite(item.value) &&
                     item.timestamp_utc;
            })
            .map(item => ({
              time: processTimeForChart(item.timestamp_utc, parseInt(dateRange)),
              value: parseFloat(item.value),
              device_id: item.device_id,
              sensor_type: item.sensor_type,
              unit: item.unit,
              timestamp: item.timestamp_utc,
              timestamp_iran: item.timestamp_iran
            }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

          console.log('Transformed real data sample:', transformedData.slice(0, 3));
          console.log('Total real data points:', transformedData.length);

          setChartData(transformedData);

          // Calculate statistics for real data
          if (transformedData.length > 0) {
            const values = transformedData.map(item => item.value);
            const average = values.reduce((sum, val) => sum + val, 0) / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);
            
            setStats({
              average: average.toFixed(1),
              max: max.toFixed(1),
              min: min.toFixed(1),
              count: transformedData.length,
              unit: transformedData[0]?.unit || ''
            });
          } else {
            setError('No data found for this time range');
            setChartData([]);
            setStats(null);
          }
        } else {
          setError('No data found for this time range');
          setChartData([]);
          setStats(null);
        }
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError(`Error fetching data: ${err.message}`);
      setChartData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV export
  const handleExport = async () => {
    try {
      if (isDeviceOffline()) {
        setError('Device is offline and unavailable');
        return;
      }

      if (selectedDevice !== 'FC:01:2C:2D:B2:E8') {
        setError('CSV export is only available for Device 1.');
        return;
      }

      const params = new URLSearchParams();
      params.append('hours', dateRange);
      params.append('sensor_type', sensorType);
      params.append('device_id', selectedDevice);

      const response = await fetch(`${API_BASE_URL}/api/dashboard/export-csv?${params}`);
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `sensor_data_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error exporting data:', err);
      setError(`Error downloading file: ${err.message}`);
    }
  };

  // Get current sensor type for chart
  const getCurrentSensorType = () => {
    return sensorType;
  };

  // Get selected device
  const getSelectedDevice = () => {
    return MOCK_DEVICES.find(d => d.id === selectedDevice);
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    console.log('Filters changed, fetching data...');
    fetchHistoricalData();
  }, [dateRange, sensorType, selectedDevice]);

  // Get selected date range label
  const getDateRangeLabel = () => {
    const option = dateRangeOptions.find(opt => opt.value === dateRange);
    return option ? option.label : 'Custom Range';
  };

  // Get selected sensor type label
  const getSensorTypeLabel = () => {
    const option = sensorTypeOptions.find(opt => opt.value === sensorType);
    return option ? option.label : 'Unknown Sensor';
  };

  const selectedDeviceInfo = getSelectedDevice();
  const deviceOffline = isDeviceOffline();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Historical Data & Analysis</h1>
            <p className="text-sm text-gray-500 mt-1">Analyze trends and export sensor data</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchHistoricalData}
              disabled={loading || deviceOffline}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
            <button
              onClick={handleExport}
              disabled={loading || chartData.length === 0 || deviceOffline}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-700">Data Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Date Range</label>
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                disabled={loading || deviceOffline}
                className="w-full px-4 py-2 pr-10 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Sensor Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Sensor Type</label>
            <div className="relative">
              <select
                value={sensorType}
                onChange={(e) => setSensorType(e.target.value)}
                disabled={loading || deviceOffline}
                className="w-full px-4 py-2 pr-10 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {sensorTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Device Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Device</label>
            <div className="relative">
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 pr-10 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {MOCK_DEVICES.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.name} - {device.location} {device.status === 'offline' ? '(Offline)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Device Status Warning */}
      {deviceOffline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Power className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800 font-medium">Device Offline</p>
          </div>
          <p className="text-yellow-700 mt-1">
            {selectedDeviceInfo?.name} is currently offline and unavailable. Please select another device.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && !deviceOffline && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">Error</p>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Main Chart Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              {getSensorTypeLabel()} - {getDateRangeLabel()} - {selectedDeviceInfo?.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Loading...' : deviceOffline ? 'Device is offline' : `${chartData.length} data points`}
            </p>
          </div>
          
          {stats && !deviceOffline && (
            <div className="flex space-x-6 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Average</p>
                <p className="text-lg font-semibold text-gray-800">
                  {stats.average} {stats.unit}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Max</p>
                <p className="text-lg font-semibold text-red-600">
                  {stats.max} {stats.unit}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Min</p>
                <p className="text-lg font-semibold text-blue-600">
                  {stats.min} {stats.unit}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chart Container */}
        <div className="h-96 w-full">
          {deviceOffline ? (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center space-y-3">
                <Power className="w-16 h-16 text-gray-400" />
                <p className="text-gray-600 font-medium">Device is Offline</p>
                <p className="text-gray-500 text-sm">This device is currently unavailable</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-gray-600">Loading data...</p>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center space-y-3">
                <AlertCircle className="w-16 h-16 text-gray-400" />
                <p className="text-gray-600 font-medium">No Data Found</p>
                <p className="text-gray-500 text-sm">No data available for this time range</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorValue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Data Summary */}
        {!loading && !deviceOffline && chartData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Readings</p>
                <p className="text-lg font-semibold text-gray-800">{stats?.count || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Time Range</p>
                <p className="text-lg font-semibold text-gray-800">{getDateRangeLabel()}</p>
              </div>
              <div>
                <p className="text-gray-500">Sensor Type</p>
                <p className="text-lg font-semibold text-gray-800">
                  {getSensorTypeLabel()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Last Update</p>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Historical;