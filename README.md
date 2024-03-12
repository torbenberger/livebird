# livebird

## setup

- Sdkarte mit raspberry os bespielen (2020-08-20-raspios-buster-armhf) ( https://downloads.raspberrypi.org/raspios_armhf/images/raspios_armhf-2020-08-24/)
  - Host, password, user, alles auf livebird
  - SSH enabled, auth with password
  - WLAN aus!

- follow: https://www.waveshare.com/wiki/SIM820X_RNDIS_Dail-up
- follow: https://www.waveshare.com/wiki/SIM8200EA-M2_5G_HAT_is_equipped_with_Raspbian_Pi_to_open_hotspots (only AP setup 4-7)
-
```
  git clone https://github.com/oblique/create_ap
  cd create_ap
  make install
```
- `apt-get update`
- `apt-get install vim`
- `sudo vim /etc/create_ap.conf`

- `sudo apt-get install udhcpc`
`sudo vim /etc/dhcpcd.conf`
```
interface usb0
static domain_name_servers=8.8.8.8 114.114.114.114
```

- `sudo nano /etc/systemd/system/setup-usb0.service`
```
  [Unit]
Description=Setup usb0 Network Interface

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'dhclient -v usb0; udhcpc -i usb0; route add -net 0.0.0.0 usb0; ifconfig usb0 up'

[Install]
WantedBy=multi-user.target
```
`apt-get install iptables`
- `sudo systemctl daemon-reload`
- `sudo systemctl start setup-usb0.service`



# install docker
`curl -fsSL https://get.docker.com -o get-docker.sh`
`sudo sh get-docker.sh`

`sudo apt-get update`
`sudo apt-get install docker-compose-plugin`


# i2c display setup

`sudo raspi-config`
interfaceing options
enable i2c
`sudo apt-get install -y i2c-tools`
`sudo apt-get update`
`sudo apt-get install python3-dev libffi-dev libssl-dev python3-pil libjpeg-dev zlib1g-dev libfreetype6-dev liblcms2-dev libopenjp2-7 libtiff5-dev -y`
`sudo apt-get install python3-rpi.gpio python3-pip -y`
`sudo apt install python3-luma.oled`


# prepare docker compose service
insert this in new service file under /etc/systemd/system/docker-compose@.service

```
[Unit]
Description=Docker Compose Application Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
WorkingDirectory=/media/livebird/INTENSO/livebird
# Stop and remove all existing containers and volumes
ExecStartPre=/usr/local/bin/docker-compose down -v
# Start fresh containers
ExecStart=/usr/local/bin/docker-compose up -d
# Stop containers on service stop
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable docker-compose@your_project.service`

`sudo reboot now`



