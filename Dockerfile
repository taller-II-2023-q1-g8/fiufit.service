# First Time
FROM node:19-alpine3.16

COPY node_modules ./node_modules
COPY main.js ./main.js
COPY routes.js ./routes.js
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY test.js ./test.js
COPY yarn.lock ./yarn.lock
RUN npm ci --only=production
CMD ["node", "main.js"]

# Fast Build

# FROM gateway:latest
#COPY node_modules ./node_modules
#COPY main.js ./main.js
#COPY routes.js ./routes.js
#COPY package.json ./package.json
#COPY package-lock.json ./package-lock.json
#COPY test.js ./test.js
#COPY yarn.lock ./yarn.lock
#CMD ["node", "main.js"]
