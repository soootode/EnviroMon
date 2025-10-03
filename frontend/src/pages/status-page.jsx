import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Wifi, WifiOff, MapPin, AlertTriangle, CheckCircle, XCircle, TrendingUp, X, Zap, ChevronDown } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Mock Devices Data ---
const MOCK_DEVICES = [
  {
    id: 'FC:01:2C:2D:B2:E8',
    name: 'Device 1',
    location: 'Environmental Monitoring Station 1',
    type: 'Weather Sensor',
    icon: '1️⃣',
    color: 'blue',
    gps: { lat: 35.5731, lng: 53.3933 },
    sensors: ['DHT22', 'BMP280', 'MQ135', 'TEMT6000']
  },
  {
    id: 'ESP32_DEVICE_002', 
    name: 'Device 2',
    location: 'Environmental Monitoring Station 2',
    type: 'Weather Sensor',
    icon: '2️⃣',
    color: 'green',
    gps: { lat: 35.6892, lng: 51.3890 },
    sensors: ['DHT22', 'BMP280', 'MQ135', 'TEMT6000']
  },
  {
    id: 'ESP32_DEVICE_003',
    name: 'Device 3',
    location: 'Environmental Monitoring Station 3',
    type: 'Weather Sensor',
    icon: '3️⃣',
    color: 'purple',
    gps: { lat: 32.6546, lng: 51.6680 },
    sensors: ['DHT22', 'BMP280', 'MQ135', 'TEMT6000']
  },
  {
    id: 'ESP32_DEVICE_004',
    name: 'Device 4',
    location: 'Environmental Monitoring Station 4',
    type: 'Weather Sensor',
    icon: '4️⃣',
    color: 'orange',
    gps: { lat: 36.2974, lng: 59.6062 },
    sensors: ['DHT22', 'BMP280', 'MQ135', 'TEMT6000']
  },
  {
    id: 'ESP32_DEVICE_005',
    name: 'Device 5',
    location: 'Environmental Monitoring Station 5',
    type: 'Weather Sensor',
    icon: '5️⃣',
    color: 'red',
    gps: { lat: 29.5918, lng: 52.5836 },
    sensors: ['DHT22', 'BMP280', 'MQ135', 'TEMT6000']
  }
];

const SENSOR_TYPES = {
  'DHT22': {
    name: 'DHT22',
    type: 'Temperature & Humidity',
    icon: '🌡️',
    sensorKeys: ['temperature', 'humidity']
  },
  'BMP280': {
    name: 'BMP280',
    type: 'Pressure & Temperature',
    icon: '📘',
    sensorKeys: ['pressure', 'temperature']
  },
  'MQ135': {
    name: 'MQ135',
    type: 'Air Quality Monitor',
    icon: '💨',
    sensorKeys: ['air_quality']
  },
  'TEMT6000': {
    name: 'TEMT6000',
    type: 'Light Intensity',
    icon: '☀️',
    sensorKeys: ['light_level', 'light']
  }
};

const API_BASE = 'https://enviromon-api.liara.run/api';
const MIN_REQUEST_INTERVAL = 2000;
const FETCH_INTERVAL = 20000;
const STATUS_CHECK_INTERVAL = 30000;
const MAX_ALERTS = 5;

