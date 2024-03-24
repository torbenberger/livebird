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

### configure gpio pins
-`sudo vim /boot/firmware/config.txt` =>
add `gpio=16,21=pu`
`pinctrl set 16 pu`
`pinctrl set 21 pu`



### prepare docker compose service
insert this in new service file under /etc/systemd/system/docker-compose.service =>
- `sudo vim /etc/systemd/system/docker-compose.service`
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


### now make file system read only

- `sudo apt-get update && apt-get upgrade`
- `sudo apt-get remove --purge triggerhappy logrotate dphys-swapfile`
- `sudo apt-get autoremove --purge`
- `sudo vim /boot/firmware/cmdline.txt` => add in first line `fastboot noswap ro`
- `sudo apt-get install busybox-syslogd`
- `sudo apt-get remove --purge rsyslog`
- `sudo vim /etc/fstab` => add `ro` to all block devices (/ and /boot)
- also add
```
  tmpfs        /tmp            tmpfs   nosuid,nodev         0       0
  tmpfs        /run            tmpfs   nosuid,nodev         0       0
  tmpfs        /var/log        tmpfs   nosuid,nodev         0       0
  tmpfs        /var/tmp        tmpfs   nosuid,nodev         0       0
  /dev/sda1 /media/livebird/INTENSO exfat defaults,noatime 0 2
  tmpfs /var/lib/containerd tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=500M 0 0
  tmpfs /etc/NetworkManager tmpfs defaults,noatime,nosuid,nodev,noexec,mode=1777,size=50M 0 0
```
- `sudo rm -rf /var/lib/dhcp /var/lib/dhcpcd5 /var/spool /etc/resolv.conf`
- `sudo ln -s /tmp /var/lib/dhcp`
- `sudo ln -s /tmp /var/lib/dhcpcd5`
- `sudo ln -s /tmp /var/spool`
- `sudo touch /tmp/dhcpcd.resolv.conf`
- `sudo ln -s /tmp/dhcpcd.resolv.conf /etc/resolv.conf`
- `sudo rm /var/lib/systemd/random-seed`
- `sudo ln -s /tmp/random-seed /var/lib/systemd/random-seed`
- `sudo vim /lib/systemd/system/systemd-random-seed.service` => 
- add `ExecStartPre=/bin/echo "" >/tmp/random-seed` under `[Service]`
- `sudo vim /etc/bash.bashrc` add =>
```
set_bash_prompt() {
    fs_mode=$(mount | sed -n -e "s/^\/dev\/.* on \/ .*(\(r[w|o]\).*/\1/p")
    PS1='\[\033[01;32m\]\u@\h${fs_mode:+($fs_mode)}\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
}
alias ro='sudo mount -o remount,ro / ; sudo mount -o remount,ro /boot'
alias rw='sudo mount -o remount,rw / ; sudo mount -o remount,rw /boot'
PROMPT_COMMAND=set_bash_prompt
```
- `sudo vim /etc/bash.bash_logout` add =>
```
mount -o remount,ro /
mount -o remount,ro /boot
```

`sudo reboot now` (take some time)


- `sudo vim /etc/fstab` => change / and /boot to all 0 0
- `sudo vim /etc/fstab` => add `mode=1777` to options of /tmp
- `sudo rm /var/spool`
- `sudo mkdir -m 755 /var/spool`
- `sudo vim /etc/fstab` add =>
```
tmpfs /var/spool tmpfs defaults,noatime,nosuid,nodev,noexec,mode=0755,size=64M 0 0
```
- `sudo reboot now`


- `ls -ld /tmp` => should look like `drwxrwxrwt 13 root root 320 Mar 24 10:47 /tmp`
- `rw`
- `sudo systemctl stop docker`
- `sudo systemctl disable docker`
- `sudo vim /etc/fstab` add =>
```
tmpfs  /var/lib/docker  tmpfs  defaults,noatime,nosuid,nodev,mode=0711  0  0
```
- `sudo rm -rf /var/lib/docker/*`
- `sudo reboot now`


