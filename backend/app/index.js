const express = require("express");
const app = express();
const router = express.Router()
const spawn = require('child_process').spawn;
const kill = require("tree-kill")
const storage = require('node-persist');
const bodyParser = require("body-parser");

let streamProcess

const init = async () => {
  await storage.init()

  console.log("currently set youtube key: ", await storage.getItem("youtubeKey"))
  console.log("currently setffmpeg params: ", await storage.getItem("ffmpegParams"))
}

app.use(express.static("../frontend/build"));
app.use(bodyParser.json());

app.listen(5555, () => {
  console.log("server started on port 5555");
});

router.get("/youtubekey", async (req, res) => {
  const youtubeKey = await storage.getItem("youtubeKey")
  res.send({youtubeKey})
})

router.post("/youtubekey", async (req, res) => {
  if(!req.body.youtubeKey) {
    res.sendStatus(400)
    return
  }

  await storage.setItem("youtubeKey", req.body.youtubeKey)

  res.sendStatus(200)
})

router.get("/ffmpegparams", async (req, res) => {
  const ffmpegParams = await storage.getItem("ffmpegParams")
  res.send({ffmpegParams})
})

router.post("/ffmpegparams", async (req, res) => {
  console.log(req.body)
  if(!req.body.ffmpegParams) {
    res.sendStatus(400)
    return
  }

  await storage.setItem("ffmpegParams", req.body.ffmpegParams)

  res.sendStatus(200)
})

router.post("/startstream", (req, res) => {
  streamProcess = spawn("")
})

router.post("/stopstream", (req, res) => {
  kill(streamProcess.pid)
})

app.use("/api", router)

init()
