// src/pages/Project.jsx
import React from 'react';
import { 
  FileText, 
  Cpu, 
  Thermometer, 
  Wind, 
  Sun, 
  Droplets,
  Wifi,
  Database,
  Globe,
  Edit3,
  BarChart2,
  TrendingUp
} from 'lucide-react';

const Project = () => {
  const sensorSpecs = [
    {
      name: 'DHT22',
      icon: '🌡️',
      title: 'Temperature & Humidity',
      specs: [
        'Temperature: -40°C to 80°C (±0.5°C)',
        'Humidity: 0-100% RH (±2-5%)'
      ],
      color: 'bg-red-50 border-red-200'
    },
    {
      name: 'BMP280',
      icon: '🔘',
      title: 'Pressure & Temperature',
      specs: [
        'Pressure: 300-1100 hPa (±1 hPa)',
        'Temperature: -40°C to 85°C'
      ],
      color: 'bg-purple-50 border-purple-200'
    },
    {
      name: 'MQ-135',
      icon: '💨',
      title: 'Air Quality',
      specs: [
        'Detects: NH3, NOx, alcohol, smoke, CO2',
        'Analog output: 0-1023'
      ],
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      name: 'TEMT6000',
      icon: '☀️',
      title: 'Light Intensity',
      specs: [
        'Range: 1-1000 lux',
        'Spectral response: 570nm peak'
      ],
      color: 'bg-green-50 border-green-200'
    }
  ];

  const systemArchitecture = [
    {
      title: 'ESP32-S3 (WROOM)',
      subtitle: 'Main microcontroller with WiFi connectivity',
      icon: Cpu,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Sensor Array',
      subtitle: 'DHT22, BMP280, MQ-135, TEMT6000 sensors',
      icon: Thermometer,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'WiFi Communication',
      subtitle: 'Wireless data transmission to cloud database',
      icon: Wifi,
      color: 'bg-cyan-100 text-cyan-600'
    },
    {
      title: 'MySQL',
      subtitle: 'Real-time database for data storage and sync',
      icon: Database,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Web Dashboard',
      subtitle: 'React-based monitoring and analysis interface',
      icon: Globe,
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Project Information</h1>
            <p className="text-sm text-gray-500 mt-1">System documentation and technical details</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
            <Edit3 className="w-4 h-4" />
            <span className="text-sm font-medium">Edit Project</span>
          </button>
        </div>
      </div>

      {/* Project Overview */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Weather & Environmental Monitoring System</h2>
            <p className="text-white/90 text-sm leading-relaxed">
             This system is presented as the undergraduate final project by Sedighe Jamalimanesh, for the Bachelor of Science degree in Mechanical Engineering at Shahid Beheshti University. This project was defined and executed under the supervision of my respected advisor, Dr. Abbas Rouhani.
			The primary objective was the development of a complete end-to-end solution for IoT-based environmental monitoring, encompassing hardware design, backend server development, and this dynamic user interface.You are invited to visit the dashboard section to observe the system's live performance.
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Specifications */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart2 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-700">Sensor Specifications</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensorSpecs.map((sensor, index) => (
            <div key={index} className={`bg-white rounded-lg border p-4 ${sensor.color}`}>
              <div className="flex items-start space-x-3">
                <div className="text-3xl">{sensor.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-800">{sensor.name}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {sensor.title}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {sensor.specs.map((spec, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Architecture */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Cpu className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-700">System Architecture</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {systemArchitecture.map((item, index) => (
            <div key={index} className="bg-white rounded-lg p-4 text-center hover:shadow-lg transition-shadow">
              <div className={`w-16 h-16 mx-auto mb-3 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500 leading-tight">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware Configuration */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Hardware Configuration</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Microcontroller</span>
              <span className="text-sm font-medium text-gray-800">ESP32-S3 WROOM</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Power Supply</span>
              <span className="text-sm font-medium text-gray-800">5V USB / 3.3V regulated</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Communication Protocol</span>
              <span className="text-sm font-medium text-gray-800">WiFi 802.11 b/g/n</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Data Format</span>
              <span className="text-sm font-medium text-gray-800">JSON over HTTPS</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Sampling Rate</span>
              <span className="text-sm font-medium text-gray-800">1 Hz (1 sample/sec)</span>
            </div>
          </div>
        </div>

        {/* Software Stack */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Software Stack</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Firmware</span>
              <span className="text-sm font-medium text-gray-800">Arduino Framework (C++)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Backend</span>
              <span className="text-sm font-medium text-gray-800">Flask</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Frontend Framework</span>
              <span className="text-sm font-medium text-gray-800">React 18.x</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">UI Components</span>
              <span className="text-sm font-medium text-gray-800">Tailwind CSS + Lucide Icons</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-600">Charts Library</span>
              <span className="text-sm font-medium text-gray-800">Recharts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Metrics */}
 	  {/* Project Metrics */}
	  <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
		<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
		  <p className="text-xs text-green-600 font-medium mb-1">Total Sensors</p>
		  <p className="text-2xl font-bold text-green-800">4 Units</p>
		 </div>
		 <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
		   <p className="text-xs text-orange-600 font-medium mb-1">System Version</p>
		   <p className="text-2xl font-bold text-orange-800">v3.1.0</p>
		 </div>
	   </div>
  </div>
  );
};

export default Project;
