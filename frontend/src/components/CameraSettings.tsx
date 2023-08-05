import { Checkbox, Slider } from '@mui/material'
import React, { SyntheticEvent, useEffect, useState } from 'react'



const CameraSettings: React.FC<{}> = () => {
    const [autoFocusEnabled, setAutoFocusEnabled] = useState<boolean>(true)
    const [autoExposureEnabled, setAutoExposureEnabled] = useState<boolean>(true)
    const [focusValue, setFocusValue] = useState<number | number[]>(0)
    const [exposureValue, setExposureValue] = useState<number | number[]>(0)

    const focusChanged = (event: Event, newValue: number | number[]) => {
        setFocusValue(newValue)
    }

    const focusChangeCommitted = (event: Event | SyntheticEvent<Element, Event>, value: number | number[]) => {
        postCameraSetting('focus_absolute', value)
    }


    const exposureChangeCommitted = (event: Event | SyntheticEvent<Element, Event>, value: number | number[]) => {
        postCameraSetting('exposure_time_absolute', value)
    }

    const exposureChanged = (event: Event, newValue: number | number[]) => {
        setExposureValue(newValue)
    }

    const autoFocusChanged = async () => {
        setAutoFocusEnabled(!autoFocusEnabled)
        postCameraSetting('focus_automatic_continuous', !autoFocusEnabled ? 1 : 0)
    }

    const autoExposureChanged = () => {
        setAutoExposureEnabled(!autoExposureEnabled)
        postCameraSetting('auto_exposure', !autoExposureEnabled ? 3 : 1)
    }

    const postCameraSetting = async (setting: string, value: any) => {
        await fetch("/api/camerasetting", {
            method: "POST",
            body: JSON.stringify({ "settingKey": setting, "value": value }),
            headers: {
                'Content-Type': 'application/json'
            },
        })
    }

    useEffect(() => {
        fetch("/api/camerasettings").then(async res => {
            if (!res) return

            const data = await res.json()

            setExposureValue(Number(data['exposure_time_absolute']))
            setFocusValue(Number(data['focus_absolute']))
            setAutoFocusEnabled(data['focus_automatic_continuous'] === '1')
            setAutoExposureEnabled(Number(data['auto_exposure']) > 1)
        })
    }, [])

    return (
        <>
            Autofocus <Checkbox onClick={autoFocusChanged} checked={autoFocusEnabled} />

            <br />
            Focus <Slider min={0} max={255} disabled={autoFocusEnabled} aria-label="Focus" value={focusValue} onChange={focusChanged} onChangeCommitted={focusChangeCommitted} />

            <br />
            Auto Exposure <Checkbox onClick={autoExposureChanged} checked={autoExposureEnabled} />

            <br />
            Exposure <Slider min={3} max={2047} disabled={autoExposureEnabled} aria-label="Exposure" value={exposureValue} onChange={exposureChanged} onChangeCommitted={exposureChangeCommitted} />
        </>
    )
}

export default CameraSettings