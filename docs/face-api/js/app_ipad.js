let currentMode = '';
let drawInterval = null;

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const statusText = document.getElementById('status');
const startCameraBtn = document.getElementById('startCameraBtn');
const videoContainer = document.getElementById('videoContainer');
const controls = document.getElementById('controls');
const userNameInput = document.getElementById('userName');
const actionBtn = document.getElementById('actionBtn');

// ==========================================
// ★ 共通機能（読み上げ・顔データ保存）
// ==========================================
function speak(text) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.onend = resolve;
        utterance.onerror = resolve;
        speechSynthesis.speak(utterance);
    });
}

function saveFaceData(name, descriptor) {
    let faces = JSON.parse(localStorage.getItem('savedFaces') || '[]');
    faces = faces.filter(f => f.name !== name);
    faces.push({ name: name, descriptor: Array.from(descriptor) });
    localStorage.setItem('savedFaces', JSON.stringify(faces));
}

function getFaceData(name) {
    const faces = JSON.parse(localStorage.getItem('savedFaces') || '[]');
    return faces.find(f => f.name === name);
}

// 画面表示をカメラ稼働状態に切り替える関数
function setCameraActiveUI() {
    if (videoContainer) videoContainer.style.display = "block";
    if (controls) controls.style.display = "block";

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.display = "flex";

    if (startCameraBtn) startCameraBtn.style.display = "none";

    // ★ iPad専用: カメラ起動時に接続チェックボックスを必ず表示する
    const connectedWrapper = document.getElementById('auroraConnectedWrapper');
    if (connectedWrapper) {
        connectedWrapper.style.display = 'block';
    }

    if (currentMode === 'register') {
        statusText.innerText = "名前を入れて登録ボタンを押してください";
    } else if (currentMode === 'authenticate') {
        statusText.innerText = "名前を入れて認証ボタンを押してください";
    } else if (currentMode === 'safe') {
        statusText.innerText = "名前を入れて金庫の鍵を開けてください";
    } else if (currentMode === 'landmarks') {
        statusText.innerText = "顔を動かして、緑色のラインがどう動くか確認しましょう";
    }
}

async function initApp(mode) {
    currentMode = mode;
    const MODEL_URL = './models';
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        if (window.parent && window.parent.sharedCameraStream) {
            video.srcObject = window.parent.sharedCameraStream;
            video.play().catch(e => console.log("自動再生エラー:", e));
            setCameraActiveUI();
        } else {
            statusText.innerText = "準備完了。カメラを起動してください。";
            if (startCameraBtn) startCameraBtn.disabled = false;
        }
    } catch (error) {
        statusText.innerText = "モデルの読み込みに失敗しました。";
    }
}

if (startCameraBtn) {
    startCameraBtn.addEventListener('click', async () => {
        try {
            const stream = await window.parent.getSharedCamera();
            video.srcObject = stream;
            video.play();
            setCameraActiveUI();
        } catch (error) {
            alert("カメラの起動に失敗しました。");
        }
    });
}

video.addEventListener('play', () => {
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    drawInterval = setInterval(async () => {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const detections = await faceapi.detectAllFaces(video, options).withFaceLandmarks();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);

        const showLandmarksCb = document.getElementById('showLandmarks');
        if (showLandmarksCb && showLandmarksCb.checked) {
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }
    }, 500);
});

window.stopCamera = function () { };


// ==========================================
// ★ iPad専用通信機能 (Web Audio API)
// ==========================================

// 通信準備
async function connectDevice() {
    const statusEl = document.getElementById("hid-status");
    ensureAudioContext();
    connect_iPad(); // ダミーデータを送信してiPad側の音声再生準備を整える

    if (statusEl) {
        statusEl.innerText = "音声通信 準備完了";
        statusEl.style.color = "#007bff"; 
    }
    return true;
}

// データのチャンク化と送信
async function transferDevice(dataBytes) {
    const payload = dataBytes.slice(2);
    let allPackets = []; 

    let blockNum = 1;
    for (let i = 0; i < payload.length; i += 16) {
        let sendArray = Array(19).fill(0);
        sendArray[0] = 253;
        sendArray[1] = 1;
        sendArray[2] = blockNum;

        let chunk = payload.slice(i, i + 16);
        for (let j = 0; j < chunk.length; j++) {
            sendArray[3 + j] = chunk[j];
        }
        allPackets.push(sendArray);
        blockNum++;
    }

    let runArray = Array(19).fill(0);
    runArray[0] = 253;
    runArray[1] = 2;
    allPackets.push(runArray);

    console.log(`【iPad送信】全${allPackets.length}個のパケットを連結して一括送信します`, allPackets);
    sendCombinedDataBySound(allPackets);
}

