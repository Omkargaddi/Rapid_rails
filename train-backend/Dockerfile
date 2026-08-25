FROM node:20-slim

RUN apt-get update && apt-get install -y \
    g++ \
    make \
    libhiredis-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN cd cpp_src && make -B

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
