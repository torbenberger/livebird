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

### install stuff 
- `sudo apt install -y --no-install-recommends udhcpc ffmpeg v4l-utils iptables psmisc sudo util-linux vim util-linux procps hostapd iproute2 iw haveged dnsmasq`
- `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash`
```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```
- `nvm install stable`

### install and configure access point
- `git clone https://github.com/oblique/create_ap`
- `cd create_ap`
- `sudo make install`
- `sudo vim /etc/create_ap.conf` => set settings livebird livebird inetiface: usb0 
- `sudo systemctl enable create_ap`


### configure dns stuff
set dns
`sudo vim /etc/dhcpcd.conf` =>
```
interface usb0
static domain_name_servers=8.8.8.8 114.114.114.114
```
configure udhcpc
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


### i2c display setup
`sudo raspi-config` => 
    interfaceing options
    enable i2c
`sudo apt install -y i2c-tools`


### configure gpio pins
-`sudo vim /boot/firmware/config.txt` =>
add `gpio=16,21=pu`
- `pinctrl set 16 pu`
- `pinctrl set 21 pu`


### setup project
- (insert ssh key to github first, `ssh-keygen -t ed25519 -C "livebird@torbenberger.de"`)
- `cd ~/app`
- `git clone git@github.com:torbenberger/livebird.git`
- `cd /frontend`
- `npm install --legacy-peer-deps`
- `npm run build`
- `cd ../backend`
- `npm install --legacy-peer-deps`
- `sudo visudo` => add `root ALL=(ALL) NOPASSWD: ALL`
- `mkidr /media/livebird/INTENSO/.node-persist`
- `npm run start`
- `cancel`
- `sudo vim /etc/systemd/system/livebird.service` => 
```
[Unit] 
Description=livebird app 
After=network.target 
 
[Service] 
Type=forking 
Environment=PATH=/home/livebird/.nvm/versions/node/v21.7.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games 
WorkingDirectory=/home/livebird/app/livebird/backend 
ExecStart=/home/livebird/.nvm/versions/node/v21.7.1/bin/npm run start
 
[Install] 
WantedBy=multi-user.target
```
`sudo systemctl daemon-reload`
`sudo systemctl enable livebird-service`

`reboot`




### now make file system read only
- `sudo raspi-config => performance options => overlay file system => both yes (if you want to edit => sudo mount -o remount,rw /boot)`
- `sudo reboot now`
