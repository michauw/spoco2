# Development Stage
FROM node:18 as development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY docker/environment-docker.ts /app/src/environments/environment.ts
EXPOSE 4200
CMD ["npm", "run", "start-docker"]

# Build Stage
FROM node:18 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY docker/environment-docker.prod.ts /app/src/environments/environment.prod.ts
RUN npm run build --prod

# Production Stage
FROM nginx:alpine as production
COPY --from=build /app/dist/spoco /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
