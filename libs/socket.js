const {v4} = require('uuid');
let SOCKET = {}
module.exports = {
    init: (server) => {
        require('socket.io')(server).on('connection', socket => {
            const uuid = v4();
            socket.on('disconnect', function () {
                delete SOCKET[uuid]
            });
            SOCKET[uuid] = socket
        })
    },
    push: (msg) => {
        for (const uuid in SOCKET) {
            const socket = SOCKET[uuid]
            socket.emit('getMsg', JSON.stringify(msg))
        }
    }
}
