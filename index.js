const Koa = require('koa')
const path = require('path')
const fs = require('fs')
const {init} = require('./libs/socket')
const {run} = require('./libs/crawling')
const app = new Koa()
var cors = require('koa2-cors');
const views = require('koa-views')
// 加载模板引擎
app.use(views(path.join(__dirname), {
    extension: 'html'
}))
app.use(cors());
const server = require('https').createServer({
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
}, app.callback());
init(server)
const router = require('koa-router')()
router.get('/index', async (ctx, next) => {
    await ctx.render('index')
})
app.use(router.routes(), router.allowedMethods())


server.listen(8000, () => {
    console.log('start')
    run()
})



