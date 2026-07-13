// ai_janken.js
//じゃんけんの処理

const videoElement = document.getElementById('webcam');
const statusElement = document.getElementById('ai-status');
const toggleAiBtn = document.getElementById('toggle-ai-btn');
const startBtn = document.getElementById('start-btn');
const resultMessage = document.getElementById('result-message');

let classifier, mobilenetModel, trainingTimer;
const exampleCounts = [0, 0, 0];
const handSymbols = ["✊", "✌️", "✋"];

let currentPrediction = -1;
let isPlaying = false;
let isAiActive = false;
let workspace; // 各ページで設定されるBlocklyのワークスペース用

let hidDevice = null;

// ==========================================
// ★追加: マイコンの切断（電源オフやケーブル抜け）を検知する
// ==========================================
navigator.hid.addEventListener('disconnect', (event) => {
    // 切断されたデバイスが、現在接続しているマイコンと同じ場合
    if (hidDevice && event.device === hidDevice) {
        console.log("マイコンの電源オフまたは切断を検知しました");
        
        // 接続状態をリセット
        hidDevice = null; 
        
        // 画面の文字を「未接続」に変更して赤色にする
        const statusEl = document.getElementById("hid-status");
        if (statusEl) {
            statusEl.innerText = "未接続";
            statusEl.style.color = "red";
        }
    }
});

async function init() {
    const isIPad = /iPad/i.test(navigator.userAgent) || 
                  (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    
    if (isIPad) {
        document.getElementById('training-msg').innerText = "ボタンをタップして学習させてください";
    }

    classifier = knnClassifier.create();
    mobilenetModel = await mobilenet.load();

    const datasetStr = localStorage.getItem("jankenKNNData");
    if (datasetStr) {
        const hasAsked = sessionStorage.getItem("hasAskedLoadData");
        let shouldUseData = true;

        if (!hasAsked) {
            shouldUseData = confirm("前回の学習データが残っています。\nこのデータを使って再開しますか？\n\n（「キャンセル」を押すと古いデータを消去して、初めから学習します）");
            sessionStorage.setItem("hasAskedLoadData", "true");
        }

        if (shouldUseData) {
            const datasetObj = JSON.parse(datasetStr);
            const dataset = {};
            Object.keys(datasetObj).forEach((key) => {
                const { data, shape } = datasetObj[key];
                dataset[key] = tf.tensor2d(data, shape);
            });
            classifier.setClassifierDataset(dataset); 
            
            Object.keys(datasetObj).forEach((key) => {
                const classId = parseInt(key);
                exampleCounts[classId] = datasetObj[key].shape[0];
                const btnLabels = ["✊ グー追加", "✌️ チョキ追加", "✋ パー追加"];
                const btnIds = ["btn-rock", "btn-scissors", "btn-paper"];
                document.getElementById(btnIds[classId]).innerText = `${btnLabels[classId]} (${exampleCounts[classId]})`;
            });
        } else {
            localStorage.removeItem("jankenKNNData");
        }
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 224, height: 224 }, audio: false });
        videoElement.srcObject = stream;
        videoElement.addEventListener('playing', () => {
            isAiActive = true;
            toggleAiBtn.disabled = false;
            enableTrainingButtons(true);
            
            if (exampleCounts[0] > 0 && exampleCounts[1] > 0 && exampleCounts[2] > 0) {
                statusElement.innerText = "AI: 稼働中！(データ読込済み✨)";
                // ★修正: 要素が存在するか（ページ2や3か）を確認してから操作する
                if (resultMessage) resultMessage.innerText = "準備OK！スタートボタンを押してね";
                if (startBtn) startBtn.disabled = false;
            } else {
                statusElement.innerText = "AI: 稼働中！まずは手を学習させてください。";
            }
            predictLoop();
        });
    } catch (err) {
        statusElement.innerText = "カメラの起動に失敗しました。";
    }
}

