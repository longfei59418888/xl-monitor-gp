var http = require('http'),
    querystring = require('querystring'),
    zlib = require('zlib');
var args = {
    //参数以及备用数据
    contents : querystring.stringify({
        //发包的信息
        name:'homeway.me',
    }),
};
var options = {
    hostname: 'data.eastmoney.com',
    port: 80,
    path: '/notices/getdata.ashx?StockCode=300562&PageIndex=1&PageSize=15',
    method: 'GET',
    headers: {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.11 Safari/537.36',
        'Accept-Encoding':'gzip, deflate',
    },
};
const iconv = require('iconv-lite');
var get = function ( options, args, callback ){
    var req = http.request(options, function (res) {
        var chunks =[], data, encoding = res.headers['content-encoding'];
        console.log(encoding)
        res.on('data', function (chunk){
            chunks.push(chunk);
        });
        res.on('end', function (){
            var buffer = Buffer.concat(chunks);
            zlib.gunzip(buffer, function (err, decoded) {
                console.log(iconv.decode(decoded,'gb2312'))
                data = decoded.toString();
                callback( err, args, res.headers, data);
            });
        });
    });
    req.write( args.contents );
    req.end();
};

get( options, args, function (err, args, headers, data){
    console.log('==>header \n', headers);
    console.log('==data \n', data);
});
