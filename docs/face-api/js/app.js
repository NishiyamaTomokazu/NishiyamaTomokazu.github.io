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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    speechSynthesis.speak(utterance);
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

// ブロックの設定を読み取って実行する関数
function executeBlocklyLogic(isSuccess) {
    if (!window.workspace) return;

    // スタートブロックを探す
    const startBlock = window.workspace.getBlocksByType('face_auth_start')[0];
    if (!startBlock) return;

    // その下にある条件ブロックを探す
    const checkBlock = startBlock.getNextBlock();
    if (!checkBlock || checkBlock.type !== 'face_auth_check') return;

    // 認証結果(isSuccess)に応じて、YESかNOのブロックの塊を取得する
    let currentBlock = checkBlock.getInputTargetBlock(isSuccess ? 'YES' : 'NO');

    // ブロックが繋がっている限り順番に実行する
    while (currentBlock) {
        if (currentBlock.type === 'face_auth_speak') {
            const text = currentBlock.getFieldValue('TEXT');
            speak(text); // 読み上げの実行

        } else if (currentBlock.type === 'face_auth_led') {
            const color = currentBlock.getFieldValue('COLOR');
            const time = currentBlock.getFieldValue('TIME');

            // ※現在はハードウェアがないため、画面上のステータスとしてLEDの動作を表示します
            const ledMsg = `[LED動作] 色: ${color}, 点灯時間: ${time}秒`;
            console.log(ledMsg);
            setTimeout(() => {
                const status = document.getElementById('status');
                if (status) status.innerText = status.innerText + " ➔ " + ledMsg;
            }, 500);
        }

        // 次に繋がっているブロックへ進む
        currentBlock = currentBlock.getNextBlock();
    }
}

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
async function transferDevice(dataBytes) {
    if (navigator.hid) {
        // WebHID用（そのまま転送）
        await transferHID(dataBytes);
    } else {
        // iPad用（Web Audio用）
        // dataBytes は [251, 240, 230, 2, ..., 231, 250] という構成なので
        // 先頭の 251, 240 を除外し、iPad用のヘッダ「253(iPadモード), 1(データ転送), 1(1ブロック目)」に置き換える
        let sendArray = Array(35).fill(0);
        sendArray[0] = 253; // iPadモード
        sendArray[1] = 1;   // データ転送開始
        sendArray[2] = 1;   // 1ブロック目

        for (let i = 2; i < dataBytes.length; i++) {
            if (i - 2 + 3 < sendArray.length) {
                sendArray[i - 2 + 3] = dataBytes[i];
            }
        }

        ensureAudioContext();
        console.log("iPad用データ転送:", sendArray);
        sendDataBySound(sendArray);

        // データ書き込み時間（500ms）待機する
        await wait(500);

        // 実行コマンドの送信
        console.log("iPad用実行コマンド送信");
        soundRun();
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
// ★ Blocklyの命令を解釈してマイコンを動かす関数（非同期）
// ==========================================
// ==========================================
// ★ Blocklyの命令を解釈してマイコン用バイトデータを生成・転送する関数
// ==========================================
async function executeBlocklyLogic(isSuccess) {
    if (!window.workspace) return;

    const startBlock = window.workspace.getBlocksByType('face_auth_start')[0];
    if (!startBlock) return;
    const checkBlock = startBlock.getNextBlock();
    if (!checkBlock || checkBlock.type !== 'face_auth_check') return;

    // 認証結果に応じてYESかNOのブロックの塊を取得
    let currentBlock = checkBlock.getInputTargetBlock(isSuccess ? 'YES' : 'NO');

    // HID転送用のベース配列（251, 240はマイコンへの書き込み開始ヘッダ、230, 2はプログラム開始番地）
    let hidBytes = [251, 240, 230, 2];
    let addr = 2; // 現在のアドレス
    let hasHardwareCommand = false;

    // 繋がっているブロックを上から順番に解析する
    while (currentBlock) {
        if (currentBlock.type === 'face_auth_speak') {
            // しゃべるブロックはブラウザで実行するため、HIDデータには含めない
            const text = currentBlock.getFieldValue('TEXT');
            speak(text);

        } else if (currentBlock.type === 'cmd_sound') {
            // 音を鳴らすブロックの変換 (2バイト長)
            const soundByte = Number(currentBlock.getFieldValue('SOUND'));
            addr += 2; // 自身(1) + 次のアドレス(1) = 2バイト使用
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
                case "purple": r = 255; g = 0; b = 255; break; // マゼンタ寄りが見栄えが良いです
                case "cyan": r = 0; g = 255; b = 255; break;
                case "white": r = 255; g = 255; b = 255; break;
            }

            addr += 6; // 自身(1) + R(1) + G(1) + B(1) + 秒(1) + 次のアドレス(1) = 6バイト使用
            hidBytes.push(130, r, g, b, sec, addr);
            hasHardwareCommand = true;
        }

        // 次に繋がっているブロックへ進む
        currentBlock = currentBlock.getNextBlock();
    }

    // ハードウェアへの命令が1つでもあれば、終了コードを追加してマイコンへ転送する
    if (hasHardwareCommand) {
        hidBytes.push(231, 250); // プログラム終了を表すコード
        console.log("マイコンへ転送するバイトデータ:", hidBytes);
        //await transferHID(hidBytes);
        await transferDevice(hidBytes); // ★修正: iPadなど非対応ブラウザでも接続をキャンセルして進める
    }
}

// ==========================================
// ★ actionBtn クリック処理の書き換え（接続処理を挟む）
// 既存の actionBtn.addEventListener('click', ...) の全体をこれに差し替えます
// ==========================================
if (actionBtn) {
    // --- js/app.js のボタン処理をこれに丸ごと差し替えてください ---

    actionBtn.addEventListener('click', async () => {
        const name = userNameInput.value.trim();
        if (!name) return alert("名前を入力してください。");

        // =========================================================
        // ★ 追加: ボタンを押した時に現在のプログラムを保存する
        // =========================================================
        if ((currentMode === 'blockly_safe' || currentMode === 'blockly_free') && window.workspace) {
            const state = Blockly.serialization.workspaces.save(window.workspace);
            // モードごと（ステップ4用 / ステップ5用）に名前を分けて保存
            localStorage.setItem('savedBlockly_' + currentMode, JSON.stringify(state));
        }

        // ★ステップ4(blockly_safe) と ステップ5(blockly_free) の場合、マイコン接続を確認する
        if (currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
            //       const connected = await connectHID();
            const connected = await connectDevice();    // ★修正: iPadなど非対応ブラウザでも接続をキャンセルして進める
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
                // 顔がない場合も「認証失敗(false)」としてブロックの命令(NO側)を実行する
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
                statusText.innerText = `${name}は登録されていません。`;
                speak(`${name}は登録されていません。`);
                return;
            }
            const registeredDescriptor = new Float32Array(targetUser.descriptor);
            const distance = faceapi.euclideanDistance(registeredDescriptor, detection.descriptor);
            if (distance < 0.5) {
                statusText.innerText = `認証成功: ${name}さん`;
                speak(`${name}を認証しました。`);
            } else {
                statusText.innerText = `認証失敗`;
                speak(`${name}を認証できませんでした。`);
            }

        } else if (currentMode === 'safe' || currentMode === 'blockly_safe' || currentMode === 'blockly_free') {
            // ステップ3、4、5 の金庫・ブロック処理
            const targetUser = getFaceData(name);
            const safeBox = document.getElementById('safeBox');
            const safeIcon = document.getElementById('safeIcon');
            const safeText = document.getElementById('safeText');
            let isSuccess = false;

            if (!targetUser) {
                statusText.innerText = `${name}は登録されていません。`;
                if (currentMode === 'safe') speak(`${name}は登録されていません。`);
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
                    if (currentMode === 'safe') speak(`${name}を認証しました。金庫が開きます。`);
                } else {
                    statusText.innerText = `認証失敗`;
                    safeBox.classList.remove('open');
                    safeIcon.innerText = '🔒';
                    safeText.innerText = '金庫はロックされています';
                    if (currentMode === 'safe') speak(`${name}を認証できませんでした。`);
                }
            }

            // ★ ステップ4と5 の場合のみ、画面のブロックを読み取ってマイコンへ転送する
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
                // GitHub Pages上なら fetch も iframe も動きます（今回はiframeで表示）
                helpContent.innerHTML = `<iframe src="./help/${targetFile}" style="width: 100%; height: 400px; border: none;"></iframe>`;
            } else {
                helpContent.innerHTML = "<p style='color: red;'>ヘルプファイルが指定されていません。</p>";
            }

            helpDialog.showModal(); // ★ <dialog> の純正機能で開く
        });

        closeHelpBtn.addEventListener('click', () => {
            helpDialog.close(); // ★ <dialog> の純正機能で閉じる
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

// ==========================================
// ★ Web Audio API (iPad用通信) の処理
// ==========================================

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

// 接続処理のダミーデータ送信
function connect_iPad() {
    let sendDataArray = Array(35).fill(0);
    sendDataArray[0] = 253;
    sendDataArray[1] = 5;
    sendDataBySound(sendDataArray);
}

// 実行コマンドの送信
function soundRun() {
    let sendDataArray = Array(35).fill(0);
    sendDataArray[0] = 253; // iPadモード
    sendDataArray[1] = 2;   // 実行
    sendDataBySound(sendDataArray);
}

// データを受け取って音データに変換して送信する
function sendDataBySound(arrayData) {
    let binaryDataArray = arrayData.map(getBinary);
    outputSoundData(binaryDataArray);
}

// 1バイトのデータを8ビット(0/1)の配列に変換する
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

// ビットのデータを波形に変換し、イヤホンジャックから出力する
function outputSoundData(binaryDataArray) {
    var audioCtxLocal = ensureAudioContext();
    if (!audioCtxLocal) return;

    var channels = 2;
    var sampleRate = audioCtxLocal.sampleRate || 44100;
    let estimatedSamples = 0;
    let counterEst = 0;

    binaryDataArray.forEach(element => {
        element.forEach(x => {
            if ((counterEst % 8) == 0) estimatedSamples += 20 + 30; // スタートビット
            if (x == 0) estimatedSamples += 5 + 5;
            else estimatedSamples += 5 + 15;
            counterEst++;
            if ((counterEst % 8) == 0) estimatedSamples += 20; // ストップビット
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