#include <WiFi.h>
#include <Firebase_ESP_Client.h>  // Official Firebase ESP Client library
#include <DHT.h>                  // Adafruit DHT sensor library (install "DHT sensor library" + "Adafruit Unified Sensor" via Library Manager)
#include <time.h>                 // For NTP time sync

// Helper functions for token generation and debug info
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// Wi-Fi credentials
#define WIFI_SSID "Minetallest's POCO X7"
#define WIFI_PASSWORD "TESTER123"

// Firebase project credentials
#define API_KEY "AIzaSyAlLaKUR4q8CZTMFlAFRTM-ToncomN4Ugs"
#define DATABASE_URL "https://farmassist-2425-default-rtdb.asia-southeast1.firebasedatabase.app/"

// ──────────────── Device & User Identity ────────────────
// DEVICE_ID: The ID the user types into the dashboard's Settings > Pair Device
// USER_UID:  Copy from Settings > Your User ID in the dashboard
//            This ensures the ESP32 writes to YOUR personal database path.
#define DEVICE_ID "esp32-farm-001"
#define USER_UID  "PASTE_YOUR_USER_UID_HERE"

// Firebase database paths (user-scoped)
String LATEST_PATH = "/users/" + String(USER_UID) + "/devices/" + String(DEVICE_ID) + "/latest";
String HISTORY_BASE = "/users/" + String(USER_UID) + "/devices/" + String(DEVICE_ID) + "/history";

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ---------------- NTP Time Sync ----------------
const long gmtOffset_sec = 8 * 3600;  // Malaysia = UTC+8
const int daylightOffset_sec = 0;
const char* ntpServer1 = "pool.ntp.org";
const char* ntpServer2 = "time.nist.gov";
bool timeSynced = false;

// ---------------- Timing ----------------
const unsigned long SAMPLE_INTERVAL_MS = 5000;    // 5 seconds - sample + /users/{uid}/devices/{id}/latest write
const unsigned long HISTORY_INTERVAL_MS = 60000;  // 1 minute - /users/{uid}/devices/{id}/history write

unsigned long sampleprevMillis = 0;
unsigned long historyPrevMillis = 0;
unsigned long sampleCount = 0;   // total samples taken since boot
unsigned long historyCount = 0;  // total history writes since boot
bool signUpOk = false;

// ---------------- PLACEHOLDER MODE ----------------
#define USE_PLACEHOLDER_DATA true

// ---------------- Soil Moisture Sensor ----------------
int soilPin = 32;
int soilVal;
int moistureVal;
const int drySoil = 3000;
const int wetSoil = 1000;

// ---------------- DHT Temperature Sensor ----------------
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);
float temperatureVal;

// ---------------- Water Level Sensor ----------------
int waterLevelPin = 34;
int waterLevelRaw;
int waterLevelVal;
const int waterLevelMin = 0;
const int waterLevelMax = 4095;

// ---------------- Light Sensor (LDR) ----------------
int lightPin = 35;
int lightRaw;
int lightVal;
const int lightDark = 4095;
const int lightBright = 0;

// Prints current wall-clock time as a short prefix, e.g. [12:03:47]
// Falls back to uptime if NTP hasn't synced yet.
String nowPrefix() {
  if (timeSynced) {
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 10)) {
      char buf[12];
      strftime(buf, sizeof(buf), "%H:%M:%S", &timeinfo);
      return "[" + String(buf) + "] ";
    }
  }
  return "[+" + String(millis() / 1000) + "s] ";
}

