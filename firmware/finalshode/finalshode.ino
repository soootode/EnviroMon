// ESP32-S2 IoT Environmental Monitor - Fixed Version
#include "DHT.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_wifi.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>

// WiFi Settings - UPDATE THESE!
const char* ssid = "ssaa";
const char* password = "sadeghx900";

// Server Settings - VERIFY THIS IP ADDRESS!
String serverName = "https://enviromon-api.liara.run/api/sensors";

// Sensor pins for ESP32-S2
#define DHTPIN 20
#define DHTTYPE DHT22
#define MQ135_PIN 6
#define TEMT6000_PIN 9
#define SDA_PIN 10
#define SCL_PIN 11

// Sensor objects
DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP280 bmp;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastWiFiCheck = 0;
const unsigned long SENSOR_INTERVAL = 5000;  // Read sensors every 5 seconds
const unsigned long SEND_INTERVAL = 30000;   // Send data every 30 seconds
const unsigned long WIFI_CHECK_INTERVAL = 60000; // Check WiFi every minute

// Sensor data structure
struct SensorData {
  float temperature;
  float humidity;
  int airQuality;
  int lightLevel;
  float pressure;
  float altitude;
  bool isValid;
};
SensorData currentData;

bool wifiEnabled = false;
bool bmpEnabled = false;
int bmpRetryCount = 0;
const int MAX_BMP_RETRIES = 3;

void setup() {
  Serial.begin(115200);
  delay(5000); // Long delay for ESP32-S2 stability
  
  Serial.println("========================================");
  Serial.println("  ESP32-S2 IoT Environmental Monitor");
  Serial.println("  Fixed Version v2.1");
  Serial.println("  Including BMP280 Pressure Sensor");
  Serial.println("========================================");
  
  // Configure pins with pull-up resistors for stability
  pinMode(MQ135_PIN, INPUT);
  pinMode(TEMT6000_PIN, INPUT);
  
  // Initialize I2C for BMP280 with longer timeout
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000); // Set I2C to 100kHz for better stability
  Serial.println("I2C initialized for BMP280 at 100kHz");
  Serial.printf("SDA Pin: %d, SCL Pin: %d\n", SDA_PIN, SCL_PIN);
  
  // Initialize DHT22 first
  dht.begin();
  Serial.println("DHT22 sensor initialized");
  delay(2000); // Give DHT22 time to stabilize
  
  // Initialize BMP280 with retries
  initializeBMP280();
  
  // Try to initialize WiFi (with crash protection)
  Serial.println("Attempting WiFi initialization...");
  initializeWiFiSafe();
  
  Serial.println("========================================");
  Serial.println("  System ready! Starting data collection...");
  Serial.println("========================================");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensors regularly
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    readAllSensors();
    lastSensorRead = currentTime;
  }
  
  // Retry BMP280 initialization if it failed
  if (!bmpEnabled && bmpRetryCount < MAX_BMP_RETRIES && (currentTime % 30000) == 0) {
    Serial.println("Retrying BMP280 initialization...");
    initializeBMP280();
  }
  
  // Check WiFi status periodically (not every loop)
  if (currentTime - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    checkWiFiStatus();
    lastWiFiCheck = currentTime;
  }
  
  // Send data to server (only if WiFi is working)
  if (currentTime - lastDataSend >= SEND_INTERVAL && currentData.isValid && wifiEnabled) {
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToServer();
    } else {
      Serial.println("WiFi not connected - skipping data send");
    }
    lastDataSend = currentTime;
  }
  
  delay(100);
}

