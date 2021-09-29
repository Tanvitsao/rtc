/* web socket */
let wsc;
/* url prarm */
let _myParam = location.search.split('room=')[1];
/* 本地流 */
let localstream;
let remotestream;
/* RTCPeerConnection */
let pc;
/* iceServer */
const iceServer = {
    iceServers: [{
        "urls": "stun:stun.l.google.com:19302" // Google's public STUN server
    }]
};
/* 本地/遠端視訊 element */
const localVideoEl = document.getElementById('localVideo');
const remoteVideoEl = document.getElementById('remoteVideo');
/* 錄音錄影 */
let localRecorder;
let remoteRecorder;

const recordingAlert = document.getElementById('recording-alert');

let onlineStatus = {
    CT: false,
    CS: false
}

// window 初始化
window.onload = function () {
    getIdentity();

    // var myHeaders = new Headers();
    // myHeaders.append('Content-Type', 'text/html');

    // fetch('./public/meida-player.html', {
    // 	mode: 'no-cors',
    // 	method: 'get',
    // 	headers: myHeaders
    // })
    // 	.then(response => response.text())
    // 	.then(res => {
    // 		console.log(res);
    // 	});
}

// 判斷身分為客服人員或客戶
function getIdentity() {
    if (_myParam.indexOf('@') > -1) { // Agent
        document.getElementById("circle").innerText = '客服人員';
    } else if (_myParam.indexOf('$') > -1) { // Customer
        document.getElementById("circle").innerText = '客戶';
    }
}

/**
 * 建立 web socket 連線
 * 因一連線就會上線，所以在點選開始之後再建立連線
 */
function createWebSocketConnection() {
    document.getElementById("enter-view").style.display = 'none';
    document.getElementById('join-button').style.display = "none";
    document.getElementById("videos").style.display = 'block';
    document.getElementById("close-button").style.display = 'block';

    if ("WebSocket" in window) {
        // wsc = new WebSocket("wss://lab.easontech.com.tw:4431/CSMWebAPI/websocket?serno=" + _myParam);
        // wsc = new WebSocket("wss://lab.easontech.com.tw:8443/rtc/rtc/" + _myParam);
        wsc = new SockJS("https://lab.easontech.com.tw:8443/rtc/rtc/" + _myParam);
        wsc.onopen = function (event) {
            console.log("WebSocket connected to server");
        };

        wsc.onmessage = function (event) {
            try {

                const message = JSON.parse(event.data);
                console.log(message);
                if (message.State && message.State.indexOf('Online') > -1) {
                    console.log("State::" + event.data);
                    document.getElementById("enter-view").style.display = 'none';
                    document.getElementById('join-button').style.display = "none";
                    document.getElementById("videos").style.display = 'block';
                    document.getElementById("close-button").style.display = 'block';

                    if (message.Serno.indexOf('@') > -1) {	//Agent
                        // document.getElementById("wait-view").innerText = '等待客戶上線中...';

                        if (message.State.indexOf('CT') > -1) {
                            document.getElementById("customerState").innerText = '客戶：已上線';
                            onlineStatus.CT = true;
                            startWebRTC();
                        }
                        else {
                            // 取得攝影機、麥克風權限
                            createMedia();
                            document.getElementById("agentState").innerText = '客服人員：已上線';
                            document.getElementById("record-button").style.display = 'block';
                            document.getElementById("screenshot-button").style.display = 'block';
                            onlineStatus.CS = true;
                        }
                    } else if (message.Serno.indexOf('$') > -1) { //Customer
                        // document.getElementById("wait-view").innerText = '等待客服人員上線中...';

                        if (message.State.indexOf('CS') > -1) {
                            document.getElementById("agentState").innerText = '客服人員：已上線';
                            onlineStatus.CS = true;
                            startWebRTC();
                        }
                        else {
                            // 取得攝影機、麥克風權限
                            createMedia();
                            document.getElementById("customerState").innerText = '客戶：已上線';
                            onlineStatus.CT = true;
                        }
                    }
                } else if (message.State && message.State.indexOf('CT Offline') > -1) {
                    // 客戶離線
                    pauseRecorder();
                    onlineStatus.CT = false;
                    remoteVideoEl.setAttribute('src', '');
                    document.getElementById("customerState").innerText = '客戶：未上線';

                    // alert('客戶已離線');
                } else if (message.State && message.State.indexOf('CS Offline') > -1) {
                    // 客服人員離線
                    onlineStatus.CS = false;
                    remoteVideoEl.setAttribute('src', '');
                    document.getElementById("agentState").innerText = '客服人員：未上線';

                } else if (message.sdp) {
                    console.log("Sdp::" + event.data);
                    pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
                        if (pc.remoteDescription.type == "offer") {
                            pc.createAnswer(localDescCreated, logError);
                        }
                    }, logError);
                } else if (message.candidate) {
                    console.log("Candidate::" + event.data);
                    pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                }
            }
            catch (e) {
                console.log(e);
            }
        };
    }
}

