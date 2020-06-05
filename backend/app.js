const io = require('socket.io')().listen(3002)

io.on('connection', socket => {
    socket.on('message', data => {
        const joinedRooms = Object.values(socket.rooms).filter(i => i !== socket.id)

        if (data.type === 'join') {
            const { room, name } = data.message
            socket.name = name

            joinedRooms.forEach(joinedRoom => {
                socket.leave(joinedRoom, () => {
                    socket.to(room).send({ type: 'member-leave', name: socket.name })
                })
            })
            socket.join(room, () => {
                socket.to(room).send({ type: 'member-join', name: socket.name })
            })
        } else {
            const target = Object.values(io.sockets.sockets).find(i => i.name === data.to)
            target.send({ ...data, name: socket.name })
        }
    })
})