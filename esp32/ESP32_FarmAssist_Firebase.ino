/**
 * ESP32_FarmAssist_Firebase.ino
 * ─────────────────────────────────────────────────────────────────
 * Arduino sketch for ESP32-S3 that reads sensor data and pushes it
 * to Firebase Realtime Database in real time.
 *
 * Hardware connections (adjust pins to your wiring):
 *   • DHT22 (Temperature + Humidity)  → GPIO 4
 *   • Soil Moisture Sensor (analog)   → GPIO 34
 *   • Water Level Sensor (analog)     → GPIO 35
 *
 * Required Arduino libraries (install via Library Manager):
 *   1. Firebase ESP Client    (by mobizt) — v2.x or later
 *   2. DHT sensor library     (by Adafruit)
 *   3. Adafruit Unified Sensor
 *
 * Firebase setup:
 *   1. Enable Anonymous sign-in in Firebase Console →
 *      Authentication → Sign-in method → Anonymous → Enable
 *   2. Set RTDB rules to allow authenticated writes:
 *      {
 *        "rules": {
 *          "sensors": {
 *            ".read": "auth != null",
 *            ".write": "auth != null"
 *          }
 *        }
 *      }
 *   3. Enable RTDB: Firebase Console → Realtime Database → Create database
 *
 * RTDB path written:
 *   sensors/latest
 * ─────────────────────────────────────────────────────────────────
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <time.h>

// ══════════════════════════════════════════════════════════════════
// CONFIGURATION — Edit these values
// ══════════════════════════════════════════════════════════════════

// Wi-Fi credentials
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// Firebase project credentials (from Firebase Console → Project Settings → General)
#define API_KEY         "AIzaSyAuWDWRSVJU-73_lYoefIxiLq8HFyhfc7o"
#define DATABASE_URL    "https://farmassist-2425-default-rtdb.asia-southeast1.firebasedatabase.app"

// No auth credentials needed — using anonymous sign-in

// Sensor pins (ESP32-S3)
#define DHT_PIN         4
#define DHT_TYPE        DHT22
#define SOIL_MOISTURE_PIN   34
#define WATER_LEVEL_PIN     35

// How often to send data (milliseconds)
#define SEND_INTERVAL_MS    5000

// Soil moisture sensor calibration (adjust for your sensor)
#define SOIL_DRY        4095    // Raw ADC when completely dry
#define SOIL_WET        1200    // Raw ADC when submerged in water

// Water level sensor calibration
#define WATER_EMPTY     0       // Raw ADC when empty
#define WATER_FULL      4095    // Raw ADC when full

// NTP server for accurate timestamps
#define NTP_SERVER      "pool.ntp.org"

// ══════════════════════════════════════════════════════════════════
// GLOBAL OBJECTS
// ══════════════════════════════════════════════════════════════════

DHT dht(DHT_PIN, DHT_TYPE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastSendTime = 0;
bool firebaseReady = false;

// ══════════════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== FarmAssist ESP32-S3 Starting ===");

  // ── Initialize sensors ──
  dht.begin();
  analogReadResolution(12);  // ESP32-S3 ADC is 12-bit (0-4095)
  Serial.println("[OK] Sensors initialized");

  // ── Connect to Wi-Fi ──
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[OK] WiFi connected — IP: %s\n", WiFi.localIP().toString().c_str());

  // ── Sync time via NTP ──
  configTime(0, 0, NTP_SERVER);
  Serial.print("[NTP] Waiting for time sync");
  while (time(nullptr) < 100000) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[OK] Time synced: %ld\n", time(nullptr));

  // ── Configure Firebase ──
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Firebase.reconnectWiFi(true);
  fbdo.setResponseSize(4096);

  // Initialize Firebase (no auth yet — just config)
  Firebase.begin(&config, &auth);
  Serial.println("[OK] Firebase.begin() called");

  // ── Sign in anonymously ──
  Serial.println("[Auth] Signing in anonymously ...\n");
  if (Firebase.signUpAnonymously(&config, &auth)) {
    Serial.printf("[OK] Signed in — UID: %s\n", auth.token.uid.c_str());
    firebaseReady = true;
  } else {
    Serial.printf("[FAIL] Anonymous sign-in failed: %s\n", fbdo.errorReason().c_str());
    Serial.println("[HINT] Enable Anonymous sign-in in Firebase Console → Authentication → Sign-in method");
  }
}

// ══════════════════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    // Don't send if Firebase sign-in failed
    if (!firebaseReady) {
      Serial.println("[SKIP] Firebase not ready — check sign-in errors above");
      return;
    }

    // ── Read sensors ──
    float temperature = dht.readTemperature();    // °C
    float humidity    = dht.readHumidity();        // %

    // Read analog sensors and convert to percentages
    int soilRaw = analogRead(SOIL_MOISTURE_PIN);
    float moisture = map(soilRaw, SOIL_DRY, SOIL_WET, 0, 100);
    moisture = constrain(moisture, 0.0f, 100.0f);

    int waterRaw = analogRead(WATER_LEVEL_PIN);
    float waterLevel = map(waterRaw, WATER_EMPTY, WATER_FULL, 0, 100);
    waterLevel = constrain(waterLevel, 0.0f, 100.0f);

    // Check for DHT read errors
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[WARN] DHT read failed, skipping cycle");
      return;
    }

    // Get current timestamp in milliseconds
    long timestamp = (long)time(nullptr) * 1000;

    // Log readings
    Serial.printf("[Read] Temp: %.1f°C | Humidity: %.1f%% | Soil: %.1f%% | Water: %.1f%%\n",
                  temperature, humidity, moisture, waterLevel);

    // ── Write to Realtime Database ──
    pushToRTDB(temperature, humidity, moisture, waterLevel, timestamp);
  }
}

// ══════════════════════════════════════════════════════════════════
// REALTIME DATABASE WRITE
// ══════════════════════════════════════════════════════════════════

void pushToRTDB(float temp, float hum, float moist, float water, long ts) {
  // RTDB path: sensors/latest
  // This overwrites the latest reading each time (upsert)
  String path = "sensors/latest";

  // Build JSON payload
  FirebaseJson json;
  json.set("temperature", temp);
  json.set("humidity", hum);
  json.set("moisture", moist);
  json.set("waterLevel", water);
  json.set("timestamp", ts);

  // Write to RTDB
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.printf("[Firebase] RTDB write OK — %s\n", path.c_str());
  } else {
    Serial.printf("[Firebase] RTDB write FAILED: %s\n", fbdo.errorReason().c_str());
  }
}
