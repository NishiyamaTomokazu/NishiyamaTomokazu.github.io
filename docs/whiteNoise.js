/*
    frameCountで、出力するデータ数を指定する
*/

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();

var channels = 1;
//var frameCount = audioCtx.sampleRate * 2.0;
var sampleRate = 22100;
var frameCount = 100;

var myArrayBuffer = audioCtx.createBuffer(1, frameCount, sampleRate);

function btnClick() {
    var tmp = 0;
    //for (var channel = 0; channel < channels; channel++){
        var nowBuffering = myArrayBuffer.getChannelData(0);
        for(var i=0; i < frameCount; i++) {
            if(i<10){
                nowBuffering[i] = 1.0;
            }
            else if(i>=10 && i<20){
                nowBuffering[i] = 0.0;
            }
            else if(i>=20 && i<30){
                nowBuffering[i] = 1.0;
            }
            else if(i>=30 && i<40){
                nowBuffering[i] = 0.0;
            }
            else if(i>=40 && i<50){
                nowBuffering[i] = 1.0;
            }
            else if(i>=50 && i<60){
                nowBuffering[i] = 0.0;
            }
            else if(i>=60 && i<70){
                nowBuffering[i] = 1.0;
            }
            else if(i>=70 && i<80){
                nowBuffering[i] = 0.0;
            }
            else if(i>=80 && i<90){
                nowBuffering[i] = 0.0;
            }
            else if(i>=90 && i<100){
                nowBuffering[i] = 1.0;
            }
            //nowBuffering[i] = Math.random() * 2 - 1;
/*
            tmp = Math.random() * 2 - 1;
            if(tmp >=0){
                nowBuffering[i] = 1;
            } else {
                nowBuffering[i] = 0;
            }
*/
    //    }
    }
    console.log(nowBuffering);
    //console.log(myArrayBuffer);
    var source = audioCtx.createBufferSource();
    source.buffer = myArrayBuffer;
    source.connect(audioCtx.destination);
    source.start();
}

function coin(destination, playbackTime) {
    var t0 = playbackTime;
    var t1 = t0 + tdur(180, 16);
    var t2 = t0 + tdur(180, 4) * 3;
    var si = mtof(83);
    var mi = mtof(88);
    var audioContext = destination.context;
    var oscillator = audioContext.createOscillator();
    var gain = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(si, t0);
    oscillator.frequency.setValueAtTime(mi, t1);
    oscillator.start(t0);
    oscillator.stop(t2);
    oscillator.connect(gain);

    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.setValueAtTime(0.5, t1);
    gain.gain.linearRampToValueAtTime(0, t2);
    gain.connect(destination);
}

function mtof(midi){
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function tdur(tempo, length) {
    return(60 / tempo) * (4 / length);
}