- `rw`
- `sudo vim /usr/local/bin/dockersave.sh` put this =>
```
#!/bin/bash
set -e
PERSIST_DIR="/var/lib/docker.persist"

# make sure docker is NOT running:
systemctl is-active -q docker && (echo "Docker service must NOT be running, please stop it first!"; exit 1)
# containers need to be writeable, so we don't allow saving when they exist either:
[ `ls /var/lib/docker/containers/ | wc -l` -eq 0 ] || (echo "We can't save Docker configuration with containers; remove them first!"; exit 1)

mkdir -p -m 700 "$PERSIST_DIR"

# copy from tmpfs to persistent storage:
# but be careful when copying overlay/ - it might contain links to the persistent storage, which we must simply leave there:
for subdir in `ls "/var/lib/docker/"`
do
  if [ "overlay2" != "$subdir" ]
  then
    rm -rf "$PERSIST_DIR/$subdir"
    cp -ra "/var/lib/docker/$subdir" "$PERSIST_DIR/$subdir"
  else
    # remove all links beecause we don't want to overwrite the persistent storage with them:
    find "/var/lib/docker/overlay2/" -maxdepth 1 -type l -exec rm '{}' ';'
    # and overlay2/l/ will be copied verbatim, so remove it in persistent storage:
    rm -rf "$PERSIST_DIR/overlay2/l"
    # everything else is copied over to persistent storage: (l/ and any new image overlays)
    mkdir -p -m 700 "$PERSIST_DIR/overlay2"
    cp -ra /var/lib/docker/overlay2/* "$PERSIST_DIR/overlay2/"
  fi
done
```
- `sudo chmod +x /usr/local/bin/dockersave.sh`
- `sudo dockersave.sh`
- `sudo vim /usr/local/bin/systemctl.dockerload.sh` put this =>
```
#!/bin/bash
set -e
PERSIST_DIR="/var/lib/docker.persist"

# Restart containerd
systemctl restart containerd

# Wait for containerd to become active
while ! systemctl is-active --quiet containerd; do
    echo "Waiting for containerd to restart..."
    sleep 1
done

echo "containerd is active."

while [ ! -S /run/containerd/containerd.sock ]; do
    echo "Waiting for containerd socket..."
    sleep 1
done

# make sure docker is NOT running:
systemctl is-active -q docker && (echo "Docker service must NOT be running, please stop it first!"; exit 1)

if [ ! -d "$PERSIST_DIR" ]
then
  echo "Docker configuration was never saved yet (dockersave.sh), nothing to load. Exiting."
  exit 0
fi

# existing directory structure should be copied verbatim, except for overlay2/ (but
# only on top level - image/overlay2 should be copied)
/bin/rm -rf /var/lib/docker/*
for subdir in `ls "$PERSIST_DIR/"`
do
  if [ "overlay2" != "$subdir" ]
  then
    cp -ra "$PERSIST_DIR/$subdir" "/var/lib/docker/$subdir"
  fi
done

# overlay2/ must be read-write, but the existing subdirectories can be links to a
# persistent (readonly) location:
mkdir -m 700 /var/lib/docker/overlay2
for layer_hash in `ls $PERSIST_DIR/overlay2 | grep -v "^l$"`
do
  ln -s "$PERSIST_DIR/overlay2/$layer_hash" "/var/lib/docker/overlay2/$layer_hash"
done
cp -ra "$PERSIST_DIR/overlay2/l" "/var/lib/docker/overlay2/l"
```
- `sudo chmod +x /usr/local/bin/systemctl.dockerload.sh`
- `sudo vim /lib/systemd/system/docker.service` add before ExecStart =>
```
ExecStartPre=/usr/local/bin/systemctl.dockerload.sh
```
- 
- `sudo systemctl daemon-reload`
- `sudo systemctl enable docker`
- `sudo vim /lib/systemd/system/docker.service` => comment out startpre
- `sudo systemctl restart containerd`
- `sudo systemctl start docker`

### clone project to external drive
- (insert ssh key to github first, ssh-keygen -t ed25519 -C "livebird@torbenberger.de")
- `cd /media/livebird/INTENSO/`
- `git clone git@github.com:torbenberger/livebird.git`
- `cat /sys/kernel/debug/gpio`
- `docker compose up -d`
- `sudo docker compose up -d --build`

- `sudo docker stop livebird-backend-1`
- `sudo docker rm livebird-backend-1`
- `sudo systemctl stop docker`
- `sudo dockersave.sh`

- `sudo vim /lib/systemd/system/docker.service` => comment back in startpre
- `sudo systemctl start docker`
- `sudo systemctl start docker-compose.service`
- `sudo systemctl daemon-reload`
- `sudo systemctl enable docker`
- `sudo systemctl enable docker-compose.service`
- `sudo systemctl enable create_ap`
- `ro`

- `sudo reboot now`