window.toggleAI = function () {
    isAiActive = !isAiActive;
    if (isAiActive) {
        toggleAiBtn.innerText = "⏸ AIを一時停止 (発熱対策)";
        toggleAiBtn.style.backgroundColor = "#ffc107";
        toggleAiBtn.style.color = "#333";
        statusElement.innerText = "AI: 稼働中！";
        statusElement.style.color = "#007bff";
        enableTrainingButtons(true);
        predictLoop();
    } else {
        toggleAiBtn.innerText = "▶️ AIを再開する";
        toggleAiBtn.style.backgroundColor = "#28a745";
        toggleAiBtn.style.color = "white";
        statusElement.innerText = "AI: 一時停止中 (端末を冷却しています ❄️)";
        statusElement.style.color = "#6c757d";
        enableTrainingButtons(false);
        // ★修正: 要素が存在するか確認
        if (startBtn) startBtn.disabled = true;
    }
}

function enableTrainingButtons(enable) {
    document.getElementById('btn-rock').disabled = !enable;
    document.getElementById('btn-scissors').disabled = !enable;
    document.getElementById('btn-paper').disabled = !enable;
    if (enable && exampleCounts[0] > 0 && exampleCounts[1] > 0 && exampleCounts[2] > 0) {
        // ★修正: 要素が存在するか確認
        if (startBtn) startBtn.disabled = false;
    }
}

window.addExample = function(classId) {
    const img = tf.browser.fromPixels(videoElement);
    const features = mobilenetModel.infer(img, true);
    classifier.addExample(features, classId);
    img.dispose();

    exampleCounts[classId]++;
    const btnLabels = ["✊ グー追加", "✌️ チョキ追加", "✋ パー追加"];
    const btnIds = ["btn-rock", "btn-scissors", "btn-paper"];
    document.getElementById(btnIds[classId]).innerText = `${btnLabels[classId]} (${exampleCounts[classId]})`;

    if (exampleCounts[0] > 0 && exampleCounts[1] > 0 && exampleCounts[2] > 0 && isAiActive) {
        // ★修正: 要素が存在するか確認
        if (startBtn) startBtn.disabled = false;
        if (resultMessage && resultMessage.innerText === "全ての形を学習させたらスタート！") {
            resultMessage.innerText = "準備OK！スタートボタンを押してね";
        }
    }
}

window.startTraining = function(classId) { if (isAiActive) { addExample(classId); trainingTimer = setInterval(() => addExample(classId), 100); } }
window.stopTraining = function() { clearInterval(trainingTimer); }

async function predictLoop() {
    if (!isAiActive) return;

    if (classifier.getNumClasses() > 0) {
        const img = tf.browser.fromPixels(videoElement);
        const features = mobilenetModel.infer(img, 'conv_preds');
        const result = await classifier.predictClass(features);

        if (!isPlaying) currentPrediction = parseInt(result.label);

        for (let i = 0; i < 3; i++) {
            const probability = result.confidences[i] || 0;
            const percent = Math.round(probability * 100);
            
            // 左パネルの確率表示（既存）
            const probEl = document.getElementById(`prob-${i}`);
            if (probEl) {
                probEl.innerText = `${handSymbols[i]} ${percent}%`;
                if (result.label == i && percent > 50) {
                    probEl.style.backgroundColor = '#ffeaa7';
                    probEl.style.borderColor = '#fdcb6e';
                } else {
                    probEl.style.backgroundColor = '#f8f9fa';
                    probEl.style.borderColor = '#ddd';
                }
            }

            // ページ1のテスト用確率表示（右パネル）
            const testProbEl = document.getElementById(`test-prob-${i}`);
            if (testProbEl) {
                const labels = ["✊ グー", "✌️ チョキ", "✋ パー"];
                testProbEl.innerText = `${labels[i]}: ${percent}%`;
            }
        }
        
        // ==========================================
        // ページ1のテスト用手の絵文字表示
        // ==========================================
        const testAiHandEl = document.getElementById('test-ai-hand');
        if (testAiHandEl) {
            testAiHandEl.innerText = handSymbols[result.label];
            testAiHandEl.style.fontSize = ""; // ★追加: リセット時に小さくした文字サイズを元(64px)に戻す
        }

        img.dispose();
    }
    if (isAiActive) {
        await tf.nextFrame();
        predictLoop();
    }
}

