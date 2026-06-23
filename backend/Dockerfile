# Use Node 22 as the base image
FROM node:22-bullseye-slim

# Set working directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose port and start application
EXPOSE 5000
CMD [ "node", "src/server.js" ]
