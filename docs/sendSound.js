//送信用のデータの入った配列
//送信用データの最大数の128
let sendDataArray = Array(64);
sendDataArray.fill(0);    //０で初期化

sendDataArray[0] = 170;   //テスト用のデータ
sendDataArray[1] = 2;
sendDataArray[63] = 170;
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
    //青点灯
    sendDataArray[0] = 0;
    sendDataArray[1] = 1;
    sendDataArray[2] = 2;
    sendDataArray[3] = 3;
    sendDataArray[4] = 4;
    sendDataArray[5] = 5;
    sendDataArray[6] = 6;
    sendDataArray[7] = 7;
    sendDataBySound(sendDataArray);
}

function soundGreen(){
    //緑点灯
    //sendDataArray[0] = 240;
    //sendDataArray[1] = 1;
    //sendDataArray[2] = 56;
    for(var i=0; i<70; i++){
        sendDataArray[i] = i;
    }
    console.log(sendDataArray);
    sendDataBySound(sendDataArray);
}

/*
    送信用データの受け取り、音データに変換して、送信する

    引数のarrayDataに、送信用のデータを配列で渡す
    例: arrayData = [230,2,126,0,....]
    arrayDataに入れる配列の要素数はいくらでも良い

    内部で呼び出した関数が、音声出力処理まで行っている

*/
function sendDataBySound(arrayData) {
    //送信データをビットの配列に変換
    //map関数を使って、binarryDataArrayにデータを保存する
    //console.log(arrayData);
    let binaryDataArray = arrayData.map(getBinary);
    
    //ビットの配列をサウンドデータに変換して出力
    outputSoundData(binaryDataArray);
}

/*
    1バイトのデータを8文字分の0/1に変換する
    getBinary(10) -> return [0,0,0,0,1,0,1,0]
    10を入れたら、10を2進数に変換した0b00001010の配列を返す
*/
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

/*
    引数のビットのデータを0/1に応じて、サウンドデータに変換する
    スタートビットを出力後、１バイト分のデータを出力する
    if文が冗長なのは調整用のため

    最後にできた配列をwebAudioの出力バッファに入れて、出力する
*/
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
                /* tmp = 50;
                while(i++ < tmp){
                    newArray[i] = -1;
                }
                tmp = i + 100;
                while(i++ < tmp){
                    newArray[i] = 1;
                } */

                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;

               /*  newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0; */
            }
            if(x == 0){
                /* tmp = i + 10;
                while(i++ < tmp){
                    newArray[i] = -1;
                }
                tmp = i + 10;
                while(i++ < tmp){
                    newArray[i] = 1;
                } */
                
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;

                /* newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
 */
            } else {
                /* tmp = i + 10;
                while(i++ < tmp){
                    newArray[i] = -1;
                }
                tmp = i + 30;
                while(i++ < tmp){
                    newArray[i] = 1;
                } */

                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;


/* 
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 1;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0;
                newArray[i++] = 0; */

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
