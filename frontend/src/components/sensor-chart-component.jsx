// src/components/sensor-chart-component.jsx
import React from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const SensorChart = ({ 
  data = [], 
  type = 'temperature',
  height = 250,
  showGrid = true,
  showLegend = false,
  chartType = 'area' // 'area' or 'line'
}) => {
  // Chart configuration based on sensor type
  const chartConfigs = {
    temperature: {
      dataKey: 'value',
      stroke: '#f59e0b',
      fill: '#fef3c7',
      strokeWidth: 2,
      label: 'Temperature (°C)',
      domain: ['dataMin - 2', 'dataMax + 2'],
      unit: '°C'
    },
    humidity: {
      dataKey: 'value',
      stroke: '#3b82f6',
      fill: '#dbeafe',
      strokeWidth: 2,
      label: 'Humidity (%)',
      domain: [0, 100],
      unit: '%'
    },
    pressure: {
      dataKey: 'value',
      stroke: '#8b5cf6',
      fill: '#ede9fe',
      strokeWidth: 2,
      label: 'Pressure (hPa)',
      domain: ['dataMin - 10', 'dataMax + 10'],
      unit: 'hPa'
    },
    airQuality: {
      dataKey: 'value',
      stroke: '#10b981',
      fill: '#d1fae5',
      strokeWidth: 2,
      label: 'Air Quality (ppm)',
      domain: [0, 'dataMax + 100'],
      unit: 'ppm'
    },
    light: {
      dataKey: 'value',
      stroke: '#a855f7',
      fill: '#f3e8ff',
      strokeWidth: 2,
      label: 'Light Intensity (lux)',
      domain: [0, 'dataMax + 100'],
      unit: 'lux'
    },
    lightLevel: {
      dataKey: 'value',
      stroke: '#a855f7',
      fill: '#f3e8ff',
      strokeWidth: 2,
      label: 'Light Level (lux)',
      domain: [0, 'dataMax + 100'],
      unit: 'lux'
    }
  };
  
  const config = chartConfigs[type] || chartConfigs.temperature;
  
  // Custom tooltip with improved formatting
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload[0]) {
      const value = payload[0].value;
      const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;
      
      // Additional data from payload if available
      const dataPoint = payload[0].payload;
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Time: {label}</p>
          <p className="text-sm font-semibold" style={{ color: config.stroke }}>
            {formattedValue} {config.unit}
          </p>
          {dataPoint?.device_id && (
            <p className="text-xs text-gray-400 mt-1">
              Device: {dataPoint.device_id.slice(-8)}
            </p>
          )}
          {dataPoint?.timestamp_iran && (
            <p className="text-xs text-gray-400">
              Iran Time: {dataPoint.timestamp_iran}
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  
  // Validate and process data - FIXED VERSION
  const validateData = (rawData) => {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      console.log('SensorChart: No data provided or data is not an array');
      return [];
    }

    console.log('SensorChart: Processing', rawData.length, 'raw data points');
    console.log('SensorChart: Sample raw data:', rawData.slice(0, 2));

    const validData = rawData
      .filter(item => {
        // Check if item has required properties
        if (!item || typeof item !== 'object') {
          console.log('SensorChart: Invalid item object:', item);
          return false;
        }
        
        // Check if value is a valid number
        if (typeof item.value !== 'number' || isNaN(item.value) || !isFinite(item.value)) {
          console.log('SensorChart: Invalid value:', item.value);
          return false;
        }
        
        // Check if time exists and is valid
        if (!item.time || item.time === 'Invalid' || item.time.includes('Invalid')) {
          console.log('SensorChart: Invalid time:', item.time);
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by original timestamp if available, otherwise by time string
        if (a.timestamp && b.timestamp) {
          return new Date(a.timestamp) - new Date(b.timestamp);
        }
        return 0;
      });

    console.log('SensorChart: Valid data points:', validData.length);
    console.log('SensorChart: Sample valid data:', validData.slice(0, 2));
    
    return validData;
  };
  
  // Process and validate the data - no more sample data generation
  const validData = validateData(data);
  
  const ChartComponent = chartType === 'line' ? LineChart : AreaChart;
  const DataComponent = chartType === 'line' ? Line : Area;
  
  // If no data provided, show appropriate message
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">No Data Available</p>
          <p className="text-sm">
            No sensor data found for the selected filters.
          </p>
          <p className="text-xs mt-1 text-gray-400">
            Try adjusting your date range or sensor type filters.
          </p>
        </div>
      </div>
    );
  }
  
  // If data exists but after validation nothing remains, show invalid data message
  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">Invalid Data</p>
          <p className="text-sm">
            The data received contains invalid values.
          </p>
          <p className="text-xs mt-1 text-gray-400">
            Please check your sensors and try again.
          </p>
        </div>
      </div>
    );
  }
  
  // Calculate tick interval for X-axis to prevent overcrowding
  const getXAxisTickInterval = (dataLength) => {
    if (dataLength <= 10) return 0; // Show all ticks
    if (dataLength <= 50) return Math.floor(dataLength / 10);
    return Math.floor(dataLength / 8);
  };

  // Format Y-axis values
  const formatYAxisValue = (value) => {
    if (typeof value === 'number') {
      // Format large numbers
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return value.toFixed(1);
    }
    return value;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent
        data={validData}
        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
      >
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
            vertical={false}
          />
        )}
        <XAxis 
          dataKey="time" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          interval={getXAxisTickInterval(validData.length)}
          angle={validData.length > 20 ? -45 : 0}
          textAnchor={validData.length > 20 ? "end" : "middle"}
          height={validData.length > 20 ? 60 : 30}
        />
        <YAxis 
          domain={config.domain}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={60}
          tickFormatter={formatYAxisValue}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend 
            verticalAlign="top" 
            height={30}
            iconType="line"
            wrapperStyle={{ fontSize: '12px' }}
          />
        )}
        <DataComponent
          type="monotone"
          dataKey={config.dataKey}
          stroke={config.stroke}
          fill={config.fill}
          strokeWidth={config.strokeWidth}
          dot={validData.length <= 20} // Show dots only for smaller datasets
          activeDot={{ r: 4, fill: config.stroke }}
          name={config.label}
          connectNulls={false}
        />
      </ChartComponent>
    </ResponsiveContainer>
  );
};

export default SensorChart;