// 結束 web socket 連線
function closeWebSocketConnection() {
    console.log('close web socket');
    wsc.close();
}

// 點選開始
function onStartClick() {
    createWebSocketConnection();
    setupPeerConnection();
}

// 初始化影像/聲音
async function createMedia() {
    // 儲存本地流到全域
    localstream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    if (!localVideoEl.srcObject && localstream) {
        localVideoEl.srcObject = localstream;
        console.log('本地端視訊！');

        if (onlineStatus.CT && onlineStatus.CS) {
            document.getElementById('rec-img').setAttribute('src', './assets/image/rec.svg');
            document.getElementById('screenshot-img').setAttribute('src', './assets/image/screenshot.svg');
        }
    }


    addLocalStream();
};

// 增加本地流
function addLocalStream() {
    // pc.addStream(localstream);
    localstream.getTracks().forEach(track => pc.addTrack(track, localstream));
};

function setupPeerConnection() {
    createPeerConnection();
    // startWebRTC();
}

// 呼叫 startWebRTC() 開始建立連線
async function startWebRTC() {
    console.log(pc);
    pc.onicecandidate = function (event) {
        if (event.candidate) {
            //send the candidate to remote peer
            wsc.send(JSON.stringify({ "candidate": event.candidate }));
        }
    };

    pc.oniceconnectionstatechange = function (event) {
        console.log('ICE 伺服器狀態變更 => ', event.target.iceConnectionState);
    }

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = function () {
        pc.createOffer(localDescCreated, logError);
    }

    // once remote stream arrives, show it in the remote video element
    pc.ontrack = function (event) {
        console.log('remote: ', event);
        if (!remoteVideoEl.srcObject && event.streams) {
            remoteVideoEl.srcObject = event.streams[0];
            remotestream = event.streams[0];
            document.getElementById("record-button").classList.remove('disabled');
            document.getElementById("screenshot-button").classList.remove('disabled');
            console.log('接收流並顯示於遠端視訊！', event);

            console.log(onlineStatus);
            if (onlineStatus.CT && onlineStatus.CS) {
                document.getElementById('rec-img').setAttribute('src', './assets/image/rec.svg');
                document.getElementById('screenshot-img').setAttribute('src', './assets/image/screenshot.svg');
            }
        }
    };
}

// 建立 P2P 連接
function createPeerConnection() {
    if (pc) {
        pc.close();
        pc = null;
    }
    pc = new RTCPeerConnection(iceServer);
    console.log(pc);
};

// 關閉 P2P 連接
function closePeerConnection() {
    // 暫停video播放，並將儲存在src裡的 MediaStreamTracks 依序停止
    if (localVideoEl.srcObject) {
        localVideoEl.pause();
        localVideoEl.srcObject.getTracks().forEach((track) => {
            track.stop();
        });
    }

    if (pc) {
        pc.close();
        pc = null;
        localstream = null;
    }
};

function onRecordClick() {
    startRecorder();
}

// 啟動錄音錄影
function startRecorder() {
    recordingAlert.style.display = 'flex';
    document.getElementById("record-button").classList.add('disabled');
    document.getElementById('rec-img').setAttribute('src', './assets/image/rec_disabled.svg');


    // const tracks = [...localstream.getTracks(), ...remotestream.getTracks()];

    /* 建立本地端 mediaRecorder 物件 */
    localRecorder = new MediaRecorder(new MediaStream(localstream));
    localRecorder.start();
    // 訂閱 MediaRecorder，在結束錄影後回傳檔案
    localRecorder.ondataavailable = function (event) {
        console.log(event);
        const recordVideo = new Blob([event.data], { 'type': 'video' });

        const file = new File([event.data], 'local_video.mp4');
        addFile(file, 'WebRTC');






        // const url = URL.createObjectURL(recordVideo);
        // const downloadLink = document.createElement('a');
        // downloadLink.href = url; // url
        // downloadLink.download = 'local_video.mp4'; // 檔名
        // document.body.appendChild(downloadLink);
        // downloadLink.click();
        // document.body.removeChild(downloadLink);
    }


    /* 建立遠端 mediaRecorder 物件 */
    remoteRecorder = new MediaRecorder(new MediaStream(remotestream));
    remoteRecorder.start();
    // 訂閱 MediaRecorder，在結束錄影後回傳檔案
    remoteRecorder.ondataavailable = function (event) {
        console.log(event);
        const recordVideo = new Blob([event.data], { 'type': 'video' });


        const file = new File([event.data], 'remote_video.mp4');
        addFile(file, 'WebRTC');

        // const url = URL.createObjectURL(recordVideo);
        // const downloadLink = document.createElement('a');
        // downloadLink.href = url; // url
        // downloadLink.download = 'remote_video.mp4'; // 檔名
        // document.body.appendChild(downloadLink);
        // downloadLink.click();
        // document.body.removeChild(downloadLink);
    }




    // const tracks = [...localstream.getTracks(), ...remotestream.getTracks()];

    // const stream = new MediaStream(tracks);
    /* 建立 mediaRecorder 物件 */
    // recorder = new MediaRecorder(stream);
    // recorder.start();
    // // 訂閱 MediaRecorder，在結束錄影後回傳檔案
    // recorder.ondataavailable = function (event) {
    // 	console.log(event);
    // 	const recordVideo = new Blob([event.data], { 'type': 'video' });
    // 	const url = URL.createObjectURL(recordVideo);
    // 	const downloadLink = document.createElement('a');
    // 	downloadLink.href = url; // url
    // 	downloadLink.download = 'video.mp4'; // 檔名
    // 	document.body.appendChild(downloadLink);
    // 	downloadLink.click();
    // 	document.body.removeChild(downloadLink);
    // }
}

