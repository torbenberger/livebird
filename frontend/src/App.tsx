import './App.css';
import { Button, Container, Grid, Paper, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

function App() {
  const [ffmpegParams, setFfmpegParams] = useState("")
  const [youtubeKey, setYoutubeKey] = useState("")

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

  return (
    <Container>
      <Paper sx={{p: 2}}>
        <Typography variant='h3'>
          <b>livebird</b>

          <Grid container spacing={2} sx={{mt: 4}}>
            <Grid item xs={12}>
              <TextField
                sx={{width: "100%"}}
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
                sx={{width: "100%"}}
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
              <Button>
                Start stream
              </Button>
              <Button>
                Stop stream
              </Button>
            </Grid>
          </Grid>
        </Typography>
      </Paper>
    </Container>
  );
}

export default App;
