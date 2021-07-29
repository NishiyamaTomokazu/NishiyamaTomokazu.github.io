//web Audio apiの練習

function btnClick() {
    //AudioContextを作成
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    //サンプリングレートを48KHzに設定
    audioCtx.sampleRate = 44100;
    //モノラル、48KHz、48000サンプルのバッファを作成
    var buf = audioCtx.createBuffer(2, 44100, 44100);
    //データが格納されている配列を取得
    var data = buf.getChannelData(0);
    
    var i;
    
    //左チャンネルと右チャンネルを16バイトごとに入れ替える
/*     for(i=0; i<data.length; i++){
        if((Math.floor(i / 16)) % 2 == 0){
            //偶数なら左チャンネル
            if((i % 16) < 8){
                data[i] = 1.0;
            } else {
                data[i] = 0.8;
            }
        } else {
            if((i % 16) < 8){
                data[i] = 0.0;
            } else {
                data[i] = 0.0;
            }
        }
    } */

    //配列に音声データを書き込む
    //数値を入れるやつ
    var dataHalf = data.length / 2;
    for(i=0; i < dataHalf; i++){
        if((i % 100) <10){
            data[i] = 1.0;
        } else {
            data[i] = -1.0;  //1.0,0.9で、ワンショットパルスみたいな波形 250us
        }
    }
    // for(i=dataHalf; i < data.length; i++){
    //     if((i % 100) < 50){
    //         data[i] = 1.0;
    //     } else {
    //         data[i] = -1.0;  //1.0,0.9で、ワンショットパルスみたいな波形 250us
    //     }
    // }
    //AudioSourceを作成
    var src = audioCtx.createBufferSource();
    //AudioSourceに作成した音声データを設定
    src.buffer = buf;
    //出力先を設定
    src.connect(audioCtx.destination);
    //出力開始
    src.start();
}

// var contex;
// window.addEventListener('load', init, false);
// function init() {
//     try {
//         window.AudioContext = window.AudioContext || window.webkitAudioContext;
//         context = new AudioContext();
//     }
//     catch(e) {
//         alert('Web Audio API is not supported in this browser');
//     }
// }    var playing = false;
//window.AudioContext = window.AudioContext || window.webkitAudioContext;

//function Play() {
    // var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // var button = document.querySelector('button');
    // var pre = document.querySelector('pre');
    // var myScript = document.querySelector('script');

    // pre.innerHTML = myScript.innerHTML;

    // //ステレオ
    // var channels = 2;
    // //AudioContextのサンプルレートで2秒間のからのステレオバッファを生成する
    // var frameCount = audioCtx.sampleRate * 2.0;
    // var myArrayBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);
//}
// function btnClick() {
//     //バッファにホワイトノイズを書き込む
//     for( var channel = 0; channel < channels; channel++){
//         //実際のデータの配列を得る
//         var nowBuffering = myArrayBuffer.getChannelData(channel);
//         for( var i = 0; i < frameCount; i++){
//             //Math.random()は[0-1.0]である
//             //音声は[-1;1.0]である必要がある
//             nowBuffering[i] = Math.random * 2 - 1;
//         }
//     }
//     //AudioBufferSourceNodeを得る
//     //これはAudioBufferを再生する時に使うAudioNodeである
//     var source = audioCtx.createBufferSource();
//     //AudioBufferSourceNodeにバッファを設定する
//     source.buffer = myArrayBuffer;
//     //AudioBufferSourceNodeを出力先に接続すると音声が聞こえるようになる
//     source.connect(audioCtx.destination);
//     //音源の再生を始める
//     source.start();
// }


    // var audioCtx = new AudioContext();
    // const buffer = audioCtx.createBuffer(2, 5* audioCtx.sampleRate, audioCtx.sampleRate);
    // for( let channel=0; channel<buffer.numberOfChannels; channel++){
    //     const data = buffer.getChannelData(channel);
    //     for( let i=0; i<buffer.length; i++){
    //         data[i] = Math.random()*2.0-1.0;
    //     }
    // }

    // const bufferSrc = audioCtx.createBufferSource();
    // bufferSrc.buffer = buffer;
    // bufferSrc.loop = true;
    // return bufferSrc;


    //alert("てすと")
    // if(playing == true){
    //     //osc.stop();
    //     playing = false;
    //     return;
    // }

    // audioctx = new AudioContext();
    // osc = new OscillatorNode(audioctx);
    // gain = new GainNode(audioctx);
    // osc.connect(gain).connect(audioctx.destination);
    // osc.start();
    // playing = true;
//}
// function Setup() {
//     let type = document.getElementById("type").value;
//     let freq = parseFloat(document.getElementById("freq").value);
//     let level = parseFloat(document.getElementById("level").value);
//     document.getElementById("freqdisp").innerHTML = freq;
//     document.getElementById("leveldisp").innerHTML = level;

//     osc.type = type;
//     osc.frequency.value = freq;
//     gain.gain.value = level;
// }
/*     var playing = false;
function Play() {
    if(playing)
        return;
    audioctx = new AudioContext();  //AudioContextを作成
    osc = new OscillatorNode(audioctx);     //オシレータを作成
    gain = new GainNode(audioctx);
    osc.connect(gain).connect(audioctx.destination);
    osc.start();
    playing = true;
}
function Setup() {
    var type = document.getElementById("type").value;
    var freq = parseFloat(document.getElementById("freq").value);
    var level = parseFloat(document.getElementById("level").value);
    document.getElementById("freqdisp").innerHTML = freq;
    document.getElementById("leveldisp").innerHTML = level;

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = level;
} */

//入力された数字を２進数にした時、ビットが立っている個数を数える
// let b = 15;
// var count = 0;

// for(let i=0; i<8; i++){
//     if(b & (1<<7)){
//         count++;
//     }
//     b = b << 1;
// }

// console.log("count=",count);

