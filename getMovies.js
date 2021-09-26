exports.handler = async (event) => {
  const cheerio = require("cheerio");
  const axios = require("axios");
  const moment = require("moment");
  const { page, region, orderBy } = event.queryStringParameters || {};
  const getUrl = (page = 1, region = "", orderBy = "view") => {
    return `https://www.movieffm.net/movies/page/${page}/?genres&orderby=${orderBy}&region=${encodeURIComponent(
      region
    )}`;
  };

  /*
  region: [
    香港,
    韓國,
    海外,
    泰國,
    歐美,
    日本,
    大陸,
    台灣,
    印度
  ]

  orderBy: [
    view,
    date
  ]

  */

  const headers = {
    headers: {
      "User-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
    },
  };

  const parseDate = (date) => {
    try {
      return moment(date).unix() * 1000;
    } catch {
      return date;
    }
  };

  const parseName = (name) => {
    if (name.indexOf("/") > -1) {
      return name.split("/")[0];
    }
    return name;
  };

  const movies = await axios
    .get(getUrl(page, region, orderBy), headers, { timeout: 60000 })
    .then(({ data }) => {
      try {
        const $ = cheerio.load(data);
        const contents = $("#archive-content .item");

        return contents
          .map((i, el) => {
            const item = $(el);

            const source = item.find(".poster > a").attr("href");

            const tags = item
              .find(".dtinfo > .genres > .mta a")
              .map((a, tag) => {
                return $(tag).text();
              })
              .get();
            return {
              poster: item.find(".poster > img").attr("src"),
              source: (source || "")
                .replace(/^(https:\/\/www.movieffm.net\/movies\/)/g, "")
                .replace("/", ""),
              title: parseName(item.find("h3 > a").text()),
              date: parseDate(item.find(".data > span").text()),
              year: item.find(".data > span").text().slice(0, 4),
              tags,
              hot: tags.indexOf("熱門電影") > -1 ? 1 : 0,
            };
          })
          .get();
      } catch (err) {
        return [];
      }
    })
    .catch((err) => {
      return [];
    });
  const response = {
    statusCode: 200,
    body: JSON.stringify(
      movies.filter((movie) => {
        return (
          movie.tags.indexOf("驚悚片") < 0 &&
          movie.tags.indexOf("恐怖片") < 0 &&
          movie.tags.indexOf("情色片") < 0 &&
          movie.tags.indexOf("寫真集") < 0
        );
      })
    ),
  };
  return response;
};
