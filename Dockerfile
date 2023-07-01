FROM node:19-alpine3.16

WORKDIR .
COPY package*.json ./

RUN npm ci --only=production
COPY . .
CMD ["node", "server.js"]
