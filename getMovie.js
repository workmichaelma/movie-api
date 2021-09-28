exports.handler = async (event) => {
  const cheerio = require("cheerio");
  const axios = require("axios");
  const { source } = event.queryStringParameters || {};
  let movie = [];
  const getSource = (source) => {
    return `https://www.movieffm.net/movies/${source}`;
  };

  const getTrailerId = (url) => {
    if (url) {
      try {
        const id = url
          .replace("https://www.youtube.com/embed/", "")
          .replace("?autoplay=0&autohide=1", "");
        return id || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const isURL = (url) => {
    try {
      if (new URL(url)) {
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const headers = {
    headers: {
      "User-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
    },
  };
  if (source) {
    try {
      movie = await axios
        .get(getSource(source), headers)
        .then(({ data }) => {
          const $ = cheerio.load(data);
          const sourcesDoc = $(".source-box").not("#source-player-trailer");
          const trailerDoc = $("#source-player-trailer iframe");
          const trailer = getTrailerId(
            trailerDoc.length > -1 ? trailerDoc.attr("src") || "" : ""
          );

          const sources = sourcesDoc
            .map((i, el) => {
              const source = $(el);
              const url = source.find("iframe").attr("src");
              if (isURL(url)) {
                const fullpath = new URL(url) || {};
                if (fullpath.search) {
                  let _source = new URLSearchParams(fullpath.search).get(
                    "source"
                  );
                  const reg = new RegExp(/^(\/\/)/g);
                  if (reg.test(_source)) {
                    _source = `https:${_source}`;
                  }
                  return _source;
                }
              }
              return "";
            })
            .get();
          return {
            sources: sources.filter((s) => s),
            trailer,
          };
        })
        .catch((err) => {
          return {
            sources: [],
            trailer: "",
            err,
          };
        });
    } catch (err) {
      return {
        sources: [],
        trailer: "",
        err,
      };
    }
  }
  const response = {
    statusCode: 200,
    body: JSON.stringify(movie),
  };
  return response;
};
