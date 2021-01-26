const axios = require('axios')
const cheerio = require('cheerio')
const config = require('../configs')
const {push} = require('./socket')
const schedule = require('node-schedule');
const crypto = require('crypto');
const iconv = require('iconv-lite');
const zlib = require('zlib');
const http = require('http')
const md5 = crypto.createHash('md5');

const LISTS = config.lists;

const OWNS = config.owns;

const NOTICES = config.notices;
const NOTICES2 = config.notices2;

const SIGNALS = {
    BUY_01: 'BUY_01',
    BUY_02: 'BUY_02',
    BUY_03: 'BUY_03',
    BUY: 'BUY',
    NOTE: 'NOTE',
    SALE_01: '高于最近30日最高涨幅',
    SALE_02: '利空消息',
    SALE_03: '近期有解禁信息',
    SALE_04: '股权质押',
}


let CACHE = {}

schedule.scheduleJob({hour: 9, minute: 31, dayOfWeek: [1, 2, 3, 4, 5]}, function () {
    CACHE = {}
});


function run() {
    const scan = async (index) => {
        const target = LISTS[index]
        if (!target) {
            setTimeout(() => {
                run()
            }, 3000)
            return
        }
        const {code} = target
        const current = await getToday(code, index)
        if (!current) {
            await scan(index)
            return
        }
        let rst = null
        if (!CACHE[code]) {
            rst = await get(code);
            if (!rst) {
                await scan(index)
                return
            }
            CACHE[code] = {
                rst,
                target,
                current
            }
        }
        const notices = await msg(target)
        if (notices) CACHE[code] = {
            ...CACHE[code],
            notices,
        }


        const extras = await getExtra(code)
        if (extras) CACHE[code] = {
            ...CACHE[code],
            extras,
        }
        await analysis(CACHE[code])
        index++
        await scan(index)
    }
    scan(0)
}

async function analysis(data) {
    const own = await ownTarget(data)
    if (own) {
        return {
            ...data,
            ...own
        }
    }
    const warn = await getTargetRang(data)
    if (warn) {
        return {
            ...data,
            ...warn
        }
    }
    return null
}

async function getTargetRang(data) {
    const {rst, target, current} = data
    const {l, ch, preDay} = rst
    const today = parseFloat((current - preDay) / preDay * 100).toFixed(2)
    const Low = ((current - ch) / ch * 100).toFixed(2)
    let state = ''
    if (today < l) {
        state = 3
        // send(SIGNALS.BUY, target)
    } else if (Low < -10 && Low > -15) {
        state = 2
        // send(SIGNALS.BUY_01, {...target, Low})
    } else if (Low < -15 && Low > -20) {
        state = 3
        // send(SIGNALS.BUY_02, {...target, Low})
    } else if (Low < -20) {
        state = 4
        // send(SIGNALS.BUY_03, {...target, Low})
    }

}

async function ownTarget(data) {
    const {rst, target, current, notices} = data
    const {fh, preDay} = rst
    const today = parseFloat((current - preDay) / preDay * 100).toFixed(2)
    const {code} = target
    const {gqzy, xsjj} = extras || {}
    if (OWNS.indexOf(code) === -1) return null
    if (today > fh) {
        return {
            code: SIGNALS.SALE_01
        }
    }
    if (xsjj && xsjj.length > 0) {
        const warns = xsjj.filter(notice => {
            const {jjsj} = notice
            if (new Date().getTime() - 3 * 24 * 60 * 60 * 1000 < new Date(jjsj).getTime()) {
                return true
            }
            return false
        })
        if (warns && warns.length > 0) return {
            code: SIGNALS.SALE_03,
            data: warns
        }
    }
    if (gqzy && gqzy.length > 0) {
        const warns = gqzy.filter(notice => {
            const {ggrq} = notice
            if (new Date().getTime() - 4 * 24 * 60 * 60 * 1000 < new Date(ggrq).getTime()) {
                return true
            }
            return false
        })
        if (warns && warns.length > 0) return {
            code: SIGNALS.SALE_04,
            data: warns
        }
    }
    if (notices && notices.length > 0) {
        const warns = notices.filter(notice => {
            const {types} = notice
            const state = NOTICES2.some(item => {
                if (types.indexOf(item) != -1) {
                    return true
                }
                return false
            })
            if (state) return true
            return false
        })
        if (warns && warns.length > 0) return {
            code: SIGNALS.SALE_02,
            data: warns
        }
    }
    return null
}


