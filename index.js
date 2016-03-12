/* jshint browser:true */
/* globals World, console */
var currentWorld = null;

function run() {
    if (currentWorld) {
        currentWorld.terminate();
    }
    currentWorld = new World({
        code: codeArea.value,
        log: console.log.bind(console),
    });
    currentWorld.onEnd = function(world) {
        console.log(world.generateSummary());
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
