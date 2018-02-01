var http = require('http'),
    faye = require('faye');

var server = http.createServer(),
    bayeux = new faye.NodeAdapter({mount: '/'});

bayeux.attach(server);
server.listen(8000);

var client = new faye.Client('http://localhost:8000/');

// client.subscribe('/messages', function(message) {
//     alert('Got a message: ' + message.text);
// })


var net = require('net')
var path = require('path')

var Parser = require('binary-parser').Parser
var parser = new Parser()
    .endianess('little')
    .uint32('magic_header', {assert: 0x5aa555aa})
    .uint8('node_type')
    .uint32('node_id')
    .uint8('frame_type')
    .uint16('pkg_length')
    .uint8('frame_id')
    .uint16('reserved_2')
    .uint8('reserved_3')
    .uint16('left_distance')
    .uint16('right_distance')
    .uint8('raw_crc')

var MAGIC_HEADER = 'aa55a55a'

var MagicHeader = new Buffer(MAGIC_HEADER, 'hex');

var server = net.createServer(function (socket) {
    var remote_address = socket.remoteAddress
    var remote_port = socket.remotePort

    var current_buff = undefined
    var last_pkg_at = new Date().getTime();
    console.log('connection_socket', remote_address, remote_port)
    var result_window = []
    var last_window_at = new Date().getTime()

    socket.on('data', function (data) {
        var current_time = new Date().getTime()
        var results = []
        var log = {
            success: false,
            data: data
        }

        // var current = new Date().getTime()
        // console.log(current - last_pkg_at, data.length)
        // last_pkg_at = current

        current_buff = (current_buff) ? Buffer.concat([current_buff, data]) : data
        try {
            // Trim the buffer for MagicHeader
            var magicHeaderIndex = current_buff.indexOf(MagicHeader)
            if (magicHeaderIndex > 0) {
                current_buff = current_buff.slice(
                    current_buff.indexOf(MagicHeader)
                )
            } else if (magicHeaderIndex < 0) {
                // TODO if MagicHeader doesn't exists
                current_buff = undefined
                console.log('SHOULD NOT BE HERE')
            }

            var isEnd = false
            var result = undefined
            while (!isEnd) {
                result = parser.parse(current_buff)
                results.push(result)

                var bar_width = 182;
                var left = result.left_distance;
                var right = result.right_distance;
                var target_x = (left * left + bar_width * bar_width - right * right) / (2 * bar_width) - bar_width / 2;
                var target_y = Math.pow(Math.pow(left, 2) - Math.pow(target_x, 2), 0.5);
                var message = {
                    x: target_x,
                    y: target_y,
                    l: left,
                    r: right
                };
                client.publish('/messages', message);

                result_window.push(message)
                var delta = current_time - last_window_at
                if (delta > 500) {
                    if (result_window.length > 0) {
                        console.log(delta, result_window[0])
                    } else {
                        console.log(delta, "no result")
                    }
                    last_window_at = current_time
                    result_window = []
                }

                var frameLength = 12 + result.pkg_length + 1
                result.raw_pkg = current_buff.slice(0, frameLength)
                result.frame_len = frameLength
                current_buff = current_buff.slice(frameLength)
                isEnd = (current_buff.length == 0)
                console.log(result.frame_id)
            }

            log.msg = 'parsed,' + results.length
            if (current_buff.length == 0) {
                current_buff = undefined
            }
        } catch (err) {
            // console.error(err)
            log.msg = 'parse failed'
        }

        results.forEach(function (result) {
            result.crc = 0
            for (var i = 0; i < result.frame_len - 1; i++) {
                result.crc = result.crc ^ result.raw_pkg[i]
            }
            if (result.raw_crc != result.crc) {
                log.err_msg = "crc failed," + result.raw_crc + "," + result.crc
                log.success = false
                log.show = true
            } else {
                log.success = true
                log.result = result
            }
            // console.log(JSON.stringify(log))
        })

    })
});

server.listen(8899, '0.0.0.0');


