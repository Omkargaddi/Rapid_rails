FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

# build the Cpp binary from cpp_src/
RUN make -C cpp_src clean && make -C cpp_src


FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/train_engine ./train_engine
COPY --from=builder /app/train_data ./train_data
COPY --from=builder /app/index.js ./index.js
COPY --from=builder /app/middleware.js ./middleware.js
COPY --from=builder /app/userModel.js ./userModel.js

ENV PORT=10000 \
    NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]