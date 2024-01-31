/****************
 * テキストを保存する
 ****************/

function saveTextAsFile(){
    var textToSave = document.getElementById("inputText").value;
    var textToSaveAsBlob = new Blob([textToSave],{type:"text/plain"});
    var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
    var fileNameToSaveAs = "test.txt";

    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML ="Download File";
    downloadLink.href = textToSaveAsURL;
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);

    downloadLink.click();
}

function destroyClickedElement(event){
    document.body.removeChild(event.target);
}

function download() {
    // テキストエリア内の文字列を取得する
    const text = document.getElementById('textarea').value;

    // 取得した文字列をBlob形式に変換
    let blobedText = new Blob([text], {type: 'text/plain' });

    // BlobをURLに変換
    let url = URL.createObjectURL(blobedText);

    // ダウンロード可能なa要素を作成する
    let link = document.createElement('a');
    link.href = url;
    link.download = 'test1.txt';
    // 要素の追加
    document.body.appendChild(link);

    // linkをclickすることでダウンロードが完了
    link.click();

    // 「link」は不要な要素になるので、link要素を削除
    link.parentNode.removeChild(link)
}