var http = require('http'),
    querystring = require('querystring'),
    zlib = require('zlib');
const axios = require('axios')
// http://emweb.securities.eastmoney.com/CompanyBigNews/Index?type=web&code=SZ002714

axios.get('http://emweb.securities.eastmoney.com/CompanyBigNews/CompanyBigNewsAjax?requesttimes=1&code=SZ002714').then((res) => {
   console.log(res.data)
})






















// gqzy 股权质押
// xsjj 限售解禁
// dzjy 大宗交易

