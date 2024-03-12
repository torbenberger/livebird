import express from "express";
import { exec } from 'child_process';
import kill from "tree-kill";
import storage from 'node-persist';
import bodyParser from "body-parser";
import HLSServer from "hls-server";
import fs from "fs";
import { Gpio } from 'onoff'
import https from 'https'
import path from 'path';
import { fileURLToPath } from 'url';

import i2c from 'i2c-bus';
import oled from 'oled-rpi-i2c-bus';
import font from 'oled-font-5x7';

const __filename = fileURLToPath(import.meta.url);
const wifiSwitchPin = new Gpio(16, 'in', 'both')
const autoLiveSwitchPin = new Gpio(21, 'in', 'both')
const app = express();
const router = express.Router()
const __dirname = path.dirname(__filename);

let streamProcess
let previewProcess
let streamRunning = false;
let previewRunning = false;

var opts = {
  width: 128,
  height: 64,
  address: 0x3C,
  bus: 1,
  driver: 'SH1106'
};

let i2cBus = i2c.openSync(opts.bus);
let display = new oled(i2cBus, opts);
display.clearDisplay(true);

autoLiveSwitchPin.watch(async (err, value) => {
  if (err) return

  await updateAutoliveTo(!value)
});

wifiSwitchPin.watch(async (err, value) => {
  if (err) return

  await changeWifi(!value)
});

