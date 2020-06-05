import io from 'socket.io-client'
import adapter from 'webrtc-adapter'

// snowpack的proxy不太行，开发模式下直接使用后端地址localhost:3002
const socket = io.connect('/')
const configuration = {
    iceServers: [
        { 'url': 'stun:stun.services.mozilla.com' },
        { 'url': 'stun:stunserver.org' },
        { 'url': 'stun:stun.l.google.com:19302' }
    ]
}
const mediaConstraints = {
    audio: false,
    video: true
}
const sendMessage = (type, message) => socket.send({ type, message })
const setVideoStream = (id, stream) => document.getElementById(id).srcObject = stream

const userMap = {}
document.getElementById('button').addEventListener('click', () => {
    sendMessage('join', {
        room: document.getElementById('input').value,
        name: document.getElementById('name').value
    })
})


function newPeerConnection(stream, id) {
    const pc = new RTCPeerConnection(configuration)
    for (const track of stream.getTracks()) {
        pc.addTrack(track)
    }
    pc.ontrack = e => {
        const ms = new MediaStream()
        ms.addTrack(e.track)

        const video = document.createElement('video')
        video.id = id
        video.autoplay = true
        video.srcObject = ms
        document.body.appendChild(video)
    }
    pc.onicecandidate = e => e.candidate && socket.send({ type: 'candidate', message: e.candidate, to: id })
    return pc
}

;(async () => {
    const localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    setVideoStream('yours', localStream)

    socket.on('message', async data => {
        console.log(`id: ${data.name} type: ${data.type}`)
        if (data.type === 'member-join') {
            userMap[data.name] = newPeerConnection(localStream, data.name)
            const offer = await userMap[data.name].createOffer()
            await userMap[data.name].setLocalDescription(new RTCSessionDescription(offer))
            socket.send({ type: 'offer', message: offer, to: data.name })
        } else if (data.type === 'offer') {
            userMap[data.name] = newPeerConnection(localStream, data.name)
            await userMap[data.name].setRemoteDescription(new RTCSessionDescription(data.message))
            const answer = await userMap[data.name].createAnswer()
            await userMap[data.name].setLocalDescription(new RTCSessionDescription(answer))
            socket.send({ type: 'answer', message: answer, to: data.name })
        } else if (data.type === 'answer') {
            await userMap[data.name].setRemoteDescription(new RTCSessionDescription(data.message))
        } else if (data.type === 'candidate') {
            await userMap[data.name].addIceCandidate(new RTCIceCandidate(data.message))
        }
    })
})()