const fs = require('fs-extra')
const path = require('path')


let own = null
let list = null
module.exports = {
    lists: async () => {
        if (!list) list = await fs.readJson(path.join(__dirname, './list.json'))
        return list
    },
    setList: async (data) => {
        list = data;
        await fs.writeJson(path.join(__dirname, './list.json'), list)
    },
    owns: async () => {
        if (!own) own = await fs.readJson(path.join(__dirname, './own.json'))
        return own
    },
    setOwns: async (data) => {
        own = data;
        await fs.writeJson(path.join(__dirname, './own.json'), own)
    },
    notices: [
        '回购预案',
        '签订协议',
        '重大合同',
        '股权激励',
        '增发',
        '对外投资'
    ],
    notices2: [
        '减持',
        '股份质押',
        '限售股份上市流通'
    ]
}
























