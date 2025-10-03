import React, { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, Monitor, ChevronDown, Wifi, WifiOff, MapPin } from "lucide-react";

// Import components
import SensorCard from "../components/sensor-card-component";
import SensorChart from "../components/sensor-chart-component";
import GaugeChart from "../components/gauge-chart-component";

// --- Mock Devices Data ---
const MOCK_DEVICES = [
  {
    id: 'FC:01:2C:2D:B2:E8',
    name: 'Device 1',
    location: 'Environmental Monitoring Station 1',
    type: 'Weather Sensor',
    icon: '1️⃣',
    color: 'blue'
  },
  {
    id: 'ESP32_DEVICE_002', 
    name: 'Device 2',
    location: 'Environmental Monitoring Station 2',
    type: 'Weather Sensor',
    icon: '2️⃣',
    color: 'green'
  },
  {
    id: 'ESP32_DEVICE_003',
    name: 'Device 3',
    location: 'Environmental Monitoring Station 3',
    type: 'Weather Sensor',
    icon: '3️⃣',
    color: 'purple'
  },
  {
    id: 'ESP32_DEVICE_004',
    name: 'Device 4',
    location: 'Environmental Monitoring Station 4',
    type: 'Weather Sensor',
    icon: '4️⃣',
    color: 'orange'
  },
  {
    id: 'ESP32_DEVICE_005',
    name: 'Device 5',
    location: 'Environmental Monitoring Station 5',
    type: 'Weather Sensor',
    icon: '5️⃣',
    color: 'red'
  }
];

