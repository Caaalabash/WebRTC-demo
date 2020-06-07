import io from 'socket.io-client'
import adapter from 'webrtc-adapter'

const pcMap = {}
const socket = io.connect('localhost:3002')

socket.on('connect_error', () => new LightTip().error('信令服务器连接失败'))
socket.on('connect', () => new LightTip().success('信令服务器连接成功'))
socket.on('message', async ({ type, payload, from }) => {
    if (type === 'member-join') {
        const pc = createPeerConnection(localStream, from)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(new RTCSessionDescription(offer))
        pcMap[from] = pc
        socket.send({ type: 'offer', payload: offer, to: from })
        new LightTip(`【${from}】加入了房间`)
    } else if (type === 'offer') {
        const pc = createPeerConnection(localStream, from)
        await pc.setRemoteDescription(new RTCSessionDescription(payload))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(new RTCSessionDescription(answer))

        pcMap[from] = pc
        socket.send({ type: 'answer', payload: answer, to: from })
    } else if (type === 'answer') {
        await pcMap[from].setRemoteDescription(new RTCSessionDescription(payload))
    } else if (type === 'candidate') {
        await pcMap[from].addIceCandidate(new RTCIceCandidate(payload))
    } else if (type === 'member-leave' && pcMap[from]) {
        pcMap[from].close()
        delete pcMap[from]
        document.body.removeChild(document.getElementById(from))
        new LightTip(`【${from}】离开了房间`)
    } else if (type === 'log') {
        new LightTip(payload)
    }
})

let localStream = null

document.getElementById('button').addEventListener('click', () => {
    socket.send({
        type: 'join',
        payload: {
            room: document.getElementById('input').value.trim(),
            name: document.getElementById('name').value.trim()
        }
    })
})

function createPeerConnection(stream, calleeId) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { 'url': 'stun:stun.services.mozilla.com' },
            { 'url': 'stun:stun.l.google.com:19302' }
        ]
    })
    for (const track of stream.getTracks()) {
        pc.addTrack(track)
    }
    pc.ontrack = e => {
        const ms = new MediaStream()
        ms.addTrack(e.track)

        const video = document.createElement('video')
        video.id = calleeId
        video.autoplay = true
        video.srcObject = ms
        document.body.appendChild(video)
    }
    pc.onicecandidate = e => {
        e.candidate && socket.send({ type: 'candidate', payload: e.candidate, to: calleeId })
    }
    return pc
}

async function setupYourCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        document.getElementById('yours').srcObject = localStream
    } catch (e) {
        new LightTip().error('无法使用媒体设备')
    }
}

setupYourCamera()

