#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

#define DHTPIN D5
#define DHTTYPE DHT11
#define SDA_PIN D2
#define SCL_PIN D1

const char* ssid = "Aradhy";
const char* password = "aradhy1234567";
const char* serverName = "https://smartsparks.onrender.com";

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiClientSecure client;

void setup() {
  Serial.begin(115200);

  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTING WiFi");

  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi CONNECTED");
    lcd.setCursor(0, 1);
    lcd.print("--WELCOME--");
    Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi FAILED!");
    Serial.println("\nWiFi connection failed!");
  }

  delay(2000);
  dht.begin();
  client.setInsecure();
}

bool sendSensorData(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping send.");
    return false;
  }

  HTTPClient http;
  String url = String(serverName) + "/api/save-data";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000); // 15 second timeout (server may be waking up)

  String jsonPayload = "{\"temperature\":" + String(temperature, 1) +
                       ",\"humidity\":" + String(humidity, 1) + "}";

  Serial.println("Sending: " + jsonPayload);
  int httpCode = http.POST(jsonPayload);
  Serial.println("HTTP Code: " + String(httpCode));

  bool success = (httpCode == 200 || httpCode == 201);
  if (!success) {
    Serial.println("Send failed. Error: " + http.errorToString(httpCode));
  }
  http.end();
  return success;
}

String fetchLCDText() {
  if (WiFi.status() != WL_CONNECTED) return "";

  HTTPClient http;
  http.begin(client, String(serverName) + "/api/get-lcd");
  http.setTimeout(15000);
  int httpCode = http.GET();

  String result = "";
  if (httpCode == 200) {
    result = http.getString();
    result.trim();
  }
  http.end();
  return result;
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Check for bad sensor readings
  if (isnan(temperature) || isnan(humidity)) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SENSOR ERROR!");
    lcd.setCursor(0, 1);
    lcd.print("Check DHT11");
    Serial.println("DHT11 read failed!");
    delay(3000);
    return;
  }

  // Show temperature
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("TEMPERATURE");
  lcd.setCursor(0, 1);
  lcd.print(String(temperature, 1));
  lcd.print(" 'C");
  Serial.println("Temp: " + String(temperature) + " | Humidity: " + String(humidity));
  delay(2000);

  // Show humidity
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HUMIDITY");
  lcd.setCursor(0, 1);
  lcd.print(String(humidity, 1));
  lcd.print("%");
  delay(2000);

  // Fetch and show LCD text
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("FETCHING MSG...");
  String lcdMsg = fetchLCDText();
  if (lcdMsg.length() > 0) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SISTec DISPLAY");
    lcd.setCursor(0, 1);
    lcd.print(lcdMsg.substring(0, 16));
    delay(3000);
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("NO MSG / SERVER");
    lcd.setCursor(0, 1);
    lcd.print("WAKING UP...");
    delay(2000);
  }

  // Send data with retry
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SENDING DATA...");
  lcd.setCursor(0, 1);
  lcd.print("Please wait...");

  bool sent = sendSensorData(temperature, humidity);

  // Retry once if failed (server may have been sleeping)
  if (!sent) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("RETRYING...");
    delay(5000);
    sent = sendSensorData(temperature, humidity);
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  if (sent) {
    lcd.print("DATA SENT OK!");
    Serial.println("Data sent successfully!");
  } else {
    lcd.print("SEND FAILED!");
    lcd.setCursor(0, 1);
    lcd.print("Server asleep?");
    Serial.println("Data send failed after retry.");
  }
  delay(2000);
}
