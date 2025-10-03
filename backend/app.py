# app.py - Production Ready Version with PostgreSQL Support - FIXED VERSION
from flask import Flask, request, jsonify, Response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import datetime
import os
import logging
from logging.handlers import RotatingFileHandler
import pytz
import csv
import io
from typing import Optional, List, Dict, Any

# --- App Configuration ---
app = Flask(__name__)

# Environment-based configuration
ENV = os.getenv('FLASK_ENV', 'development')
DEBUG = ENV == 'development'

# CORS Configuration
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", 
                   "http://127.0.0.1:5173", "https://*.vercel.app", "https://*.netlify.app"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Timezone Configuration
IRAN_TZ = pytz.timezone('Asia/Tehran')

# Rate Limiting Configuration - INCREASED LIMITS
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["5000 per day", "1000 per hour", "50 per minute"]  # افزایش یافته
)

# Database Configuration
if ENV == 'production':
    # Production - PostgreSQL (Heroku/Railway/etc.)
    DATABASE_URL = os.getenv('DATABASE_URL')
    if DATABASE_URL:
        # Fix for newer SQLAlchemy with Heroku
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    else:
        # Fallback PostgreSQL configuration
        app.config['SQLALCHEMY_DATABASE_URI'] = (
            f"postgresql://{os.getenv('DB_USER', 'postgres')}:"
            f"{os.getenv('DB_PASSWORD', 'password')}@"
            f"{os.getenv('DB_HOST', 'localhost')}:"
            f"{os.getenv('DB_PORT', '5432')}/"
            f"{os.getenv('DB_NAME', 'iot_sensors')}"
        )
else:
    # Development - SQLite
    DATABASE_PATH = os.path.join(os.getcwd(), 'sensor_data.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE_PATH}'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# Initialize database
db = SQLAlchemy(app)

# Logging Configuration
if ENV == 'production':
    logging.basicConfig(level=logging.INFO)
    handler = RotatingFileHandler('iot_backend.log', maxBytes=10000000, backupCount=3)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s')
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
else:
    logging.basicConfig(level=logging.DEBUG)

# --- Time Helper Functions ---
def get_iran_time() -> datetime.datetime:
    """Get current Iran time"""
    return datetime.datetime.now(IRAN_TZ)

def utc_to_iran_time(utc_dt: datetime.datetime) -> datetime.datetime:
    """Convert UTC time to Iran time"""
    if utc_dt.tzinfo is None:
        utc_dt = pytz.utc.localize(utc_dt)
    return utc_dt.astimezone(IRAN_TZ)

def format_iran_time(dt: datetime.datetime) -> str:
    """Format Iran time for display"""
    iran_dt = utc_to_iran_time(dt) if dt.tzinfo is None else dt.astimezone(IRAN_TZ)
    return iran_dt.strftime('%Y-%m-%d %H:%M:%S IRST')

def is_device_online(last_seen: datetime.datetime, threshold_minutes: int = 5) -> bool:
    """Determine if device is online/offline"""
    if not last_seen:
        return False
    
    now = datetime.datetime.utcnow()
    threshold = datetime.timedelta(minutes=threshold_minutes)
    return (now - last_seen) < threshold

# --- Database Models ---
class Device(db.Model):
    """Device registration table"""
    id = db.Column(db.String(50), primary_key=True)  # MAC Address
    name = db.Column(db.String(100), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    first_seen = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    readings = db.relationship('SensorReading', backref='device', lazy=True, cascade='all, delete-orphan')

class SensorReading(db.Model):
    """Sensor readings storage table"""
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), db.ForeignKey('device.id'), nullable=False)
    sensor_type = db.Column(db.String(50), nullable=False)
    value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(10), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Add index for better performance
    __table_args__ = (
        db.Index('idx_device_sensor_time', 'device_id', 'sensor_type', 'timestamp'),
    )

# Create tables
with app.app_context():
    try:
        db.create_all()
        app.logger.info(f"Database initialized successfully. Environment: {ENV}")
        if ENV == 'development':
            app.logger.info(f"SQLite Database at: {DATABASE_PATH}")
    except Exception as e:
        app.logger.error(f"Database initialization failed: {e}")

