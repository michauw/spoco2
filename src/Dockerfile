# Development Stage
FROM node:18 as development
WORKDIR /app
COPY ../package*.json ./
RUN npm install
COPY . .
RUN ln -s /app/settings /app/src/settings
EXPOSE 4200
CMD ["npm", "start"]

# Build Stage
FROM node:18 as build
WORKDIR /app
COPY ../package*.json ./
RUN npm install
COPY . .
RUN npm run build --prod

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist/your-angular-app /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
