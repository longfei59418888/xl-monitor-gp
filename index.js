const Koa = require('koa')
const path = require('path')
const fs = require('fs')
const cors = require('koa2-cors');
const views = require('koa-views')
const staticFiles = require('koa-static')
const router = require('koa-router')()
const BodyParser = require('koa-bodyparser');

const {init} = require('./libs/socket')
const {run} = require('./libs/crawling2')
const {
    getList,
    getOwn,
    optionOwn,
    optionList
} = require('./libs/config')

const bodyparser = new BodyParser();
const app = new Koa()

app.use(bodyparser);
app.use(cors());
app.use(staticFiles(path.resolve(__dirname, "./public/")))


// 加载模板引擎
app.use(views(path.join(__dirname, './tpl'), {
    extension: 'ejs',
}))


router.get('/index', async (ctx, next) => {
    await ctx.render('index')
})

router.get('/config/list', async (ctx, next) => {
    const list = await getList()
    await ctx.render('config', {
        type: 'list',
        list
    })
})
router.get('/config/own', async (ctx, next) => {
    const list = await getOwn()
    await ctx.render('config', {
        type: 'own',
        list
    })
})

router.post('/config/list/:option', async (ctx, next) => {
    const {params, body} = ctx.request
    const {option} = params
    const data = await optionList(option, body)
    ctx.set("Content-Type", "application/json")
    ctx.body = JSON.stringify(data)
})
router.post('/config/own/:option', async (ctx, next) => {
    const {params, body} = ctx.request
    const {option} = params
    const data = await optionOwn(option, body)
    ctx.set("Content-Type", "application/json")
    ctx.body = JSON.stringify(data)
})

app.use(router.routes(), router.allowedMethods())
const server = require('https').createServer({
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
}, app.callback());
init(server)
server.listen(8000, () => {
    console.log('start')
    run()
})