void initializeBMP280() {
  Serial.println("Attempting to initialize BMP280...");
  
  // Scan for I2C devices first
  Serial.println("Scanning for I2C devices...");
  byte error, address;
  int nDevices = 0;
  
  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.printf("I2C device found at address 0x%02X\n", address);
      nDevices++;
    }
  }
  
  if (nDevices == 0) {
    Serial.println("No I2C devices found!");
    bmpEnabled = false;
    bmpRetryCount++;
    return;
  }
  
  // Try different BMP280 addresses with longer delays
  delay(1000);
  
  // Try address 0x76 first (most common)
  if (bmp.begin(0x76, 0x58)) { // Try with chip ID check
    Serial.println("BMP280 sensor initialized successfully at address 0x76");
    bmpEnabled = true;
  } 
  // Try address 0x77 (alternative address)  
  else if (bmp.begin(0x77, 0x58)) {
    Serial.println("BMP280 sensor initialized successfully at address 0x77");
    bmpEnabled = true;
  }
  // Try without chip ID check (for clones/variants)
  else if (bmp.begin(0x76)) {
    Serial.println("BMP280 sensor initialized at 0x76 (no chip ID check)");
    bmpEnabled = true;
  }
  else if (bmp.begin(0x77)) {
    Serial.println("BMP280 sensor initialized at 0x77 (no chip ID check)");
    bmpEnabled = true;
  }
  else {
    Serial.println("❌ Could not initialize BMP280 sensor!");
    Serial.println("Troubleshooting steps:");
    Serial.println("1. Check wiring: VCC->3.3V, GND->GND, SDA->GPIO10, SCL->GPIO11");
    Serial.println("2. Check for loose connections");
    Serial.println("3. Verify sensor is BMP280 (not BME280 or other variant)");
    Serial.println("4. Try different I2C pull-up resistors (4.7kΩ recommended)");
    Serial.println("5. Check power supply stability");
    bmpEnabled = false;
    bmpRetryCount++;
    return;
  }
  
  if (bmpEnabled) {
    // Configure BMP280 settings
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,     /* Operating Mode. */
                    Adafruit_BMP280::SAMPLING_X2,     /* Temp. oversampling */
                    Adafruit_BMP280::SAMPLING_X16,    /* Pressure oversampling */
                    Adafruit_BMP280::FILTER_X16,      /* Filtering. */
                    Adafruit_BMP280::STANDBY_MS_500); /* Standby time. */
    Serial.println("BMP280 sampling configuration set");
    
    // Test reading to verify sensor is working
    delay(2000); // Longer delay for first reading
    float testTemp = bmp.readTemperature();
    float testPressure = bmp.readPressure();
    
    if (!isnan(testTemp) && !isnan(testPressure) && testTemp > -40 && testTemp < 85) {
      Serial.printf("✅ BMP280 test reading successful: %.2f°C, %.2f Pa\n", testTemp, testPressure);
      bmpRetryCount = 0; // Reset retry count on success
    } else {
      Serial.println("❌ BMP280 test reading failed - invalid data!");
      Serial.printf("Test values: temp=%.2f, pressure=%.2f\n", testTemp, testPressure);
      bmpEnabled = false;
      bmpRetryCount++;
    }
  }
}

void initializeWiFiSafe() {
  try {
    // ESP32-S2 specific WiFi settings
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(true);
    delay(2000);
    
    // Disable power saving for stability
    esp_wifi_set_ps(WIFI_PS_NONE);
    
    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);
    
    WiFi.begin(ssid, password);
    
    // Wait max 30 seconds for connection
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(1000);
      Serial.print(".");
      attempts++;
      
      // Print current status every 5 attempts
      if (attempts % 5 == 0) {
        Serial.printf("\nWiFi Status: %d (attempt %d/30)\n", WiFi.status(), attempts);
      }
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ WiFi connected successfully!");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
      Serial.print("Signal Strength: ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
      Serial.print("Gateway: ");
      Serial.println(WiFi.gatewayIP());
      Serial.print("DNS: ");
      Serial.println(WiFi.dnsIP());
      wifiEnabled = true;
      
      // Test server connectivity
      testServerConnection();
    } else {
      Serial.println("\n❌ WiFi connection failed!");
      Serial.printf("Final WiFi Status: %d\n", WiFi.status());
      Serial.println("Continuing in offline mode...");
      wifiEnabled = false;
    }
  } catch (...) {
    Serial.println("WiFi initialization crashed! Running in offline mode.");
    wifiEnabled = false;
  }
}

void testServerConnection() {
  Serial.println("Testing server connection...");
  HTTPClient http;
  http.begin("http://192.168.111.7:5000/");
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  if (httpCode > 0) {
    Serial.printf("✅ Server is reachable! HTTP code: %d\n", httpCode);
  } else {
    Serial.printf("❌ Server unreachable! Error: %s\n", http.errorToString(httpCode).c_str());
    Serial.println("Possible issues:");
    Serial.println("1. Server not running on 192.168.111.7:5000");
    Serial.println("2. Firewall blocking connection");
    Serial.println("3. Wrong IP address");
    Serial.println("4. Server on different network segment");
  }
  http.end();
}

void checkWiFiStatus() {
  if (!wifiEnabled) return;
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Attempting reconnection...");
    Serial.printf("Disconnect reason: %d\n", WiFi.status());
    
    WiFi.disconnect();
    delay(1000);
    WiFi.begin(ssid, password);
    
    // Wait max 15 seconds for reconnection
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 15) {
      delay(1000);
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✅ WiFi reconnected!");
      Serial.print("New IP: ");
      Serial.println(WiFi.localIP());
    } else {
      Serial.println("❌ WiFi reconnection failed. Will try again later.");
    }
  } else {
    // WiFi is connected, print signal strength
    int rssi = WiFi.RSSI();
    Serial.printf("WiFi signal: %d dBm (%s)\n", rssi, 
                 rssi > -50 ? "Excellent" : 
                 rssi > -60 ? "Good" : 
                 rssi > -70 ? "Fair" : "Poor");
  }
}

