import React from 'react'
import CastIcon from '@mui/icons-material/Cast';
import { Typography } from '@mui/material';

const Logo: React.FC<{}> = () => {

    return <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(1.5)', padding: '40px 0 40px 0' }}>
            <CastIcon sx={{ lineHeight: '2', mr: 1, mt: '-10px' }} /><Typography variant="h5" gutterBottom>livebird </Typography>
        </div>
    </>
}

export default Logo