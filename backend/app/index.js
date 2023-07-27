const express = require("express");
const app = express();
const router = express.Router()
const { exec } = require('child_process');
const kill = require("tree-kill")
const storage = require('node-persist');
const bodyParser = require("body-parser");
const HLSServer = require("hls-server");
const fs = require("fs");


let streamProcess
let previewProcess

let streamRunning = false;
let previewRunning = false;

let streamStartedByAutoLive = false

let lastAutolive = undefined;


const init = async () => {
  await storage.init()

  console.log("currently set youtube key: ", await storage.getItem("youtubeKey"))
  console.log("currently setffmpeg params: ", await storage.getItem("ffmpegParams"))
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
      break;
    case "stopStream":
      streamRunning = false
      await killProcess(streamProcess?.pid)
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

router.post("/autolive", async (req, res) => {
  const autoLive = req.body.autolive

  if (autoLive == lastAutolive) return
  lastAutolive = autoLive

  console.log("autolive updated:", autoLive)
  console.log("stream running: ", streamRunning)

  if (!streamRunning && autoLive) {
    streamStartedByAutoLive = true
    await handleAction("startStream")
  }

  if (streamRunning && !autoLive && streamStartedByAutoLive) {
    await handleAction("stopStream")
  }

  res.sendStatus(200)
})

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

init()
