const net = require('net')
const stick = require('stickpackage')

const tcp_server = net.createServer(function (socket) {
    const msgCenter = new stick.msgCenter()

    socket.on('data', function (data) {
        // msgCenter.putData(data)
        console.log(data.length)
    })

    msgCenter.onMsgRecv(function (data) {
        console.log('recv data: ' + data.toString())
    })

    socket.on('close', function (error) {
        console.log('client disconnected')
    })

    socket.on('error', function (error) {
        console.log(error)
    })
})

tcp_server.on('error', function (err) {
    throw err
})
tcp_server.listen(8899, function () {
    console.log('tcp_server listening on 8080')
})
