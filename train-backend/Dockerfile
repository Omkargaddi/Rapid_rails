FROM node:20-slim

RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build:addon

ENV PORT=10000
EXPOSE 10000

CMD [ "npm", "start" ]