let testArray = Array(5);
testArray.fill(255);
testArray[0] = 10;
testArray[1] = 20;
testArray[2] = 30;

function testArrayFunction(){
    showArray(testArray);
}

function showArray(testArray){
    console.log(testArray);
    const tmp = testArray.map(function (x){
        return x**2;
    });
    console.log(tmp);
}

function testFunc(x){
    return x*3;
}