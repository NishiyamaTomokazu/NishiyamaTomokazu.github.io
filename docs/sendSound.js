//送信用のデータの入った配列　テスト用
let sendDataArray = Array(64);
sendDataArray.fill(255);    //初期化
sendDataArray[0] = 170;
sendDataArray[1] = 50;
sendDataArray[2] = 60;      //テスト用

let convertedData = Array(50);    //送信用音楽データ
convertedData.fill(0);

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();   //AudioContextの作成
audioCtx.sampleRate = 44100;
var buf = audioCtx.createBuffer(1,200,44100);

//テスト用の関数　
function testArrayFunc(){
    sendDataBySound(sendDataArray);
}

//送信用データの配列を受け取り、音データに変換して、送信する
function sendDataBySound(dataArray) {
    console.log(dataArray);
    let binaryDataArray = dataArray.map(getBinary);
    console.log(binaryDataArray);
}

/*
    1バイトのデータを8文字分の0/1に変換する
    getBinary(10) -> return [0,0,0,0,1,0,1,0]
    10を入れたら、10を2進数に変換した0b00001010の配列を返す
*/
function getBinary(data){
    let tmp = data;
    let retrunData = Array(8);
    for(let i=0; i<8; i++){
        tmp = tmp & 0b10000000;     //最上位ビットが1かどうかを確認
        if(tmp == 0){
            retrunData[i] = 0;      //0だった
        } else {
            retrunData[i] = 1;      //1だった
        }
        data = data << 1;           //次のビットを確認
        tmp = data;
    }
    return retrunData;      //[0,0,0,0,1,0,1,0]みたいな配列を返す
}