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
    logger.info('connection_socket', remote_address, remote_port)
    console.log('connection_socket', remote_address, remote_port)
    socket.on('data', function (data) {
        var results = []
        var log = {
            success: false,
            data: data
        }
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

                var frameLength = 12 + result.pkg_length + 1
                result.raw_pkg = current_buff.slice(0, frameLength)
                result.frame_len = frameLength
                current_buff = current_buff.slice(frameLength)
                isEnd = (current_buff.length == 0)
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
            console.log(JSON.stringify(log))
        })

    })
});

server.listen(8899, '0.0.0.0');



