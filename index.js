const Koa = require('koa')
const path = require('path')
const fs = require('fs')
const cors = require('koa2-cors');
const views = require('koa-views')
const staticFiles = require('koa-static')
const router = require('koa-router')()

const {init} = require('./libs/socket')
const {run} = require('./libs/crawling2')
const {getList, getOwn} = require('./libs/config')


const app = new Koa()

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
        list
    })
})
router.get('/config/own', async (ctx, next) => {
    const list = await getOwn()
    await ctx.render('config', {
        list
    })
})

// router.get('/config/list/:option', async (ctx, next) => {
//     const data = await getInfo(code)
//     await ctx.render('index', data)
// })
// router.get('/config/own/:option', async (ctx, next) => {
//     const data = await getInfo(code)
//     await ctx.render('index', data)
// })

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