// 暫停錄影
function pauseRecorder() {
    console.log('客戶離線因此暫停錄影');
    recordingAlert.style.display = 'none';
    document.getElementById("record-button").classList.add('disabled');
    document.getElementById("screenshot-button").classList.add('disabled');
    document.getElementById('rec-img').setAttribute('src', './assets/image/rec_disabled.svg');
    document.getElementById('screenshot-img').setAttribute('src', './assets/image/screenshot_disabled.svg');

    if (localRecorder) {
        localRecorder.pause();
    }
    if (remoteRecorder) {
        remoteRecorder.pause();
    }
}

// 結束錄音錄影並下載檔案
function stopRecorder() {
    recordingAlert.style.display = 'none';
    document.getElementById("record-button").classList.add('disabled');
    document.getElementById("screenshot-button").classList.add('disabled');
    document.getElementById('rec-img').setAttribute('src', './assets/image/rec_disabled.svg');
    document.getElementById('screenshot-img').setAttribute('src', './assets/image/screenshot_disabled.svg');

    if (localRecorder) {
        localRecorder.stop();
    }
    if (remoteRecorder) {
        remoteRecorder.stop();
    }
}

function onScreenShotClick() {
    const unitWidth = 4;
    const unitHeight = 3;
    const canvas = document.createElement('canvas');
    console.log(remoteVideoEl.videoWidth, remoteVideoEl.videoHeight);
    canvas.width = unitWidth * 200;
    canvas.height = unitHeight * 200;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(remoteVideoEl, 0, 0, canvas.width, canvas.height);

    //convert to desired file format
    const dataURI = canvas.toDataURL('image/jpg'); // can also use 'image/png'

    // 檔名格式：YYYYMMDD_HH:mm:ss
    const now = new Date();
    const name = `screenshot_${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}
    _${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    const fileName = name + '.jpg';
    let arr = dataURI.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    const file = new File([u8arr], fileName, { type: mime });

    addFile(file, 'WebRTC');
}

function onStopClick() {
    if (_myParam.indexOf('@') > -1) { // Agent
        onlineStatus.CS = false;
    } else if (_myParam.indexOf('$') > -1) { // Customer
        onlineStatus.CT = false;
    }

    const isInactive = (localRecorder && localRecorder.state === 'inactive') ||
        (remoteRecorder && remoteRecorder.state === 'inactive');
    if (_myParam.indexOf('@') > -1 && !isInactive) {
        stopRecorder();
    }
    closeWebSocketConnection();
    closePeerConnection();

    document.getElementById("videos").style.display = 'none';
    document.getElementById("enter-view").style.display = 'flex';
    // document.getElementById("wait-view").style.display = 'none';
    document.getElementById('join-button').style.display = "block";
    document.getElementById("close-button").style.display = 'none';
    document.getElementById("record-button").style.display = 'none';
    document.getElementById("screenshot-button").style.display = 'none';
    if (_myParam.indexOf('@') > -1) { // Agent
        document.getElementById("agentState").innerText = '客服人員：未上線';
    } else if (_myParam.indexOf('$') > -1) { // Customer
        document.getElementById("customerState").innerText = '客戶：未上線';
    }
}

function localDescCreated(desc) {
    pc.setLocalDescription(desc, function () {
        wsc.send(JSON.stringify({ "sdp": pc.localDescription }));
    }, logError);
}

function logError(error) {
    console.log(error.name + ": " + error.message);
}
