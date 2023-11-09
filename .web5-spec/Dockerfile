FROM node:18-alpine
RUN apk add --no-cache git
RUN git clone https://github.com/TBD54566975/web5-js.git /web5-js && cd /web5-js && npm ci && npm run build
WORKDIR /web5-js
RUN npm install express express-openapi
ADD . /web5-js/.web5-component
RUN npx tsc -p .web5-component/tsconfig.json
CMD ["node", ".web5-component/dist/main.js"]
