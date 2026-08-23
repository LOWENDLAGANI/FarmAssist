#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <time.h>
#include <Preferences.h>
#include <WebServer.h>
#include <Adafruit_NeoPixel.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define API_KEY "AIzaSyAlLaKUR4q8CZTMFlAFRTM-ToncomN4Ugs"
#define DATABASE_URL "https://farmassist-2425-default-rtdb.asia-southeast1.firebasedatabase.app/"

#define DEFAULT_WIFI_SSID "Minetallest's POCO X7"
#define DEFAULT_WIFI_PASSWORD "TESTER123"
#define DEFAULT_USER_UID "tsYo3zKfr8SSowOE23lPQe8Kb0v2"
#define DEFAULT_DEVICE_ID "esp32-farm-001"
#define FIRMWARE_VERSION "0.1.0"

#define DEFAULT_SAMPLE_INTERVAL_MS 5000
#define DEFAULT_HISTORY_INTERVAL_MS 60000
#define DEFAULT_WIFI_CHECK_INTERVAL_MS 15000

#define AP_SSID "FarmAssist-Setup"
#define AP_PASSWORD "setup1234"

#define WEB_AUTH_USER "admin"
#define WEB_AUTH_PASS "admin123"

#define LED_PIN 48
#define LED_COUNT 1

Preferences prefs;
WebServer server(80);
Adafruit_NeoPixel statusLed(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

String cfgSsid;
String cfgPass;
String cfgUserUid;
String cfgDeviceId;
unsigned long cfgSampleInterval;
unsigned long cfgHistoryInterval;
unsigned long cfgWifiCheckInterval;

String LATEST_PATH;
String HISTORY_BASE;
String REGISTRY_PATH;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const long gmtOffset_sec = 8 * 3600;
const int daylightOffset_sec = 0;
const char* ntpServer1 = "pool.ntp.org";
const char* ntpServer2 = "time.nist.gov";
bool timeSynced = false;

unsigned long sampleprevMillis = 0;
unsigned long historyPrevMillis = 0;
unsigned long lastWifiCheck = 0;
unsigned long sampleCount = 0;
unsigned long historyCount = 0;
bool signUpOk = false;
bool isOwner = true;
unsigned long lastOwnershipCheck = 0;
#define OWNERSHIP_CHECK_INTERVAL_MS 30000

unsigned long ledLastUpdate = 0;
bool ledBlinkState = false;
uint16_t ledHue = 0;

#define USE_PLACEHOLDER_DATA true

int soilPin = 32;
int soilVal;
int moistureVal;
const int drySoil = 3000;
const int wetSoil = 1000;

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);
float temperatureVal;

int waterLevelPin = 34;
int waterLevelRaw;
int waterLevelVal;
const int waterLevelMin = 0;
const int waterLevelMax = 4095;

int lightPin = 35;
int lightRaw;
int lightVal;
const int lightDark = 4095;
const int lightBright = 0;

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

void loadConfig() {
  prefs.begin("cfg", false);
  cfgSsid = prefs.getString("ssid", DEFAULT_WIFI_SSID);
  cfgPass = prefs.getString("pass", DEFAULT_WIFI_PASSWORD);
  cfgUserUid = prefs.getString("uid", DEFAULT_USER_UID);
  cfgDeviceId = prefs.getString("devid", DEFAULT_DEVICE_ID);
  cfgSampleInterval = prefs.getULong("sampint", DEFAULT_SAMPLE_INTERVAL_MS);
  cfgHistoryInterval = prefs.getULong("histint", DEFAULT_HISTORY_INTERVAL_MS);
  cfgWifiCheckInterval = prefs.getULong("wifiint", DEFAULT_WIFI_CHECK_INTERVAL_MS);
  prefs.end();

  LATEST_PATH = "/users/" + cfgUserUid + "/devices/" + cfgDeviceId + "/latest";
  HISTORY_BASE = "/users/" + cfgUserUid + "/devices/" + cfgDeviceId + "/history";
  REGISTRY_PATH = "/rover_registry/" + cfgDeviceId;
}

