let SOCKET = null
module.exports = {
    init: (server) => {
        require('socket.io')(server).on('connection', socket => {
            SOCKET = socket
        })
    },
    push: (msg) => {
        SOCKET.emit('getMsg', JSON.stringify(msg))
    }
}
