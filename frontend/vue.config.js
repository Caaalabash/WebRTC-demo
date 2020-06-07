module.exports = {
    devServer: {
        proxy: {
            '/socket.io': {
                target: 'http://localhost:3002',
                ws: true
            }
        }
    }
}