window.startJanken = function () {
    if (classifier && classifier.getNumClasses() > 0) {
        const dataset = classifier.getClassifierDataset();
        const datasetObj = {};
        Object.keys(dataset).forEach((key) => {
            const tensor = dataset[key];
            datasetObj[key] = { data: Array.from(tensor.dataSync()), shape: tensor.shape };
        });
        localStorage.setItem("jankenKNNData", JSON.stringify(datasetObj));
    }

    isPlaying = true;
    // ★修正: 要素が存在するか確認（ページ2以降でのみ実行される想定ですが念のため）
    if (startBtn) startBtn.disabled = true;
    
    const dummy = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(dummy);
    
    document.getElementById("player-hand").innerText = "✊";
    document.getElementById("cpu-hand").innerText = "✊";
    
    if (resultMessage) resultMessage.style.color = "#333";
    if (resultMessage) resultMessage.innerText = "最初はグー！";
    setTimeout(() => { if (resultMessage) resultMessage.innerText = "じゃんけん..."; }, 1200);
    setTimeout(() => {
        if (resultMessage) resultMessage.innerText = "ポン！";
        judgeGame();
    }, 2400);
}

function judgeGame() {
    const cpuChoice = Math.floor(Math.random() * 3);
    document.getElementById("player-hand").innerText = handSymbols[currentPrediction];
    document.getElementById("cpu-hand").innerText = handSymbols[cpuChoice];

    const result = (currentPrediction - cpuChoice + 3) % 3;

    if (result === 0) {
        if (resultMessage) {
            resultMessage.innerText = "あいこ！";
            resultMessage.style.color = "#333";
        }
        speakResult("あいこです"); 
    } else if (result === 1) {
        if (resultMessage) {
            resultMessage.innerText = "あなたの負け...";
            resultMessage.style.color = "#007bff";
        }
        executeBlocklyReaction("lose"); 
    } else if (result === 2) {
        if (resultMessage) {
            resultMessage.innerText = "あなたの勝ち！🎉";
            resultMessage.style.color = "#ff4500";
        }
        executeBlocklyReaction("win"); 
    }

    if (isAiActive && startBtn) startBtn.disabled = false;
    setTimeout(() => { isPlaying = false; }, 2000);
}

window.resetModel = function() {
    classifier.clearAllClasses();
    
    // ==========================================
    // ★追加: ブラウザに保存されている学習データも完全に削除する
    // ==========================================
    localStorage.removeItem("jankenKNNData");
    sessionStorage.removeItem("hasAskedLoadData");
    console.log("保存されている学習データも削除しました");
    // ==========================================

    for (let i = 0; i < 3; i++) {
        exampleCounts[i] = 0;
        
        // 左パネルの確率表示をリセット
        const probEl = document.getElementById(`prob-${i}`);
        if (probEl) {
            probEl.innerText = `${handSymbols[i]} 0%`;
            probEl.style.backgroundColor = '#f8f9fa';
        }

        // ページ1の右パネルのテスト用確率表示をリセット
        const testProbEl = document.getElementById(`test-prob-${i}`);
        if (testProbEl) {
            const labels = ["✊ グー", "✌️ チョキ", "✋ パー"];
            testProbEl.innerText = `${labels[i]}: 0%`;
        }
    }
    
    // ページ1の右パネルの判定結果を「判定できません」にする
    const testAiHandEl = document.getElementById('test-ai-hand');
    if (testAiHandEl) {
        testAiHandEl.innerText = "判定できません";
        testAiHandEl.style.fontSize = "24px"; 
    }

    document.getElementById('btn-rock').innerText = "✊ グー追加 (0)";
    document.getElementById('btn-scissors').innerText = "✌️ チョキ追加 (0)";
    document.getElementById('btn-paper').innerText = "✋ パー追加 (0)";
    
    if (startBtn) startBtn.disabled = true;
    if (resultMessage) resultMessage.innerText = "全ての形を学習させたらスタート！";
}