bool syncTime() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer1, ntpServer2);

  Serial.println("---------------------------------------------");
  Serial.print("[NTP] Syncing time");
  struct tm timeinfo;
  int attempts = 0;
  while (!getLocalTime(&timeinfo) && attempts < 20) {
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (attempts >= 20) {
    Serial.println("\n[NTP] FAILED to sync after 10s. Timestamps will use uptime until retried.");
    timeSynced = false;
    return false;
  }

  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  Serial.println("\n[NTP] Synced successfully -> " + String(buf));
  Serial.println("---------------------------------------------");
  timeSynced = true;
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\n===============================================");
  Serial.println("  FarmAssist ESP32 - Booting");
  Serial.println("  Device ID : " + String(DEVICE_ID));
  Serial.println("  User UID  : " + String(USER_UID));
  Serial.println("  Data path : " + LATEST_PATH);
  Serial.println("===============================================");

  // Check that USER_UID has been configured
  if (String(USER_UID) == "PASTE_YOUR_USER_UID_HERE") {
    Serial.println("\n*** WARNING: USER_UID not configured! ***");
    Serial.println("*** Copy your UID from the dashboard Settings ***");
    Serial.println("*** and paste it in the USER_UID #define. ***\n");
  }

  dht.begin();

  Serial.println("[WiFi] Connecting to SSID: " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
    wifiAttempts++;
  }
  Serial.println();
  Serial.println("[WiFi] Connected!");
  Serial.println("[WiFi]   IP address : " + WiFi.localIP().toString());
  Serial.println("[WiFi]   Signal RSSI: " + String(WiFi.RSSI()) + " dBm");
  Serial.println("[WiFi]   Attempts   : " + String(wifiAttempts));

  syncTime();

  Serial.println("[Firebase] Configuring...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Anonymous sign-in — matches the dashboard's security model where
  // the ESP32 doesn't need a Google account, just any authenticated write.
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("[Firebase] Anonymous sign-in OK");
    signUpOk = true;
  } else {
    Serial.println("[Firebase] Sign-up FAILED: " + String(config.signer.signupError.message.c_str()));
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  randomSeed(analogRead(0));

  Serial.println("===============================================");
  Serial.println("  Setup complete.");
  Serial.println("  " + LATEST_PATH + " -> updated every " + String(SAMPLE_INTERVAL_MS / 1000) + "s");
  Serial.println("  " + HISTORY_BASE + " -> logged every " + String(HISTORY_INTERVAL_MS / 1000) + "s");
  Serial.println("===============================================\n");
}

// Smoothly drifting placeholder value with a little jitter
float placeholderWave(float minVal, float maxVal, unsigned long periodMs, float phaseOffset) {
  float t = (float)millis() / (float)periodMs;
  float wave = (sin(2.0 * PI * t + phaseOffset) + 1.0) / 2.0;
  float jitter = (random(-100, 100) / 100.0) * 0.03;
  float normalized = constrain(wave + jitter, 0.0, 1.0);
  return minVal + normalized * (maxVal - minVal);
}

// Runs every 5 seconds: reads sensors AND writes /users/{uid}/devices/{id}/latest to Firebase
void sampleSensors() {
  sampleCount++;

  if (USE_PLACEHOLDER_DATA) {
    moistureVal = (int)placeholderWave(20, 80, 60000, 0.0);
    temperatureVal = placeholderWave(22.0, 34.0, 90000, 1.0);
    waterLevelVal = (int)placeholderWave(10, 100, 45000, 2.0);
    lightVal = (int)placeholderWave(0, 100, 30000, 3.0);
  } else {
    soilVal = analogRead(soilPin);
    moistureVal = constrain(map(soilVal, drySoil, wetSoil, 0, 100), 0, 100);

    temperatureVal = dht.readTemperature();
    if (isnan(temperatureVal)) {
      Serial.println(nowPrefix() + "[Sensor] WARNING: DHT read failed (NaN), using fallback -1");
      temperatureVal = -1;
    }

    waterLevelRaw = analogRead(waterLevelPin);
    waterLevelVal = constrain(map(waterLevelRaw, waterLevelMin, waterLevelMax, 0, 100), 0, 100);

    lightRaw = analogRead(lightPin);
    lightVal = constrain(map(lightRaw, lightDark, lightBright, 0, 100), 0, 100);
  }

  unsigned long msUntilNextHistory = HISTORY_INTERVAL_MS - (millis() - historyPrevMillis);
  Serial.println(nowPrefix() + "[Sample #" + String(sampleCount) + "] Moisture=" + String(moistureVal) + "% Temp=" + String(temperatureVal, 1) + "C Water=" + String(waterLevelVal) + "% Light=" + String(lightVal) + "%  (next history write in " + String(msUntilNextHistory / 1000) + "s)");

  // ---- Write /users/{uid}/devices/{id}/latest every 5 seconds ----
  if (Firebase.ready() && signUpOk) {
    time_t now;
    struct tm timeinfo;
    char timeStr[25] = "unsynced";
    double epoch = 0;

    if (getLocalTime(&timeinfo, 200)) {
      time(&now);
      epoch = (double)now;
      strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", &timeinfo);
    }

    FirebaseJson latestJson;
    latestJson.set("moisture", moistureVal);
    latestJson.set("temperature", temperatureVal);
    latestJson.set("waterLevel", waterLevelVal);
    latestJson.set("light", lightVal);
    latestJson.set("timestamp_epoch", epoch);
    latestJson.set("timestamp_str", timeStr);

    if (Firebase.RTDB.setJSON(&fbdo, LATEST_PATH.c_str(), &latestJson)) {
      Serial.println(nowPrefix() + "[Latest] Updated OK -> " + LATEST_PATH);
    } else {
      Serial.println(nowPrefix() + "[Latest] FAILED - reason: " + fbdo.errorReason());
    }
  } else {
    Serial.println(nowPrefix() + "[Latest] SKIPPED - Firebase not ready/signed in");
  }
}

// Runs every 60 seconds: writes one entry under /users/{uid}/devices/{id}/history
void saveHistoryToFirebase() {
  historyCount++;
  Serial.println("-----------------------------------------------");
  Serial.println(nowPrefix() + "[History #" + String(historyCount) + "] Attempting Firebase write...");

  if (!Firebase.ready()) {
    Serial.println(nowPrefix() + "[History] SKIPPED - Firebase not ready.");
    Serial.println("-----------------------------------------------");
    return;
  }
  if (!signUpOk) {
    Serial.println(nowPrefix() + "[History] SKIPPED - not signed in to Firebase.");
    Serial.println("-----------------------------------------------");
    return;
  }

  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 1000)) {
    Serial.println(nowPrefix() + "[History] Time not synced - retrying NTP...");
    syncTime();
    if (!getLocalTime(&timeinfo, 1000)) {
      Serial.println(nowPrefix() + "[History] SKIPPED - still no valid time.");
      Serial.println("-----------------------------------------------");
      return;
    }
  }
  time(&now);

  char timeStr[25];
  strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", &timeinfo);

  String entryKey = String((unsigned long)now);
  String basePath = HISTORY_BASE + "/" + entryKey;

  FirebaseJson json;
  json.set("moisture", moistureVal);
  json.set("temperature", temperatureVal);
  json.set("waterLevel", waterLevelVal);
  json.set("light", lightVal);
  json.set("timestamp_epoch", (double)now);
  json.set("timestamp_str", timeStr);

  Serial.println(nowPrefix() + "[History] Writing to: " + basePath);
  Serial.println(nowPrefix() + "[History]   Moisture=" + String(moistureVal) + "% Temp=" + String(temperatureVal, 1) + "C Water=" + String(waterLevelVal) + "% Light=" + String(lightVal) + "%");

  if (Firebase.RTDB.setJSON(&fbdo, basePath.c_str(), &json)) {
    Serial.println(nowPrefix() + "[History] SUCCESS - saved at " + String(timeStr));
  } else {
    Serial.println(nowPrefix() + "[History] FAILED - reason: " + fbdo.errorReason());
  }

  Serial.println(nowPrefix() + "[Status] WiFi RSSI: " + String(WiFi.RSSI()) + " dBm | Free heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("-----------------------------------------------\n");
}

void loop() {
  unsigned long now = millis();

  // Periodic WiFi watchdog message so you know it's alive even between events
  static unsigned long lastWifiCheck = 0;
  if (now - lastWifiCheck > 15000) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(nowPrefix() + "[WiFi] WARNING: disconnected, attempting reconnect...");
    }
  }

  // ---- Every 5 seconds: sample sensors + write /users/{uid}/devices/{id}/latest ----
  if (now - sampleprevMillis > SAMPLE_INTERVAL_MS || sampleprevMillis == 0) {
    sampleprevMillis = now;
    sampleSensors();
  }

  // ---- Every 1 minute: write one entry to /users/{uid}/devices/{id}/history ----
  if (now - historyPrevMillis > HISTORY_INTERVAL_MS || historyPrevMillis == 0) {
    historyPrevMillis = now;
    saveHistoryToFirebase();
  }
}