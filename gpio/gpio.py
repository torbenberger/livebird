#Importing the Right libraries
import RPi.GPIO as GPIO
import requests
from time import sleep

GPIO.setmode(GPIO.BCM)

switchPin = 18
GPIO.setup(switchPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

backendAvailable = False

def sendStateToBe(state):
    requests.post("http://backend:5555/api/autolive", json = {"autolive": state})


while not backendAvailable:
    infoCall = requests.get('http://backend:5555/api/health')

    if(infoCall.status_code):
        backendAvailable = True
        print("backend available")
        sendStateToBe(not GPIO.input(switchPin))

        while True:
            sendStateToBe(not GPIO.input(switchPin))
            sleep(5)
        
    sleep(1)
