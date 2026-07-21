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

function speak(text) {
    // ★ 読み上げが終わるまで完了の合図（resolve）を待つように変更
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';

        // しゃべり終わった時、またはエラーになった時に待機を解除する
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
        // ★追加：ステップ4用のテキスト
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

        // ★追加：チェックボックスが存在し、かつチェックが入っている場合のみ特徴点を描画する
        const showLandmarksCb = document.getElementById('showLandmarks');
        if (showLandmarksCb && showLandmarksCb.checked) {
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }

    }, 500);
});

// iframeの親(index.html)から呼ばれる停止処理の空関数(エラー回避用)
window.stopCamera = function () { };

// --- js/app.js に追加する処理 ---



// 既存の actionBtn 処理内の、認証判定の直後（金庫が開閉する処理の下）に以下を組み込みます。
// ※ currentMode === 'safe' の処理を 'blockly_safe' でも動くように調整します。


// ==========================================
// ★ WebHID通信とマイコン制御（じゃんけんアプリから移植[cite: 8]）
// ==========================================

let hidDevice = null;

// ★修正: iPadなど非対応ブラウザでエラー停止するのを防ぐ
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

// マイコンと接続する関数[cite: 8]
async function connectHID() {
    const statusEl = document.getElementById("hid-status");
    // ★修正: iPad等の場合は接続処理をキャンセルして進める
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

// データ転送用の関数とウェイト[cite: 8]
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function transferHID(outData) {
    if (!hidDevice) return;
    const outputReportId = 0x00;
    const outputReport = new Uint8Array([0]);

    console.log("転送開始:", outData);

    for (let i = 0; i < outData.length; i++) {
        outputReport[0] = outData[i];
        await hidDevice.sendReport(outputReportId, outputReport);
        console.log(`送信中 (${i + 1}/${outData.length}): ${outData[i]}`);
        await wait(90);
    }
}

// ==========================================
// ★ 端末自動判定による通信の振り分け
// ==========================================
// ★ デバッグ用スイッチ： true にするとWindowsでも強制的にiPad（音声通信）モードになります
// （※本番として公開する時は false に戻してください）
//const DEBUG_IPAD_MODE = false;

// WebHID対応ならUSB通信、非対応（iPad等）ならWeb Audio通信で接続する
async function connectDevice() {
    const statusEl = document.getElementById("hid-status");

    if (navigator.hid) {
        // Windows / Mac / Chromebook など
        return await connectHID();
    } else {
        // iPad など
        ensureAudioContext();
        //connect_iPad();
        if (statusEl) {
            statusEl.innerText = "音声通信 準備完了";
            statusEl.style.color = "#007bff"; // 青色で表示
        }
        return true;
    }
}

// 共通のブロックデータを受け取り、端末に合わせて送信する
// 共通のブロックデータを受け取り、端末に合わせて送信する
async function transferDevice(dataBytes) {
    if (navigator.hid) {
        // WebHID用
        await transferHID(dataBytes);
    } else {
        // iPad用（Web Audio用）
        const payload = dataBytes.slice(2);

        let allPackets = []; // 転送するすべてのデータを溜める配列

        // 1. 16バイトずつ分割してキューに追加
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

        // 2. 最後に「実行コマンド」もキューに追加
        let runArray = Array(19).fill(0);
        runArray[0] = 253;
        runArray[1] = 2;
        allPackets.push(runArray);

        if (typeof screenLog !== 'undefined') {
            console.log(`【iPad送信】全${allPackets.length}個のパケットを連結して一括送信します`, allPackets);
        }

        // 3. キューに溜めた全パケットを、1本の音声データとしてまとめて一括送信！
        sendCombinedDataBySound(allPackets);
    }
}

// LED制御のコマンド生成と送信[cite: 8]
async function controlLedFromBlock(colorName, timeSeconds) {
    if (!hidDevice || !hidDevice.opened) return;

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

    let sec = 4 * Number(timeSeconds);

    try {
        // 点灯コマンド送信[cite: 8]
        const onCommand = [251, 240, 230, 2, 130, r, g, b, sec, 8, 231, 250];
        await transferHID(onCommand);

        // 指定秒数待機する[cite: 8]
        await wait(timeSeconds * 1000);
    } catch (error) {
        console.error("LED制御エラー:", error);
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
    if (!currentBlock) return; // 次のブロックがなければ終了

    // もし「条件ブロック（顔認証チェック）」があれば、YES/NOの分岐に進む
    if (currentBlock.type === 'face_auth_check') {
        currentBlock = currentBlock.getInputTargetBlock(isSuccess ? 'YES' : 'NO');
    }

    // HID転送用のベース配列
    let hidBytes = [251, 240, 230, 2];
    let addr = 2; // 現在のアドレス
    let hasHardwareCommand = false;

    // 繋がっているブロックを上から順番に解析する
    while (currentBlock) {
        if (currentBlock.type === 'face_auth_speak') {
            const text = currentBlock.getFieldValue('TEXT');
            const connectedCheckbox = document.getElementById('auroraConnected');

            // ★iPad等(WebHID非対応) かつ チェックが入っている場合は「しゃべらない」
            if (!navigator.hid && connectedCheckbox && connectedCheckbox.checked) {
                console.log("オーロラクロック接続中: しゃべる命令をスキップしました");
            } else {
                // チェックがない場合（またはWindows等の場合）は通常通りしゃべる
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

        // 次に繋がっているブロックへ進む
        currentBlock = currentBlock.getNextBlock();
    }

    // ハードウェアへの命令が1つでもあれば、マイコンへ転送する
    if (hasHardwareCommand) {
        
        // =========================================================
        // ★ 追加: iPad等の場合、チェックボックスが「OFF（未接続）」なら転送をキャンセル
        // =========================================================
        if (!navigator.hid) {
            const connectedCheckbox = document.getElementById('auroraConnected');
            if (connectedCheckbox && !connectedCheckbox.checked) {
                console.log("チェックがないため、データ転送の通信音をスキップします");
                return; // ここで処理を終了し、転送を行わない
            }
        }

        // チェックがある（またはWindows等の）場合は転送する
        hidBytes.push(231, 250); 
        console.log("マイコンへ転送するバイトデータ:", hidBytes);
        await transferDevice(hidBytes); 
    }
}