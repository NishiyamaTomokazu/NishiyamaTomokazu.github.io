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

        // 顔の四角い枠線（バウンディングボックス）は常に描画する
        faceapi.draw.drawDetections(canvas, resizedDetections);

        // チェックボックスが存在し、かつチェックが入っている場合のみ特徴点を描画する
        const showLandmarksCb = document.getElementById('showLandmarks');
        if (showLandmarksCb && showLandmarksCb.checked) {
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }

    }, 500);
});

// iframeの親(index.html)から呼ばれる停止処理の空関数(エラー回避用)
window.stopCamera = function () { };


// ==========================================
// ★ WebHID通信とマイコン制御 (Windows/ChromeOS専用)
// ==========================================

let hidDevice = null;

if (navigator.hid) {
    navigator.hid.addEventListener('disconnect', (event) => {
        if (hidDevice && event.device === hidDevice) {
            console.log("マイコンの電源オフまたは切断を検知しました");
            hidDevice = null;
            const statusEl = document.getElementById("hid-status");
            if (statusEl) {
                statusEl.innerText = "未接続";
                statusEl.style.color = "red";
            }
        }
    });
}

// マイコンと接続する関数[cite: 17]
async function connectHID() {
    const statusEl = document.getElementById("hid-status");
    if (!navigator.hid) {
        console.warn("このブラウザはWebHIDに対応していません。");
        return false;
    }

    if (!hidDevice || !hidDevice.opened) {
        try {
            const devices = await navigator.hid.getDevices();
            let targetDevice = devices.find(d => d.vendorId === 0x21CF && d.productId === 0x0002);

            if (!targetDevice) {
                const filters = [{ vendorId: 0x21CF, productId: 0x0002 }];
                const requestedDevices = await navigator.hid.requestDevice({ filters });
                if (requestedDevices.length > 0) {
                    targetDevice = requestedDevices[0];
                } else {
                    return false; // キャンセルされた
                }
            }

            hidDevice = targetDevice;
            await hidDevice.open();

            if (statusEl) {
                statusEl.innerText = "接続完了";
                statusEl.style.color = "#28a745";
            }
            return true;
        } catch (error) {
            console.error("HID接続エラー:", error);
            if (statusEl) {
                statusEl.innerText = "接続に失敗しました";
                statusEl.style.color = "red";
            }
            return false;
        }
    }
    return true; // すでに接続されている
}

// データ転送用の関数とウェイト[cite: 17]
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function transferHID(outData) {
    if (!hidDevice) return;
    const outputReportId = 0x00;
    const outputReport = new Uint8Array([0]);

    console.log("転送開始:", outData);

    for (let i = 0; i < outData.length; i++) {
        outputReport[0] = outData[i];
        await hidDevice.sendReport(outputReportId, outputReport);
        //console.log(`送信中 (${i + 1}/${outData.length}): ${outData[i]}`);
        await wait(90);
    }
}


// ==========================================
// ★ Blocklyの命令を解釈してマイコン用バイトデータを生成・転送する関数
// ==========================================
async function executeBlocklyLogic(isSuccess) {
    if (!window.workspace) return;

    const startBlock = window.workspace.getBlocksByType('face_auth_start')[0];
    if (!startBlock) return;
    
    let currentBlock = startBlock.getNextBlock();
    if (!currentBlock) return;

    // 認証結果に応じてYESかNOのブロックの塊を取得
    if (currentBlock.type === 'face_auth_check') {
        currentBlock = currentBlock.getInputTargetBlock(isSuccess ? 'YES' : 'NO');
    }

    // HID転送用のベース配列（251, 240はマイコンへの書き込み開始ヘッダ、230, 2はプログラム開始番地）[cite: 17, 18]
    let hidBytes = [251, 240, 230, 2];
    let addr = 2; // 現在のアドレス
    let hasHardwareCommand = false;

    // 繋がっているブロックを上から順番に解析する
    while (currentBlock) {
        if (currentBlock.type === 'face_auth_speak') {
            const text = currentBlock.getFieldValue('TEXT');
            // Windowsは音声の同時再生ブロック機能がないため、常に喋る
            await speak(text);

        } else if (currentBlock.type === 'cmd_sound') {
            // 音を鳴らすブロックの変換 (2バイト長)
            const soundByte = Number(currentBlock.getFieldValue('SOUND'));
            addr += 2; 
            hidBytes.push(soundByte, addr);
            hasHardwareCommand = true;

        } else if (currentBlock.type === 'face_auth_led') {
            // LEDブロックの変換 (6バイト長)
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

    // ハードウェアへの命令が1つでもあれば、終了コードを追加してマイコンへ直接WebHID転送する[cite: 18]
    if (hasHardwareCommand) {
        hidBytes.push(231, 250); 
        console.log("マイコンへ転送するバイトデータ:", hidBytes);
        await transferHID(hidBytes); 
    }
}

// ==========================================
// ★ actionBtn クリック処理
// ==========================================
if (actionBtn) {
    actionBtn.addEventListener('click', async () => {
        const name = userNameInput.value.trim();
        if (!name) return alert("名前を入力してください。");

        // ボタンを押した時に現在のプログラムを保存する
        if ((currentMode === 'blockly_safe' || currentMode === 'blockly_free') && window.workspace) {
            const state = Blockly.serialization.workspaces.save(window.workspace);
            localStorage.setItem('savedBlockly_' + currentMode, JSON.stringify(state));
        }

        // ステップ4(blockly_safe) と ステップ5(blockly_free) の場合、マイコン接続を確認する[cite: 18]
        if (currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
            const connected = await connectHID(); 
            if (!connected) return; // 接続をキャンセルした場合は処理を中断
        }

        statusText.innerText = "処理中...";

        // 金庫の見た目を一旦「ロック状態・認証中」にする
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

        // 顔の検出
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

        // ーーー ここから各モードの処理 ーーー
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
                statusText.innerText = `${name}さんを認証しました`;
                speak(`${name}さんを認証しました`);
            } else {
                statusText.innerText = `顔が認証できませんでした`;
                speak(`顔が認証できませんでした`);
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
                    if (currentMode === 'safe') speak(`${name}さんを認証しました。金庫が開きます。`);
                } else {
                    statusText.innerText = `認証失敗`;
                    safeBox.classList.remove('open');
                    safeIcon.innerText = '🔒';
                    safeText.innerText = '金庫はロックされています';
                    if (currentMode === 'safe') speak(`顔が認証できませんでした`);
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