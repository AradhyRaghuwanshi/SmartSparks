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
const char* serverName = "https://your-render-deployment-url.com";

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiClientSecure client;

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTING TO WiFi");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    lcd.print(".");
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTED TO WiFi");
  lcd.setCursor(0, 1);
  lcd.print("--WELCOME--");
  delay(2000);

  dht.begin();
  client.setInsecure();
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("TEMPERATURE");
  lcd.setCursor(0, 1);
  lcd.print(temperature);
  lcd.print(" 'C");
  delay(2000);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HUMIDITY");
  lcd.setCursor(0, 1);
  lcd.print(humidity);
  lcd.print("%");
  delay(2000);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("FETCHING LCD TXT");

  HTTPClient http;
  http.begin(client, String(serverName) + "/api/get-lcd");
  int httpCode = http.GET();
  if (httpCode > 0) {
    String payload = http.getString();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SISTec DISPLAY");
    lcd.setCursor(0, 1);
    lcd.print(payload.substring(0, 16));
    delay(3000);
  }
  http.end();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SENDING DATA TO");
  lcd.setCursor(0, 1);
  lcd.print("WEB SERVER....");

  http.begin(client, String(serverName) + "/api/save-data");
  http.addHeader("Content-Type", "application/json");
  String jsonPayload = String("{\"temperature\":") + temperature + ",\"humidity\":" + humidity + "}";
  httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("DATA SENT...!!");
    delay(1000);
  }
  http.end();
}