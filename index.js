var currentWorld = null;

function run() {
    if (currentWorld) {
        currentWorld.terminate();
    }
    currentWorld = new World({code: codeArea.value});
    currentWorld.onEnd = function() {
        console.log(currentWorld.generateSummary());
    };
    currentWorld.run();
}

var runBtn;
var codeArea;
window.addEventListener('load', function () {
    runBtn = document.getElementById('run');
    codeArea = document.getElementById('code');
    runBtn.addEventListener('click', run);
});
