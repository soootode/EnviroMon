import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  Activity, 
  FolderOpen,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [sensorCount, setSensorCount] = useState(4);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Real-time Dashboard', path: '/dashboard', desc: 'Live sensor data' },
    { icon: BarChart3, label: 'Historical Analysis', path: '/historical', desc: 'Data trends & export' },
    { icon: Activity, label: 'System Status', path: '/status', desc: 'Maps & alerts' },
    { icon: FolderOpen, label: 'Project Info', path: '/project', desc: 'About this system' }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Logo Section */}
        <div className="p-4 border-b bg-gradient-to-r from-cyan-500 to-blue-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-cyan-600 font-bold text-lg">E</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-white font-bold text-lg">EnviroMon</h1>
                <p className="text-cyan-100 text-xs">Environmental Monitoring</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4">
          <div className="px-3 mb-2">
            {!isCollapsed && (
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
            )}
          </div>
          
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${
                      isActive ? 'text-cyan-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                    {!isCollapsed && (
                      <>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                        {isActive && <ChevronRight className="w-4 h-4 text-cyan-500" />}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Status Section */}
        <div className="border-t p-4 bg-gray-50">
          <div className={`${isCollapsed ? 'items-center' : ''} space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {connectionStatus === 'online' ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                {!isCollapsed && (
                  <span className="text-xs text-gray-600">Connection</span>
                )}
              </div>
              {!isCollapsed && (
                <span className={`text-xs font-medium ${
                  connectionStatus === 'online' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                {!isCollapsed && (
                  <span className="text-xs text-gray-600">Sensors</span>
                )}
              </div>
              {!isCollapsed && (
                <span className="text-xs font-medium text-gray-700">{sensorCount} Active</span>
              )}
            </div>

            {!isCollapsed && (
              <div className="text-xs text-gray-500">
                Last Update: <span className="font-medium">2 sec ago</span>
              </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="p-3 border-t bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-xs font-semibold text-gray-700">ESP32-S2 System</p>
                <p className="text-xs text-gray-400">v2.1.0 • Online</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;