void saveConfig(String ssid, String pass, String uid, String devid, unsigned long sampint, unsigned long histint, unsigned long wifiint) {
  prefs.begin("cfg", false);
  prefs.putString("ssid", ssid);
  prefs.putString("pass", pass);
  prefs.putString("uid", uid);
  prefs.putString("devid", devid);
  prefs.putULong("sampint", sampint);
  prefs.putULong("histint", histint);
  prefs.putULong("wifiint", wifiint);
  prefs.end();
}

bool checkAuth() {
  if (!server.authenticate(WEB_AUTH_USER, WEB_AUTH_PASS)) {
    server.requestAuthentication();
    return false;
  }
  return true;
}

String buildConfigPage() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>FarmAssist Config</title>";
  html += "<style>body{font-family:sans-serif;max-width:480px;margin:20px auto;padding:0 10px}";
  html += "input{width:100%;padding:8px;margin:6px 0;box-sizing:border-box}";
  html += "label{font-weight:bold}button{padding:10px 20px;margin-top:12px}</style></head><body>";
  html += "<h2>FarmAssist Device Config</h2><form method='POST' action='/save'>";

  html += "<label>WiFi SSID</label><input name='ssid' value='" + cfgSsid + "'>";
  html += "<label>WiFi Password</label><input name='pass' type='password' value='" + cfgPass + "'>";
  html += "<label>User UID</label><input name='uid' value='" + cfgUserUid + "'>";
  html += "<label>Device ID</label><input name='devid' value='" + cfgDeviceId + "'>";
  html += "<label>Latest Write Interval (ms)</label><input name='sampint' type='number' value='" + String(cfgSampleInterval) + "'>";
  html += "<label>History Write Interval (ms)</label><input name='histint' type='number' value='" + String(cfgHistoryInterval) + "'>";
  html += "<label>WiFi Check Interval (ms)</label><input name='wifiint' type='number' value='" + String(cfgWifiCheckInterval) + "'>";

  html += "<button type='submit'>Save and Restart</button></form></body></html>";
  return html;
}

void handleRoot() {
  if (!checkAuth()) return;
  server.send(200, "text/html", buildConfigPage());
}

void handleSave() {
  if (!checkAuth()) return;

  String ssid = server.arg("ssid");
  String pass = server.arg("pass");
  String uid = server.arg("uid");
  String devid = server.arg("devid");
  unsigned long sampint = server.arg("sampint").toInt();
  unsigned long histint = server.arg("histint").toInt();
  unsigned long wifiint = server.arg("wifiint").toInt();

  if (sampint < 1000) sampint = 1000;
  if (histint < 5000) histint = 5000;
  if (wifiint < 5000) wifiint = 5000;

  saveConfig(ssid, pass, uid, devid, sampint, histint, wifiint);

  String html = "<html><body><h3>Saved. Restarting device...</h3></body></html>";
  server.send(200, "text/html", html);

  delay(1500);
  ESP.restart();
}

void setupWebServer() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.begin();
}

void checkOwnership() {
  if (!Firebase.ready() || !signUpOk) return;

  FirebaseData snap;
  if (!Firebase.RTDB.getJSON(&snap, REGISTRY_PATH.c_str())) {
    return;
  }

  if (!snap.dataAvailable()) {
    isOwner = true;
    return;
  }

  FirebaseJsonData ownerData;
  FirebaseJsonData pairedData;
  FirebaseJson *json = snap.jsonObjectPtr();

  json->get(ownerData, "ownerUid");
  json->get(pairedData, "paired");

  String ownerUid = ownerData.stringValue;
  bool paired = pairedData.boolValue;

  if (!paired || ownerUid.length() == 0) {
    isOwner = true;
  } else if (ownerUid == cfgUserUid) {
    isOwner = true;
  } else {
    isOwner = false;
  }

  Serial.println(nowPrefix() + "[Ownership] " + String(isOwner ? "OK" : "DENIED") +
                  " (owner=" + ownerUid + ", paired=" + String(paired ? "yes" : "no") + ")");
}

