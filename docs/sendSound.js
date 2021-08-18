//送信用のデータの入った配列　テスト用
let sendDataArray = Array(64);
sendDataArray.fill(0);    //初期化
sendDataArray[0] = 170;
//sendDataArray[1] = 170;
//sendDataArray[2] = 255;      //テスト用

let convertedData = Array(50);    //送信用音楽データ
convertedData.fill(0);

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();
//モノラル
var channels = 2;
audioCtx.sampleRate = 48000;
var frameCount = audioCtx.sampleRate * 2.0; 
var myArrayBuffer = audioCtx.createBuffer(2,frameCount,audioCtx.sampleRate);

//テスト用の関数　
function testArrayFunction(){
    sendDataBySound(sendDataArray);
}

//送信用データの配列を受け取り、音データに変換して、送信する
function sendDataBySound(dataArray) {
    //console.log(dataArray);
    let binaryDataArray = dataArray.map(getBinary);
    //console.log(binaryDataArray);
    //let soundDataArray = getBinaryArray(binaryDataArray);
    getBinaryArray(binaryDataArray);
    //console.log("soundDataArray : " + soundDataArray);
    //let sendResult = outputSoundData(soundDataArray);   //音声を出力する
}

/*
    1バイトのデータを8文字分の0/1に変換する
    getBinary(10) -> return [0,0,0,0,1,0,1,0]
    10を入れたら、10を2進数に変換した0b00001010の配列を返す
*/
function getBinary(data){
    var tmp = data;
    var tmpArray = Array(8);
    //var startBit = [1,1,1,1];   //スタートビット用
    var returnData;

    for(let i=0; i<8; i++){
        tmp = tmp & 0b10000000;     //最上位ビットが1かどうかを確認
        if(tmp == 0){
            tmpArray[i] = 0;      //0だった
        } else {
            tmpArray[i] = 1;      //1だった
        }
        data = data << 1;           //次のビットを確認
        tmp = data;
    }
    //returnData = startBit.concat(tmpArray);
    returnData = tmpArray;
    //console.log("returndata : " + returnData);
    return returnData;      //[1,1,1,1,0,0,0,0,1,0,1,0]みたいな配列を返す スタートビットを入れる
}

/*
    64バイト分の配列データを結合して、１つの配列に変換する
    dataに64バイト分の0/1に変換した値が入っている
    それを先頭から読み込んで、newArrayに入れていく
    64バイト x ８ビット　= 512この要素を持った配列ができる
*/
function getBinaryArray(data) {
    console.log(data);
    //let newArray = new Array();
    var newArray = myArrayBuffer.getChannelData(0);
    let counter = 0;
    let i = 0;
    //console.log(newArray);
    data.forEach(element => {
        element.map(x => {
            //newArray.push([1,1,1,1]);    //スタートビット
            if((counter % 8) == 0) {
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
            }
            if(x == 0){
                //newArray.push([0,0,0,0,0,0]);
                //newArray.push([0,0,1,1]);
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 1;
                newArray[i++] = 1;
            } else {
                //newArray.push([1,1,1,1,1,1]);
                //newArray.push([0,0,1,1,1,1,1,1]);
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
            }
            counter++;
        })
    });
    console.log(newArray);
    //return newArray;
    var source = audioCtx.createBufferSource();
    source.buffer = myArrayBuffer;
    source.connect(audioCtx.destination);
    source.start();
}

/*
    配列を音データに変換して出力する
    dataでもらった配列を音声に変換する
*/
function outputSoundData(data){
    //console.log(data);
    var source = audioCtx.createBufferSource();
    myArrayBuff = data;
    source.buffer = myArrayBuffer;
    console.log(source);
    source.connect(audioCtx.destination);
    source.start();
}