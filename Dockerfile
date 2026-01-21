FROM node:18-alpine

WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Ensure data dir exists
RUN mkdir -p /usr/src/app/data

ENV PORT=3000
ENV P2P_PORT=7100
ENV HOST=0.0.0.0

EXPOSE 3000 7100

CMD ["node", "src/server.js"]
