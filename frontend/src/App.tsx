import './App.css';
import { Accordion, AccordionDetails, AccordionSummary, Button, Checkbox, CircularProgress, Container, Grid, Paper, Slider, Stack, TextField, ThemeProvider, Typography, createTheme } from '@mui/material';
import React, { useMemo, useRef, useState } from 'react';
import ReactHlsPlayer from 'react-hls-player';
import Logo from './components/Logo'
import '@fontsource/roboto/700.css';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CameraSettings from './components/CameraSettings';

function App() {
  const [ffmpegParams, setFfmpegParams] = useState("")
  const [youtubeKey, setYoutubeKey] = useState("")

  const [previewRunning, setPreviewRunning] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [streamRunning, setStreamRunning] = useState(false)


  const playerRef = useRef<HTMLVideoElement>(null)

  useMemo(() => {
    fetch("/api/ffmpegparams").then(async res => {
      if (!res) return

      const data = await res.json()

      setFfmpegParams(data.ffmpegParams)
    })

    fetch("/api/youtubekey").then(async res => {
      if (!res) return

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
      body: JSON.stringify({ "ffmpegParams": ffmpegParams }),
      headers: {
        'Content-Type': 'application/json'
      },
    })

    await fetch("/api/youtubekey", {
      method: "POST",
      body: JSON.stringify({ "youtubeKey": youtubeKey }),
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

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <Container>
        <Paper sx={{ p: 2 }}>
          <Typography variant='h3'>
            <Logo />
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                sx={{ mr: 2 }}
                variant="contained"
                disabled={previewRunning || streamRunning || previewLoading}
                onClick={() => { sendAction("startStream"); setStreamRunning(true) }}
              >
                Start Stream
              </Button>
              <Button
                sx={{ mr: 2 }}
                variant="contained"
                disabled={!streamRunning}
                onClick={() => { sendAction("stopStream"); setStreamRunning(false) }}
              >
                Stop Stream
              </Button>
              <Button
                sx={{ mr: 2 }}
                variant="contained"
                disabled={previewRunning || streamRunning || previewLoading}
                onClick={() => {
                  sendAction("startPreview");
                  setPreviewLoading(true)
                  setTimeout(() => {
                    setPreviewLoading(false)
                    setPreviewRunning(true);
                    playerRef.current?.play()
                  }, 5000)
                }}
              >
                Start Preview
              </Button>
              <Button
                sx={{ mr: 2 }}
                variant="contained"
                disabled={!previewRunning}
                onClick={() => { sendAction("stopPreview"); setPreviewRunning(false) }}
              >
                Stop preview
              </Button>
            </Grid>
          </Grid>

          {
            (previewRunning || previewLoading) &&
            <Grid container spacing={2} sx={{ mt: 4 }}>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {
                  previewLoading &&
                  <CircularProgress />
                }
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
                        maxLoadingDelay: 1,
                        minAutoBitrate: 0,
                        lowLatencyMode: true,
                      }}
                    />
                  )
                }
              </Grid>
              <Grid item xs={6}>
                <CameraSettings />
              </Grid>
            </Grid>
          }




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
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                >
                  <Typography>expert settings (don't touch!)</Typography>
                </AccordionSummary>
                <AccordionDetails>
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
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
