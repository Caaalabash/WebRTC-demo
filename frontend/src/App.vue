<template>
  <div id="app">
      <div class="header">
          <img src="./assets/logo.png" alt="" class="header-logo">
          <p class="header-desc">WebRTC Chat {{ joined ? `- ${room}` : '' }}</p>
      </div>
      <div v-show="!joined" class="join-container">
          <input type="text" placeholder="Your Room" class="input" v-model="room">
          <input type="text" placeholder="Your Nickname" class="input" v-model="name">
          <div role="button" class="button" @click="joinRoom">Join</div>
      </div>
      <div v-show="joined" class="video-container">
          <div v-for="entry in Object.entries(totalStream)" :key="entry[0]" class="video-box">
              <video :srcObject.prop="entry[1]" autoplay class="video"></video>
              <span class="video-from">{{ entry[0] }}</span>
          </div>
          <div class="leave-button" @click="leaveRoom">&#10006;</div>
      </div>
  </div>
</template>

<script>
import io from 'socket.io-client'
import adapter from 'webrtc-adapter'

export default {
    name: 'App',
    data: () => ({
        joined: false,
        room: '',
        name: '',
        socket: null,
        socketConnect: false,
        localStream: null,
        pcMap: {},
        streamMap: {},
    }),
    computed: {
        totalStream() {
            return {
                ...this.streamMap,
                [`${this.name}(You)`]: this.localStream
            }
        }
    },
    async mounted() {
        await this.setupYourCamera()
        this.setupSocket()
    },
    methods: {
        joinRoom() {
            if (!this.socketConnect) {
                new LightTip().error('信令服务器暂未连接，请稍后')
            } else if (!/[a-zA-Z0-9]/.test(this.name) || !/[a-zA-Z0-9]/.test(this.room)) {
                new LightTip().error('仅限英文字母和数字')
            } else {
                this.socket.send({
                    type: 'join',
                    payload: {
                        room: this.room,
                        name: this.name,
                    }
                })
            }
        },
        createPeerConnection(stream, calleeId) {
            const pc = new RTCPeerConnection({
                'iceServers': [
                    {'urls': 'stun:111.229.115.45:3478'},
                    {'urls': 'turn:111.229.115.45:3478', 'username': 'calabash', 'credential': 'calabashisbest' }
                ],
            })
            for (const track of stream.getTracks()) {
                pc.addTrack(track)
            }
            pc.ontrack = e => {
                const ms = new MediaStream()
                ms.addTrack(e.track)
                this.$set(this.streamMap, calleeId, ms)
            }
            pc.onicecandidate = e => {
                e.candidate && this.socket.send({ type: 'candidate', payload: e.candidate, to: calleeId })
            }
            return pc
        },
        async setupYourCamera() {
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
            } catch (e) {
                new LightTip().error('无法使用媒体设备, 请设置权限后刷新重试')
            }
        },
        setupSocket() {
            this.socket = io.connect('/')

            this.socket.on('connect_error', () => {
                new LightTip().error('信令服务器连接失败')
                this.socketConnect = false
            })
            this.socket.on('connect', () => {
                new LightTip().success('信令服务器连接成功')
                this.socketConnect = true
            })
            this.socket.on('joined', () => this.joined = true)
            this.socket.on('message', async ({ type, payload, from }) => {
                if (type === 'member-join') {
                    this.$set(this.pcMap, from, this.createPeerConnection(this.localStream, from))
                    const offer = await this.pcMap[from].createOffer()
                    await this.pcMap[from].setLocalDescription(new RTCSessionDescription(offer))

                    this.socket.send({ type: 'offer', payload: offer, to: from })
                    new LightTip(`【${from}】加入了房间`)
                } else if (type === 'offer') {
                    this.$set(this.pcMap, from, this.createPeerConnection(this.localStream, from))
                    await this.pcMap[from].setRemoteDescription(new RTCSessionDescription(payload))
                    const answer = await this.pcMap[from].createAnswer()
                    await this.pcMap[from].setLocalDescription(new RTCSessionDescription(answer))

                    this.socket.send({ type: 'answer', payload: answer, to: from })
                } else if (type === 'answer') {
                    await this.pcMap[from].setRemoteDescription(new RTCSessionDescription(payload))
                } else if (type === 'candidate') {
                    await this.pcMap[from].addIceCandidate(new RTCIceCandidate(payload))
                } else if (type === 'member-leave' && this.pcMap[from]) {
                    this.pcMap[from].close()
                    this.$delete(this.pcMap, from)
                    this.$delete(this.streamMap, from)
                    new LightTip(`【${from}】离开了房间`)
                } else if (type === 'log') {
                    new LightTip(payload)
                } else if (type === 'leaved') {
                    Object.values(this.pcMap).forEach(pc => pc.close())
                    this.joined = false
                    this.room = ''
                    this.name = ''
                    this.pcMap = {}
                    this.streamMap = {}
                }
            })
        },
        leaveRoom() {
            this.socket.send({ type: 'leave' })
        }
    },
}
</script>

<style>
    HTML,BODY {
        min-width:100%;
        min-height:100%;
        margin:0px;
        padding:0px;
        background-color:#000000;
        color:#fff;
    }
    * {
        -webkit-appearance:none;
        outline-style:none;
        box-sizing: border-box;
    }
    #app {
        padding: 20px;
    }
    .header {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .header-logo {
        width: 32px;
        height: 32px;
        margin-right: 20px;
    }
    .header-desc {
        line-height: 30px;
        font-size: 24px;
        color: rgb(170, 170, 170);
    }
    .join-container {
        width: 400px;
        margin: 0 auto;
    }
    .input {
        position: relative;
        width: 100%;
        font-size: 26px;
        font-weight: bold;
        background-color: rgb(68, 68, 68);
        border-radius: 8px; border: 0px;
        padding: 8px 16px;
        margin-top: 16px;
        color: rgb(255, 255, 255);
    }
    .button {
        position: relative;
        cursor: pointer;
        user-select: none;
        font-size: 20px;
        font-weight: bold;
        padding: 4px 16px;
        background: rgb(0, 132, 255);
        margin-top: 16px;
        line-height: 42px;
        border-radius: 8px;
        text-align: center;
    }
    .video-container {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
    }
    .video-box {
        display: inline-flex;
        position: relative;
        flex-shrink: 0;
        flex-grow: 0;
        margin-bottom: 10px;
        margin-right: 10px;
    }
    .video {
        width: 100%;
        height: 100%;
        min-width: 400px;
        max-width: 600px;
    }
    .video-from {
        position: absolute;
        left: 20px;
        bottom: 20px;
        background: #373737;
        opacity: .5;
        border-radius: 20px;
        width: 200px;
        height: 30px;
        line-height: 30px;
        text-align: center;
    }
    .leave-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        background: #272727;
        text-align: center;
        line-height: 40px;
    }
</style>
