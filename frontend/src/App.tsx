import './App.css';
import { Button, Container, Grid, Paper, TextField, Typography } from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player'
import ReactHlsPlayer from 'react-hls-player';

function App() {
  const [ffmpegParams, setFfmpegParams] = useState("")
  const [youtubeKey, setYoutubeKey] = useState("")

  const [previewRunning, setPreviewRunning] = useState(false)
  const [streamRunning, setStreamRunning] = useState(false)

  const playerRef = useRef<HTMLVideoElement>(null)

  useMemo(() => {
    fetch("/api/ffmpegparams").then(async res => {
      if(!res) return

      const data = await res.json()

      setFfmpegParams(data.ffmpegParams)
    })

    fetch("/api/youtubekey").then(async res => {
      if(!res) return

      const data = await res.json()

      setYoutubeKey(data.youtubeKey)
    })

    fetch("/api/actions").then(async res => {
      if (!res) return

      const data = await res.json()

      setStreamRunning(data.streamRunning)
      setPreviewRunning(data.previewRunning)
    })
  }, [])

  const save = async () => {
    await fetch("/api/ffmpegparams", {
      method: "POST",
      body: JSON.stringify({"ffmpegParams": ffmpegParams}),
      headers: {
        'Content-Type': 'application/json'
      },
    })

    await fetch("/api/youtubekey", {
      method: "POST",
      body: JSON.stringify({"youtubeKey": youtubeKey}),
      headers: {
        'Content-Type': 'application/json'
      },
    })
  }

  const ffmpegParamsChanged = (e: any) => {
    setFfmpegParams(e.target.value)
  }

  const youtubeKeyChanged = (e: any) => {
    setYoutubeKey(e.target.value)
  }

  const sendAction = async (action: string) => {
    await fetch("/api/action", {
      method: "POST",
      body: JSON.stringify({ "action": action }),
      headers: {
        'Content-Type': 'application/json'
      },
    })
  }

  return (
    <Container>
      <Paper sx={{p: 2}}>
        <Typography variant='h3'>
          <b>livebird</b>
        </Typography>

        <Grid container spacing={2} sx={{ mt: 4 }}>
          <Grid item xs={12}>
            <TextField
              sx={{ width: "100%" }}
              onChange={youtubeKeyChanged}
              value={youtubeKey}
              variant="outlined"
              label="YouTube key"
            ></TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              onChange={ffmpegParamsChanged}
              value={ffmpegParams}
              rows={10}
              sx={{ width: "100%" }}
              multiline
              variant="outlined"
              label="ffmpeg parameters"
            ></TextField>
            <Button
              onClick={save}
            >
              save
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              disabled={previewRunning || streamRunning}
              onClick={() => { sendAction("startStream"); setStreamRunning(true) }}
            >
              Start Stream
            </Button>
            <Button
              disabled={!streamRunning}
              onClick={() => { sendAction("stopStream"); setStreamRunning(false) }}
            >
              Stop Stream
            </Button>
            <Button
              disabled={previewRunning || streamRunning}
              onClick={() => { sendAction("startPreview"); setPreviewRunning(true) }}
            >
              Start Preview
            </Button>
            <Button
              disabled={!previewRunning}
              onClick={() => { sendAction("stopPreview"); setPreviewRunning(false) }}
            >
              Stop preview
            </Button>
          </Grid>
        </Grid>
        {/* <ReactPlayer
          url="/api/stream/live.m3u8"
          playing={true}
          controls={true}
          config={{
            file: {
              forceHLS: true
            }
          }}
        /> */}

        {
          previewRunning && (
            <ReactHlsPlayer
              playerRef={playerRef}
              src="/api/stream/live.m3u8"
              autoPlay={true}
              controls={true}
              width="100%"
              height="auto"
              hlsConfig={{
                maxLoadingDelay: 4,
                minAutoBitrate: 0,
                lowLatencyMode: true,
              }}
            />
          )
        }
      </Paper>
    </Container>
  );
}

export default App;