void readAllSensors() {
  Serial.println("\n📊 Reading sensor data...");
  
  // Read DHT22 with retry logic
  float tempHumidity = dht.readHumidity();
  float tempTemperature = dht.readTemperature();
  
  // Retry DHT22 if first reading fails
  if (isnan(tempHumidity) || isnan(tempTemperature)) {
    Serial.println("First DHT22 reading failed, retrying...");
    delay(2000);
    tempHumidity = dht.readHumidity();
    tempTemperature = dht.readTemperature();
  }
  
  // Check DHT22 data validity with reasonable ranges
  if (isnan(tempHumidity) || isnan(tempTemperature) || 
      tempTemperature < -40 || tempTemperature > 80 ||
      tempHumidity < 0 || tempHumidity > 100) {
    Serial.println("❌ Failed to read valid data from DHT22 sensor!");
    Serial.printf("Raw values: temp=%.2f, humidity=%.2f\n", tempTemperature, tempHumidity);
    currentData.isValid = false;
    return;
  }
  
  currentData.humidity = tempHumidity;
  currentData.temperature = tempTemperature;
  
  // Read BMP280 if available
  if (bmpEnabled) {
    Serial.println("Reading BMP280 sensor...");
    
    float tempPressure = bmp.readPressure();
    float tempBmpTemperature = bmp.readTemperature();
    
    if (!isnan(tempPressure) && !isnan(tempBmpTemperature) && 
        tempPressure > 30000 && tempPressure < 110000 && // Reasonable pressure range
        tempBmpTemperature > -40 && tempBmpTemperature < 85) { // Reasonable temp range
      
      currentData.pressure = tempPressure / 100.0F; // Convert Pa to hPa
      currentData.altitude = bmp.readAltitude(1013.25); // Sea level pressure
      Serial.printf("✅ BMP280 readings: %.2f hPa, %.2f°C, %.2fm\n", 
                   currentData.pressure, tempBmpTemperature, currentData.altitude);
    } else {
      Serial.println("❌ Failed to read valid data from BMP280 sensor!");
      Serial.printf("Raw values: pressure=%.2f, temp=%.2f\n", tempPressure, tempBmpTemperature);
      // Don't disable immediately, just set values to 0 for this reading
      currentData.pressure = 0;
      currentData.altitude = 0;
    }
  } else {
    Serial.println("BMP280 sensor disabled/unavailable");
    currentData.pressure = 0;
    currentData.altitude = 0;
  }
  
  // Read analog sensors with multiple samples for stability
  int aqSum = 0, lightSum = 0;
  for(int i = 0; i < 5; i++) {
    aqSum += analogRead(MQ135_PIN);
    lightSum += analogRead(TEMT6000_PIN);
    delay(10);
  }
  
  currentData.airQuality = aqSum / 5;  // Average of 5 readings
  currentData.lightLevel = lightSum / 5;
  
  currentData.isValid = true;
  
  // Display data
  displaySensorData();
}

