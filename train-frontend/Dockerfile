FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci || npm install

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_TEST_EMAIL=omkar@gmail.com
ARG VITE_TEST_PASSWORD=Qwert@123
ENV VITE_TEST_EMAIL=$VITE_TEST_EMAIL
ENV VITE_TEST_PASSWORD=$VITE_TEST_PASSWORD

RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
