// src/components/GaugeChart.jsx
import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const GaugeChart = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  unit = '', 
  label = '',
  sensorType = 'generic', // نوع سنسور برای محدوده‌های هوشمند
  height = 180,
  showValue = true,
  showScale = true,
  showStatus = true, // نمایش وضعیت
  colorRanges = null // Custom color ranges
}) => {
  // دیباگ - نمایش داده‌های دریافتی
  console.log('GaugeChart props:', { value, min, max, unit, label, sensorType });
  
  // تنظیمات هوشمند بر اساس نوع سنسور - اصلاح شده
  const getSensorConfig = (type, val) => {
    switch(type) {
      case 'pressure':
        return {
          min: 800, // اصلاح شده: محدوده واقعی‌تر
          max: 1050, // اصلاح شده: محدوده واقعی‌تر
          unit: 'hPa',
          ranges: [
            { min: 800, max: 1000, color: '#f59e0b', status: 'فشار کم' },
            { min: 1000, max: 1030, color: '#10b981', status: 'عادی' },
            { min: 1030, max: 1050, color: '#f59e0b', status: 'فشار بالا' }
          ]
        };
      case 'airQuality':
        return {
          min: 0,
          max: 3000,
          unit: 'ppm',
          ranges: [
            { min: 0, max: 400, color: '#10b981', status: 'عالی' },
            { min: 400, max: 1000, color: '#84cc16', status: 'خوب' },
            { min: 1000, max: 2000, color: '#f59e0b', status: 'متوسط' },
            { min: 2000, max: 3000, color: '#ef4444', status: 'ضعیف' }
          ]
        };
      case 'light': // اضافه کردن نوع light
        return {
          min: 0,
          max: 3000,
          unit: 'lux',
          ranges: [
            { min: 0, max: 100, color: '#1e293b', status: 'تاریک' },
            { min: 100, max: 500, color: '#475569', status: 'کم نور' },
            { min: 500, max: 1500, color: '#fbbf24', status: 'نور متوسط' },
            { min: 1500, max: 3000, color: '#f59e0b', status: 'نور زیاد' }
          ]
        };
      case 'temperature':
        return {
          min: -10,
          max: 50,
          unit: '°C',
          ranges: [
            { min: -10, max: 10, color: '#3b82f6', status: 'سرد' },
            { min: 10, max: 30, color: '#10b981', status: 'مطبوع' },
            { min: 30, max: 50, color: '#ef4444', status: 'گرم' }
          ]
        };
      case 'humidity':
        return {
          min: 0,
          max: 100,
          unit: '%',
          ranges: [
            { min: 0, max: 30, color: '#f59e0b', status: 'خشک' },
            { min: 30, max: 70, color: '#10b981', status: 'مطبوع' },
            { min: 70, max: 100, color: '#3b82f6', status: 'مرطوب' }
          ]
        };
      default:
        return {
          min: min,
          max: max,
          unit: unit,
          ranges: [
            { min: min, max: max * 0.6, color: '#10b981', status: 'خوب' },
            { min: max * 0.6, max: max * 0.8, color: '#f59e0b', status: 'هشدار' },
            { min: max * 0.8, max: max, color: '#ef4444', status: 'بحرانی' }
          ]
        };
    }
  };

  const config = getSensorConfig(sensorType, value);
  const gaugeMin = min !== 0 ? min : config.min;
  const gaugeMax = max !== 100 ? max : config.max;
  const gaugeUnit = unit || config.unit;

  // اصلاح شده: اعتبارسنجی بهتر مقدار
  const raw = Number(value);
  const numericValue = Number.isFinite(raw) ? raw : 0;
  
  // اطمینان از قرار گیری مقدار در محدوده - اصلاح شده
  const clampedValue = Math.max(gaugeMin, Math.min(gaugeMax, numericValue));
  
  // محاسبه درصد با توجه به محدوده درست - اصلاح شده
  const percentage = gaugeMax > gaugeMin ? 
    Math.max(0, Math.min(100, ((clampedValue - gaugeMin) / (gaugeMax - gaugeMin)) * 100)) : 0;

  console.log('Gauge calculation:', { 
    numericValue, 
    clampedValue,
    gaugeMin, 
    gaugeMax, 
    percentage,
    sensorType 
  });

  // پیدا کردن رنگ و وضعیت بر اساس مقدار - اصلاح شده
  const getCurrentStatus = () => {
    const currentValue = clampedValue; // استفاده از مقدار محدود شده
    
    if (colorRanges) {
      for (const range of colorRanges) {
        if (currentValue >= range.min && currentValue <= range.max) {
          return { color: range.color, status: range.status || 'عادی' };
        }
      }
    }
    
    // بررسی محدوده‌های پیش‌فرض
    for (const range of config.ranges) {
      if (currentValue >= range.min && currentValue < range.max) {
        return { color: range.color, status: range.status };
      }
    }
    
    // برای آخرین محدوده
    const lastRange = config.ranges[config.ranges.length - 1];
    if (currentValue >= lastRange.min) {
      return { color: lastRange.color, status: lastRange.status };
    }
    
    // اگر مقدار خارج از محدوده است
    return { color: '#6b7280', status: 'نامشخص' };
  };

  const currentStatus = getCurrentStatus();
  const needleColor = currentStatus.color;

  // آیکون وضعیت
  const getStatusIcon = (status) => {
    if (status.includes('عادی') || status.includes('خوب') || status.includes('عالی') || status.includes('مطبوع')) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (status.includes('هشدار') || status.includes('متوسط') || status.includes('بالا') || status.includes('کم')) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  // محاسبه نشانه‌های مقیاس - نیم دایره
  const scaleMarks = [];
  const numMarks = 5;
  for (let i = 0; i <= numMarks; i++) {
    const markValue = gaugeMin + (gaugeMax - gaugeMin) * (i / numMarks);
    scaleMarks.push({
      value: markValue
    });
  }

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ height: `${height}px` }}>
      <svg 
        viewBox="0 0 200 100" 
        className="w-full h-full"
        style={{ maxWidth: '300px' }}
      >
        {/* Background arc - نیم دایره */}
        <path
          d="M 20 80 A 80 80 0 0 1 180 80"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Color ranges arc - نیم دایره */}
        {config.ranges.map((range, index) => {
          const startPercent = Math.max(0, ((range.min - gaugeMin) / (gaugeMax - gaugeMin)) * 100);
          const endPercent = Math.min(100, ((range.max - gaugeMin) / (gaugeMax - gaugeMin)) * 100);
          const startAngle = (startPercent / 100) * 180;
          const endAngle = (endPercent / 100) * 180;
          
          if (endPercent <= startPercent) return null;
          
          const startX = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
          const startY = 80 - 80 * Math.sin((startAngle * Math.PI) / 180);
          const endX = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
          const endY = 80 - 80 * Math.sin((endAngle * Math.PI) / 180);
          
          return (
            <path
              key={index}
              d={`M ${startX} ${startY} A 80 80 0 ${endPercent - startPercent > 50 ? 1 : 0} 0 ${endX} ${endY}`}
              fill="none"
              stroke={range.color}
              strokeWidth="12"
              strokeLinecap="round"
              opacity="0.4"
            />
          );
        })}
        
        {/* Scale marks - نیم دایره */}
        {showScale && scaleMarks.map((mark, i) => {
          const angle = (mark.value - gaugeMin) / (gaugeMax - gaugeMin) * 180;
          const x1 = 100 + 70 * Math.cos((angle * Math.PI) / 180);
          const y1 = 80 - 70 * Math.sin((angle * Math.PI) / 180);
          const x2 = 100 + 80 * Math.cos((angle * Math.PI) / 180);
          const y2 = 80 - 80 * Math.sin((angle * Math.PI) / 180);
          const labelX = 100 + 90 * Math.cos((angle * Math.PI) / 180);
          const labelY = 80 - 90 * Math.sin((angle * Math.PI) / 180);
          
          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#9ca3af"
                strokeWidth="1"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-gray-500"
                style={{ fontSize: '8px' }}
              >
                {Math.round(mark.value)}
              </text>
            </g>
          );
        })}
        
        {/* Center circle */}
        <circle cx="100" cy="80" r="6" fill={needleColor} />
        
        {/* Needle - نیم دایره */}
        <line
          x1="100"
          y1="80"
          x2={100 + 65 * Math.cos((percentage / 100 * 180) * Math.PI / 180)}
          y2={80 - 65 * Math.sin((percentage / 100 * 180) * Math.PI / 180)}
          stroke={needleColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Needle tip circle */}
        <circle 
          cx={100 + 65 * Math.cos((percentage / 100 * 180) * Math.PI / 180)}
          cy={80 - 65 * Math.sin((percentage / 100 * 180) * Math.PI / 180)}
          r="3" 
          fill={needleColor} 
        />
      </svg>
      
      {/* Value display */}
      {showValue && (
        <div className="absolute bottom-2 text-center">
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-xl font-bold text-gray-800">
              {clampedValue.toFixed(sensorType === 'pressure' ? 1 : 0)}
            </span>
            <span className="text-sm text-gray-500">{gaugeUnit}</span>
          </div>
          {label && (
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          )}
          {showStatus && (
            <div className="flex items-center justify-center space-x-1 mt-1">
              {getStatusIcon(currentStatus.status)}
              <span className="text-xs text-gray-600">{currentStatus.status}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GaugeChart;