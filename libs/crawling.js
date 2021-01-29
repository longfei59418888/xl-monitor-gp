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

const SIGNALS = {
    BUY_01: 'BUY_01', // 1级别
    BUY_02: 'BUY_02', // 1级别
    BUY_03: 'BUY_03', // 1级别
    BUY: 'BUY', // 买
    NOTE: 'NOTE', // 重要信息
    SALE: 'SALE', // 买
}


let CACHE = {}

schedule.scheduleJob({hour: 9, minute: 31, dayOfWeek: [1, 2, 3, 4, 5]}, function () {
    CACHE = {}
});


function run() {
    function scan(index) {

        const target = LISTS[index]
        if (!target) {
            setTimeout(() => {
                run()
            }, 300)
            return
        }
        const {code} = target
        getToday(code, index).then((current) => {
            if (!CACHE[code]) {
                get(code).then(rst => {
                    CACHE[code] = rst
                    deal({
                        rst,
                        target,
                        current,
                    })

                }, () => {
                    scan(index)
                })
            } else {
                deal({
                    rst: CACHE[code],
                    target,
                    current,
                })
            }
        }, () => {
            scan(index)
        })

        function deal(data) {
            const {rst, target, current} = data
            const {l, ch, fh, preDay} = rst
            const {code} = target
            const today = parseFloat((current - preDay) / preDay * 100).toFixed(2)
            const Low = ((current - ch) / ch * 100).toFixed(2)
            if (OWNS.indexOf(code) !== -1) {
                if (today > fh) {
                    send(SIGNALS.SALE, target)
                }
            } else {
                if (today < l) {
                    send(SIGNALS.BUY, target)
                } else if (Low < -10 && Low > -15) {
                    send(SIGNALS.BUY_01, {...target, Low})
                } else if (Low < -15 && Low > -20) {
                    send(SIGNALS.BUY_02, {...target, Low})
                } else if (Low < -20) {
                    send(SIGNALS.BUY_03, {...target, Low})
                }
            }
            msg(target).then((data) => {
                console.log(data)
                // send('NOTE', data)
                index++
                scan(index)
            }, () => {
                index++
                scan(index)
            }).catch(() => {
                index++
                scan(index)
            })
        }
    }

    scan(0)
}


function send(signal, data) {
    console.log(signal, data)
    push({
        signal,
        data
    })
}

function get(s) {

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


/*
* 获取当前位置
* */
function getToday(s, time) {
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
function msg(target) {
    const {code} = target
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(null)
        }, 300)
        return
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
                const type = columns.reduce((a, item) => item.column_name + a, '')
                console.log(type)
                const href = `http://data.eastmoney.com/notices/detail/${code}/${art_code}.html`
                if (new Date().getTime() - 3 * 24 * 60 * 60 * 1000 < new Date(display_time).getTime() && art_code) {
                    if (OWNS.indexOf(code) != -1) {
                        ['减持', '股份质押', '限售股份上市流通', ''].forEach(item => {
                            if (type.indexOf(item) != -1) {
                                lists.push({
                                    ...target,
                                    href,
                                    id: art_code,
                                    title,
                                    type: item
                                })
                            }
                        })
                    } else {
                        NOTICES.forEach(item => {
                            if (type.indexOf(item) != -1) {
                                lists.push({
                                    ...target,
                                    href,
                                    title,
                                    id: art_code,
                                    type: item
                                })
                            }
                        })
                    }

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
