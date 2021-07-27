//オーディオバッファーのテスト
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ステレオ
var channels = 2;
// AudioContextのサンプルレートで2秒間の空のステレオバッファを生成する
var frameCount = audioCtx.sampleRate * 2.0;

var myArrayBuffer = audioCtx.createBuffer(2, frameCount, audioCtx.sampleRate);

let counter = 0;
let oneBit = 0;
let inData = 10;  //テスト用のデータ

function btnClick(){
  // バッファにホワイトノイズを書き込む;
  // 単なる-1.0から1.0の間の乱数の値である
  for (var channel = 0; channel < channels; channel++) {
    // 実際のデータの配列を得る
   var nowBuffering = myArrayBuffer.getChannelData(channel);
   for (var i = 0; i < frameCount; i++) {
     if(onBit < 8){
        counter++;
        let tmp = inData;
        inData = inData & 0b10000000;
        if(counter < 10){
          if(inData == 0){
            nowBuffering[i] = 0;
          } else {
            nowBuffering[i] = 1;
          }
        }
      onBit++;
    }
    onBit = 0;
   }
  }
  console.log(nowBuffering);
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