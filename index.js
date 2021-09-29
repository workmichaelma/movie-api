const Koa = require("koa");
const Router = require("koa-router");
const send = require("koa-send");
const app = (module.exports = new Koa());
const CronJob = require("cron").CronJob;
const router = new Router();

const getMovies = require("./getMovies");
const getMovie = require("./getMovie");
const cron = require("./cron");

router.get("/cron", async function (ctx) {
  const { page = 1 } = ctx.request.query;
  ctx.body = await cron.startCron(page);
});

router.get("/cron/movies", async function (ctx) {
  const { page = 1, type, year } = ctx.request.query;
  ctx.body = await cron.getMovies({ page, type, year });
});

router.get("/cron/movies/all", async function (ctx) {
  ctx.body = await cron.getAllMovies();
});

router.get("/movie", async function (ctx) {
  const { source } = ctx.request.query;
  if (source) {
    ctx.body = await cron.getMovie(source);
  } else {
    ctx.body = {};
  }
});

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

// router.get("/movie", async (ctx) => {
//   let movie = [];
//   const { source } = ctx.request.query || {};
//   const { body } = await getMovie.handler({
//     queryStringParameters: { source },
//   });
//   if (body) {
//     movie = JSON.parse(body);
//   }
//   ctx.body = movie;
// });

router.get("/youtube", async (ctx) => {
  await send(ctx, "./youtube.html");
});

const cron1 = new CronJob("0 0 0 * * *", () => {
  cron.startCron(1);
});
cron1.start();

const cron2 = new CronJob("0 0 6 * * *", () => {
  cron.startCron(2);
});
cron2.start();

const cron3 = new CronJob("0 0 12 * * *", () => {
  cron.startCron(3);
});
cron3.start();

const cron4 = new CronJob("0 0 18 * * *", () => {
  cron.startCron(4);
});
cron4.start();

app.use(router.routes()).use(router.allowedMethods());

if (!module.parent) {
  app.listen(9999);
  console.log("listening 9999");
}
