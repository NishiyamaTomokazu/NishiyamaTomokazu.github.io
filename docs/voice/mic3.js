// //マイクで録音する

// function startRec() {
//     //マイクのアクセス権を取得
//     navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
//     //audioのみtrue. webAudioが使えるならば、第2引数で指定した関数を実行
//     navigator.getUserMedia({
//         audio: true,
//         video: false
//     }, successFunc,errorFunc);

//     function successFunc(){
//         console.log("成功");
//         var recorder = new MediaRecorder(stream, {

//         })
//     }

//     function errorFunc() {
//         console.log("失敗");
//     }

// }

var localStream,source,scriptNode;
var startbutton = document.getElementById("start");
var endbutton = document.getElementById("end");
// getUserMediaとAudioContextを準備する
navigator.mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
    getUserMedia: function(c) {
        return new Promise(function(y, n) {
          (navigator.mozGetUserMedia ||
           navigator.webkitGetUserMedia).call(navigator, c, y, n);
        });
      }
   } : null);
var AudioContext;
var audioCtx;
function start() {
    AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    // 音声のStreamを取得する
    navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
       //startbutton.disabled = true;
       localStream = stream;
       // alert(stream.getTracks()[0].label);
       // Nodeを二つ用意
       source = audioCtx.createMediaStreamSource(stream);
       scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
       scriptNode.onaudioprocess = onAudioProcess;
       // それぞれのノードを接続
       source.connect(scriptNode);
       scriptNode.connect(audioCtx.destination);
       // 終了ボタンを押せるように
       //endbutton.disabled = false;
     }).catch(function(e) { alert("開始できません(" + e + ")。"); } );
   };
   // 音声入力をグラフ用配列に入れる
   var graphSize = 1000;
   var graphdata = new Array(graphSize).fill(0);
   var data = new Uint8Array(graphSize).fill(0);
function onAudioProcess(e) {
       var input = e.inputBuffer.getChannelData(0);
       graphdata = graphdata.slice(input.length)
       input.forEach(function(f){graphdata.push(f)});
	   //console.log(input);
       for(var i=0; i<input.length; i++){
           data[i] = 255 * input[i];
       }
       console.log(data);
       // 入力をそのまま出力する
       // var output = e.outputBuffer.getChannelData(0);
       // for (var i=0;i<input.length;i++) {
       //   output[i] = input[i];
       // }
   };
   // 後片付け
function end() {
       //endbutton.disabled = true;
       localStream.getTracks().forEach(function(track) {
          track.stop();
       });
       source.disconnect(scriptNode);
       scriptNode.disconnect(audioCtx.destination);
       //startbutton.disabled = false;
   };
   // 以下 グラフ描画用コード
function graphInit() {
     var width = 300;
     var height = 200;
     var xmin = 0;
     var xmax = graphSize;
     var ymin = -1;
     var ymax = 1;
     svg = d3.select("#graph")
             .append("svg")
             .attr("width", width)
             .attr("height", height);
     var xScale = d3.scaleLinear().domain([xmin, xmax]).range([0,width]);
     var yScale = d3.scaleLinear().domain([ymax, ymin]).range([0,height]);
     var xAxis = d3.axisBottom(xScale).tickSize(0).tickFormat("");
     svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + yScale(0) + ")")
        .call(xAxis);
     d3line = d3.line()
                .x(function(d,i){return xScale(i);})
                .y(function(d,i){return yScale(d);});
     var pathg = svg.append("g")
     pathg.append("path")
          .data([graphdata])
          .style("stroke-width", 1)
          .style("stroke", "steelblue")
          .style("fill", "none");
     setInterval(function () {
       pathg.selectAll("path")
            .data([graphdata])
            .attr("d", d3line);
     }, 100);
   };
   graphInit();