var AudioContextClass = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;

function ensureAudioContext() {
    if (!AudioContextClass) return null;
    if (!audioCtx) {
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function (e) { console.warn('AudioContext resume failed:', e); });
    }
    return audioCtx;
}

function connect_iPad() {
    let sendDataArray = Array(19).fill(0);
    sendDataArray[0] = 253;
    sendDataArray[1] = 5;
    sendDataBySound(sendDataArray);
}

function sendDataBySound(arrayData) {
    console.log("【iPadダミー送信データ】:", arrayData);
    let binaryDataArray = arrayData.map(getBinary);
    outputSoundData(binaryDataArray);
}

function getBinary(arrayData) {
    var tmp = arrayData;
    let returnData = Array(8);
    for (let i = 0; i < 8; i++) {
        tmp = tmp & 0b10000000;
        if (tmp == 0) {
            returnData[i] = 0;
        } else {
            returnData[i] = 1;
        }
        arrayData = arrayData << 1;
        tmp = arrayData;
    }
    return returnData;
}

function outputSoundData(binaryDataArray) {
    var audioCtxLocal = ensureAudioContext();
    if (!audioCtxLocal) return;

    var channels = 2;
    var sampleRate = audioCtxLocal.sampleRate || 44100;
    let estimatedSamples = 0;
    let counterEst = 0;

    binaryDataArray.forEach(element => {
        element.forEach(x => {
            if ((counterEst % 8) == 0) estimatedSamples += 20 + 30; 
            if (x == 0) estimatedSamples += 5 + 5;
            else estimatedSamples += 5 + 15;
            counterEst++;
            if ((counterEst % 8) == 0) estimatedSamples += 20; 
        })
    });
    estimatedSamples += 1024;

    var myArrayBuffer = audioCtxLocal.createBuffer(channels, estimatedSamples, sampleRate);
    var newArray = myArrayBuffer.getChannelData(0);
    let counter = 0;
    let i = 0;
    var tmp = 0;

    binaryDataArray.forEach(element => {
        element.map(x => {
            if ((counter % 8) == 0) {
                tmp = 20;
                while (i++ < tmp) newArray[i] = 0;
                tmp = i + 30;
                while (i++ < tmp) newArray[i] = 1;
            }
            if (x == 0) {
                tmp = i + 5;
                while (i++ < tmp) newArray[i] = 0;
                tmp = i + 5;
                while (i++ < tmp) newArray[i] = 1;
            } else {
                tmp = i + 5;
                while (i++ < tmp) newArray[i] = 0;
                tmp = i + 15;
                while (i++ < tmp) newArray[i] = 1;
            }
            counter++;
            if ((counter % 8) == 0) {
                tmp = i + 20;
                while (i++ < tmp) newArray[i] = 0;
            }
        })
    });

    var source = audioCtxLocal.createBufferSource();
    source.buffer = myArrayBuffer;
    source.connect(audioCtxLocal.destination);
    source.start();
}

function sendCombinedDataBySound(packets) {
    var audioCtxLocal = ensureAudioContext();
    if (!audioCtxLocal) return;

    var channels = 2;
    var sampleRate = audioCtxLocal.sampleRate || 44100;

    const binaryPackets = packets.map(packet => packet.map(getBinary));

    let totalSamples = 0;
    const waitSamples = Math.floor(sampleRate * 0.5); 

    binaryPackets.forEach((binaryDataArray) => {
        let est = 0;
        let counterEst = 0;
        binaryDataArray.forEach(element => {
            element.forEach(x => {
                if ((counterEst % 8) == 0) est += 50; 
                if (x == 0) est += 10;
                else est += 20;
                counterEst++;
                if ((counterEst % 8) == 0) est += 20; 
            })
        });
        totalSamples += est + 1024 + waitSamples;
    });

    var myArrayBuffer = audioCtxLocal.createBuffer(channels, totalSamples, sampleRate);
    var newArray = myArrayBuffer.getChannelData(0);

    let i = 0;
    var tmp = 0;

    binaryPackets.forEach((binaryDataArray) => {
        let counter = 0;
        binaryDataArray.forEach(element => {
            element.forEach(x => {
                if ((counter % 8) == 0) {
                    tmp = i + 20;
                    while (i < tmp) newArray[i++] = 0;
                    tmp = i + 30;
                    while (i < tmp) newArray[i++] = 1;
                }
                if (x == 0) {
                    tmp = i + 5;
                    while (i < tmp) newArray[i++] = 0;
                    tmp = i + 5;
                    while (i < tmp) newArray[i++] = 1;
                } else {
                    tmp = i + 5;
                    while (i < tmp) newArray[i++] = 0;
                    tmp = i + 15;
                    while (i < tmp) newArray[i++] = 1;
                }
                counter++;
                if ((counter % 8) == 0) {
                    tmp = i + 20;
                    while (i < tmp) newArray[i++] = 0;
                }
            })
        });

        i += 1024;
        tmp = i + waitSamples;
        while (i < tmp) newArray[i++] = 0;
    });

    var source = audioCtxLocal.createBufferSource();
    source.buffer = myArrayBuffer;
    source.connect(audioCtxLocal.destination);
    source.start();
}