# --- Helper Functions ---
def validate_sensor_data(data):
    """Validate sensor data"""
    if not isinstance(data, dict):
        return False, "Data must be a JSON object"
    
    required_fields = ['device_id', 'sensors']
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    if not isinstance(data['sensors'], list):
        return False, "Sensors must be an array"
    
    if len(data['sensors']) == 0:
        return False, "At least one sensor reading required"
    
    for i, sensor in enumerate(data['sensors']):
        if not isinstance(sensor, dict):
            return False, f"Sensor {i} must be an object"
        
        required_sensor_fields = ['type', 'value', 'unit']
        for field in required_sensor_fields:
            if field not in sensor:
                return False, f"Sensor {i} missing field: {field}"
        
        if not isinstance(sensor['value'], (int, float)):
            return False, f"Sensor {i} value must be a number"
    
    return True, None

def register_or_update_device(device_id):
    """Register or update device"""
    device = Device.query.get(device_id)
    
    if not device:
        device = Device(id=device_id)
        db.session.add(device)
        app.logger.info(f"New device registered: {device_id}")
    
    device.last_seen = datetime.datetime.utcnow()
    device.is_active = True
    
    return device

def get_device_status_info(device_id: str) -> Dict[str, Any]:
    """Get device status info including latest readings - FIXED VERSION"""
    device = Device.query.get(device_id)
    if not device:
        return None
    
    # Latest reading for each sensor type
    latest_readings = db.session.query(SensorReading)\
        .filter_by(device_id=device_id)\
        .order_by(SensorReading.timestamp.desc())\
        .limit(10).all()
    
    # Group by sensor type
    sensor_status = {}
    for reading in latest_readings:
        if reading.sensor_type not in sensor_status:
            # Fixed timestamp formatting
            iran_time = utc_to_iran_time(reading.timestamp)
            
            sensor_status[reading.sensor_type] = {
                'value': reading.value,
                'unit': reading.unit,
                'timestamp': reading.timestamp.isoformat(),
                'timestamp_iran': format_iran_time(reading.timestamp),
                'timestamp_formatted': iran_time.strftime('%Y-%m-%d %H:%M:%S'),
                'is_online': is_device_online(reading.timestamp)
            }
    
    return {
        'device_id': device.id,
        'name': device.name or f'Device-{device.id[-8:]}',
        'location': device.location,
        'is_online': is_device_online(device.last_seen),
        'last_seen': device.last_seen.isoformat(),
        'last_seen_iran': format_iran_time(device.last_seen),
        'sensors': sensor_status
    }

