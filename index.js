const Koa = require("koa");
const Router = require("koa-router");
const cheerio = require("cheerio");
const axios = require("axios");
const app = (module.exports = new Koa());
const router = new Router();

const getMovies = require("./getMovies");
const getMovie = require("./getMovie");

const getUrl = (page = 1, region = "") => {
  return `https://www.movieffm.net/movies/page/${page}/?genres&region=${encodeURIComponent(
    region
  )}`;
};

const getSource = (source) => {
  return `https://www.movieffm.net/movies/${source}`;
};

const headers = {
  headers: {
    "User-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
  },
};

router.get("/movies", async function (ctx) {
  let movies = [];
  const { region, page, orderBy } = ctx.request.query || {};
  const { body } = await getMovies.handler({
    queryStringParameters: { region, page, orderBy },
  });
  if (body) {
    movies = JSON.parse(body);
  }

  ctx.body = movies;
});

router.get("/movie", async (ctx) => {
  let movie = [];
  const { source } = ctx.request.query || {};
  const { body } = await getMovie.handler({
    queryStringParameters: { source },
  });
  if (body) {
    movie = JSON.parse(body);
  }
  ctx.body = movie;
});

app.use(router.routes()).use(router.allowedMethods());

if (!module.parent) {
  app.listen(3000);
  console.log("listening 3000");
}
