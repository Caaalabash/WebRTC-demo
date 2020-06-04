import io from 'socket.io-client'
import adapter from 'webrtc-adapter'

const socket = io.connect('/')
const configuration = {
    iceServers: [
        { 'url': 'stun:stun.services.mozilla.com' },
        { 'url': 'stun:stunserver.org' },
        { 'url': 'stun:stun.l.google.com:19302' }
    ]
}
const sendMessage = (type, message) => socket.send({ type, message })
const setVideoStream = (id, stream) => document.getElementById(id).srcObject = stream

document.getElementById('button').addEventListener('click', () => {
    sendMessage('join', document.getElementById('input').value)
})

try {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
        setVideoStream('yours', stream)
        const pc = new RTCPeerConnection(configuration)
        pc.addStream(stream)
        pc.onaddstream = e => setVideoStream('theirs', e.stream)
        pc.onicecandidate = e => e.candidate && socket.send({ type: 'candidate', message: e.candidate })

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