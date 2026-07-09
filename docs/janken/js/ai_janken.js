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
        
        // ページ1のテスト用手の絵文字表示
        const testAiHandEl = document.getElementById('test-ai-hand');
        if (testAiHandEl) {
            testAiHandEl.innerText = handSymbols[result.label];
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
    for (let i = 0; i < 3; i++) {
        exampleCounts[i] = 0;
        document.getElementById(`prob-${i}`).innerText = `${handSymbols[i]} 0%`;
        document.getElementById(`prob-${i}`).style.backgroundColor = '#f8f9fa';
    }
    document.getElementById('btn-rock').innerText = "✊ グー追加 (0)";
    document.getElementById('btn-scissors').innerText = "✌️ チョキ追加 (0)";
    document.getElementById('btn-paper').innerText = "✋ パー追加 (0)";
    // ★修正: 要素が存在するか確認
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

window.executeBlocklyReaction = function(result) {
    if (!workspace) return; 

    const allBlocks = workspace.getAllBlocks(false);
    if (result === "win") {
        const speakWinBlock = allBlocks.find(block => block.type === 'cmd_speak_win');
        speakResult(speakWinBlock ? speakWinBlock.getFieldValue('TEXT') : "あなたの勝ちです"); 
    } else if (result === "lose") {
        const speakLoseBlock = allBlocks.find(block => block.type === 'cmd_speak_lose');
        speakResult(speakLoseBlock ? speakLoseBlock.getFieldValue('TEXT') : "私の勝ちです"); 
    }
}

window.stopAI = function() {
    if (!isAiActive && (!videoElement || !videoElement.srcObject)) return;
    isAiActive = false;
    if (videoElement && videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
};

window.addEventListener('pagehide', window.stopAI);
