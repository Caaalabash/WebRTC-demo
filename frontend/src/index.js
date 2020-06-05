import io from 'socket.io-client'
import adapter from 'webrtc-adapter'

// snowpack的proxy不太行，开发模式下直接使用后端地址localhost:3000
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

document.getElementById('button').addEventListener('click', () => {
    sendMessage('join', document.getElementById('input').value)
})

try {
    navigator.mediaDevices.getUserMedia(mediaConstraints).then(mediaStream => {
        setVideoStream('yours', mediaStream)
        const pc = new RTCPeerConnection(configuration)

        for (const track of mediaStream.getTracks()) {
            pc.addTrack(track)
        }
        pc.ontrack = e => {
            const ms = new MediaStream()
            ms.addTrack(e.track)
            setVideoStream('theirs', ms)
        }
        pc.onicecandidate = e => e.candidate && socket.send({ type: 'candidate', message: e.candidate })
        pc.oniceconnectionstatechange = async () => {
            if (pc.iceConnectionState === 'disconnected') {
                setVideoStream('theirs', null)
                pc.restartIce()
            }
        }
        socket.on('message', async data => {
            if (data.type === 'log') {
                console.log(data.message)
            } else if (data.type === 'member') {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(new RTCSessionDescription(offer))
                socket.send({ type: 'offer', message: offer })
            } else if (data.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.message))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(new RTCSessionDescription(answer))
                socket.send({ type: 'answer', message: answer })
            } else if (data.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.message))
            } else if (data.type === 'candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(data.message))
            }
        })
    }).catch(e => {
        alert(e.message)
    })
} catch (e) {
    // 如果不是ssl的话
    alert(e.message)
}