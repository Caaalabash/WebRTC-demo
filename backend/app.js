const io = require('socket.io')().listen(3002)

// 信令服务器设计：
// 0. 约定传递对象结构为: { type, payload, to, from }
// 1. 处理其他功能需要的自定义事件
// 2. 处理点对点之间的信息转发
io.on('connection', socket => {
    socket.on('message', ({ type, payload, to }) => {
        if (type === 'join') {
            socket.from = payload.name
            // 离开其他房间
            Object.values(socket.rooms).filter(i => i !== socket.id).forEach(joinedRoom =>
                socket.leave(joinedRoom, () =>
                    socket.to(payload.room).send({ type: 'member-leave', from: payload.name })
                )
            )
            // 加入当前房间
            socket.join(payload.room, () => {
                socket.send({ type: 'log', payload: `已加入房间【${payload.room}】` })
                socket.to(payload.room).send({ type: 'member-join', from: payload.name })
            })
        } else {
            const target = Object.values(io.sockets.sockets).find(i => i.from === to)
            target && target.send({ type, payload, to, from: target.from })
        }
    })
})