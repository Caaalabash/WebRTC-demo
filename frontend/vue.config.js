module.exports = {
    devServer: {
        proxy: {
            '/socket.io': {
                target: 'http://localhost:8080',
                ws: true
            }
        }
    }
}
