# livebird

## setup modem

- Sdkarte mit raspberry os bespielen (2020-08-20-raspios-buster-armhf) ( https://downloads.raspberrypi.org/raspios_armhf/images/raspios_armhf-2020-08-24/)
  - Host, password, user, alles auf livebird
  - SSH enabled, auth with password
  - WLAN aus!

- follow: https://www.waveshare.com/wiki/SIM820X_RNDIS_Dail-up

[//]: # (- follow: https://www.waveshare.com/wiki/SIM8200EA-M2_5G_HAT_is_equipped_with_Raspbian_Pi_to_open_hotspots &#40;only AP setup 4-7&#41;)

## find correct pin numbers
`cat /sys/kernel/debug/gpio`


## setup system
- `sudo apt update`

### install stuff 
- `sudo apt install -y --no-install-recommends udhcpc ffmpeg v4l-utils iptables psmisc sudo util-linux vim util-linux procps hostapd iproute2 iw haveged dnsmasq git`
- `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash`
- `nvm install stable`

### install and configure access point
- `git clone https://github.com/oblique/create_ap`
- `cd create_ap`
- `sudo make install`
- `sudo vim /etc/create_ap.conf` => set settings livebird livebird inetiface: eth0 
- `sudo systemctl enable create_ap`



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


### setup usb mount
`sudo mkdir /media/livebird`
in `/etc/fstab` => 
`/dev/sda1	/media/livebird/INTENSO	vfat	defaults,nofail,sync,uid=1000,gid=1000,umask=022	0	0`

### setup project
- (insert ssh key to github first, `ssh-keygen -t ed25519 -C "livebird@torbenberger.de"`)
- `cd ~/app`
- `git clone git@github.com:torbenberger/livebird.git`
- `cd livebird`
- `cd frontend`
- `npm install --legacy-peer-deps`
- `npm run build`
- `cd ../backend`
- `npm install --legacy-peer-deps`
- `sudo visudo` => add `root ALL=(ALL) NOPASSWD: ALL`
- `mkdir /media/livebird/INTENSO/.node-persist`
- `mkdir /media/livebird/INTENSO/api`
- `mkdir /media/livebird/INTENSO/api/stream`
- `sudo vim /etc/systemd/system/livebird.service` => 
```
[Unit] 
Description=livebird app 
After=network.target 
 
[Service] 
Type=simpel 
Environment=PATH=/home/livebird/.nvm/versions/node/v21.7.3/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games 
WorkingDirectory= /home/livebird/app/livebird/backend
ExecStart=/home/livebird/.nvm/versions/node/v21.7.3/bin/npm run start
KillMode=process
 
[Install] 
WantedBy=multi-user.target
```
`sudo systemctl daemon-reload`
`sudo systemctl enable livebird.service`


### maybe add udev role to keep camera writable

`lsusb` get device ids
`sudo vim /etc/udev/rules.d/99-webcam.rules`
`SUBSYSTEM=="video4linux", ATTRS{idVendor}=="id here", ATTRS{idProduct}=="id here", MODE="0666"`
`sudo udevadm control --reload-rules`
`sudo udevadm trigger`

### now make file system read only

- `sudo apt-get update && apt-get upgrade`
- `sudo apt-get remove --purge triggerhappy logrotate dphys-swapfile`
- `sudo apt-get autoremove --purge`
- `sudo vim /boot/firmware/cmdline.txt` => add at end of line `fastboot noswap ro`
- `sudo apt-get install busybox-syslogd`
- `sudo apt-get remove --purge rsyslog`
- `sudo vim /etc/fstab` => 
- `ADD ,ro to options of / and /boot!!!!`
```
tmpfs        /tmp                    tmpfs   nosuid,nodev         0       0
tmpfs        /var/log                tmpfs   nosuid,nodev         0       0
tmpfs        /var/tmp                tmpfs   nosuid,nodev         0       0
```
- `sudo rm -rf /var/lib/dhcp /var/lib/dhcpcd5 /var/spool /etc/resolv.conf`
- `sudo ln -s /tmp /var/lib/dhcp`
- `sudo ln -s /tmp /var/lib/dhcpcd5`
- `sudo ln -s /tmp /var/spool`
[//]: # (- `sudo touch /tmp/dhcpcd.resolv.conf`)
[//]: # (- `sudo ln -s /tmp/dhcpcd.resolv.conf /etc/resolv.conf`)
- `sudo rm /var/lib/systemd/random-seed`
- `sudo ln -s /tmp/random-seed /var/lib/systemd/random-seed`
- `sudo vim /lib/systemd/system/systemd-random-seed.service` => add under Service => `ExecStartPre=/bin/echo "" >/tmp/random-seed`
- `sudo vim /etc/bash.bashrc` => 
```
set_bash_prompt() {
    fs_mode=$(mount | sed -n -e "s/^\/dev\/.* on \/ .*(\(r[w|o]\).*/\1/p")
    PS1='\[\033[01;32m\]\u@\h${fs_mode:+($fs_mode)}\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
}
alias ro='sudo mount -o remount,ro / ; sudo mount -o remount,ro /boot'
alias rw='sudo mount -o remount,rw / ; sudo mount -o remount,rw /boot'
PROMPT_COMMAND=set_bash_prompt
```
- `sudo vim /etc/bash.bash_logout` => 
```
mount -o remount,ro /
mount -o remount,ro /boot
```

`sudo reboot`


