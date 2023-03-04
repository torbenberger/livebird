ffmpeg \
-thread_queue_size 1024 \
-f alsa -ac 2 -i dsnoop:CARD=C920 \
-c:a aac \
-f v4l2 -i /dev/video0 \
-c:v libx264 -pix_fmt yuv420p -preset ultrafast -b 3000k -g 60 -b:v 2000k \
-bufsize 512k \
-acodec libmp3lame -ar 44100 \
-threads 4 -qscale 0 \
-b:a 128k \
-r 30 \
-s 1280x720 \
-f flv rtmp://a.rtmp.youtube.com/live2/sxz1-v5dk-we08-8zb6-es81





chatgpt:
ffmpeg -f v4l2 -input_format mjpeg -video_size 1280x720 -framerate 30 -i /dev/video0 -f alsa -i dsnoop:CARD=C920 -c:v libx264 -pix_fmt yuv420p -preset ultrafast -g 30 -b:v 2500k -c:a aac -b:a 128k -f flv rtmp://a.rtmp.youtube.com/live2/sxz1-v5dk-we08-8zb6-es81




chat gpt changed:





-acodec libmp3lame -ar 44100 \
-input_format mjpeg \




audio devices
v4l2-ctl --list-devices


des isses:

ffmpeg \
-thread_queue_size 1024 \
-f alsa -ac 2 -i dsnoop:CARD=C920 \
-c:a aac \
-f v4l2 -i /dev/video0  \
-c:v libx264 -pix_fmt yuv420p -preset ultrafast -b 3000k -g 60 -b:v 2500k \
-b:a 128k \
-r 30 \
-s 1280x720 \
-ar 44100 \
-f flv rtmp://a.rtmp.youtube.com/live2/sxz1-v5dk-we08-8zb6-es81



webcam to webbsite:


-preset slow \
rm backend/app/api/stream/live* && ffmpeg -y \
-input_format h264 -i /dev/video0 \
-c:v copy \
-f hls \
-vcodec libx264 \
-x264-params keyint=5 \
-hls_time 2 \
-hls_init_time 2 \
-hls_list_size 1 \
-hls_flags delete_segments \
backend/app/api/stream/live.m3u8