#Importing the Right libraries
import RPi.GPIO as GPIO
# import requests
# from time import sleep
# import subprocess

GPIO.setmode(GPIO.BCM)
# GPIO.setwarnings(False)

autoLiveSwitchPin = 21
# runningPin = 23
wifiSwitchPin = 16

GPIO.setup(autoLiveSwitchPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(wifiSwitchPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# autoLiveSwitchPinStatus = None
# backendAvailable = False

# import time

# def throttle(seconds):
#     def decorator(func):
#         func.last_called = 0

#         def wrapper(*args, **kwargs):
#             if time.time() - func.last_called > seconds:
#                 result = func(*args, **kwargs)
#                 func.last_called = time.time()
#                 return result
#             else:
#                 print(f"Function {func.__name__} called too soon. Ignoring...")

#         return wrapper
#     return decorator


# @throttle(10)
# def sendWifiToggleToBackend(arg):
#     global backendAvailable

#     if(not backendAvailable):
#         return

#     print("toggle wifi button pressed")
#     # requests.post("http://backend:5555/api/wifiToggle", json = {"toggle": 1})


# def sendAutoliveUpdate():
#     global autoLiveSwitchPinStatus
#     global backendAvailable

#     if(not backendAvailable):
#         return

#     newAutoLiveSwitchPinStatus = GPIO.input(autoLiveSwitchPin)
#     print(newAutoLiveSwitchPinStatus)
#     if(autoLiveSwitchPinStatus == newAutoLiveSwitchPinStatus):
#         return
    
#     autoLiveSwitchPinStatus = newAutoLiveSwitchPinStatus
#     print("autolive switched", autoLiveSwitchPinStatus)

#     # requests.post("http://backend:5555/api/autolive", json = {"autolive": autoLiveSwitchPinStatus})


# GPIO.add_event_detect(wifiSwitchPin, GPIO.RISING, callback=sendWifiToggleToBackend, bouncetime=5000)

# while not backendAvailable:
#     # infoCall = requests.get('http://backend:5555/api/health')

#     print("infocall")

#     # if(infoCall.status_code):
#     #     print("backend available")
#     #     backendAvailable = True


# while True:
#     print("blubb")
#     sendAutoliveUpdate()
#     sleep(1)