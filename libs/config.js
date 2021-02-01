const axios = require('axios')

const config = require('../configs')
const getList = config.lists
const getOwn = config.owns

module.exports = {
    getList,
    getOwn,
    optionOwn: async (option, data) => {
        const list = await getOwn();
        debugger
        const isHas = list.some(item => item.code === data.code)
        switch (option) {
            case 'add':
                if (isHas) {
                    return {
                        status: '1',
                        msg: '已添加过，不能重复添加~'
                    }
                }
                list.push(data)
                await config.setOwns(list)
                return {
                    status: '0',
                    msg: '添加成功！'
                }
                break;
            case 'delete':
                if (!isHas) {
                    return {
                        status: '1',
                        msg: '不存在，请重新选择~'
                    }
                }
                let index = null
                list.forEach((item, i) => {
                    if (item.code == data.code) {
                        index = i
                    }
                })
                list.splice(index, 1)
                await config.setOwns(list)
                return {
                    status: '0',
                    msg: '删除成功！'
                }
        }
    },
    optionList: async (option, data) => {
        const list = await getList();
        const isHas = list.some(item => item.code === data.code)
        switch (option) {
            case 'add':
                if (isHas) {
                    return {
                        status: '1',
                        msg: '已添加过，不能重复添加~'
                    }
                }
                list.push(data)
                await config.setList(list)
                return {
                    status: '0',
                    msg: '添加成功！'
                }
                break;
            case 'delete':
                if (!isHas) {
                    return {
                        status: '1',
                        msg: '不存在，请重新选择~'
                    }
                }
                let index = null
                list.forEach((item, i) => {
                    if (item.code == data.code) {
                        index = i
                    }
                })
                list.splice(index, 1)
                await config.setList(list)
                return {
                    status: '0',
                    msg: '删除成功！'
                }
        }
    },
}
