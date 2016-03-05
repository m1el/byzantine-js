var world = {
    log: function(message) {
        postMessage({
            kind: 'log',
            message: message,
        });
    },
    sendMessage: function(target, message) {
        postMessage({
            kind: 'message',
            target: target,
            message: message,
        });
    },
    attack: function() {
        postMessage({kind: 'attack'});
    },
    retreat: function() {
        postMessage({kind: 'retreat'});
    },
};

addEventListener('message', function(event) {
    var message = event.data;
    switch (message.kind) {
        case 'eval': {
            eval(message.code);
        } break;

        case 'setIndex': {
            world.myIndex = message.index;
        } break;

        case 'hour': {
            if (typeof general === 'undefined' || typeof general.onHourPassed !== 'function') {
                world.log('general did not define onHourPassed');
            } else {
                general.onHourPassed();
            }
        } break;

        case 'message': {
            if (typeof general === 'undefined' || typeof general.onMessage !== 'function') {
                world.log('general did not define message');
            } else {
                general.onMessage(message);
            }
        } break;

        default: {
            world.log('unknown message kind: ' + message.kind);
        }
    }
});
