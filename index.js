const Koa = require('koa');
const Router = require('koa-router');
const cheerio = require('cheerio');
const axios = require('axios');
const app = module.exports = new Koa();
const router = new Router();

const getUrl = (page = 1, region = '') => {
  return `https://www.movieffm.net/movies/page/${page}/?genres&region=${encodeURIComponent(region)}`
}

const getSource = source => {
  return `https://www.movieffm.net/movies/${source}`
}

const headers = {
  headers: {
    'User-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36'
  }
}

router.get('/movies', async function (ctx) {
  const { region, page } = ctx.request.query || {}

  const movies = await axios.get(getUrl(page, region), headers).then(({ data }) => {
    try {
      const $ = cheerio.load(data)
      const contents = $('#archive-content .item')
  
      return contents.map((i, el) => {
        const item = $(el)

        const source = item.find('.poster > a').attr('href')

        return {
          poster: item.find('.poster > img').attr('src'),
          source: (source || '').replace(/^(https:\/\/www.movieffm.net\/movies\/)/g, '').replace('/', ''),
          title: item.find('h3 > a').text(),
          date: item.find('.data > span').text().slice(-4),
          tags: item.find('.dtinfo > .genres > .mta a').map((a, tag) => {
            return $(tag).text()
          }).get()
        }
      }).get()
    } catch (err) {
      return []
    }
  }).catch(err => {
    return []
  })

  ctx.body = movies;
});

router.get('/movie', async ctx => {
  const { source } = ctx.request.query || {}
  if (source) {
    try {
      const movie = await axios.get(getSource(source), headers).then(({ data }) => {
        const $ = cheerio.load(data)
        const sources = $('.source-box').not('#source-player-trailer')
      
        return sources.map((i, el) => {
          const source = $(el)
          const url = source.find('iframe').attr('src')
          const fullpath = new URL(url) || {}
          if (fullpath.search) {
            return new URLSearchParams(fullpath.search).get('source')
          }
          return ''
        }).get()
      }).catch(err => {
        return []
      })

      ctx.body = movie
    } catch (err) {
      return []
    }
  }

  ctx.json = []
})

app
  .use(router.routes())
  .use(router.allowedMethods());

if (!module.parent) app.listen(3000);