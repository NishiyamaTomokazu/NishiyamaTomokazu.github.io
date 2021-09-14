


/**************************************
 * webAudioの初期化
 * ここは、そのままで
**************************************/
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();
var channels = 2;
audioCtx.sampleRate = 44100;
var frameCount = audioCtx.sampleRate * 20.0
var myArrayBuffer = audioCtx.createBuffer(2,frameCount,audioCtx.sampleRate);

/*************************************
 * 
 * 送信用のデータを入れる配列
 * 
 * 1度に送信できるデータは、最大32バイトまで。
 * それ以上のデータの場合は、分割して送ること。
 * 送信前に、0で初期化する。
 * 送信データが32バイト未満のときは、必要な分だけ入力し、
 * 以降は、"0"のままで良い。（例2参照）
 * 
 * ダミーデータ(1バイト） + 識別用のデータ(2 or 3バイト)　+　転送データ(32バイト)
 * 識別用のデータ
 * sendDataArray[0] = 0     :ダミーデータ
 * sendDataArray[1] = 253;  :iPadモード
 * sendDataArray[2] = 1-4;
 *                      1:LEDデータ転送
 *                      2:LED実行
 *                      3:音データ転送
 *                      4:音実行
 * sendDataArray[3] = 1-4;
 *                      1:　最初の32バイトのデータ（1ブロック）
 *                      2:　次の32バイトのデータ（2ブロック）
 *                      3:　次の32バイトのデータ（3ブロック）
 *                      4:　次の32バイトのデータ（4ブロック）
 * 例1:
 * sendDataArray.fill(0);       :0で初期化
 * sendDataArray[0] = 0;        :ダミー
 * sendDataArray[1] = 253;      :iPadモード
 * sendDataArray[2] = 1;        :LEDデータ転送開始
 * sendDataArray[3] = 1;        :最初の32バイト転送
 * sendDataArray[4] = 230;      :最初のデータ
 *  ......
 * 
 * 例2:
 * sendDataArray.fill(0);       :0で初期化
 * sendDataArray[0] = 0;        :ダミー
 * sendDataArray[1] = 253;      :iPadモード
 * sendDataArray[2] = 3;        :音データ転送開始
 * sendDataArray[3] = 3;        :3ブロック目のデータを転送
 * sendDataArray[4] = 90;       :音符の”90”
 * sendDataArray[5] = 250;      :最終データ 以降は、入力しなくて良い
 * (sendDataArray[6] = 0;)      :最初に0で初期化しているので、以降は0になってる
 * 
 * 例3:
 * sendDataArray.fill(0);       :0で初期化
 * sendDataArray[0] = 0;        :ダミー
 * sendDataArray[1] = 253;      :iPadモード
 * sendDataArray[2] = 2;        :LED実行　　実行は、"253","2"だけ送れば良い
 * 
**************************************/
//送信用のデータの入った配列
let sendDataArray = Array(37);

/**************************************
 * データの転送方法
 * sendDataArray配列に、転送用のデータを入力後、
 * 下記のように関数を呼び出す。
 * sendDataBySound(sendDataArray);
 * 
 * 複数回呼び出す場合は、500ミリ秒ほど空けてほしい
 * sendDataBySound(sendDataArray1);
 * wait500ms();      //PICへ書き込む時間
 * sendDataBySound(sendDataArray2);
 * 
 **************************************/

//テスト用
function soundRed(){
    sendDataArray.fill(0);      //0で初期化
    sendDataArray[0] = 0;       //ダミー
    sendDataArray[1] = 0;       //ダミー
    sendDataArray[2] = 253;     //iPadモード
    sendDataArray[3] = 1;       //LEDデータ転送開始
    sendDataArray[4] = 1;       //ブロック1へデータ書き込む
    sendDataArray[5] = 230;     //以下、LEDの点灯データ
    sendDataArray[6] = 2;
    sendDataArray[7] = 126;
    sendDataArray[8] = 0;
    sendDataArray[9] = 1;
    sendDataArray[10] = 0;
    sendDataArray[11] = 7;
    sendDataArray[12] = 1;
    sendDataArray[13] = 248;
    sendDataArray[14] = 1;
    sendDataArray[15] = 0;
    sendDataArray[16] = 12;
    sendDataArray[17] = 0;
    sendDataArray[18] = 7;
    sendDataArray[19] = 225;
    sendDataArray[20] = 0;
    sendDataArray[21] = 17;
    sendDataArray[22] = 231; 
    
    sendDataBySound(sendDataArray);     //スピーカー出力
    //console.log(sendDataArray);    
}

function sendWhite(){
    sendDataArray.fill(0);
    sendDataArray[0] = 0;
    sendDataArray[1] = 253;
    sendDataArray[2] = 1;
    sendDataArray[3] = 1;
    sendDataArray[4] = 230;
    sendDataArray[5] = 2;
    sendDataArray[6] = 127;
    sendDataArray[7] = 255;
    sendDataArray[8] = 225;
    sendDataArray[9] = 0;
    sendDataArray[10] = 7;
    sendDataArray[11] = 126;
    sendDataArray[12] = 7;
    sendDataArray[13] = 225;
    sendDataArray[14] = 0;
    sendDataArray[15] = 12;
    sendDataArray[16] = 127;
    sendDataArray[17] = 248;
    sendDataArray[18] = 1;
    sendDataArray[19] = 0;
    sendDataArray[20] = 17;
    sendDataArray[21] = 231; 
    sendDataBySound(sendDataArray);
    console.log(sendDataArray);
}

function sendLoop(){
    sendDataArray.fill(0);
    sendDataArray[0] = 0;
    sendDataArray[1] = 253;
    sendDataArray[2] = 1;
    sendDataArray[3] = 1;
    sendDataArray[4] = 230;
    sendDataArray[5] = 2;
    sendDataArray[6] = 190;
    sendDataArray[7] = 3;
    sendDataArray[8] = 5;
    sendDataArray[9] = 1;
    sendDataArray[10] = 248;
    sendDataArray[11] = 0;
    sendDataArray[12] = 64;
    sendDataArray[13] = 10;
    sendDataArray[14] = 0;
    sendDataArray[15] = 7;
    sendDataArray[16] = 224;
    sendDataArray[17] = 64;
    sendDataArray[18] = 15;
    sendDataArray[19] = 127;
    sendDataArray[20] = 255;
    sendDataArray[21] = 224;
    sendDataArray[22] = 64;
    sendDataArray[23] = 20;
    sendDataArray[24] = 191;
    sendDataArray[25] = 22;
    sendDataArray[26] = 231;
    sendDataBySound(sendDataArray);
}

function soundRun() {
    sendDataArray.fill(0);
    //実行
    sendDataArray[0] = 0;
    sendDataArray[1] = 0;
    sendDataArray[2] = 253;             //iPadモード
    sendDataArray[3] = 2;               //実行
                                        //以降の配列は、0が入っているので、そのままで良い
    sendDataBySound(sendDataArray);
    //console.log(sendDataArray);
}

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
    //console.log(binaryDataArray);
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
            //ストップビット
            if((counter % 8) == 0) {
                tmp = i+20;
               while(i++ < tmp){
                   newArray[i] = 0;
               }
            }
        })
    });
    //console.log(newArray);
    var source = audioCtx.createBufferSource();     //出力用のバッファを作成
    source.buffer = myArrayBuffer;                  //出力用のバッファに変換したデータを入れる
    source.connect(audioCtx.destination);           //出力先に接続する
    source.start();                                 //再生開始
}



