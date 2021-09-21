FROM node:12-alpine

WORKDIR /usr/src/app/movies/app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 9999

CMD npm run dev
