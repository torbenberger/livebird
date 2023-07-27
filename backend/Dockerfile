FROM node:18.13.0

WORKDIR /app/frontend

COPY frontend ./

RUN npm install --legacy-peer-deps

RUN npm run build

WORKDIR /app/backend

COPY backend ./

RUN npm install --legacy-peer-deps

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg v4l-utils

EXPOSE 5555

CMD npm run start

