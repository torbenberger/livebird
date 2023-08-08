import RPi.GPIO as GPIO

autoLiveSwitchPin = 18
wifiSwitchPin = 16

GPIO.setup(autoLiveSwitchPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(wifiSwitchPin, GPIO.IN, pull_up_down=GPIO.PUD_UP)