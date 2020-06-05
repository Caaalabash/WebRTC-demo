const io = require('socket.io')().listen(3000)

io.on('connection', socket => {
    socket.send({ type: 'log', message: 'Socket已连接' })

    socket.on('message', data => {
        if (data.type === 'join') {
            // 离开其他房间
            Object.values(socket.rooms).filter(i => i !== socket.id).forEach(room => {
                socket.leave(room, () => {
                    socket.to(room).send({ type: 'log', message: `user ${socket.id} 离开了房间` })
                    socket.send({ type: 'log', message: `自动退出房间${room}` })
                })
            })
            const roomSize = (io.sockets.adapter.rooms[data.message] || { length: 0 }).length
            if (roomSize === 0) {
                socket.join(data.message, () => {
                    socket.send({ type: 'log', message: `创建房间${data.message}` })
                })
            } else if (roomSize === 1) {
                socket.join(data.message, () => {
                    socket.send({ type: 'log', message: `加入房间${data.message}` })
                    socket.to(data.message).send({ type: 'log', message: `${socket.id}加入了房间` })
                    socket.to(data.message).send({ type: 'member', message: socket.id })
                })
            } else if (roomSize === 2) {
                socket.send({ type: 'log', message: `房间已满` })
            }
        } else {
            Object.values(socket.rooms).filter(i => i !== socket.id).forEach(room => {
                socket.to(room).send(data)
            })
        }
    })

    socket.on('disconnect', () => {
        socket.send({ type: 'log', message: 'Socket已断开连接' })
    })
})