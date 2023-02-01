FROM node:18.13.0

WORKDIR /app/frontend

COPY frontend ./

RUN npm install

RUN npm run build

WORKDIR /app/backend

COPY backend ./

RUN npm install

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg

EXPOSE 5555

CMD npm run start

