s//送信用データの入った配列　テスト用
let sendDataArray = Array(5);

//操作用のデータ
let tmpData = Array(64);

//let sendDataArray = Array(255);
sendDataArray.fill(255);     //255で初期化
sendDataArray[0] = 10;
sendDataArray[1] = 170;
//sendDataArray[2] = 0;
//sendDataArray[3] = 0;
//console.log(sendDataArray);

//送信用のデータ
let convertedData = Array(6400);

//音声出力用のバッファ作る
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
audioCtx.sampleRate = 44100;
var buf = audioCtx.createBuffer(1,200,44100);
var data = buf.getChannelData(0);
var bufCount;
var cnt = 0;
var gainNode = audioCtx.createGain();


//送信データを受け取って、音声で出力する
/*function sendDataBySound(){
    tmpData = sendDataArray.slice();    //一応データをコピーする
    tmpData.forEach(element => sendBit(element));
    
}*/
function sendDataBySound() {
    //convertedData.fill(255);    //
    let tmp;
    console.log(sendDataArray);
    //let convertedData = sendDataArray.map(sendBit(x));
    for(var i=0; i<64; i++) {
        tmp = sendBit(sendDataArray[i]);
        convertedData.push(tmp);
    }
    console.log(convertedData);

/*
    //AudioSourceを作成
    var src = audioCtx.createBufferSource();
    //AudioSourceに作成した音声データを設定
    src.buffer = buf;

    //出力先を設定
    src.connect(audioCtx.destination);
    //出力開始
    src.start();
    console.log(cnt++);
*/
}

//1バイト受け取って、その値の応じて音を出力する
function sendBit(sendData){
    let tmp,i;
    tmp = sendData;
    bufCount = 0;
    //スタートビットを出力
    for(i=0; i<40; i++){
        bufCount++;
        if(i<20){
            data[i] = 0.0;
        } else {
            data[i] = 1.0;
        }
    }

    for(i=0; i<8; i++){
        sendData = sendData & 0b10000000;
        if(sendData == 0){
            txZero();
        } else {
            txOne();
        }
        tmp = tmp << 1;
        sendData = tmp;
    }

    //console.log(data);
    
    return data;
}

//ビット０の時、出力する関数
function txZero() {
    for(var i=0; i<3; i++){
        data[bufCount++] = 0.0;
    }
    //console.log("0出力");
    
}

//ビット１の時、出力する関数
function txOne() {
    for(var i=0; i<3; i++){
        data[bufCount++] = 1.0;
    }
    //console.log("1出力")
}