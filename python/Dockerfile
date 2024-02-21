FROM python:3.9

WORKDIR /app/gpio

COPY gpio ./

RUN apt-get update && apt-get install -y --no-install-recommends python3

RUN python3 -m pip install RPi.GPIO

# RUN python3 -m pip install requests

CMD ["python3", "-u", "gpio.py"]

