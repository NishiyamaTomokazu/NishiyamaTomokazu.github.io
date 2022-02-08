// クロスブラウザ定義
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// 変数定義
var localMediaStream = null;
var localScriptProcessor = null;
var audioContext = new AudioContext();
var bufferSize = 1024;
var audioData = []; // 録音データ
var recordingFlg = false;

// キャンバス
var canvas = document.getElementById('canvas');
var canvasContext = canvas.getContext('2d');

// 音声解析
var audioAnalyser = null;


// 録音バッファ作成（録音中自動で繰り返し呼び出される）
var onAudioProcess = function(e) {
    if (!recordingFlg) return;

    // 音声のバッファを作成
    var input = e.inputBuffer.getChannelData(0);
    var bufferData = new Float32Array(bufferSize);
    for (var i = 0; i < bufferSize; i++) {
        bufferData[i] = input[i];
    }
    audioData.push(bufferData);

    // 波形を解析
    analyseVoice();
};

// 解析用処理
var analyseVoice = function() {
    var fsDivN = audioContext.sampleRate / audioAnalyser.fftSize;
    var spectrums = new Uint8Array(audioAnalyser.frequencyBinCount);
    audioAnalyser.getByteFrequencyData(spectrums);
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    canvasContext.beginPath();

    for (var i = 0, len = spectrums.length; i < len; i++) {
        //canvasにおさまるように線を描画
        var x = (i / len) * canvas.width;
        var y = (1 - (spectrums[i] / 255)) * canvas.height;
        if (i === 0) {
            canvasContext.moveTo(x, y);
        } else {
            canvasContext.lineTo(x, y);
        }
        var f = Math.floor(i * fsDivN);  // index -> frequency;

        // 500 Hz単位にy軸の線とラベル出力
        if ((f % 500) === 0) {
            var text = (f < 1000) ? (f + ' Hz') : ((f / 1000) + ' kHz');
            // Draw grid (X)
            canvasContext.fillRect(x, 0, 1, canvas.height);
            // Draw text (X)
            canvasContext.fillText(text, x, canvas.height);
        }
    }

    canvasContext.stroke();

    // x軸の線とラベル出力
    var textYs = ['1.00', '0.50', '0.00'];
    for (var i = 0, len = textYs.length; i < len; i++) {
        var text = textYs[i];
        var gy   = (1 - parseFloat(text)) * canvas.height;
        // Draw grid (Y)
        canvasContext.fillRect(0, gy, canvas.width, 1);
        // Draw text (Y)
        canvasContext.fillText(text, 0, gy);
    }
}


// 解析開始
var startRecording = function() {
    recordingFlg = true;
    navigator.getUserMedia({audio: true}, function(stream) {
        // 録音関連
        localMediaStream = stream;
        var scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        localScriptProcessor = scriptProcessor;
        var mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(scriptProcessor);
        scriptProcessor.onaudioprocess = onAudioProcess;
        scriptProcessor.connect(audioContext.destination);

        // 音声解析関連
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 2048;
        frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        timeDomainData = new Uint8Array(audioAnalyser.frequencyBinCount);
        mediastreamsource.connect(audioAnalyser);
    },
    function(e) {
        console.log(e);
    });
};

// 解析終了
var endRecording = function() {
    recordingFlg = false;
    console.log(audioData);

    //audioDataをサーバに送信するなど終了処理
};