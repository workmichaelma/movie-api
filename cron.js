const CronJob = require("cron").CronJob;
const axios = require("axios");
var convert = require("xml-js");
const getMovies = require("./getMovies");
const getMovie = require("./getMovie");
const { map, range, flatten, slice, orderBy } = require("lodash");
const admin = require("firebase-admin");
const moment = require("moment");

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

const fetchMovie = async (source) => {
  try {
    const { body } = await getMovie.handler({
      queryStringParameters: { source },
    });
    return JSON.parse(body);
  } catch (err) {
    console.log(`Fetch movie error, Source:${source}`);
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
  moviesPreprocess: (snapshot) => {
    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        ...data,
        date: moment(data.date).format("YYYY-MM-DD"),
      });
    });

    return items;
  },
  getMovies: async ({ page = 1, type, year }) => {
    _.initDB();
    const _page = parseInt(page);
    let docRef = _.db.collection(_.DB_NAME);

    docRef = docRef.where("date", "<", moment().unix() * 1000);
    if (year) {
      docRef = docRef.where("year", "==", year);
    }
    if (type) {
      docRef = docRef.where("tags", "array-contains", type);
    }

    const snapshot = await docRef
      .orderBy("date", "desc")
      .offset((page - 1) * 50)
      .limit(51)
      .get();
    const items = _.moviesPreprocess(snapshot);

    return {
      currentPage: _page,
      hasNextPage: items.length > 50,
      items: slice(items, 0, 50),
    };
  },
  getAllMovies: async () => {
    _.initDB();
    const snapshot = await _.db.collection(_.DB_NAME).get();
    const items = _.moviesPreprocess(snapshot);
    return items;
  },
  getMovie: async (source) => {
    _.initDB();
    const snapshot = await _.db
      .collection(_.DB_NAME)
      .where("source", "==", source)
      .get();
    const [item] = _.moviesPreprocess(snapshot);
    const { sources, trailer } = item;
    if (sources && trailer !== undefined) {
      return item;
    } else {
      const detail = await fetchMovie(source);
      const { sources, trailer } = detail || {};
      if (sources && trailer !== undefined) {
        const movie = {
          ...item,
          ...detail,
        };
        _.insertToDB(movie);
        return movie;
      } else {
        return item;
      }
    }
  },
};

module.exports = _;