const Status = () => {
  const [selectedDevice, setSelectedDevice] = useState(MOCK_DEVICES[0]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [deviceOnlineStatus, setDeviceOnlineStatus] = useState({});
  const [sensors, setSensors] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [systemStats, setSystemStats] = useState({
    uptime: '99.8%',
    dataPoints: 0,
    networkLatency: '12ms',
    onlineDevices: 0,
    totalDevices: 5
  });
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);

  const initializeSensorsForDevice = useCallback((device) => {
    const deviceSensors = device.sensors.map(sensorId => ({
      id: sensorId,
      name: SENSOR_TYPES[sensorId].name,
      type: SENSOR_TYPES[sensorId].type,
      status: 'offline',
      lastUpdate: 'Never',
      icon: SENSOR_TYPES[sensorId].icon,
      location: device.gps,
      deviceId: device.id,
      sensorKeys: SENSOR_TYPES[sensorId].sensorKeys
    }));
    
    setSensors(deviceSensors);
  }, []);

  const handleDeviceChange = useCallback((device) => {
    setSelectedDevice(device);
    setShowDeviceSelector(false);
    initializeSensorsForDevice(device);
    
    addAlert({
      type: 'info',
      message: `Switched to monitoring ${device.name}`,
      time: new Date().toLocaleString()
    });
  }, [initializeSensorsForDevice]);

  const addAlert = useCallback((newAlert) => {
    const alertWithId = { 
      ...newAlert, 
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
    };
    
    setSystemAlerts(prevAlerts => {
      const updatedAlerts = [...prevAlerts, alertWithId];
      return updatedAlerts.length > MAX_ALERTS ? updatedAlerts.slice(-MAX_ALERTS) : updatedAlerts;
    });
  }, []);

  const removeAlert = useCallback((alertId) => {
    setSystemAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setSystemAlerts([]);
  }, []);

  const makeThrottledRequest = useCallback(async (url, options = {}) => {
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL || requestInProgress) {
      return null;
    }

    setRequestInProgress(true);
    setLastRequestTime(now);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Request error:', error);
      }
      return null;
    } finally {
      setRequestInProgress(false);
    }
  }, [requestInProgress, lastRequestTime]);

  const checkDeviceStatus = useCallback(async () => {
    if (requestInProgress) return;

    try {
      const response = await makeThrottledRequest(`${API_BASE}/devices`);
      if (!response) return;

      if (response.ok) {
        const data = await response.json();
        const statusMap = {};
        
        MOCK_DEVICES.forEach(device => {
          if (device.id === 'FC:01:2C:2D:B2:E8') {
            const deviceExists = data.devices && data.devices.some(d => d.id === device.id);
            statusMap[device.id] = deviceExists;
          } else {
            statusMap[device.id] = false;
          }
        });
        
        setDeviceOnlineStatus(statusMap);
      }
    } catch (error) {
      console.error('Error checking device status:', error);
    }
  }, [requestInProgress, makeThrottledRequest]);

  const fetchSensorStatus = useCallback(async () => {
    if (requestInProgress) return;

    try {
      if (selectedDevice.id === 'FC:01:2C:2D:B2:E8') {
        const devicesResponse = await makeThrottledRequest(`${API_BASE}/devices`);
        if (!devicesResponse) return;

        if (devicesResponse.ok) {
          const devicesData = await devicesResponse.json();
          
          setSystemStats(prev => ({
            ...prev,
            onlineDevices: devicesData.online_devices || 0,
            totalDevices: devicesData.count || 5
          }));

          const deviceExists = devicesData.devices && 
            devicesData.devices.some(d => d.id === selectedDevice.id);
          
          setDeviceOnlineStatus(prev => ({
            ...prev,
            [selectedDevice.id]: deviceExists
          }));

          if (deviceExists) {
            setTimeout(async () => {
              const statusResponse = await makeThrottledRequest(`${API_BASE}/devices/${selectedDevice.id}/status`);
              if (statusResponse && statusResponse.ok) {
                const deviceStatus = await statusResponse.json();
                
                if (deviceStatus.sensors) {
                  const updatedSensors = sensors.map(sensor => {
                    let matchingSensorData = null;
                    let matchedSensorType = '';
                    
                    if (sensor.id === 'DHT22') {
                      matchingSensorData = deviceStatus.sensors['temperature'] || deviceStatus.sensors['humidity'];
                      matchedSensorType = deviceStatus.sensors['temperature'] ? 'temperature' : 'humidity';
                    } else if (sensor.id === 'BMP280') {
                      matchingSensorData = deviceStatus.sensors['pressure'];
                      matchedSensorType = 'pressure';
                    } else if (sensor.id === 'MQ135') {
                      matchingSensorData = deviceStatus.sensors['air_quality'];
                      matchedSensorType = 'air_quality';
                    } else if (sensor.id === 'TEMT6000') {
                      matchingSensorData = deviceStatus.sensors['light_level'] || deviceStatus.sensors['light'];
                      matchedSensorType = deviceStatus.sensors['light_level'] ? 'light_level' : 'light';
                    }

                    if (matchingSensorData) {
                      const wasOffline = sensor.status === 'offline';
                      let isOnline = matchingSensorData.is_online;
                      
                      if (matchedSensorType === 'pressure' && matchingSensorData.value === 0) {
                        isOnline = false;
                      }
                      
                      if (wasOffline && isOnline) {
                        addAlert({
                          type: 'info',
                          message: `${sensor.name} is back online in ${selectedDevice.name}`,
                          time: new Date().toLocaleString()
                        });
                      } else if (!wasOffline && !isOnline) {
                        addAlert({
                          type: 'warning',
                          message: `${sensor.name} went offline in ${selectedDevice.name}`,
                          time: new Date().toLocaleString()
                        });
                      }

                      return {
                        ...sensor,
                        status: isOnline ? 'online' : 'offline',
                        lastUpdate: matchingSensorData.timestamp_iran || matchingSensorData.timestamp_formatted || 'Just now',
                        sensorType: matchedSensorType,
                        value: matchingSensorData.value,
                        unit: matchingSensorData.unit
                      };
                    }
                    
                    return {
                      ...sensor,
                      status: 'offline',
                      lastUpdate: 'No data available'
                    };
                  });
                  
                  setSensors(updatedSensors);
                }
              }
            }, 1000);
          } else {
            const offlineSensors = sensors.map(sensor => ({
              ...sensor,
              status: 'offline',
              lastUpdate: 'Device is offline'
            }));
            setSensors(offlineSensors);
          }
        }
      } else {
        const updatedSensors = sensors.map(sensor => ({
          ...sensor,
          status: 'offline',
          lastUpdate: 'Simulated - Device Offline'
        }));
        setSensors(updatedSensors);
        
        setDeviceOnlineStatus(prev => ({
          ...prev,
          [selectedDevice.id]: false
        }));
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [selectedDevice, sensors, requestInProgress, makeThrottledRequest, addAlert]);

  useEffect(() => {
    initializeSensorsForDevice(selectedDevice);
    checkDeviceStatus();
  }, [selectedDevice, initializeSensorsForDevice, checkDeviceStatus]);

  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      fetchSensorStatus();
    }, 2000);

    const fetchInterval = setInterval(fetchSensorStatus, FETCH_INTERVAL);
    const statusInterval = setInterval(() => {
      if (selectedDevice.id === 'FC:01:2C:2D:B2:E8') {
        checkDeviceStatus();
      }
    }, STATUS_CHECK_INTERVAL);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(fetchInterval);
      clearInterval(statusInterval);
    };
  }, [fetchSensorStatus, checkDeviceStatus, selectedDevice.id]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBgColor = (status) => {
    switch(status) {
      case 'online': return 'bg-green-50 border-green-200';
      case 'offline': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const nextUpdateCountdown = useMemo(() => {
    return Math.max(0, Math.ceil((FETCH_INTERVAL - (Date.now() - lastRequestTime)) / 1000));
  }, [lastRequestTime]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">System Status Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor sensor locations and system health</p>
            {requestInProgress && (
              <p className="text-xs text-blue-500 mt-1">🔄 Fetching data...</p>
            )}
          </div>
          
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
                {deviceOnlineStatus[selectedDevice.id] ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </button>

            {showDeviceSelector && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-700">Select Device</div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {MOCK_DEVICES.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => handleDeviceChange(device)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 ${
                        selectedDevice.id === device.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="text-lg">{device.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{device.name}</div>
                        <div className="text-xs text-gray-500">{device.location}</div>
                      </div>
                      {deviceOnlineStatus[device.id] ? (
                        <span className="text-xs text-green-600">Online</span>
                      ) : (
                        <span className="text-xs text-red-600">Offline</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Wifi className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-700">Sensor Status - {selectedDevice.name}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sensors.map((sensor) => (
            <div key={sensor.id} className={`p-4 bg-white rounded-lg border ${getStatusBgColor(sensor.status)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{sensor.icon}</span>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(sensor.status)}`}></div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${
                  sensor.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {sensor.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <h3 className="font-semibold text-gray-800 mb-1">{sensor.name}</h3>
              <p className="text-xs text-gray-500 mb-2">{sensor.type}</p>
              <p className="text-xs text-gray-400">Last update: {sensor.lastUpdate}</p>
              {sensor.value !== undefined && (
                <p className="text-xs text-green-600 mt-1">Value: {sensor.value} {sensor.unit}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-700">Device Location - {selectedDevice.name}</h2>
            </div>
          </div>
          
          <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
            <MapContainer 
              center={[selectedDevice.gps.lat, selectedDevice.gps.lng]} 
              zoom={14} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
              key={selectedDevice.id}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[selectedDevice.gps.lat, selectedDevice.gps.lng]}>
                <Popup>
                  <div style={{ padding: '8px', minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                      {selectedDevice.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                      {selectedDevice.location}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                      Status: <span style={{ color: deviceOnlineStatus[selectedDevice.id] ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                        {deviceOnlineStatus[selectedDevice.id] ? 'Online' : 'Offline'}
                      </span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg z-[1000]">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">{sensors.filter(s => s.status === 'online').length} Active</span>
              </div>
              <div className="flex items-center space-x-2 text-sm mt-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">{sensors.filter(s => s.status === 'offline').length} Offline</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-700">Alerts</h2>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {systemAlerts.length}/{MAX_ALERTS}
              </span>
              {systemAlerts.length > 0 && (
                <button
                  onClick={clearAllAlerts}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
          
          {systemAlerts.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {systemAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${
                  alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      {alert.type === 'critical' ? (
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                      ) : alert.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          alert.type === 'critical' ? 'text-red-800' :
                          alert.type === 'warning' ? 'text-orange-800' :
                          'text-blue-800'
                        }`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">No active alerts</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">System Uptime</p>
              <p className="text-lg font-bold text-gray-800">{systemStats.uptime}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Data Points Today</p>
              <p className="text-lg font-bold text-gray-800">{systemStats.dataPoints.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Network Latency</p>
              <p className="text-lg font-bold text-gray-800">{systemStats.networkLatency}</p>
            </div>
            <Wifi className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {showDeviceSelector && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDeviceSelector(false)}
        ></div>
      )}
    </div>
  );
};

export default Status;