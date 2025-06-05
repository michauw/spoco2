# Build Stage
FROM node:20-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY docker/environment-docker.ts /app/src/environments/environment.prod.ts
RUN npm run build --prod

# Production Stage
FROM nginx:alpine AS production
COPY --from=build /app/dist/spoco /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
