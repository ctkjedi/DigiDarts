// Network Stuff
#include <ArduinoJson.h>
#include <WiFi.h>
#include <ArduinoHttpClient.h>

const char* ssid = "YOUR_SSID_HERE";
const char* password = "YOUR_PW_HERE";
const char* serverAddress = "YOUR_SERVER_IP_HERE";
const int serverPort = 3000;

WiFiClient wifiClient;
HttpClient http(wifiClient, serverAddress, serverPort);


//vars for ESP32
const int bigRedBtn = 15;
int bigRedState = 0;
int lastButtonState = HIGH;
unsigned long lastPressTime = 0;
unsigned long debounceDelay = 1000;

const int masterLines = 12; //The number of rows in your dartboard matrix (higher number)
const int slaveLines = 7; //The number of columns in your dartboard matrix (lower number)

int matrixMaster[] = {26, 27, 14, 12, 13, 23, 22, 21, 19, 18, 5, 17}; //arduino pins for matrix rows
int matrixSlave[] = {39, 36, 35, 34, 33, 32, 25}; //arduino pins for matrix columns

// point values based on row/column combinations. Comments are for pin reference
int values01[masterLines][slaveLines] = {
  // 39 36  35  34  33  32  25
  { 4, 13,  8, 39, 13,  4, 12}, //26
  {18,  6, 36, 18, 54, 18,  6}, //27
  {30, 10,  2, 10,  3,  1,  1}, //14
  {45, 15, 40, 15, 60, 20, 20}, //12
  { 2, 50, 10, 30, 12, 26, 20}, //13
  { 5, 12, 24, 15,  5, 12, 36}, //23
  { 3, 25, 14,  4,  6, 38, 34}, //22
  { 2,  6, 18,  2, 27,  9,  9}, //21
  {17, 51, 28, 17, 42, 14, 14}, //19
  { 3,  9, 22,  3, 33, 11, 11}, //18
  { 7, 16, 32, 21,  7, 16, 48}, //5
  {19, 57, 16,  8, 24,  8, 19}, //17
};

//create arrays specifying special multiplier points - triple, double, bull
//each number in the array is simply to corresponding pin combo concatenated
const int x3Len = 20;
const int x2Len = 21;
const int cricketHitsLen = 26;
int x3[] = {1433, 2136, 1836, 2625, 2334, 2739, 534, 1733, 2133, 1439, 1833, 2325, 2634, 1933, 1239, 525, 1936, 2733, 1736, 1233};
int x2[] = {1435, 2234, 2233, 2635, 1335, 1333, 2235, 1735, 2135, 1325, 1835, 2335, 1332, 1935, 1334, 535, 2225, 2735, 2232, 1235, 1336};
int cricketHits[] = {1336,2236,1225,1232,1233,1235,1725,1736,1739,2232,2732,2733,2734,2735,1934,1936,1939,2225,525,532,535,536,1234,1236,1239,1334};

String multi = "";

//timer stuff
unsigned long previousMillis = 0;
const long interval = 500;

void setup() {
  Serial.begin(115200);

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  Serial.println(multi);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Connected to Wi-Fi");
  Serial.println(WiFi.localIP());

  pinMode(bigRedBtn, INPUT_PULLUP);
  digitalWrite(bigRedBtn, LOW);
  multi = "Press Start";
  Serial.println(multi);


  // Initialize matrix pins

  for (int j = 0; j < slaveLines; j++) {
    pinMode(matrixSlave[j], INPUT_PULLUP);
  }
  for (int i = 0; i < masterLines; i++) {
    pinMode(matrixMaster[i], OUTPUT);
    digitalWrite(matrixMaster[i], HIGH);
  }

  delay(1000);
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    // Add periodic actions here if needed
  }
  throwCheck();
  bigRedCheck();

  //delay(50);

}

//Checks to see if physical button on dartboard has been pressed
void bigRedCheck() {
  bigRedState = digitalRead(bigRedBtn);
  if (lastButtonState == LOW && bigRedState == LOW){
    Serial.println("don't do anything, button is held");
  }else if(lastButtonState == HIGH && bigRedState == LOW){
    Serial.println("this is where everything is done");
    lastButtonState = LOW;
    Serial.println("Big Red");
    sendData(0, "bigRed", 0);
    //delay(50);
  }else{
    if(lastButtonState!=HIGH){
      Serial.println("set it back to high");
      lastButtonState = HIGH;
    }
    
  }
//  if (bigRedState == LOW && millis() - lastPressTime > debounceDelay) {
//    lastPressTime = millis();
//    Serial.println("Big Red");
//    sendData(0, "bigRed");
//    delay(50);
//  }
  //digitalWrite(bigRedState, HIGH);
}

//button cycler
void throwCheck() {
  for (int i = 0; i < masterLines; i++) {
    digitalWrite(matrixMaster[i], LOW);
    for (int j = 0; j < slaveLines; j++) {
      if (digitalRead(matrixSlave[j]) == LOW) {
        multiCheck(matrixMaster[i], matrixSlave[j]);

        Serial.print("Score: ");
        Serial.println(values01[i][j]);
        Serial.println("Master: " + String(matrixMaster[i]) + "   Slave: " + String(matrixSlave[j]));
        sendData(values01[i][j], multiCheck(matrixMaster[i], matrixSlave[j]), cricketCheck(matrixMaster[i], matrixSlave[j]));
        //delay(50);
        break;
      }
    }
    digitalWrite(matrixMaster[i], HIGH);
  }
}

int cricketCheck(int M, int S){
  int zoneCheck = M * 100 + S;
  for (int x=0; x < cricketHitsLen; x++)
  {
    if(zoneCheck==cricketHits[x]){
      return 1;
      break;
    }
  }
}

//checks to see if multiiplier or bulls eye have been hit.
String multiCheck(int M, int S) {
  int count = 0;
  int zoneCheck = M * 100 + S;
  for (int i = 0; i < x2Len; i++) {
    if (x2[i] == zoneCheck) {
      count = 1;
      multi = "DOUBLE";
    } else if (x3[i] == zoneCheck) {
      count = 1;
      multi = "TRIPLE";
    }
    if (zoneCheck == 1336) {
      count = 1;
      multi = "DBLBULL";
    };
    if (zoneCheck == 2236) {
      count = 1;
      multi = "BULL";
    };
    if (count == 0) multi = "";
  }
  return multi;
  Serial.println(multi);
}


void sendData(int point, String msg, int cricket) {
  if (WiFi.status() == WL_CONNECTED) {
    StaticJsonDocument<200> doc;
    doc["point"] = String(point);
    doc["message"] = String(msg);
    doc["cricket"] = String(cricket);

    // Serialize JSON to a String
    String jsonString;
    serializeJson(doc, jsonString);

    // Send HTTP POST request with JSON data
    http.beginRequest();
    http.post("/data", "application/json", jsonString);
    int httpResponseCode = http.responseStatusCode();
    String response = http.responseBody();
    http.endRequest();
  }
}
