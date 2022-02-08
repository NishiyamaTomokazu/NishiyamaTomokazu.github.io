var manager;
//var counter = 0;
function startRec(){
    manager = new AudioManager({
        fps : 60,
        useMicrophone : true,
        fftSize : 512,
        onMicInitFaild : function() {
            alert('マイクは使えません');},
        onEnterFrame : function() {
            //console.log(Utils.sum(this.analyser.mic.getByteFrequencyData()))
            //console.log(Utils.sum(this.analysers.mic.getByteFrequencyData()));
            //console.log(this.analysers.mic.getByteFrequencyData());
            console.log(Utils.sum(this.analysers.mic.getByteTimeDomainData()));
            //console.log(this.analysers.mic.getByteTimeDomainData());
            var data = this.analysers.mic.getByteTimeDomainData();
            console.log(data);
            
            
        }
    });
    manager.init();
}

function stopRec() {
    manager.stopLoop();
}
