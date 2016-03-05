var NUMBER_OF_GENERALS = 15;
var MAX_TICKS = 1000;

var World = function(code) {
    Object.assign(this, {
        tick: 0,
        generals: [],
        messengers: [],
        actions: {},
        terminated: false,
    });

    this.bound = {
        messageListener: this.messageListener.bind(this),
        tickFn: this.tickFn.bind(this),
    };

    for (var i = 0; i < NUMBER_OF_GENERALS; i++) {
        this.generals.push(this.makeGeneral(code, i));
    }
};

World.prototype = {
    makeGeneral: function(code, index) {
        var worker = new Worker('./worker.js');
        var canAttack = Math.random() > 0.5;
        worker.postMessage(['setInfo', {
            index: index,
            canAttack: canAttack,
           numberOfGenerals: NUMBER_OF_GENERALS,
        }]);
        worker.canAttack = canAttack;
        worker.index = index;
        worker.addEventListener('message', this.bound.messageListener);
        worker.postMessage(['eval', code]);
        return worker;
    },

    makeMessenger: function (source, target, message) {
        if (typeof target !== 'number'
            || isNaN(target) || target < 0 || target >= NUMBER_OF_GENERALS) {
            throw new Error('invalid target');
        }

        var target = Math.floor(target);
        return {
            hours: 2,
            source: source,
            target: target,
            message: message,
        };
    },

    processMessengers: function() {
        this.messengers = this.messengers.filter(function(messenger) {
            messenger.hour -= 1;
            if (messenger.hour > 0) {
                return true;
            }
            if (!this.generals[messenger.target]) {
                return false;
            }
            this.generals[messenger.target].postMessage(
               ['message', messenger.source, messenger.message]);
            return false;
        }, this);
    },

    tickFn: function () {
        if (this.tick > MAX_TICKS) {
            this.terminate();
            console.log('some generals took too long to make a decision');
            console.log(this.actions);
        }

        this.processMessengers();
        var activeGenerals = this.generals.filter(function(g) { return g; });
        if (activeGenerals.length === 0) {
            this.terminate();
            console.log('all generals made a decision');
            console.log(this.actions);
        }

        activeGenerals.forEach(function(worker) {
            worker.postMessage(['hour', this.tick]);
        }, this);
        this.tick += 1;
    },

    messageListener: function(event) {
        var message = event.data;
        var index = event.target.index;
        switch (message[0]) {
            case 'log': {
                console.log('general#' + index + ':', message[1]);
            } break;

            case 'message': {
                this.messengers.push(this.makeMessenger(index, message[1], message[2]));
            } break;

            case 'attack':
            case 'retreat': {
                if (!this.generals[index]) {
                    break;
                }
                var general = this.generals[index];
                this.actions[index] = {
                    decision: message[0],
                    tick: this.tick,
                    canAttack: general.canAttack,
                };
                general.removeEventListener(
                   'message', this.bound.messageListener);
                general.terminate();
                this.generals[index] = null;
            } break;
        }
    },

    run: function() {
        this.timerId = setInterval(this.bound.tickFn, 1000);
    },

    terminate: function () {
        if (this.terminated) {
            return;
        }
        this.generals.forEach(function(g) {
            g && g.terminate();
        }, this);
        clearInterval(this.timerId);
        this.terminated = true;
    },
};

var currentWorld = null;

function run() {
    if (currentWorld) {
        currentWorld.terminate();
    }
    currentWorld = new World(codeArea.value);
    currentWorld.run();
}

var runBtn;
var codeArea;
window.addEventListener('load', function () {
    runBtn = document.getElementById('run');
    codeArea = document.getElementById('code');
    runBtn.addEventListener('click', run);
});
