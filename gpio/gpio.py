#Importing the Right libraries
import RPi.GPIO as GPIO
import requests
from time import sleep
import subprocess

GPIO.setmode(GPIO.BCM)

switchPin = 18
runningPin = 23
wifiSwitchPin = 16

GPIO.setup(switchPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(wifiSwitchPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(runningPin, GPIO.OUT)
GPIO.output(runningPin, GPIO.HIGH)

import time

def throttle(seconds):
    def decorator(func):
        func.last_called = 0

        def wrapper(*args, **kwargs):
            if time.time() - func.last_called > seconds:
                result = func(*args, **kwargs)
                func.last_called = time.time()
                return result
            else:
                print(f"Function {func.__name__} called too soon. Ignoring...")

        return wrapper
    return decorator


@throttle(10)
def sendWifiToggleToBackend(arg):
    print("toggle wifi button pressed")
    requests.post("http://backend:5555/api/wifiToggle", json = {"toggle": 1})


GPIO.add_event_detect(wifiSwitchPin, GPIO.RISING, callback=sendWifiToggleToBackend, bouncetime=5000)



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
