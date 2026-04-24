FROM node:20-slim

RUN apt-get update && apt-get install -y \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build the C++ binary from cpp_src/
RUN cd cpp_src && make

ENV PORT=10000
EXPOSE 10000

CMD ["npm", "start"]