void updateLastSeen() {
  if (!Firebase.ready() || !signUpOk) return;

  double epoch = 0;
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 200)) {
    time_t now;
    time(&now);
    epoch = (double)now;
  }

  FirebaseJson updateJson;
  updateJson.set("lastSeen", epoch > 0 ? (double)epoch * 1000.0 : (double)millis());

  if (Firebase.RTDB.updateNode(&fbdo, REGISTRY_PATH.c_str(), &updateJson)) {
    Serial.println(nowPrefix() + "[Registry] lastSeen updated -> " + REGISTRY_PATH);
  } else {
    Serial.println(nowPrefix() + "[Registry] lastSeen FAILED - reason: " + fbdo.errorReason());
  }
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

void updateStatusLed() {
  bool wifiConnected = (WiFi.status() == WL_CONNECTED);
  bool fullyReady = wifiConnected && Firebase.ready() && signUpOk && isOwner && sampleCount > 0;

  if (!wifiConnected) {
    if (millis() - ledLastUpdate > 300) {
      ledLastUpdate = millis();
      ledBlinkState = !ledBlinkState;
      statusLed.setPixelColor(0, ledBlinkState ? statusLed.Color(255, 0, 0) : statusLed.Color(0, 0, 0));
      statusLed.show();
    }
  } else if (!fullyReady) {
    if (millis() - ledLastUpdate > 300) {
      ledLastUpdate = millis();
      ledBlinkState = !ledBlinkState;
      statusLed.setPixelColor(0, ledBlinkState ? statusLed.Color(255, 255, 255) : statusLed.Color(0, 0, 0));
      statusLed.show();
    }
  } else {
    if (millis() - ledLastUpdate > 20) {
      ledLastUpdate = millis();
      ledHue += 150;
      uint32_t rgbColor = statusLed.gamma32(statusLed.ColorHSV(ledHue));
      statusLed.setPixelColor(0, rgbColor);
      statusLed.show();
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  loadConfig();

  Serial.println("\n\n===============================================");
  Serial.println("  FarmAssist ESP32 - Booting");
  Serial.println("  User UID  : " + cfgUserUid);
  Serial.println("  Device ID : " + cfgDeviceId);
  Serial.println("  Data path : " + LATEST_PATH);
  Serial.println("===============================================");

  statusLed.begin();
  statusLed.setBrightness(60);
  statusLed.show();

  dht.begin();

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  Serial.println("[AP] SSID: " + String(AP_SSID));
  Serial.println("[AP] IP  : " + WiFi.softAPIP().toString());

  setupWebServer();

  Serial.println("[WiFi] Connecting to SSID: " + cfgSsid);
  WiFi.begin(cfgSsid.c_str(), cfgPass.c_str());
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 40) {
    Serial.print(".");
    updateStatusLed();
    delay(300);
    wifiAttempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Connected!");
    Serial.println("[WiFi]   IP address : " + WiFi.localIP().toString());
    Serial.println("[WiFi]   Signal RSSI: " + String(WiFi.RSSI()) + " dBm");
  } else {
    Serial.println("[WiFi] FAILED to connect. AP config portal still available.");
  }

  syncTime();

  Serial.println("[Firebase] Configuring...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

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

  checkOwnership();

  updateLastSeen();
  if (Firebase.ready() && signUpOk) {
    FirebaseJson fwJson;
    fwJson.set("firmwareVersion", FIRMWARE_VERSION);
    Firebase.RTDB.updateNode(&fbdo, REGISTRY_PATH.c_str(), &fwJson);
  }

  Serial.println("===============================================");
  Serial.println("  Setup complete.");
  Serial.println("  Config portal -> http://" + WiFi.softAPIP().toString());
  Serial.println("  " + LATEST_PATH + " -> updated every " + String(cfgSampleInterval / 1000) + "s");
  Serial.println("  " + HISTORY_BASE + " -> logged every " + String(cfgHistoryInterval / 1000) + "s");
  Serial.println("  " + REGISTRY_PATH + "/lastSeen -> heartbeat on every sample");
  Serial.println("  Ownership: " + String(isOwner ? "GRANTED" : "DENIED (update USER_UID to: " + cfgUserUid + ")"));
  Serial.println("===============================================\n");
}

float placeholderWave(float minVal, float maxVal, unsigned long periodMs, float phaseOffset) {
  float t = (float)millis() / (float)periodMs;
  float wave = (sin(2.0 * PI * t + phaseOffset) + 1.0) / 2.0;
  float jitter = (random(-100, 100) / 100.0) * 0.03;
  float normalized = constrain(wave + jitter, 0.0, 1.0);
  return minVal + normalized * (maxVal - minVal);
}

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

  unsigned long msUntilNextHistory = cfgHistoryInterval - (millis() - historyPrevMillis);
  Serial.println(nowPrefix() + "[Sample #" + String(sampleCount) + "] Moisture=" + String(moistureVal) +
                  "% Temp=" + String(temperatureVal, 1) + "C Water=" + String(waterLevelVal) +
                  "% Light=" + String(lightVal) + "%  (next history write in " +
                  String(msUntilNextHistory / 1000) + "s)");

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

    if (!isOwner) {
      Serial.println(nowPrefix() + "[Latest] SKIPPED - not the registered owner. Update USER_UID to: " + cfgUserUid);
    } else {
      if (Firebase.RTDB.setJSON(&fbdo, LATEST_PATH.c_str(), &latestJson)) {
        Serial.println(nowPrefix() + "[Latest] Updated OK -> " + LATEST_PATH);
      } else {
        Serial.println(nowPrefix() + "[Latest] FAILED - reason: " + fbdo.errorReason());
      }
    }

    updateLastSeen();
  } else {
    Serial.println(nowPrefix() + "[Latest] SKIPPED - Firebase not ready/signed in");
  }
}

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
  if (!isOwner) {
    Serial.println(nowPrefix() + "[History] SKIPPED - not the registered owner.");
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
  json.set("value", temperatureVal);
  json.set("timestamp", (double)now * 1000.0);
  json.set("timestamp_epoch", (double)now);
  json.set("timestamp_str", timeStr);

  Serial.println(nowPrefix() + "[History] Writing to: " + basePath);
  Serial.println(nowPrefix() + "[History]   Moisture=" + String(moistureVal) +
                  "% Temp=" + String(temperatureVal, 1) + "C Water=" + String(waterLevelVal) +
                  "% Light=" + String(lightVal) + "%");

  if (Firebase.RTDB.setJSON(&fbdo, basePath.c_str(), &json)) {
    Serial.println(nowPrefix() + "[History] SUCCESS - saved at " + String(timeStr));
  } else {
    Serial.println(nowPrefix() + "[History] FAILED - reason: " + fbdo.errorReason());
  }

  Serial.println(nowPrefix() + "[Status] WiFi RSSI: " + String(WiFi.RSSI()) +
                  " dBm | Free heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("-----------------------------------------------\n");
}

void loop() {
  server.handleClient();
  updateStatusLed();

  unsigned long now = millis();

  if (now - lastOwnershipCheck > OWNERSHIP_CHECK_INTERVAL_MS || lastOwnershipCheck == 0) {
    lastOwnershipCheck = now;
    checkOwnership();
  }

  if (now - lastWifiCheck > cfgWifiCheckInterval) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(nowPrefix() + "[WiFi] WARNING: disconnected, attempting reconnect...");
      WiFi.reconnect();
    }
  }

  if (now - sampleprevMillis > cfgSampleInterval || sampleprevMillis == 0) {
    sampleprevMillis = now;
    sampleSensors();
  }

  if (now - historyPrevMillis > cfgHistoryInterval || historyPrevMillis == 0) {
    historyPrevMillis = now;
    saveHistoryToFirebase();
  }
}