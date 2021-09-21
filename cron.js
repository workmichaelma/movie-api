const CronJob = require("cron").CronJob;
const axios = require("axios");
var convert = require("xml-js");
const getMovies = require("./getMovies");
const { map, range, flatten, slice } = require("lodash");
const admin = require("firebase-admin");

const serviceAccount = require("./movies-9c04d-firebase-adminsdk-er3do-cb0243730b");

const fetchMovies = async (page) => {
  try {
    const { body } = await getMovies.handler({
      queryStringParameters: { page, orderBy: "date" },
    });
    return JSON.parse(body);
  } catch (err) {
    console.log(`Fetch movies error, Page:${page}`);
  }
};

const _ = {
  db: null,
  DB_NAME: "movie",
  totalPages: 50,
  itemPerPage: 50,
  initDB: async () => {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    _.db = admin.firestore();
  },
  startCron: async (startFrom = 1) => {
    const calls = map(
      range((startFrom - 1) * _.totalPages + 1, _.totalPages * startFrom + 1),
      async (i) => {
        return fetchMovies(i);
      }
    );
    const c = await Promise.all(calls);
    const movies = flatten(c);

    if (movies.length > 0) {
      _.initDB();
      if (_.db) {
        const push = map(movies, _.insertToDB);
        const data = await Promise.all(push);
        return data;
      }
    }
    return [];
  },
  insertToDB: async (movie) => {
    try {
      const docRef = _.db.collection(_.DB_NAME).doc(movie.title);
      const doc = await docRef.set(movie);
      return {
        doc,
        movie: movie.title,
      };
    } catch (err) {
      console.log(`insert Movie error, movie: ${movie.title}`, err);
      return {};
    }
  },
  getMovies: async ({ page = 1, type, year }) => {
    _.initDB();
    const _page = parseInt(page);
    let docRef = _.db.collection(_.DB_NAME);

    if (year) {
      docRef = docRef.where("year", "==", year);
    }
    if (type) {
      docRef = docRef.where("tags", "array-contains", type);
    }

    const snapshot = await docRef.get();
    const items = [];
    let i = 0;
    snapshot.forEach((doc) => {
      i++;
      if (i >= (_page - 1) * 50 + 1 && i <= _page * 50) {
        items.push(doc.data());
      }
    });

    return {
      totalItems: i,
      totalPage: Math.ceil(i / 50),
      currentPage: _page,
      hasNextPage: i > _page * 50,
      items,
    };
  },
};

module.exports = _;
