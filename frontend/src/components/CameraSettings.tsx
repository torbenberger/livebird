import { Checkbox, Slider } from '@mui/material'
import React, { useEffect, useState } from 'react'



const CameraSettings: React.FC<{}> = () => {
    const [autoFocusEnabled, setAutoFocusEnabled] = useState<boolean>(true)
    const [autoExposureEnabled, setAutoExposureEnabled] = useState<boolean>(true)
    const [focusValue, setFocusValue] = useState<number | number[]>(0)
    const [exposureValue, setExposureValue] = useState<number | number[]>(0)

    const focusChanged = (event: Event, newValue: number | number[]) => {
        setFocusValue(newValue)
    }

    const exposureChanged = (event: Event, newValue: number | number[]) => {
        setFocusValue(newValue)
    }

    const autoFocusChanged = () => {
        setAutoFocusEnabled(!autoFocusEnabled)
    }

    const autoExposureChanged = () => {
        setAutoExposureEnabled(!autoExposureEnabled)
    }

    useEffect(() => {
        fetch("/api/camerasettings").then(async res => {
            if (!res) return

            const data = await res.json()

            setExposureValue(Number(data['exposure_time_absolute']))
            setFocusValue(Number(data['focus_absolute']))
            setAutoFocusEnabled(data['focus_automatic_continuous'] === '1')
            setAutoFocusEnabled(Number(data['auto_exposure']) > 0)
        })
    }, [])

    return (
        <>
            Autofocus <Checkbox onClick={autoFocusChanged} checked={autoFocusEnabled} />

            <br />
            Focus <Slider min={0} max={255} disabled={autoFocusEnabled} aria-label="Focus" value={focusValue} onChange={focusChanged} />

            <br />
            Auto Exposure <Checkbox onClick={autoExposureChanged} checked={autoExposureEnabled} />

            <br />
            Exposure <Slider min={3} max={2047} disabled={autoExposureEnabled} aria-label="Exposure" value={exposureValue} onChange={focusChanged} />
        </>
    )
}

export default CameraSettings