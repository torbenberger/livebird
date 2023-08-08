import express from "express";
import { exec } from 'child_process';
import kill from "tree-kill";
import storage from 'node-persist';
import bodyParser from "body-parser";
import HLSServer from "hls-server";
import fs, { rmSync } from "fs";
import { ACT, authenticate, execute } from "tl-api";
import { Gpio } from 'onoff'
import https from 'https'

const wifiLed = new Gpio(21, 'out')
const runLed = new Gpio(23, 'out')

runLed.write(Gpio.HIGH)

const wifiSwitchPin = new Gpio(16, 'in', 'rising')
const autoLiveSwitchPin = new Gpio(18, 'in', 'both')


autoLiveSwitchPin.watch(async (err, value) => {
  if (err) return

  await updateAutoliveTo(!value)
});


wifiSwitchPin.watch(async (err, value) => {
  if (err) return

  await toggleWifi()
});



const app = express();
const router = express.Router()
let wifiEnabled

let streamProcess
let previewProcess

let streamRunning = false;
let previewRunning = false;
let lastWifiSwitch = 0

let liveBlinkingIndicatorInterval
let runLedOn = false




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

const startLiveBlinking = () => {
  liveBlinkingIndicatorInterval = setInterval(() => {
    runLedOn = !runLedOn

    runLed.write(runLedOn ? Gpio.HIGH : Gpio.LOW)
  }, 1000)
}

const stopLiveBlinking = () => {
  if (!liveBlinkingIndicatorInterval) return

  clearInterval(liveBlinkingIndicatorInterval)
}

const toggleWifi = async () => {
  if (lastWifiSwitch + 10000 >= new Date().getTime()) {
    return
  }

  lastWifiSwitch = new Date().getTime()

  wifiLed.writeSync(!wifiEnabled ? 1 : 0)

  console.log("toggle wifi")
  await changeWifi(!wifiEnabled)


  await getWifiStatus()
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
  await storage.init()

  console.log("currently set youtube key: ", await storage.getItem("youtubeKey"))
  console.log("currently setffmpeg params: ", await storage.getItem("ffmpegParams"))

  await waitForInternetConnection()
  await getWifiStatus()
}

const killProcess = async (pid) => {
  return new Promise((resolve, reject) => {
    if (!pid) resolve()

    kill(pid, 'SIGTERM', resolve)
  })
}

const handleAction = async (action) => {
  switch (action) {
    case "startStream":
      await killProcess(streamProcess?.pid)
      streamRunning = true
      const currentStreamKey = await storage.getItem("youtubeKey")
      const currentFfmpegParams = await storage.getItem("ffmpegParams")

      streamProcess = exec(`${currentFfmpegParams}/${currentStreamKey}`)

      streamProcess.stdout.on('data', data => console.log(data.toString()))
      streamProcess.stderr.on('data', data => {
        console.error("stream error: ", data.toString())
        streamRunning = false
      })

      startLiveBlinking()
      break;
    case "stopStream":
      streamRunning = false
      await killProcess(streamProcess?.pid)

      stopLiveBlinking()
      break;
    case "startPreview":
      await killProcess(streamProcess?.pid)
      await killProcess(previewProcess?.pid)

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
      await killProcess(previewProcess?.pid)
      previewRunning = false
      break;
  }

  console.log(`action ${action} executed`)
}

const handleCameraSettingChange = ({ settingKey, value }) => {
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
  const baseUrl = "http://192.168.1.1";

  const { info, ...context } = await authenticate(baseUrl, {
    password: "livebird",
  });

  const result = await execute(
    baseUrl,
    [
      [ACT.GL, "LAN_WLAN", ['enable']],
    ],
    context
  );

  const enabled = result.actions[0].res.some(res => res.attributes.enable === '1')

  wifiLed.writeSync(enabled ? 1 : 0)

  wifiEnabled = enabled

  console.log("wifi enabled:", wifiEnabled)

  return enabled
}

async function changeWifi(enable) {
  const baseUrl = "http://192.168.1.1";

  const { info, ...context } = await authenticate(baseUrl, {
    password: "livebird",
  });

  const result = await execute(
    baseUrl,
    [
      [ACT.SET, "LAN_WLAN", { enable: enable ? '1' : '0' }, '1,1,0,0,0,0'],
      [ACT.SET, "LAN_WLAN", { enable: enable ? '1' : '0' }, '1,2,0,0,0,0'],
    ],
    context
  );
}

init()

process.on('SIGINT', () => {
  wifiButton.unexport();  // Release button resources
  process.exit();
});