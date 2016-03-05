var NUMBER_OF_GENERALS = 15;

function startGeneral(code, index) {
    return worker;
}

function run() {
    var code = codeArea.value;
    var state = {generals: []};

    var listener = function(event) {
        var message = event.data;
        var index = event.target.index;
        switch (message.kind) {
            case 'log': {
                console.log('general#' + index + ':', message.message);
            } break;
        }
    };

    for (var i = 0; i < NUMBER_OF_GENERALS; i++) {
        var worker = new Worker('./worker.js');
        worker.postMessage({kind: 'setIndex', index: i});
        worker.index = i;
        worker.addEventListener('message', listener);
        worker.postMessage({kind: 'eval', code: code});
        state.generals.push(worker);
    }
}

var runBtn;
var codeArea;
window.addEventListener('load', function () {
    runBtn = document.getElementById('run');
    codeArea = document.getElementById('code');
    runBtn.addEventListener('click', run);
});
