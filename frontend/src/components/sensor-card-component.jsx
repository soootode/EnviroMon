import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Sun, 
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff
} from 'lucide-react';

const SensorCard = ({ 
  title = 'Sensor', 
  value, 
  unit, 
  trend, 
  lastUpdate, 
  icon, 
  color = 'blue',
  status = 'normal',
  isOnline = false, // پیش‌فرض false است
  deviceName = '',
  timestamp = null
}) => {
  // Safe number formatting function
  const formatNumber = (val, decimals = 1) => {
    if (val === null || val === undefined || val === '' || isNaN(val)) {
      return '0.0';
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      return '0.0';
    }
    return num.toFixed(decimals);
  };

  // Format timestamp for display
  const formatTimestamp = (ts) => {
    if (!ts) return 'No data';
    
    try {
      // Handle different timestamp formats
      let date;
      if (typeof ts === 'string') {
        // If it's already formatted, return as is
        if (ts.includes('AM') || ts.includes('PM') || ts.includes(':')) {
          return ts;
        }
        // If it's ISO string, parse it
        date = new Date(ts + (ts.includes('Z') ? '' : 'Z'));
      } else {
        date = new Date(ts);
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  // Safe values with validation
  const safeValue = formatNumber(value, 1);
  const safeTrend = formatNumber(trend, 1);
  const safeUnit = unit || '';
  // استفاده از lastUpdate که از داشبورد می‌آید (قبلاً محاسبه شده)
  const safeLastUpdate = lastUpdate || 'No data';
  
  // Convert back to numbers for comparisons
  const numericTrend = parseFloat(safeTrend) || 0;
  
  // Icon mapping
  const iconMap = {
    'thermometer': Thermometer,
    'droplets': Droplets,
    'wind': Wind,
    'sun': Sun,
    'gauge': Gauge
  };
  
  const IconComponent = iconMap[icon] || Thermometer;
  
  // Color schemes for different sensor types
  const colorSchemes = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      trend: 'text-yellow-700'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      trend: 'text-blue-700'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      iconBg: 'bg-green-100',
      trend: 'text-green-700'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      iconBg: 'bg-purple-100',
      trend: 'text-purple-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      iconBg: 'bg-red-100',
      trend: 'text-red-700'
    }
  };
  
  const scheme = colorSchemes[color] || colorSchemes.blue;
  
  // Status badge colors - بهبود یافته برای نمایش وضعیت اتصال
  const getStatusInfo = () => {
    // اولویت با وضعیت آنلاین/آفلاین
    if (!isOnline) {
      return {
        color: 'bg-red-100 text-red-700 border border-red-200',
        label: 'Offline',
        icon: WifiOff
      };
    }
    
    // در صورت آنلاین بودن، وضعیت سنسور را نمایش بده
    const statusMap = {
      normal: { 
        color: 'bg-green-100 text-green-700 border border-green-200', 
        label: 'Normal',
        icon: Wifi
      },
      warning: { 
        color: 'bg-yellow-100 text-yellow-700 border border-yellow-200', 
        label: 'Warning',
        icon: Wifi
      },
      critical: { 
        color: 'bg-red-100 text-red-700 border border-red-200', 
        label: 'Critical',
        icon: Wifi
      }
    };
    
    return statusMap[status] || statusMap.normal;
  };
  
  const statusInfo = getStatusInfo();
  
  // Trend icon
  const TrendIcon = numericTrend > 0 ? TrendingUp : numericTrend < 0 ? TrendingDown : Minus;
  
  return (
    <div className={`relative p-4 rounded-lg border ${scheme.bg} ${scheme.border} transition-all hover:shadow-lg ${!isOnline ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${scheme.iconBg} ${!isOnline ? 'opacity-50' : ''}`}>
            <IconComponent className={`w-5 h-5 ${scheme.icon}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
            <p className="text-xs text-gray-400">
              {deviceName || 
               (title === 'Temperature' ? 'DHT22/BMP280' : 
                title === 'Humidity' ? 'DHT22' :
                title === 'Air Quality' ? 'MQ-135' :
                title === 'Light Level' ? 'TEMT6000' : 
                title === 'Pressure' ? 'BMP280' : '')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          {/* Status badge with connection icon */}
          <div className="flex items-center space-x-1">
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <statusInfo.icon className={`w-3 h-3 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>
      </div>
      
      {/* Value Display */}
      <div className="mb-3">
        <div className="flex items-baseline space-x-1">
          <span className={`text-3xl font-bold ${isOnline ? 'text-gray-800' : 'text-gray-400'}`}>
            {safeValue}
          </span>
          <span className={`text-lg ${isOnline ? 'text-gray-500' : 'text-gray-400'}`}>
            {safeUnit}
          </span>
        </div>
        
        {/* Trend - only show if online and trend data available */}
        {isOnline && trend !== null && trend !== undefined && numericTrend !== 0 && (
          <div className="flex items-center space-x-1 mt-1">
            <TrendIcon className={`w-4 h-4 ${numericTrend > 0 ? 'text-green-500' : numericTrend < 0 ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={`text-sm ${numericTrend > 0 ? 'text-green-600' : numericTrend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {numericTrend > 0 ? '+' : ''}{safeTrend}{safeUnit === '°C' || safeUnit === '%' ? safeUnit : ''}
            </span>
          </div>
        )}
        
        {/* No data message when offline */}
        {!isOnline && (
          <div className="flex items-center space-x-1 mt-1">
            <Minus className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">No recent data</span>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="text-xs text-gray-400">
        Last update: <span className={`font-medium ${isOnline ? 'text-gray-600' : 'text-gray-400'}`}>
          {safeLastUpdate}
        </span>
      </div>
      
      {/* Offline overlay indicator */}
      {!isOnline && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      )}
    </div>
  );
};

export default SensorCard;