function send(signal, data) {
    console.log(signal, data)
    push({
        signal,
        data
    })
}

async function get(s) {

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(null)
        }, 8000)
        axios.get(`http://www.aigaogao.com/tools/history.html?s=${s}`)
            .then((rst) => {
                const $ = cheerio.load(rst.data);
                const list = $('#ctl16_contentdiv tbody tr')
                let index = 1,
                    mh = [],
                    ml = [],
                    cc = [],
                    ff = [],
                    preDay = null;
                while (index < 30) {
                    const target = $(list[index])
                    const preTarget = $(list[index + 1])
                    const items = target.find('td')
                    const preItems = preTarget.find('td')
                    const h = $(items[2]).text()
                    const l = $(items[3]).text()
                    const c = $(items[4]).text()
                    const f = parseFloat($(items[8]).text()).toFixed(2)
                    if (index === 1) preDay = c
                    const pc = $(preItems[4]).text()
                    if (h > pc) mh.push(((h - pc) * 100 / pc).toFixed(2))
                    if (l < pc) ml.push(((l - pc) * 100 / pc).toFixed(2))
                    ff.push(f)
                    cc.push(c)
                    index++
                }
                resolve({
                    l: Math.min(...ml), //最低
                    h: Math.max(...mh), //最高
                    ch: Math.max(...cc), //高点
                    fh: Math.max(...ff), //高幅
                    fl: Math.min(...ff), //低幅
                    preDay
                })

            })
    })
}


async function getExtra(s) {
    if (/^6\d+/.test(s)) s = `SH${s}`
    else s = `SZ${s}`
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(null)
        }, 3000)
        axios.get(`http://emweb.securities.eastmoney.com/CompanyBigNews/CompanyBigNewsAjax?requesttimes=1&code=${s}`)
            .then((rst) => {
                const {data = {}} = rst
                const {gqzy, xsjj, dzjy} = data
                resolve({
                    gqzy,
                    xsjj,
                    dzjy
                })
            })
    })
}


//
// else {
//     NOTICES.forEach(item => {
//         if (type.indexOf(item) != -1) {
//             lists.push({
//                 ...target,
//                 href,
//                 title,
//                 id: art_code,
//                 type: item
//             })
//         }
//     })
// }

/*
* 获取当前位置
* */
async function getToday(s) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(null)
        }, 2000)
        axios({
            url: "http://www.aigaogao.com/tools/action.aspx?act=apr",
            method: "post",
            data: {
                s
            },
            transformRequest: [function (data) {
                let ret = ''
                for (let it in data) {
                    ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&'
                }
                return ret
            }],
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
            }
        }).then((res) => {
            let rst = null
            eval('rst = ' + res.data)
            const current = rst.data[0].price
            resolve(current)
        })
    })
}

/*
* 获取公共
* */
async function msg(target) {
    const {code} = target
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(null)
        }, 3000)
        const req = http.request({
            hostname: 'data.eastmoney.com',
            port: 80,
            path: `/notices/getdata.ashx?StockCode=${code}&CodeType=A&PageIndex=1&PageSize=15`,
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.11 Safari/537.36',
                'Accept-Encoding': 'gzip, deflate',
            },
        }, function (res) {
            const chunks = [];
            res.on('data', function (chunk) {
                chunks.push(chunk);
            });
            res.on('error', function (err) {
                reject()
            });
            res.on('end', function () {
                const buffer = Buffer.concat(chunks);
                zlib.gunzip(buffer, function (err, decoded) {
                    deal(iconv.decode(decoded, 'gb2312'))
                });
            });
        });

        req.end();

        function deal(rst) {
            let msgList = null
            eval(rst.replace('var  = ', 'msgList  = '))
            const {data} = msgList
            let lists = []
            data.forEach(item => {
                const {art_code, title, display_time, columns} = item
                const types = columns.reduce((a, item) => item.column_name + a, '')
                const href = `http://data.eastmoney.com/notices/detail/${code}/${art_code}.html`
                if (new Date().getTime() - 3 * 24 * 60 * 60 * 1000 < new Date(display_time).getTime() && art_code) {
                    lists.push({
                        href,
                        title,
                        types,
                        id: art_code,
                        item
                    })
                }
            })
            resolve(lists)
        }
    })
}


module.exports = {
    run: function () {
        run()
    }
}