void displaySensorData() {
  Serial.println("=================== Sensor Results ===================");
  Serial.printf("🌡️  Temperature: %.2f °C\n", currentData.temperature);
  Serial.printf("💧 Humidity: %.2f %%\n", currentData.humidity);
  if (bmpEnabled && currentData.pressure > 0) {
    Serial.printf("🌊 Pressure: %.2f hPa\n", currentData.pressure);
    Serial.printf("⛰️  Altitude: %.2f m\n", currentData.altitude);
  } else if (bmpEnabled) {
    Serial.println("🌊 Pressure: BMP280 reading failed");
  } else {
    Serial.println("🌊 Pressure: BMP280 not available");
  }
  Serial.printf("🌬️  Air Quality: %d - %s\n", currentData.airQuality, getAirQualityStatus(currentData.airQuality).c_str());
  Serial.printf("☀️  Light Level: %d - %s\n", currentData.lightLevel, getLightStatus(currentData.lightLevel).c_str());
  Serial.printf("🔥 Heat Index: %.2f °C\n", calculateHeatIndex(currentData.temperature, currentData.humidity));
  Serial.printf("📶 WiFi Status: %s", wifiEnabled ? (WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected") : "Disabled");
  if (wifiEnabled && WiFi.status() == WL_CONNECTED) {
    Serial.printf(" (RSSI: %d dBm)", WiFi.RSSI());
  }
  Serial.println();
  Serial.println("=====================================================");
}

void sendDataToServer() {
  Serial.println("\n📤 Preparing to send data to server...");
  
  HTTPClient http;
  http.begin(serverName);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000); // Increased timeout
  
  // Create JSON with more robust structure
  DynamicJsonDocument doc(2048); // Increased size
  doc["device_id"] = WiFi.macAddress();
  doc["timestamp"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["location"] = "IoT Test Environment";
  doc["firmware_version"] = "2.1";
  doc["uptime_ms"] = millis();
  
  JsonArray sensors = doc.createNestedArray("sensors");
  
  // Temperature
  JsonObject temp = sensors.createNestedObject();
  temp["type"] = "temperature";
  temp["value"] = round(currentData.temperature * 100.0) / 100.0; // Round to 2 decimal places
  temp["unit"] = "C";
  temp["sensor"] = "DHT22";
  temp["status"] = "online";
  
  // Humidity
  JsonObject humi = sensors.createNestedObject();
  humi["type"] = "humidity";
  humi["value"] = round(currentData.humidity * 100.0) / 100.0;
  humi["unit"] = "%";
  humi["sensor"] = "DHT22";
  humi["status"] = "online";
  
  // Pressure (if BMP280 is working)
  if (bmpEnabled && currentData.pressure > 0) {
    JsonObject press = sensors.createNestedObject();
    press["type"] = "pressure";
    press["value"] = round(currentData.pressure * 100.0) / 100.0;
    press["unit"] = "hPa";
    press["sensor"] = "BMP280";
    press["status"] = "online";
    
    JsonObject alt = sensors.createNestedObject();
    alt["type"] = "altitude";
    alt["value"] = round(currentData.altitude * 100.0) / 100.0;
    alt["unit"] = "m";
    alt["sensor"] = "BMP280";
    alt["status"] = "online";
  } else {
    JsonObject press = sensors.createNestedObject();
    press["type"] = "pressure";
    press["value"] = 0;
    press["unit"] = "hPa";
    press["sensor"] = "BMP280";
    press["status"] = bmpEnabled ? "error" : "offline";
  }
  
  // Air Quality
  JsonObject air = sensors.createNestedObject();
  air["type"] = "air_quality";
  air["value"] = currentData.airQuality;
  air["unit"] = "raw";
  air["sensor"] = "MQ135";
  air["status"] = getAirQualityStatus(currentData.airQuality);
  
  // Light Level
  JsonObject light = sensors.createNestedObject();
  light["type"] = "light_level";
  light["value"] = currentData.lightLevel;
  light["unit"] = "raw";
  light["sensor"] = "TEMT6000";
  light["status"] = getLightStatus(currentData.lightLevel);
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📋 JSON payload size: " + String(jsonString.length()) + " bytes");
  Serial.println("📋 Sending JSON data:");
  serializeJsonPretty(doc, Serial);
  Serial.println();
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ HTTP Response Code: %d\n", httpResponseCode);
    if (response.length() > 0) {
      Serial.println("📥 Server Response: " + response);
    }
    
    if (httpResponseCode == 200) {
      Serial.println("✅ Data sent successfully to server!");
    } else {
      Serial.printf("⚠️ Server returned non-200 response: %d\n", httpResponseCode);
    }
  } else {
    Serial.printf("❌ HTTP POST failed! Error: %s\n", http.errorToString(httpResponseCode).c_str());
    Serial.println("Troubleshooting steps:");
    Serial.println("1. Verify server is running: http://192.168.111.7:5000/");
    Serial.println("2. Check firewall settings");
    Serial.println("3. Verify API endpoint accepts POST requests");
    Serial.println("4. Check server logs for errors");
  }
  
  http.end();
}

// Helper functions remain the same
float calculateHeatIndex(float temperature, float humidity) {
  if (temperature < 27) return temperature;
  
  float tempF = (temperature * 9.0/5.0) + 32.0;
  float hi = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (humidity * 0.094));
  
  if (hi > 79) {
    hi = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity
         - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF
         - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity
         + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
  }
  
  return (hi - 32.0) * 5.0/9.0;
}

String getAirQualityStatus(int rawValue) {
  if (rawValue < 1000) return "Good";
  else if (rawValue < 2000) return "Moderate";
  else if (rawValue < 3000) return "Poor";
  else return "Hazardous";
}

String getLightStatus(int rawValue) {
  if (rawValue < 200) return "Dark";
  else if (rawValue < 800) return "Dim";
  else if (rawValue < 2000) return "Bright";
  else return "Very Bright";
}