// ==========================================
// ★ Blocklyの命令を解釈してマイコン用データを生成する関数（iPad専用）
// ==========================================
async function executeBlocklyLogic(isSuccess) {
    if (!window.workspace) return;

    const startBlock = window.workspace.getBlocksByType('face_auth_start')[0];
    if (!startBlock) return;

    let currentBlock = startBlock.getNextBlock();
    if (!currentBlock) return; 

    if (currentBlock.type === 'face_auth_check') {
        currentBlock = currentBlock.getInputTargetBlock(isSuccess ? 'YES' : 'NO');
    }

    let hidBytes = [251, 240, 230, 2];
    let addr = 2; 
    let hasHardwareCommand = false;

    // iPad用：チェックボックスの状態を取得
    const connectedCheckbox = document.getElementById('auroraConnected');
    const isConnected = connectedCheckbox && connectedCheckbox.checked;

    while (currentBlock) {
        if (currentBlock.type === 'face_auth_speak') {
            const text = currentBlock.getFieldValue('TEXT');
            
            // ★チェックが入っている場合は「しゃべらない」、入っていない場合は「しゃべる」
            if (isConnected) {
                console.log("オーロラクロック接続中: しゃべる命令をスキップしました");
            } else {
                await speak(text);
            }

        } else if (currentBlock.type === 'cmd_sound') {
            const soundByte = Number(currentBlock.getFieldValue('SOUND'));
            addr += 2; 
            hidBytes.push(soundByte, addr);
            hasHardwareCommand = true;

        } else if (currentBlock.type === 'face_auth_led') {
            const colorName = currentBlock.getFieldValue('COLOR');
            let sec = 4 * Number(currentBlock.getFieldValue('TIME'));

            let r = 0, g = 0, b = 0;
            switch (colorName) {
                case "red": r = 255; g = 0; b = 0; break;
                case "green": r = 0; g = 255; b = 0; break;
                case "blue": r = 0; g = 0; b = 255; break;
                case "yellow": r = 255; g = 255; b = 0; break;
                case "purple": r = 255; g = 0; b = 255; break; 
                case "cyan": r = 0; g = 255; b = 255; break;
                case "white": r = 255; g = 255; b = 255; break;
            }

            addr += 6; 
            hidBytes.push(130, r, g, b, sec, addr);
            hasHardwareCommand = true;
        }

        currentBlock = currentBlock.getNextBlock();
    }

    // ハードウェアへの命令がある場合の処理
    if (hasHardwareCommand) {
        // ★チェックが入っていない場合（未接続）は、データ転送をキャンセルする
        if (!isConnected) {
            console.log("チェックがないため、データ転送の通信音をスキップします");
            return; 
        }

        // チェックが入っている場合はデータ送信
        hidBytes.push(231, 250); 
        console.log("マイコンへ転送するバイトデータ:", hidBytes);
        await transferDevice(hidBytes); 
    }
}