function speakResult(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
}

// window.executeBlocklyReaction = function(result) {
//     if (!workspace) return; 

//     const allBlocks = workspace.getAllBlocks(false);
//     if (result === "win") {
//         const speakWinBlock = allBlocks.find(block => block.type === 'cmd_speak_win');
//         speakResult(speakWinBlock ? speakWinBlock.getFieldValue('TEXT') : "あなたの勝ちです"); 
//     } else if (result === "lose") {
//         const speakLoseBlock = allBlocks.find(block => block.type === 'cmd_speak_lose');
//         speakResult(speakLoseBlock ? speakLoseBlock.getFieldValue('TEXT') : "私の勝ちです"); 
//     }
// }
// ==========================================
// ★修正: 既存の executeBlocklyReaction 関数の中にLED制御を追加
// 非同期(async)にして、ブロックを下へ順番に辿れるようにします
// ==========================================
window.executeBlocklyReaction = async function(result) {
    if (!workspace) return; 

    const allBlocks = workspace.getAllBlocks(false);
    let speakBlock = null;

    if (result === "win") {
        speakBlock = allBlocks.find(block => block.type === 'cmd_speak_win');
    } else if (result === "lose") {
        speakBlock = allBlocks.find(block => block.type === 'cmd_speak_lose');
    }

    if (speakBlock) {
        // 1. 「〜としゃべる」ブロックの実行
        speakResult(speakBlock.getFieldValue('TEXT')); 
        
        // 2. 次に繋がっているブロック（LEDブロック）を探す
        const nextBlock = speakBlock.getNextBlock();
        if (nextBlock && nextBlock.type === 'cmd_led') {
            const color = nextBlock.getFieldValue('COLOR');
            const time = Number(nextBlock.getFieldValue('TIME')); // 秒数を取得
            
            // LEDの制御を実行
            await controlLedFromBlock(color, time);
        }
    }
}

window.stopAI = function() {
    if (!isAiActive && (!videoElement || !videoElement.srcObject)) return;
    
    // ==========================================================
    // ★追加: 別のページに移動する直前に、学習データを自動保存する
    // ==========================================================
    if (classifier && classifier.getNumClasses() > 0) {
        const dataset = classifier.getClassifierDataset();
        const datasetObj = {};
        Object.keys(dataset).forEach((key) => {
            const tensor = dataset[key];
            datasetObj[key] = { data: Array.from(tensor.dataSync()), shape: tensor.shape };
        });
        localStorage.setItem("jankenKNNData", JSON.stringify(datasetObj));
        console.log("ページ移動前に学習データを自動保存しました");
    }
    // ==========================================================

    isAiActive = false;
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
};

window.addEventListener('pagehide', window.stopAI);