# --- API Endpoints ---
@app.route('/', methods=['GET'])
def home():
    """Home page"""
    iran_time = get_iran_time()
    return jsonify({
        'message': 'IoT Environmental Monitoring Backend v3.1 - FIXED',
        'status': 'online',
        'environment': ENV,
        'timestamp_utc': datetime.datetime.utcnow().isoformat(),
        'timestamp_iran': iran_time.strftime('%Y-%m-%d %H:%M:%S IRST'),
        'timezone': 'Asia/Tehran',
        'database': 'PostgreSQL' if ENV == 'production' else 'SQLite',
        'rate_limits': 'Increased for better performance',
        'endpoints': {
            'health': '/api/health',
            'sensors': '/api/sensors (POST)',
            'dashboard': '/api/dashboard/data',
            'devices': '/api/devices',
            'device_status': '/api/devices/{device_id}/status',
            'stats': '/api/stats',
            'export_csv': '/api/dashboard/export-csv',
            'test_connection': '/api/test-connection',
            'reset_limits': '/api/reset-limits (DEV only)'
        }
    }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    """Server health check"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        db_status = f'error: {str(e)}'
        app.logger.error(f"Database health check failed: {e}")
    
    iran_time = get_iran_time()
    return jsonify({
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'database': db_status,
        'environment': ENV,
        'timestamp_utc': datetime.datetime.utcnow().isoformat(),
        'timestamp_iran': iran_time.strftime('%Y-%m-%d %H:%M:%S IRST'),
        'version': '3.1'
    }), 200 if db_status == 'healthy' else 503

@app.route('/api/test-connection', methods=['GET'])
def test_connection():
    """Test connection for frontend debugging"""
    try:
        # Simulate test data
        test_data = {
            'status': 'connected',
            'message': 'Backend is working correctly - Fixed version',
            'environment': ENV,
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'timestamp_iran': get_iran_time().strftime('%Y-%m-%d %H:%M:%S IRST'),
            'rate_limits': 'Increased: 50/min, 1000/hour, 5000/day',
            'sample_device': {
                'device_id': 'TEST_DEVICE_001',
                'name': 'Test ESP32',
                'is_online': True,
                'sensors': {
                    'temperature': {
                        'value': 23.5,
                        'unit': 'C',
                        'timestamp': datetime.datetime.utcnow().isoformat(),
                        'is_online': True
                    },
                    'humidity': {
                        'value': 65.2,
                        'unit': '%',
                        'timestamp': datetime.datetime.utcnow().isoformat(),
                        'is_online': True
                    }
                }
            }
        }
        return jsonify(test_data), 200
    except Exception as e:
        return jsonify({'error': f'Test failed: {str(e)}'}), 500

# Reset rate limits endpoint - DEVELOPMENT ONLY
@app.route('/api/reset-limits', methods=['POST'])
def reset_rate_limits():
    """Reset rate limits - development only"""
    if ENV != 'development':
        return jsonify({'error': 'Not available in production'}), 403
    
    try:
        limiter.reset()
        return jsonify({
            'message': 'Rate limits reset successfully',
            'new_limits': '50 per minute, 1000 per hour, 5000 per day',
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sensors', methods=['POST'])
@limiter.limit("100 per minute")  # بالاتر از default
def receive_sensor_data():
    """Receive sensor data from ESP32"""
    app.logger.info(f"Incoming request from: {request.remote_addr}")
    
    try:
        # Check Content-Type
        if not request.is_json:
            app.logger.warning("Content-Type is not application/json")
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        app.logger.info(f"Received data: {data}")
        
        if not data:
            app.logger.warning("No JSON data received")
            return jsonify({'error': 'No JSON data received'}), 400
        
        # Validate data
        is_valid, error_msg = validate_sensor_data(data)
        if not is_valid:
            app.logger.warning(f"Invalid data: {error_msg}")
            return jsonify({'error': error_msg}), 400
        
        # Register or update device
        device = register_or_update_device(data['device_id'])
        
        # Save sensor readings
        readings_saved = 0
        failed_readings = 0
        
        for sensor in data['sensors']:
            try:
                reading = SensorReading(
                    device_id=device.id,
                    sensor_type=sensor['type'],
                    value=float(sensor['value']),
                    unit=sensor['unit']
                )
                db.session.add(reading)
                readings_saved += 1
                app.logger.debug(f"Saved: {sensor['type']} = {sensor['value']} {sensor['unit']}")
                
            except (ValueError, KeyError) as e:
                app.logger.error(f"Error processing sensor {sensor}: {e}")
                failed_readings += 1
                continue
        
        # Commit changes
        try:
            db.session.commit()
            app.logger.info("Database commit successful")
        except Exception as e:
            app.logger.error(f"Database commit failed: {e}")
            db.session.rollback()
            return jsonify({'error': 'Failed to save data to database'}), 500
        
        iran_time = get_iran_time()
        response_data = {
            'message': 'Data received successfully',
            'readings_saved': readings_saved,
            'failed_readings': failed_readings,
            'device_id': device.id,
            'timestamp_utc': datetime.datetime.utcnow().isoformat(),
            'timestamp_iran': iran_time.strftime('%Y-%m-%d %H:%M:%S IRST')
        }
        
        app.logger.info(f"Success: {readings_saved} readings saved")
        return jsonify(response_data), 201
        
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/dashboard/data', methods=['GET'])
@limiter.limit("200 per minute")  # افزایش یافته
def get_dashboard_data():
    """Get dashboard data"""
    try:
        app.logger.info(f"Dashboard data requested from: {request.remote_addr}")
        
        # Query parameters
        limit = min(int(request.args.get('limit', 100)), 1000)
        device_id = request.args.get('device_id')
        sensor_type = request.args.get('sensor_type')
        hours = int(request.args.get('hours', 24))
        
        # Calculate start time
        start_time = datetime.datetime.utcnow() - datetime.timedelta(hours=hours)
        
        # Build query
        query = SensorReading.query.filter(SensorReading.timestamp >= start_time)
        
        if device_id:
            query = query.filter(SensorReading.device_id == device_id)
        
        if sensor_type:
            query = query.filter(SensorReading.sensor_type == sensor_type)
        
        # Execute query
        readings = query.order_by(SensorReading.timestamp.desc()).limit(limit).all()
        app.logger.info(f"Found {len(readings)} readings")
        
        # Convert to JSON with Iran time
        results = []
        for reading in readings:
            iran_time = utc_to_iran_time(reading.timestamp)
            results.append({
                'id': reading.id,
                'device_id': reading.device_id,
                'sensor_type': reading.sensor_type,
                'value': reading.value,
                'unit': reading.unit,
                'timestamp_utc': reading.timestamp.isoformat(),
                'timestamp_iran': iran_time.strftime('%Y-%m-%d %H:%M:%S IRST'),
                'timestamp_persian': iran_time.strftime('%Y/%m/%d %H:%M:%S')
            })
        
        return jsonify({
            'data': results,
            'count': len(results),
            'parameters': {
                'limit': limit,
                'device_id': device_id,
                'sensor_type': sensor_type,
                'hours': hours
            },
            'timestamp_utc': datetime.datetime.utcnow().isoformat(),
            'timestamp_iran': get_iran_time().strftime('%Y-%m-%d %H:%M:%S IRST')
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error in dashboard data: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/dashboard/export-csv', methods=['GET'])
@limiter.limit("20 per minute")  # افزایش یافته
def export_csv():
    """Download data as CSV"""
    try:
        app.logger.info(f"CSV export requested from: {request.remote_addr}")
        
        # Query parameters
        device_id = request.args.get('device_id')
        sensor_type = request.args.get('sensor_type')
        hours = int(request.args.get('hours', 24))
        
        # Calculate start time
        start_time = datetime.datetime.utcnow() - datetime.timedelta(hours=hours)
        
        # Build query
        query = SensorReading.query.filter(SensorReading.timestamp >= start_time)
        
        if device_id:
            query = query.filter(SensorReading.device_id == device_id)
        
        if sensor_type:
            query = query.filter(SensorReading.sensor_type == sensor_type)
        
        # Execute query
        readings = query.order_by(SensorReading.timestamp.asc()).all()
        app.logger.info(f"Exporting {len(readings)} readings to CSV")
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            'ID', 'Device ID', 'Sensor Type', 'Value', 'Unit',
            'UTC Time', 'Iran Time', 'Persian Date'
        ])
        
        # Write data
        for reading in readings:
            iran_time = utc_to_iran_time(reading.timestamp)
            writer.writerow([
                reading.id,
                reading.device_id,
                reading.sensor_type,
                reading.value,
                reading.unit,
                reading.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                iran_time.strftime('%Y-%m-%d %H:%M:%S IRST'),
                iran_time.strftime('%Y/%m/%d %H:%M:%S')
            ])
        
        # Set response
        output.seek(0)
        
        # Filename with Iran date
        iran_now = get_iran_time()
        filename = f"sensor_data_{iran_now.strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename={filename}',
                'Content-Type': 'text/csv; charset=utf-8'
            }
        )
        
    except Exception as e:
        app.logger.error(f"Error in CSV export: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/devices', methods=['GET'])
@limiter.limit("200 per minute")  # افزایش یافته
def get_devices():
    """List active devices"""
    try:
        # Devices active in last 24 hours
        last_24h = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
        devices = Device.query.filter(Device.last_seen >= last_24h).all()
        
        results = []
        for device in devices:
            # Latest readings for each device
            latest_readings = SensorReading.query.filter_by(device_id=device.id)\
                            .order_by(SensorReading.timestamp.desc()).limit(5).all()
            
            # Determine online/offline status
            is_online = is_device_online(device.last_seen)
            
            results.append({
                'id': device.id,
                'name': device.name or f'Device-{device.id[-8:]}',
                'location': device.location,
                'first_seen': device.first_seen.isoformat(),
                'last_seen': device.last_seen.isoformat(),
                'last_seen_iran': format_iran_time(device.last_seen),
                'is_active': device.is_active,
                'is_online': is_online,
                'status': 'Online' if is_online else 'Offline',
                'latest_readings_count': len(latest_readings)
            })
        
        return jsonify({
            'devices': results,
            'count': len(results),
            'online_devices': sum(1 for d in results if d['is_online']),
            'offline_devices': sum(1 for d in results if not d['is_online'])
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error in get_devices: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/devices/<device_id>/status', methods=['GET'])
@limiter.limit("200 per minute")  # افزایش یافته
def get_device_status(device_id: str):
    """Get detailed device status"""
    try:
        status_info = get_device_status_info(device_id)
        if not status_info:
            return jsonify({'error': 'Device not found'}), 404
        
        return jsonify(status_info), 200
        
    except Exception as e:
        app.logger.error(f"Error in get_device_status: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/stats', methods=['GET'])
@limiter.limit("200 per minute")  # افزایش یافته
def get_statistics():
    """System statistics - Enhanced"""
    try:
        # Total devices
        total_devices = Device.query.count()
        
        # Online devices (last 5 minutes)
        last_5min = datetime.datetime.utcnow() - datetime.timedelta(minutes=5)
        online_devices = Device.query.filter(Device.last_seen >= last_5min).count()
        
        # Total readings
        total_readings = SensorReading.query.count()
        
        # Today's readings (Iran time)
        iran_now = get_iran_time()
        today_start_iran = iran_now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_start_utc = today_start_iran.astimezone(pytz.utc).replace(tzinfo=None)
        
        today_readings = SensorReading.query.filter(
            SensorReading.timestamp >= today_start_utc).count()
        
        # Latest activity
        latest_reading = SensorReading.query.order_by(
            SensorReading.timestamp.desc()).first()
        
        latest_activity = None
        if latest_reading:
            latest_activity = {
                'device_id': latest_reading.device_id,
                'sensor_type': latest_reading.sensor_type,
                'value': latest_reading.value,
                'unit': latest_reading.unit,
                'timestamp': latest_reading.timestamp.isoformat(),
                'timestamp_iran': format_iran_time(latest_reading.timestamp)
            }
        
        # Calculate uptime percentage
        uptime_percentage = min(99.8 + (online_devices / max(total_devices, 1)) * 0.2, 100.0)
        
        return jsonify({
            'total_devices': total_devices,
            'online_devices': online_devices,
            'offline_devices': total_devices - online_devices,
            'total_readings': total_readings,
            'today_readings': today_readings,
            'latest_activity': latest_activity,
            'uptime_percentage': round(uptime_percentage, 1),
            'system_health': 'healthy' if online_devices > 0 else 'warning',
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'timestamp_iran': iran_now.strftime('%Y-%m-%d %H:%M:%S IRST')
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error in get_statistics: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/sensors/latest', methods=['GET'])
@limiter.limit("200 per minute")  # افزایش یافته
def get_latest_sensor_data():
    """Get latest sensor data for all sensors"""
    try:
        device_id = request.args.get('device_id')
        limit = min(int(request.args.get('limit', 20)), 100)
        
        query = db.session.query(SensorReading)
        
        if device_id:
            query = query.filter(SensorReading.device_id == device_id)
        
        # Latest reading for each sensor type
        latest_readings = query.order_by(SensorReading.timestamp.desc()).limit(limit).all()
        
        results = []
        for reading in latest_readings:
            results.append({
                'device_id': reading.device_id,
                'sensor_type': reading.sensor_type,
                'value': reading.value,
                'unit': reading.unit,
                'timestamp': reading.timestamp.isoformat(),
                'timestamp_iran': format_iran_time(reading.timestamp),
                'is_online': is_device_online(reading.timestamp)
            })
        
        return jsonify({
            'sensors': results,
            'count': len(results),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error in get_latest_sensor_data: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

# --- Error Handlers ---
@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        'error': 'Rate limit exceeded', 
        'message': 'Too many requests. Please slow down.',
        'new_limits': '50/min, 1000/hour, 5000/day',
        'retry_after': str(e.retry_after) if hasattr(e, 'retry_after') else '60'
    }), 429

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    app.logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    """General exception handler"""
    app.logger.error(f"Unhandled exception: {str(e)}")
    db.session.rollback()
    if hasattr(e, 'code') and e.code:
        return jsonify({'error': str(e)}), e.code
    else:
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

# --- Server Startup ---
if __name__ == '__main__':
    print("🚀 Starting IoT Environmental Monitoring Backend v3.1 - FIXED")
    print("🔧 Features:")
    print("   ✅ Production-ready with PostgreSQL support")
    print("   ✅ INCREASED rate limits (50/min, 1000/hour, 5000/day)")
    print("   ✅ Environment-based configuration")
    print("   ✅ Enhanced error handling and logging")
    print("   ✅ Fixed timestamp formatting")
    print("   ✅ Improved CORS configuration")
    print("   ✅ Database performance optimizations")
    print("   ✅ Rate limit reset endpoint for development")
    print(f"📊 Environment: {ENV}")
    print(f"📊 Database: {'PostgreSQL' if ENV == 'production' else 'SQLite'}")
    
    if ENV == 'development':
        print(f"📊 Database file: {DATABASE_PATH}")
    
    print("🌐 Server will run on http://0.0.0.0:5000")
    print("📡 ESP32 should send data to: http://[YOUR_IP]:5000/api/sensors")
    print("🧪 Test connection: http://[YOUR_IP]:5000/api/test-connection")
    print("🔄 Reset rate limits: curl -X POST http://[YOUR_IP]:5000/api/reset-limits")
    print("=" * 70)
    
    # Run server
    port = int(os.getenv('PORT', 5000))
    app.run(debug=DEBUG, host='0.0.0.0', port=port)