function checkInternetConnection() {
  return new Promise((resolve) => {
    const req = https.get('https://www.google.com', (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', (err) => {
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function waitForInternetConnection() {
  let isConnected = await checkInternetConnection();
  while (!isConnected) {
    console.log('No internet. Retrying in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    isConnected = await checkInternetConnection();
  }
  console.log('Internet connection active.');
}

const updateAutoliveTo = async (autoLive) => {
  console.log("autolive updated:", autoLive)

  if (!streamRunning && autoLive) {
    await handleAction("startStream")
  }

  if (streamRunning && !autoLive) {
    await handleAction("stopStream")
  }
}

const init = async () => {
  await startService("setup-usb0")
  await storage.init()

  console.log("currently set youtube key: ", await storage.getItem("youtubeKey"))
  console.log("currently setffmpeg params: ", await storage.getItem("ffmpegParams"))

  await waitForInternetConnection()

  const currentCameraSettings = await storage.getItem("cameraSettings") || {}

  const allSettings = []
  for (let settingKey in currentCameraSettings) {
    const settingPromise = new Promise((resolve, reject) => {
      exec(`v4l2-ctl --set-ctrl ${settingKey}=${currentCameraSettings[settingKey]}`, (error, stdout, stdterr) => {
        console.log(error)
        console.log(stdout)
        console.log(stdterr)
        resolve()
      })
    })

    allSettings.push(settingPromise)
  }

  await Promise.all(allSettings)
  await updateAutoliveTo(!autoLiveSwitchPin.readSync())
  await changeWifi(!wifiSwitchPin.readSync())
}

const killProcess = async (pid) => {
  return new Promise((resolve, reject) => {
    if (!pid) resolve()

    kill(pid, 'SIGTERM', resolve)
  })
}

const killFfmpeg = async () => {
  return new Promise((resolve, reject) => {
    exec('sudo killall ffmpeg', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error}`);
        resolve(stdout);
        return;
      }

      console.log(`STDOUT: ${stdout}`);
      console.error(`STDERR: ${stderr}`);
      resolve(stdout);
    });
  });
}

const handleAction = async (action) => {
  switch (action) {
    case "startStream":
      // await killProcess(streamProcess?.pid)
      await killFfmpeg()
      streamRunning = true
      const currentStreamKey = await storage.getItem("youtubeKey")
      const currentFfmpegParams = await storage.getItem("ffmpegParams")

      streamProcess = exec(`${currentFfmpegParams}/${currentStreamKey}`)

      streamProcess.stdout.on('data', data => console.log(data.toString()))
      streamProcess.stderr.on('data', data => {
        console.error("stream error: ", data.toString())
        streamRunning = false
      })

      break;
    case "stopStream":
      streamRunning = false
      // await killProcess(streamProcess?.pid)
      await killFfmpeg()

      break;
    case "startPreview":
      // await killProcess(streamProcess?.pid)
      // await killProcess(previewProcess?.pid)
      await killFfmpeg()

      try {
        const streamPath = `${__dirname}/api/stream/`
        fs.readdirSync(streamPath)
          .filter(f => f != '.gitkeep')
          .forEach(f => {
            fs.unlinkSync(streamPath + f)
          })
      } catch (e) {
        console.log('delete failed')
      }
      previewProcess = exec(`ffmpeg -y -i /dev/video0 -c:v copy -f hls -vcodec libx264 -x264-params keyint=5 -hls_time 2 -hls_init_time 2 -hls_list_size 1 -hls_flags delete_segments ${__dirname}/api/stream/live.m3u8`)
      previewRunning = true

      break;
    case "stopPreview":
      // await killProcess(previewProcess?.pid)
      await killFfmpeg()
      previewRunning = false
      break;
  }

  console.log(`action ${action} executed`)
}

const handleCameraSettingChange = async ({ settingKey, value }) => {
  const currentCameraSettings = await storage.getItem("cameraSettings") || {}
  currentCameraSettings[settingKey] = value
  await storage.setItem('cameraSettings', currentCameraSettings)


  console.log(settingKey)
  console.log(value)
  console.log(`v4l2-ctl --set-ctrl ${settingKey}=${value}`)

  exec(`v4l2-ctl --set-ctrl ${settingKey}=${value}`, (error, stdout, stdterr) => {
    console.log(error)
    console.log(stdout)
    console.log(stdterr)
  })
}

app.use(express.static("../frontend/build"));
// app.use("static", express.static("/static"));

app.use(bodyParser.json());

let server = app.listen(5555, () => {
  console.log("server started on port 5555");
});

router.get("/health", (req, res) => {
  res.sendStatus(200)
})

const getCameraSetting = (settingString) => {
	console.log("get camera settings");
  return new Promise((resolve, reject) => {
    exec(`v4l2-ctl --get-ctrl ${settingString}`, (error, stdout, stdterr) => {
      resolve(stdout.split(':')[1].trim())
    })
  })
}

router.get('/camerasettings', async (req, res) => {
  const settings = ['focus_absolute', 'focus_automatic_continuous', 'auto_exposure', 'exposure_time_absolute']
  const pulledSettings = {}


  for (let i = 0; i < settings.length; i++) {
    pulledSettings[settings[i]] = await getCameraSetting(settings[i])
  }

  res.send(pulledSettings)
})

// router.post("/autolive", async (req, res) => {
//   const autoLive = req.body.autolive

//   if (autoLive == lastAutolive) return
//   lastAutolive = autoLive

//   console.log("autolive updated:", autoLive)
//   console.log("stream running: ", streamRunning)

//   if (!streamRunning && autoLive) {
//     streamStartedByAutoLive = true
//     await handleAction("startStream")
//   }

//   if (streamRunning && !autoLive && streamStartedByAutoLive) {
//     await handleAction("stopStream")
//   }

//   res.sendStatus(200)
// })

router.get("/youtubekey", async (req, res) => {
  const youtubeKey = await storage.getItem("youtubeKey")
  res.send({ youtubeKey })
})

router.post("/youtubekey", async (req, res) => {
  if (!req.body.youtubeKey) {
    res.sendStatus(400)
    return
  }

  await storage.setItem("youtubeKey", req.body.youtubeKey)

  res.sendStatus(200)
})

router.get("/ffmpegparams", async (req, res) => {
  const ffmpegParams = await storage.getItem("ffmpegParams")
  res.send({ ffmpegParams })
})

router.post("/ffmpegparams", async (req, res) => {
  if (!req.body.ffmpegParams) {
    res.sendStatus(400)
    return
  }

  await storage.setItem("ffmpegParams", req.body.ffmpegParams)

  res.sendStatus(200)
})


router.post("/action", async (req, res) => {
  if (!req.body.action) {
    res.sendStatus(400)
    return
  }

  await handleAction(req.body.action)

  res.sendStatus(200)
})


router.post("/camerasetting", async (req, res) => {
  await handleCameraSettingChange(req.body)

  res.sendStatus(200)
})

router.get("/actions", (req, res) => {
  res.send({
    previewRunning,
    streamRunning
  })
})

app.use("/api", router)

let hls = new HLSServer(server, {
  provider: {
    exists: (req, cb) => {
      const ext = req.url.split(".").pop()

      if (ext != "m3u8" && ext !== "ts") {
        return cb(null, true)
      }

      fs.access(__dirname + req.url, fs.constants.F_OK, function (err) {
        if (err) {
          console.log("File not exists")
          return cb(null, false)
        }

        cb(null, true)
      })
    },
    getManifestStream: (req, cb) => {
      const stream = fs.createReadStream(__dirname + req.url)
      console.log(req.url)
      cb(null, stream)
    },
    getSegmentStream: (req, cb) => {
      const stream = fs.createReadStream(__dirname + req.url)
      console.log(req.url)
      cb(null, stream)
    }
  }
})

async function getWifiStatus() {
  const wifiEnabled = await isServiceRunning("create_ap")
  return wifiEnabled
}

async function changeWifi(enable) {
  display.clearDisplay();
  display.setCursor(1, 1);
  if(enable) {
    startService("create_ap")
    display.writeString(font, 1, 'WIFI: on', 1, true);
  } else {
    display.writeString(font, 1, 'WIFI: off', 1, true);
    stopService("create_ap")
  }
}

function isServiceRunning(serviceName) {
  return new Promise((resolve, reject) => {
    executeCommandOnHost(`systemctl is-active ${serviceName}.service`, (error, stdout, stderr) => {
      if (error) {
        // If an error occurs, we'll consider the service as not running
        console.error(`exec error: ${error}`);
        resolve(false);
        return;
      }
      // If the command output includes "active", the service is running
      resolve(stdout.trim() === 'active');
    });
  });
}

function startService(serviceName) {
  return new Promise((resolve, reject) => {
    executeCommandOnHost(`sudo systemctl start ${serviceName}.service`, (error, stdout, stderr) => {
      if (error) {
        // If an error occurs, reject the promise with the error
        console.error(`Could not start the service: ${error}`);
        reject(error);
        return;
      }
      // If the command is successful, resolve the promise
      resolve(`Service ${serviceName} started successfully`);
    });
  });
}

function stopService(serviceName) {
  return new Promise((resolve, reject) => {
    executeCommandOnHost(`sudo systemctl stop ${serviceName}.service`, (error, stdout, stderr) => {
      if (error) {
        // If an error occurs, log it and reject the promise
        console.error(`Could not stop the service: ${error}`);
        reject(error);
        return;
      }
      // If the command is successful, resolve the promise
      resolve(`Service ${serviceName} stopped successfully`);
    });
  });
}

function executeCommandOnHost(command, callback) {
  exec(`nsenter --mount=/host/proc/1/ns/mnt --uts=/host/proc/1/ns/uts --ipc=/host/proc/1/ns/ipc --net=/host/proc/1/ns/net --pid=/host/proc/1/ns/pid -- target 1 /usr/bin/sudo ${command}`, callback);
}


init()

process.on('SIGINT', () => {
  wifiSwitchPin.unexport();
  autoLiveSwitchPin.unexport();
  process.exit();
});
