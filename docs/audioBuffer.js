//オーディオバッファーのテスト
window.AudioContext = window.AudioContext || window.webkitAudioContext;
//const ctx = new AudioContext();
var audioCtx = new AudioContext();
let oscillator;
let isPlaying = false;

var channels = 2;
var frameCount = audioCtx.sampleRate * 2.0;
var myArrayBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);

function btnClick() {
  console.log(audioCtx.sampleRate);
      // バッファにホワイトノイズを書き込む;
  // 単なる-1.0から1.0の間の乱数の値である
  // for (var channel = 0; channel < channels; channel++) {
  //   // 実際のデータの配列を得る
  //   var nowBuffering = myArrayBuffer.getChannelData(channel);
  //   if(channel == 1){
  //     for (var i = 0; i < frameCount; i++) {
  //         if((Math.floor(i /16)) % 2 == 0){
  //           nowBuffering[i] = 1.0;
  //         } else {
  //           nowBuffering[i] = 0.0;
  //         }
  //     }
  //   } else {
  //     for(var i = 0; i < frameCount; i++){
  //       nowBuffering[i] = Math.random() * 2 - 1;
  //     }
  //   }
  // }
 
   // AudioBufferSourceNodeを得る
   // これはAudioBufferを再生するときに使うAudioNodeである
   var source = audioCtx.createBufferSource();
   // AudioBufferSourceNodeにバッファを設定する
   source.buffer = myArrayBuffer;
   // AudioBufferSourceNodeを出力先に接続すると音声が聞こえるようになる
   source.connect(audioCtx.destination);
   // 音源の再生を始める
   source.start();
 
}

// document.querySelector("#play").addEventListener("click", () => {
//     //再生中なら二重再生されないようにする
//     if(isPlaying) return;
//     oscillator = ctx.createOscillator();
//     oscillator.type = "sine";
//     oscillator.frequency.setValueAtTime(440, ctx.currentTime);
//     oscillator.connect(ctx.destination);
//     oscillator.start();
//     isPlaying = true;
// });

// document.querySelector("#stop").addEventListener("click", () => {
//     oscillator.stop();
//     isPlaying = false;
// });



// function btnClick() {
//     //AudioContextを作成
//     var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
//     //ステレオ
//     var channels = 2;
//     //AudioContextのサンプルレートで2秒かの空のステレオバッファを生成する
//     var frameCount = audioCtx.sampleRate * 2.0;
    
//     var myArrayBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);

//     //バッファにホワイトノイズを書き込む
//     for(var channel = 0; channel < channels; channel++){
//         //実際のデータの配列を得る
//         var nowBuffering = myArrayBuffer.getChannelData(channel);
//         for(var i = 0; i < frameCount; i++){
//             //Math.random()は[0; 1.0]である
//             //音声は[-1.0; 1.0]である必要がある
//             nowBuffering[i] = Math.random() * 2 - 1;
//         }
//     }

//     //AudioBufferSourceNodeを得る
//     //これはAudioBufferを再生する時に使うAudioNodeである
//     var source = audioCtx.createBufferSource();
//     //AudioBufferSourceNodeを出力先に接続すると音声が聞こえるようになる
//     source.connect(audioCtx.destination);
//     //音源の再生を始める
//     source.start();
//  }