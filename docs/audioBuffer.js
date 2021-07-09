//オーディオバッファーのテスト

var channels = 2;
//AudioContextを作成
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

//サンプリングレートを48kHzに設定
audioCtx.sampleRate = 48000;
//バッファの時間設定
var frameCount = audioCtx.sampleRate * 1
//ステレオ、48kHz、48000サンプル（1秒）のバッファを作成
var myArrayBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);
//データが格納されている配列を取得
//var data = buf.getChannelData(0);

function btnClick() {
  //データの作成
  for(var channel = 0; channel < channels; channel++){
    var nowBuffering = myArrayBuffer.getChannelData(channel);
    if(channel == 0){
      for(var i = 0; i < frameCount; i++){
        nowBuffering[i] = 1;
      }
    }
    else {
      for(var i = 0; i < frameCount; i++){
        nowBuffering[i]= 0;
      }
    }
    // for(var i = 0; i < frameCount; i++){
    //   if(((Math.floor(i / 500)) % 2) == 0){
    //     nowBuffering[i] = 1.0;
    //   } else {
    //     nowBuffering[i] = -1.0;
    //   }
    // }
  }
  //オーディオデータの再生
  //AudioBufferを再生する時に使うAudioNode
  var source = audioCtx.createBufferSource();

  //AudioBufferSourceNodeにバッファを設定する
  source.buffer = myArrayBuffer;

  //AudioBufferSourceNodeを出力先に接続すると音声が聞こえるようになる
  source.connect(audioCtx.destination);

  //音源の再生を始める
  source.start();

}
