# Build Stage
FROM node:20-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY docker/environment-docker.ts /app/src/environments/environment.prod.ts
ARG SUBPATH
RUN npm run build -- --base-href=${SUBPATH}

# Production Stage
FROM nginx:alpine AS production
COPY --from=build /app/dist/spoco/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
