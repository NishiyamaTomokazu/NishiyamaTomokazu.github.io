
//送信用のデータの入った配列
//送信用データの最大数の128
let sendDataArray = Array(35);
sendDataArray.fill(0);    //０で初期化

sendDataArray[0] = 170;   //テスト用のデータ
sendDataArray[1] = 2;
//sendDataArray[63] = 170;
//sendDataArray[2] = 255;      //テスト用


//webAudioの初期化
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();
var channels = 2;
//audioCtx.sampleRate = 22050;
audioCtx.sampleRate = 44100;
var frameCount = audioCtx.sampleRate * 20.0

var myArrayBuffer = audioCtx.createBuffer(2,frameCount,audioCtx.sampleRate);

//テスト用の関数
//送信する配列を準備して、sendDataBySound関数に入れる
function testArrayFunction(){
    sendDataArray[0] = 170;
    sendDataArray[1] = 85;
    sendDataBySound(sendDataArray);
}

//テスト用
function soundBlue(){
    //転送
    sendDataArray[0] = 253;
    sendDataArray[1] = 1;
    sendDataArray[2] = 1;
  /*   sendDataArray[3] = 230;
    sendDataArray[4] = 2;
    sendDataArray[5] = 126;
    sendDataArray[6] = 0;
    sendDataArray[7] = 1;
    sendDataArray[8] = 0;
    sendDataArray[9] = 7;
    sendDataArray[10] = 1;
    sendDataArray[11] = 248;
    sendDataArray[12] = 1;
    sendDataArray[13] = 0;
    sendDataArray[14] = 12;
    sendDataArray[15] = 0;
    sendDataArray[16] = 7;
    sendDataArray[17] = 225;
    sendDataArray[18] = 0;
    sendDataArray[19] = 17;
    sendDataArray[20] = 231; */
    for(var i=3;i<35;i++){
        sendDataArray[i] = i-3;
    }
    sendDataBySound(sendDataArray);
    console.log(sendDataArray);
/*     for(var i=0; i<32; i++){
        sendDataArray[i] = i;
    }
    sendDataBySound(sendDataArray);
    console.log(sendDataArray); */
}

function sendWhite(){
    sendDataArray[0] = 253;
    sendDataArray[1] = 1;
    sendDataArray[2] = 2;
    for(var i=3;i<35;i++){
        sendDataArray[i] = i+3;
    }
/*     sendDataArray[3] = 230;
    sendDataArray[4] = 2;
    sendDataArray[5] = 1;
    sendDataArray[6] = 255;
    sendDataArray[7] = 224;
    sendDataArray[8] = 64;
    sendDataArray[9] = 7;
    sendDataArray[10] = 126;
    sendDataArray[11] = 7;
    sendDataArray[12] = 224;
    sendDataArray[13] = 64;
    sendDataArray[14] = 12;
    sendDataArray[15] = 127;
    sendDataArray[16] = 255;
    sendDataArray[17] = 224;
    sendDataArray[18] = 64;
    sendDataArray[19] = 17;
    sendDataArray[20] = 231; */
    sendDataBySound(sendDataArray);
    console.log(sendDataArray);
}

function soundGreen() {
    sendDataArray.fill(0);
    //実行
    sendDataArray[0] = 253;
    sendDataArray[1] = 2;
    sendDataBySound(sendDataArray);
    console.log(sendDataArray);
    /* for(var i=0; i<32; i++){
        sendDataArray[i+32] = i+5;
    }
    sendDataBySound(sendDataArray);
    console.log(sendDataArray); */
}

/* function soundGreen() {
    //32個のデータ送信後、500ms空けて、再度32個のデータを送信する
    for(var i=0; i<32; i++){
        sendDataArray[i] = i;
    }
    console.log(sendDataArray);
    sendDataBySound(sendDataArray);

    const ms = 500;
    setTimeout(() => {
    for(var i=0; i<32; i++){
            sendDataArray[i] = i+32;
    
        }
        console.log(sendDataArray);
        sendDataBySound(sendDataArray);
    }, ms);
} */


/*
function soundGreen(){
    for(var i=0; i<70; i++){
        sendDataArray[i] = i;
    }

     console.log(sendDataArray);
    sendDataBySound(sendDataArray);
    //await _sleep(2);
    //let id = setTimeout(soundGreen, 10);
    
    for(var i=32; i<64; i++){
        sendDataArray[i] = i;
    } 
    //console.log(sendDataArray);
    //sendDataBySound(sendDataArray);
    //clearTimeout(id);
}*/

/*******************************************
    送信用データの受け取り、音データに変換して、送信する

    引数のarrayDataに、送信用のデータを配列で渡す
    例: arrayData = [230,2,126,0,....]
    arrayDataに入れる配列の要素数はいくらでも良い

    内部で呼び出した関数が、音声出力処理まで行っている

*******************************************/
function sendDataBySound(arrayData) {
    //送信データをビットの配列に変換
    //map関数を使って、binarryDataArrayにデータを保存する
    //console.log(arrayData);
    let binaryDataArray = arrayData.map(getBinary);
    
    //ビットの配列をサウンドデータに変換して出力
    outputSoundData(binaryDataArray);
}

/*******************************************
    1バイトのデータを8文字分の0/1に変換する
    getBinary(10) -> return [0,0,0,0,1,0,1,0]
    10を入れたら、10を2進数に変換した0b00001010の配列を返す
*******************************************/
function getBinary(arrayData){
    var tmp = arrayData;
    let returnData = Array(8);
    //var returnData;

    for(let i=0; i<8; i++){
        tmp = tmp & 0b10000000;     //最上位ビットが1かどうかを確認
        if(tmp == 0){
            returnData[i] = 0;      //0だった
        } else {
            returnData[i] = 1;      //1だった
        }
        arrayData = arrayData << 1;           //次のビットを確認
        tmp = arrayData;
    }
    return returnData;      //バイトデータをビットの配列に変換したデータを返す
}

/*******************************************
    引数のビットのデータを0/1に応じて、サウンドデータに変換する
    スタートビットを出力後、１バイト分のデータを出力する
    if文が冗長なのは調整用のため

    最後にできた配列をwebAudioの出力バッファに入れて、出力する
*******************************************/
function outputSoundData(binaryDataArray) {
    console.log(binaryDataArray);
    //let newArray = new Array();
    var newArray = myArrayBuffer.getChannelData(0);     //変換データを保存する配列
    let counter = 0;    //8ビット数えるためのカウンタ
    let i = 0;  //出力用の配列の現在値
    var tmp = 0;
    //console.log(newArray);
    binaryDataArray.forEach(element => {
        element.map(x => {
            //スタートビット
            if((counter % 8) == 0) {
                tmp = 20;
                while(i++ < tmp){
                    newArray[i] = 0;
                }
                tmp = i + 30;
                while(i++ < tmp){
                    newArray[i] = 1;
                }
            }
            if(x == 0){
                tmp = i + 5;
                while(i++ < tmp){
                    newArray[i] = 0;
                }
                tmp = i + 5;
                while(i++ < tmp){
                    newArray[i] = 1;
                 }
            } else {
                tmp = i + 5;
                while(i++ < tmp){
                    newArray[i] = 0;
                }
                tmp = i + 15;
                while(i++ < tmp){
                    newArray[i] = 1;
                }
            }
            counter++;
        })
    });
    
    console.log(newArray);
    var source = audioCtx.createBufferSource();     //出力用のバッファを作成
    source.buffer = myArrayBuffer;      //出力用のバッファに変換したデータを入れる
    source.connect(audioCtx.destination);       //出力先に接続する
    source.start();     //再生開始
    
}



