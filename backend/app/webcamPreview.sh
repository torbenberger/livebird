ffmpeg -y \
-input_format h264 -i /dev/video0 \
-c:v copy \
-f hls \
-vcodec libx264 \
-x264-params keyint=5 \
-hls_time 2 \
-hls_init_time 2 \
-hls_list_size 1 \
-hls_flags delete_segments \
api/stream/live.m3u8