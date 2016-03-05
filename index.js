var NUMBER_OF_GENERALS = 15;
var MAX_TICKS = 1000;

function startGeneral(code, index) {
    return worker;
}

function sendMessenger(source, message) {
    if (!message || typeof message.target !== 'number'
        || isNaN(message.target)
        || message.target < 0 || message.target >= NUMBER_OF_GENERALS) {
        throw new Error('invalid target');
    }

    var target = Math.floor(message.target);
    return {
        hours: 2,
        source: source,
        target: target,
        message: message,
    };
}

function processMessengers(state) {
    state.messengers = state.messengers.filter(function(messenger) {
        messenger.hour -= 1;
        if (messenger.hour > 0) {
            return true;
        }
        if (!state.generals[messenger.target]) {
            return false;
        }
        state.generals[messenger.target].postMessage(
           ['message', messenger.source, messenger.message]);
        return false;
    });
}

function run() {
    var code = codeArea.value;
    var state = {
        tick: 0,
        generals: [],
        messengers: [],
        actions: {},
    };

    state.messageListener = function(event) {
        var message = event.data;
        var index = event.target.index;
        switch (message[0]) {
            case 'log': {
                console.log('general#' + index + ':', message[1]);
            } break;

            case 'message': {
                state.messengers.push(makeMessenger(index, message));
            } break;

            case 'attack':
            case 'retreat': {
                state.actions[index] = message[0];
                state.generals[index].removeEventListener(
                   'message', state.messageListener);
                state.generals[index].terminate();
                state.generals[index] = null;
            } break;
        }
    };

    state.terminate = function () {
        state.generals.forEach(function(g) {
            g && g.terminate();
        });
        clearInterval(state.timerId);
    };

    state.tickFn = function () {
        if (state.tick > MAX_TICKS) {
            state.terminate();
            console.log('some generals took too long to make a decision');
            console.log(state.actions);
        }

        processMessengers(state);
        var activeGenerals = state.generals.filter(function(g) { return g; });
        if (activeGenerals.length === 0) {
            state.terminate();
            console.log('all generals made a decision');
            console.log(state.actions);
        }

        activeGenerals.forEach(function(worker) {
            worker.postMessage(['hour', state.tick]);
        });
        state.tick += 1;
    };

    for (var i = 0; i < NUMBER_OF_GENERALS; i++) {
        var worker = new Worker('./worker.js');
        var canAttack = Math.random() > 0.5;
        worker.postMessage(['setInfo', {index: i, canAttack: canAttack}]);
        worker.index = i;
        worker.addEventListener('message', state.messageListener);
        worker.postMessage(['eval', code]);
        state.generals.push(worker);
    }

    state.timerId = setInterval(state.tickFn, 1000);
}

var runBtn;
var codeArea;
window.addEventListener('load', function () {
    runBtn = document.getElementById('run');
    codeArea = document.getElementById('code');
    runBtn.addEventListener('click', run);
});
