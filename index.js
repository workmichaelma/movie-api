const Koa = require("koa");
const Router = require("koa-router");
const app = (module.exports = new Koa());
const router = new Router();

const getMovies = require("./getMovies");
const getMovie = require("./getMovie");

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
