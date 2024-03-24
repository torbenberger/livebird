# livebird

## setup modem

- Sdkarte mit raspberry os bespielen (2020-08-20-raspios-buster-armhf) ( https://downloads.raspberrypi.org/raspios_armhf/images/raspios_armhf-2020-08-24/)
  - Host, password, user, alles auf livebird
  - SSH enabled, auth with password
  - WLAN aus!

- follow: https://www.waveshare.com/wiki/SIM820X_RNDIS_Dail-up

[//]: # (- follow: https://www.waveshare.com/wiki/SIM8200EA-M2_5G_HAT_is_equipped_with_Raspbian_Pi_to_open_hotspots &#40;only AP setup 4-7&#41;)


## setup system
- `sudo apt update`

### install vim
`sudo apt install -y vim`


### install and configure access point
- `git clone https://github.com/oblique/create_ap`
- `cd create_ap`
- `sudo apt install util-linux procps hostapd iproute2 iw haveged dnsmasq`
- `sudo make install`
- `sudo vim /etc/create_ap.conf` => set settings livebird livebird inetiface: usb0 
- `apt install iptables`
- `sudo systemctl enable create_ap`


### configure dns stuff
set dns
`sudo vim /etc/dhcpcd.conf` =>
```
interface usb0
static domain_name_servers=8.8.8.8 114.114.114.114
```
configure udhcpc
- `sudo apt install udhcpc`
- `sudo dhclient -v usb0`
- `sudo udhcpc -i usb0`
- `sudo route add -net 0.0.0.0 usb0`

setup service to start usb stuff
`sudo vim /etc/systemd/system/setup-usb0.service` =>
```
[Unit]
Description=Setup usb0 Network Interface

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'dhclient -v usb0; udhcpc -i usb0; route add -net 0.0.0.0 usb0; ifconfig usb0 up'

[Install]
WantedBy=multi-user.target
```

install ip tables
- `sudo systemctl daemon-reload`
- `sudo systemctl start setup-usb0.service`


### install docker
- `curl -fsSL https://get.docker.com -o get-docker.sh`
- `sudo sh get-docker.sh`
- `sudo apt update`
- `sudo apt install docker-compose-plugin`


### i2c display setup
`sudo raspi-config` => 
    interfaceing options
    enable i2c
`sudo apt install -y i2c-tools`


### clone project to external drive
- (insert ssh key to github first, `ssh-keygen -t ed25519 -C "livebird@torbenberger.de"`)
- `cd /media/livebird/INTENSO/`
- `git clone git@github.com:torbenberger/livebird.git`


### prepare docker compose service
insert this in new service file under /etc/systemd/system/docker-compose.service =>
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
ExecStartPre=-docker compose down -v
# Start fresh containers
ExecStart=docker compose up -d
# Stop containers on service stop
ExecStop=docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```


`sudo systemctl enable docker-compose.service`

### start docker first time
-`cd /media/livebird/INTENSO/livebird`
-`docker compose up -d`

### configure gpio pins
-`sudo vim /boot/firmware/config.txt` =>
add `gpio=16,21=pu`

### now make file system read only

`sudo raspi-config` =>
performance options => overlay file system => both yes
(if you want to edit => `sudo mount -o remount,rw /boot`)

`sudo reboot now`