// ==========================================
// ★ actionBtn クリック処理
// ==========================================
if (actionBtn) {
    actionBtn.addEventListener('click', async () => {
        const name = userNameInput.value.trim();
        if (!name) return alert("名前を入力してください。");

        if ((currentMode === 'blockly_safe' || currentMode === 'blockly_free') && window.workspace) {
            const state = Blockly.serialization.workspaces.save(window.workspace);
            localStorage.setItem('savedBlockly_' + currentMode, JSON.stringify(state));
        }

        // iPad用通信準備
        if (currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
            await connectDevice();    
        }

        statusText.innerText = "処理中...";

        if (currentMode === 'safe' || currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
            const safeBox = document.getElementById('safeBox');
            const safeIcon = document.getElementById('safeIcon');
            const safeText = document.getElementById('safeText');
            if (safeBox && safeIcon && safeText) {
                safeBox.classList.remove('open');
                safeIcon.innerText = '🔒';
                safeText.innerText = '認証しています...';
            }
        }

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const detection = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            statusText.innerText = "顔が検出できませんでした。";

            if (currentMode === 'safe') {
                speak("顔が検出できませんでした。");
                document.getElementById('safeText').innerText = '金庫はロックされています';
            } else if (currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
                document.getElementById('safeText').innerText = '金庫はロックされています';
                await executeBlocklyLogic(false);
            }
            return;
        }

        if (currentMode === 'register') {
            saveFaceData(name, detection.descriptor);
            statusText.innerText = `${name}さんを登録しました。`;
            speak(`${name}さんを登録しました。`);
            userNameInput.value = "";

        } else if (currentMode === 'authenticate') {
            const targetUser = getFaceData(name);
            if (!targetUser) {
                statusText.innerText = `${name}さんは登録されていません。`;
                speak(`${name}さんは登録されていません。`);
                return;
            }
            const registeredDescriptor = new Float32Array(targetUser.descriptor);
            const distance = faceapi.euclideanDistance(registeredDescriptor, detection.descriptor);
            if (distance < 0.5) {
                // ★ 変更: 成功時の表示と音声を統一
                statusText.innerText = `${name}さんを認証しました`;
                speak(`${name}さんを認証しました`);
            } else {
                // ★ 変更: 失敗時の表示と音声を統一
                statusText.innerText = `${name}さんを認証できませんでした`;
                speak(`${name}さんを認証できませんでした`);
            }

        } else if (currentMode === 'safe' || currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
            const targetUser = getFaceData(name);
            const safeBox = document.getElementById('safeBox');
            const safeIcon = document.getElementById('safeIcon');
            const safeText = document.getElementById('safeText');
            let isSuccess = false;

            if (!targetUser) {
                statusText.innerText = `${name}さんは登録されていません。`;
                if (currentMode === 'safe') speak(`${name}さんは登録されていません。`);
                safeBox.classList.remove('open');
                safeIcon.innerText = '🔒';
                safeText.innerText = '金庫はロックされています';
            } else {
                const registeredDescriptor = new Float32Array(targetUser.descriptor);
                const distance = faceapi.euclideanDistance(registeredDescriptor, detection.descriptor);

                if (distance < 0.5) {
                    isSuccess = true;
                    statusText.innerText = `認証成功: ${name}さん`;
                    safeBox.classList.add('open');
                    safeIcon.innerText = '🔓';
                    safeText.innerText = '金庫が開きました！';
                    if (currentMode === 'safe') speak(`${name}さんを認証しました。金庫が開きました。`);
                } else {
                    statusText.innerText = `認証失敗`;
                    safeBox.classList.remove('open');
                    safeIcon.innerText = '🔒';
                    safeText.innerText = '金庫はロックされています';
                    if (currentMode === 'safe') speak(`${name}さんを認証できませんでした。`);
                }
            }

            if (currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
                await executeBlocklyLogic(isSuccess);
            }
        }
    });
}

// ==========================================
// ★ ヘルプウィンドウ（ダイアログ）の制御
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('helpBtn');
    const helpDialog = document.getElementById('helpDialog');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    const helpContent = document.getElementById('helpContent');

    if (helpBtn && helpDialog && helpContent) {
        helpBtn.addEventListener('click', () => {
            const targetFile = helpBtn.getAttribute('data-help-file');

            if (targetFile) {
                helpContent.innerHTML = `<iframe src="./help/${targetFile}" style="width: 100%; height: 400px; border: none;"></iframe>`;
            } else {
                helpContent.innerHTML = "<p style='color: red;'>ヘルプファイルが指定されていません。</p>";
            }
            helpDialog.showModal(); 
        });

        closeHelpBtn.addEventListener('click', () => {
            helpDialog.close(); 
            helpContent.innerHTML = "";
        });

        helpDialog.addEventListener('click', (event) => {
            if (event.target === helpDialog) {
                helpDialog.close();
                helpContent.innerHTML = "";
            }
        });
    }
});