// ==========================================
// ★追加: WebHID経由でじゃんけんをスタートする関数
// ==========================================
// ==========================================
// WebHID経由でじゃんけんをスタートする関数 (修正版)
// ==========================================
window.startJankenWithHID = async function () {
    const statusEl = document.getElementById("hid-status");

    if (!hidDevice || !hidDevice.opened) {
        try {
            // 1. まず「すでに許可済みのデバイス」のリストを取得する
            const devices = await navigator.hid.getDevices();
            
            // 2. リストの中に、目的のマイコン(VID: 0x21CF, PID: 0x0002)があるか探す
            let targetDevice = devices.find(d => d.vendorId === 0x21CF && d.productId === 0x0002);

            // 3. 見つからなかった場合のみ、新しく許可を求めるダイアログを出す
            if (!targetDevice) {
                const filters = [
                    { vendorId: 0x21CF, productId: 0x0002 } 
                ];
                
                const requestedDevices = await navigator.hid.requestDevice({ filters });
                if (requestedDevices.length > 0) {
                    targetDevice = requestedDevices[0];
                } else {
                    return; // キャンセルされた場合はそのまま終了
                }
            }

            // 4. デバイスを開いて接続する
            hidDevice = targetDevice;
            await hidDevice.open();
            
            if (statusEl) {
                statusEl.innerText = "接続完了";
                statusEl.style.color = "#28a745";
            }
        } catch (error) {
            console.error("HID接続エラー:", error);
            if (statusEl) {
                statusEl.innerText = "接続に失敗しました";
                statusEl.style.color = "red";
            }
            return;
        }
    }
    
    startJanken();
}
// ==========================================
// データを1バイトずつ転送する関数と待機用関数
// ==========================================
// 指定ミリ秒待機するプロミス（ウェイト用）
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function transferHID(outData) {
    if (!hidDevice) return;

    const outputReportId = 0x00;
    const outputReport = new Uint8Array([0]); // 1バイト送信用のバッファ

    console.log("転送開始:", outData);

    for (let i = 0; i < outData.length; i++) {
        outputReport[0] = outData[i];
        // マイコンへレポートを送信
        await hidDevice.sendReport(outputReportId, outputReport);
        
        console.log(`送信中 (${i + 1}/${outData.length}): ${outData[i]}`);
        
        // 90ミリ秒のウェイトを入れてデータの取りこぼしを防ぐ
        await wait(90); 
    }
}

// ==========================================
// マイコンへLEDの命令を送る関数
// ==========================================
async function sendLedCommand(color) {
    if (!hidDevice || !hidDevice.opened) return;

    // 参考ファイルの例を元にした、転送プログラムの配列
    // ※LEDの色を指定する数値部分は、実際のマイコン側の仕様に合わせて適宜変更してください
    let command;
    if (color === "blue") {
        // 例: 青色 (R:0, G:0, B:255) のプログラム
        command = [251,240, 230, 2, 130, 0, 0, 255, 4, 8, 231, 250]; 
    } else if (color === "red") {
        // 例: 赤色 (R:255, G:0, B:0) のプログラム
        command = [251,240, 230, 2, 130, 255, 0, 0, 4, 8, 231, 250];
    }

    if (command) {
        try {
            // 1. プログラムの転送
            await transferHID(command);
            
            // 2. プログラムの実行命令（241）を送信
            //await transferHID([241]);
        } catch (error) {
            console.error("コマンド送信エラー:", error);
        }
    }
}

// ==========================================
// ブロックの指示通りにLEDを制御する関数
// ==========================================
async function controlLedFromBlock(colorName, timeSeconds) {
    if (!hidDevice || !hidDevice.opened) return;

    let r = 0, g = 0, b = 0;
    
    // 選ばれた色に応じてRGBの数値を設定
    switch (colorName) {
        case "red":    r = 255; g = 0;   b = 0;   break;
        case "green":  r = 0;   g = 255; b = 0;   break;
        case "blue":   r = 0;   g = 0;   b = 255; break;
        case "yellow": r = 255; g = 255; b = 0;   break;
        case "purple": r = 255; g = 0;   b = 255; break; // マゼンタ寄りが見栄えが良いです
        case "cyan":   r = 0;   g = 255; b = 255; break;
        case "white":  r = 255; g = 255; b = 255; break;
    }

    let sec = 4 * Number(timeSeconds);

    try {
        // 1. 点灯コマンドを送信
        const onCommand = [251,240, 230, 2, 130, r, g, b, sec, 8, 231, 250];
        await transferHID(onCommand);
        //await transferHID([241]); // 実行命令

        // 2. 指定された秒数待機する (秒数 × 1000 でミリ秒に変換)
        await wait(timeSeconds * 1000);

        // 3. 消灯コマンド(すべて0)を送信
        //const offCommand = [251,240, 230, 2, 130, 0, 0, 0, 4, 8, 231, 250];
        //await transferHID(offCommand);
        //await transferHID([241]); // 実行命令
    } catch (error) {
        console.error("LED制御エラー:", error);
    }
}
