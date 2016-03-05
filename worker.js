var world = {
    log: function(message) {
        postMessage(['log', message]);
    },
    sendMessage: function(target, message) {
        postMessage(['message', target, message]);
    },
    attack: function() {
        postMessage(['attack']);
    },
    retreat: function() {
        postMessage(['retreat']);
    },
};

var general;

function defaultListener (event) {
    var message = event.data;
    switch (message[0]) {
        case 'eval': {
            eval(message[1]);
        } break;

        case 'setInfo': {
            world.info = message[1];
        } break;

        case 'hour': {
            if (!general || typeof general.onHourPassed !== 'function') {
                world.log('general did not define onHourPassed');
            } else {
                general.onHourPassed(message[1]);
            }
        } break;

        case 'message': {
            if (!general || typeof general.onMessage !== 'function') {
                world.log('general did not define message');
            } else {
                general.onMessage(message[1], message[2]);
            }
        } break;

        default: {
            world.log('unknown message kind: ' + message[0]);
        }
    }
}
addEventListener('message', defaultListener);
