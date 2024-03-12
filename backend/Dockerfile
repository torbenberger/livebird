FROM node:18.13.0

WORKDIR /app/frontend

COPY frontend ./

RUN npm install --legacy-peer-deps

RUN npm run build

WORKDIR /app/backend

COPY backend ./

RUN npm install --legacy-peer-deps

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg v4l-utils psmisc sudo util-linux
EXPOSE 5555

USER root

RUN echo "root ALL=NOPASSWD: ALL" >> /etc/sudoers

CMD npm run start




# RUN npm install pm2 -g

# ENV NODE_ENV=production


# CMD [ "pm2-runtime", "start", "./app/index.js" ]