// --- Time helpers ---
const parseServerDate = (ts) => {
  if (!ts) return null;
  
  try {
    if (typeof ts === 'number' && ts < 2000000000) {
      return new Date(ts * 1000);
    }
    
    const s = String(ts).trim();

    if (s.endsWith('IRST')) {
      const iso = s.replace(' IRST', '').replace(' ', 'T') + '+03:30';
      const date = new Date(iso);
      return isNaN(date.getTime()) ? null : date;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
      const date = new Date(s + 'Z');
      return isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(s);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn('Error parsing date:', ts, error);
    return null;
  }
};

const formatStatsTime = (stats) => {
  const ts = stats?.timestamp_iran || stats?.timestamp_utc;
  const d = parseServerDate(ts);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isSensorOnline = (timestamp) => {
  if (!timestamp) return false;
  
  const sensorTime = parseServerDate(timestamp);
  if (!sensorTime || isNaN(sensorTime.getTime())) return false;
  
  const now = new Date();
  const diffMinutes = (now - sensorTime) / (1000 * 60);
  
  return diffMinutes < 5;
};

const Dashboard = () => {
  // Device Selection State
  const [selectedDevice, setSelectedDevice] = useState(MOCK_DEVICES[0]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [deviceOnlineStatus, setDeviceOnlineStatus] = useState({});

  const [sensorData, setSensorData] = useState({
    temperature: { value: 0, unit: '°C', trend: 0, lastUpdate: 'No data', timestamp: null },
    humidity: { value: 0, unit: '%', trend: 0, lastUpdate: 'No data', timestamp: null },
    airQuality: { value: 0, unit: 'ppm', trend: 0, lastUpdate: 'No data', timestamp: null },
    lightLevel: { value: 0, unit: 'lux', trend: 0, lastUpdate: 'No data', timestamp: null },
    pressure: { value: 0, unit: 'hPa', trend: 0, lastUpdate: 'No data', timestamp: null }
  });
  
  const [chartData, setChartData] = useState({
    temperature: [],
    humidity: []
  });

  const [systemAlerts, setSystemAlerts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({});

  // Function to calculate relative time
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'No data';
    const time = parseServerDate(timestamp);
    if (!time || isNaN(time.getTime())) return 'Invalid time';

    const diff = Math.floor((Date.now() - time.getTime()) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  // Function to calculate trend
  const calculateTrend = (currentValue, previousValue) => {
    if (!previousValue || previousValue === 0) return 0;
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return parseFloat(change.toFixed(1));
  };

  const validateSensorValue = (sensorType, value) => {
    const numValue = parseFloat(value);
    if (!Number.isFinite(numValue)) return null;
    
    const limits = {
      temperature: { min: -50, max: 70 },
      humidity: { min: 0, max: 100 },
      air_quality: { min: 0, max: 5000 },
      light_level: { min: 0, max: 10000 },
      light: { min: 0, max: 10000 },
      pressure: { min: 800, max: 1200 }
    };
    
    const limit = limits[sensorType];
    if (!limit) return numValue;
    
    return Math.max(limit.min, Math.min(limit.max, numValue));
  };

  const getLightStatus = (lightValue) => {
    if (lightValue < 10) return "شب تاریک";
    if (lightValue < 100) return "شب/داخل خانه";
    if (lightValue < 300) return "طلوع/غروب";
    if (lightValue < 800) return "روز ابری";
    if (lightValue < 2000) return "روز آفتابی";
    return "خیلی روشن";
  };

  const getSensorStatus = (sensorType, value) => {
    const numValue = parseFloat(value);
    if (!Number.isFinite(numValue)) return 'normal';
    
    switch(sensorType) {
      case 'temperature':
        if (numValue < 5 || numValue > 40) return 'critical';
        if (numValue < 15 || numValue > 30) return 'warning';
        return 'normal';
      case 'humidity':
        if (numValue < 20 || numValue > 85) return 'critical';
        if (numValue < 30 || numValue > 70) return 'warning';
        return 'normal';
      case 'airQuality':
        if (numValue > 2000) return 'critical';
        if (numValue > 1000) return 'warning';
        return 'normal';
      case 'lightLevel':
        if (numValue < 5 || numValue > 5000) return 'warning';
        return 'normal';
      case 'pressure':
        if (numValue < 980 || numValue > 1050) return 'critical';
        if (numValue < 1000 || numValue > 1030) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const getTimestamp = (item) => {
    return item.timestamp_utc || item.timestamp_iran || item.timestamp;
  };

  // Reset sensor data to offline state
  const resetToOfflineState = () => {
    setSensorData({
      temperature: { value: 0, unit: '°C', trend: 0, lastUpdate: 'Offline', timestamp: null },
      humidity: { value: 0, unit: '%', trend: 0, lastUpdate: 'Offline', timestamp: null },
      airQuality: { value: 0, unit: 'ppm', trend: 0, lastUpdate: 'Offline', timestamp: null },
      lightLevel: { value: 0, unit: 'lux', trend: 0, lastUpdate: 'Offline', timestamp: null },
      pressure: { value: 0, unit: 'hPa', trend: 0, lastUpdate: 'Offline', timestamp: null }
    });
    
    setChartData({
      temperature: [],
      humidity: []
    });
    
    setIsOnline(false);
  };

  // Device Selection Handler
  const handleDeviceChange = (device) => {
    setSelectedDevice(device);
    setShowDeviceSelector(false);
    
    // If not Device 1, reset to offline state immediately
    if (device.id !== 'FC:01:2C:2D:B2:E8') {
      resetToOfflineState();
      setSystemAlerts([{ 
        type: 'warning', 
        message: `${device.name} is offline - no data available`, 
        time: 'Now' 
      }]);
    }
  };

  // Check device online status
  const checkDeviceStatus = async () => {
    const statusMap = {};
    
    for (const device of MOCK_DEVICES) {
      if (device.id === 'FC:01:2C:2D:B2:E8') {
        // Device 1 - Check real backend connection
        try {
          const response = await fetch('https://enviromon-api.liara.run/api/devices');
          statusMap[device.id] = response.ok;
        } catch (error) {
          statusMap[device.id] = false;
        }
      } else {
        // Other devices are offline
        statusMap[device.id] = false;
      }
    }
    
    setDeviceOnlineStatus(statusMap);
  };

  // Fetch system stats
  const fetchStats = async () => {
    try {
      const response = await fetch('https://enviromon-api.liara.run/api/stats');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Use basic stats if API fails
        setStats({
          total_devices: MOCK_DEVICES.length,
          online_devices: Object.values(deviceOnlineStatus).filter(status => status).length,
          total_readings: 0,
          today_readings: 0
        });
      }
    } catch (error) {
      console.warn('Could not fetch stats:', error);
      setStats({
        total_devices: MOCK_DEVICES.length,
        online_devices: Object.values(deviceOnlineStatus).filter(status => status).length,
        total_readings: 0,
        today_readings: 0
      });
    }
  };

  // Fetch data from backend - REAL DATA ONLY
  const fetchData = async () => {
    try {
      console.log('Fetching data for device:', selectedDevice.name);
      
      // Only fetch real data for Device 1
      if (selectedDevice.id === 'FC:01:2C:2D:B2:E8') {
        const response = await fetch('https://enviromon-api.liara.run/api/dashboard/data?limit=50&hours=1');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const { data } = await response.json();
        console.log('Real data received for Device 1:', data);
        setIsOnline(true);
        
        if (!data || data.length === 0) {
          console.log('No real data available');
          setSystemAlerts([{ 
            type: 'info', 
            message: 'No sensor data available from Device 1', 
            time: 'Now' 
          }]);
          resetToOfflineState();
          return;
        }
        
        // Process real sensor data
        const latestReadings = {};
        const tempChartData = [];
        const humiChartData = [];
        
        const sortedData = data.sort((a, b) => {
          const timestampA = getTimestamp(a);
          const timestampB = getTimestamp(b);
          const dateA = parseServerDate(timestampA);
          const dateB = parseServerDate(timestampB);
          if (!dateA || !dateB) return 0;
          return dateA - dateB;
        });
        
        const sensorGroups = {};
        sortedData.forEach(item => {
          const type = item.sensor_type;
          if (!sensorGroups[type]) {
            sensorGroups[type] = [];
          }
          sensorGroups[type].push(item);
        });
        
        Object.keys(sensorGroups).forEach(sensorType => {
          const readings = sensorGroups[sensorType];
          const latest = readings[readings.length - 1];
          const previous = readings.length > 1 ? readings[readings.length - 2] : null;
          
          const timestamp = getTimestamp(latest);
          const validatedValue = validateSensorValue(sensorType, latest.value);
          
          if (validatedValue !== null) {
            latestReadings[sensorType] = {
              value: validatedValue,
              unit: latest.unit,
              timestamp: timestamp,
              trend: previous ? calculateTrend(validatedValue, 
                validateSensorValue(sensorType, previous.value)) : 0
            };
          }
        });
        
        // Update sensor data with real data
        setSensorData({
          temperature: latestReadings.temperature ? {
            value: latestReadings.temperature.value,
            unit: latestReadings.temperature.unit,
            trend: latestReadings.temperature.trend,
            lastUpdate: getRelativeTime(latestReadings.temperature.timestamp),
            timestamp: latestReadings.temperature.timestamp
          } : { value: 0, unit: '°C', trend: 0, lastUpdate: 'No data', timestamp: null },
          
          humidity: latestReadings.humidity ? {
            value: latestReadings.humidity.value,
            unit: latestReadings.humidity.unit,
            trend: latestReadings.humidity.trend,
            lastUpdate: getRelativeTime(latestReadings.humidity.timestamp),
            timestamp: latestReadings.humidity.timestamp
          } : { value: 0, unit: '%', trend: 0, lastUpdate: 'No data', timestamp: null },
          
          airQuality: latestReadings.air_quality ? {
            value: latestReadings.air_quality.value,
            unit: latestReadings.air_quality.unit,
            trend: latestReadings.air_quality.trend,
            lastUpdate: getRelativeTime(latestReadings.air_quality.timestamp),
            timestamp: latestReadings.air_quality.timestamp
          } : { value: 0, unit: 'ppm', trend: 0, lastUpdate: 'No data', timestamp: null },
          
          lightLevel: (latestReadings.light_level || latestReadings.light) ? {
            value: (latestReadings.light_level || latestReadings.light).value,
            unit: (latestReadings.light_level || latestReadings.light).unit,
            trend: (latestReadings.light_level || latestReadings.light).trend,
            lastUpdate: getRelativeTime((latestReadings.light_level || latestReadings.light).timestamp),
            timestamp: (latestReadings.light_level || latestReadings.light).timestamp
          } : { value: 0, unit: 'lux', trend: 0, lastUpdate: 'No data', timestamp: null },
          
          pressure: latestReadings.pressure ? {
            value: latestReadings.pressure.value,
            unit: latestReadings.pressure.unit,
            trend: latestReadings.pressure.trend,
            lastUpdate: getRelativeTime(latestReadings.pressure.timestamp),
            timestamp: latestReadings.pressure.timestamp
          } : { value: 0, unit: 'hPa', trend: 0, lastUpdate: 'No data', timestamp: null }
        });
        
        // Generate real chart data
        if (sensorGroups.temperature) {
          sensorGroups.temperature.forEach(item => {
            const iranTime = item.timestamp_iran || item.timestamp_persian;
            let timeLabel;
            
            if (iranTime) {
              const time = parseServerDate(iranTime);
              timeLabel = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Invalid';
            } else {
              const utcTime = parseServerDate(getTimestamp(item));
              if (utcTime) {
                const iranTime = new Date(utcTime.getTime() + (3.5 * 60 * 60 * 1000));
                timeLabel = iranTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } else {
                timeLabel = 'Invalid';
              }
            }
            
            const validValue = validateSensorValue('temperature', item.value);
            if (timeLabel !== 'Invalid' && validValue !== null) {
              tempChartData.push({ time: timeLabel, value: validValue });
            }
          });
        }
        
        if (sensorGroups.humidity) {
          sensorGroups.humidity.forEach(item => {
            const iranTime = item.timestamp_iran || item.timestamp_persian;
            let timeLabel;
            
            if (iranTime) {
              const time = parseServerDate(iranTime);
              timeLabel = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Invalid';
            } else {
              const utcTime = parseServerDate(getTimestamp(item));
              if (utcTime) {
                const iranTime = new Date(utcTime.getTime() + (3.5 * 60 * 60 * 1000));
                timeLabel = iranTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } else {
                timeLabel = 'Invalid';
              }
            }
            
            const validValue = validateSensorValue('humidity', item.value);
            if (timeLabel !== 'Invalid' && validValue !== null) {
              humiChartData.push({ time: timeLabel, value: validValue });
            }
          });
        }
        
        setChartData({
          temperature: tempChartData.slice(-30),
          humidity: humiChartData.slice(-30)
        });
        
        // Generate alerts for real data
        const realAlerts = [];
        
        if (latestReadings.temperature) {
          const tempStatus = getSensorStatus('temperature', latestReadings.temperature.value);
          if (tempStatus === 'critical') {
            realAlerts.push({
              type: 'critical',
              message: `Temperature ${latestReadings.temperature.value < 5 ? 'too low' : 'too high'}: ${latestReadings.temperature.value.toFixed(1)}°C`,
              time: 'Now'
            });
          }
        }
        
        if (latestReadings.humidity) {
          const humidityStatus = getSensorStatus('humidity', latestReadings.humidity.value);
          if (humidityStatus === 'critical') {
            realAlerts.push({
              type: 'critical',
              message: `Humidity ${latestReadings.humidity.value < 20 ? 'too low' : 'too high'}: ${latestReadings.humidity.value.toFixed(1)}%`,
              time: 'Now'
            });
          }
        }
        
        setSystemAlerts(realAlerts);
        
      } else {
        // Other devices - set offline state
        resetToOfflineState();
        setSystemAlerts([{ 
          type: 'warning', 
          message: `${selectedDevice.name} is offline - no data available`, 
          time: 'Now' 
        }]);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsOnline(false);
      resetToOfflineState();
      setSystemAlerts([{ 
        type: 'error', 
        message: `Connection to ${selectedDevice.name} failed: ${error.message}`, 
        time: 'Now' 
      }]);
    }
  };

  // Initial setup
  useEffect(() => {
    checkDeviceStatus();
    handleDeviceChange(MOCK_DEVICES[0]);
  }, []);

  useEffect(() => {
    fetchData();
    fetchStats();
    
    const interval = setInterval(fetchData, 5000);
    const statusInterval = setInterval(checkDeviceStatus, 15000);
    const statsInterval = setInterval(fetchStats, 30000);
    
    const timeInterval = setInterval(() => {
      setSensorData(prev => ({
        ...prev,
        temperature: { ...prev.temperature, lastUpdate: getRelativeTime(prev.temperature.timestamp) },
        humidity: { ...prev.humidity, lastUpdate: getRelativeTime(prev.humidity.timestamp) },
        airQuality: { ...prev.airQuality, lastUpdate: getRelativeTime(prev.airQuality.timestamp) },
        lightLevel: { ...prev.lightLevel, lastUpdate: getRelativeTime(prev.lightLevel.timestamp) },
        pressure: { ...prev.pressure, lastUpdate: getRelativeTime(prev.pressure.timestamp) }
      }));
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
      clearInterval(statsInterval);
      clearInterval(timeInterval);
    };
  }, [selectedDevice]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    await fetchStats();
    setLastRefresh(new Date());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with Device Selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Real-time Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Live environmental sensor monitoring 
              {stats.timestamp_iran && (
                <span className="ml-2">• Last update: {formatStatsTime(stats)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Device Selector */}
            <div className="relative">
              <button
                onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                className={`flex items-center space-x-3 px-4 py-2 bg-white border-2 rounded-lg transition-all ${
                  selectedDevice.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                  selectedDevice.color === 'green' ? 'border-green-200 bg-green-50' :
                  selectedDevice.color === 'purple' ? 'border-purple-200 bg-purple-50' :
                  selectedDevice.color === 'orange' ? 'border-orange-200 bg-orange-50' :
                  'border-red-200 bg-red-50'
                } hover:shadow-md`}
              >
                <span className="text-xl">{selectedDevice.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-800">{selectedDevice.name}</div>
                  <div className="text-xs text-gray-500">{selectedDevice.location}</div>
                </div>
                <div className="flex items-center space-x-1">
                  {deviceOnlineStatus[selectedDevice.id] !== false ? (
                    <Wifi className="w-3 h-3 text-green-500" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-red-500" />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </button>

              {/* Dropdown Menu */}
              {showDeviceSelector && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-sm font-semibold text-gray-700">Select Device</div>
                    <div className="text-xs text-gray-500">Choose a device to monitor</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {MOCK_DEVICES.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => handleDeviceChange(device)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          selectedDevice.id === device.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <span className="text-lg">{device.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-800">{device.name}</div>
                          <div className="text-xs text-gray-500">{device.location}</div>
                          <div className="text-xs text-gray-400">{device.type}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {deviceOnlineStatus[device.id] !== false ? (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-green-600">Online</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-xs text-red-600">Offline</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-gray-500">Total Devices</div>
            <div className="text-xl font-bold text-gray-800">{stats.total_devices || 0}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-gray-500">Online Devices</div>
            <div className="text-xl font-bold text-green-600">{stats.online_devices || 0}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-gray-500">Total Readings</div>
            <div className="text-xl font-bold text-blue-600">{stats.total_readings || 0}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-gray-500">Today's Readings</div>
            <div className="text-xl font-bold text-purple-600">{stats.today_readings || 0}</div>
          </div>
        </div>

        {/* Selected Device Info */}
        <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{selectedDevice.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800">{selectedDevice.name}</h3>
                <p className="text-sm text-gray-500">{selectedDevice.location} • {selectedDevice.type}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{selectedDevice.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <SensorCard
          title="Temperature"
          value={sensorData.temperature.value}
          unit={sensorData.temperature.unit}
          trend={sensorData.temperature.trend}
          lastUpdate={sensorData.temperature.lastUpdate}
          icon="thermometer"
          color="yellow"
          status={getSensorStatus('temperature', sensorData.temperature.value)}
          isOnline={isSensorOnline(sensorData.temperature.timestamp)}
        />
        
        <SensorCard
          title="Humidity"
          value={sensorData.humidity.value}
          unit={sensorData.humidity.unit}
          trend={sensorData.humidity.trend}
          lastUpdate={sensorData.humidity.lastUpdate}
          icon="droplets"
          color="blue"
          status={getSensorStatus('humidity', sensorData.humidity.value)}
          isOnline={isSensorOnline(sensorData.humidity.timestamp)}
        />
        
        <SensorCard
          title="Air Quality"
          value={sensorData.airQuality.value}
          unit={sensorData.airQuality.unit}
          trend={sensorData.airQuality.trend}
          lastUpdate={sensorData.airQuality.lastUpdate}
          icon="wind"
          color="green"
          status={getSensorStatus('airQuality', sensorData.airQuality.value)}
          isOnline={isSensorOnline(sensorData.airQuality.timestamp)}
        />
        
        <SensorCard
          title="Light Level"
          value={sensorData.lightLevel.value}
          unit={sensorData.lightLevel.unit}
          trend={sensorData.lightLevel.trend}
          lastUpdate={sensorData.lightLevel.lastUpdate}
          icon="sun"
          color="purple"
          status={getSensorStatus('lightLevel', sensorData.lightLevel.value)}
          isOnline={isSensorOnline(sensorData.lightLevel.timestamp)}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Temperature Trends (°C)</h3>
            <span className="text-xs text-gray-400">
              Live data ({chartData.temperature.length} points)
            </span>
          </div>
          <SensorChart data={chartData.temperature} type="temperature" />
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Humidity Levels (%)</h3>
            <span className="text-xs text-gray-400">
              Live data ({chartData.humidity.length} points)
            </span>
          </div>
          <SensorChart data={chartData.humidity} type="humidity" />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Air Quality Gauge */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Air Quality Monitor</h3>
          <GaugeChart 
            value={sensorData.airQuality.value || 0} 
            min={0}
            max={3000}
            unit="ppm"
            sensorType="airQuality"
            label="Air Quality"
            showValue={true}
            showScale={true}
            showStatus={true}
          />
          <div className="mt-4 text-center text-sm text-gray-500">
            Normal range: 0-1000 ppm
          </div>
          <div className="mt-2 text-center text-xs text-gray-400">
            Last update: {sensorData.airQuality.lastUpdate}
          </div>
        </div>

        {/* Light Level Monitor */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Light Level Monitor</h3>
          <GaugeChart 
            value={sensorData.lightLevel.value || 0} 
            min={0}
            max={3000}
            unit="lux"
            sensorType="light" 
            label="Light"
            showValue={true}
            showScale={true}
            showStatus={true}
          />
          <div className="mt-4 text-center text-sm text-gray-500">
            وضعیت: {getLightStatus(sensorData.lightLevel.value)}
          </div>
          <div className="mt-2 text-center text-xs text-gray-400">
            Last update: {sensorData.lightLevel.lastUpdate}
          </div>
        </div>
      </div>

      {/* Click outside to close device selector */}
      {showDeviceSelector && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDeviceSelector(false)}
        ></div>
      )}
    </div>
  );
};

export default Dashboard;