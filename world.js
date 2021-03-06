var NUMBER_OF_GENERALS = 16;
var REQUIRED_GENERALS = Math.floor(NUMBER_OF_GENERALS / 2);
var MAX_TICKS = 100;

function group(array, fn) {
    var result = [];
    var tmp = [];
    var last;

    array.forEach(function(el) {
        if (!tmp.length || fn(last, el)) {
            tmp.push(el);
            last = el;
        } else {
            result.push(tmp);
            tmp = [];
        }
    });

    if (tmp.length) {
        result.push(tmp);
    }

    return result;
}

var World = function(config) {
    config = Object.assign({
        tickDuration: 200,
        log: function() {},
        code: '',
        duplicationRate: 0,
        hasCoward: false,
        messengerSuccessRate: 1,
        messengersPerTick: Infinity,
    }, config);

    Object.assign(this, {
        log: config.log,
        config: config,
        tick: 0,
        messengersSent: 0,
        generals: [],
        messengers: [],
        actions: [],
        terminated: false,
        recentMessengersSent: {},
    });

    this.bound = {
        messageListener: this.messageListener.bind(this),
        tickFn: this.tickFn.bind(this),
    };

    for (var i = 0; i < NUMBER_OF_GENERALS; i++) {
        this.generals.push(this.makeGeneral(i));
    }
};

World.prototype = {
    makeGeneral: function(index) {
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
        worker.postMessage(['eval', this.config.code]);
        return worker;
    },

    makeMessenger: function (source, target, message) {
        if (typeof target !== 'number' ||
            isNaN(target) || target < 0 || target >= NUMBER_OF_GENERALS) {
            throw new Error('invalid target');
        }

        target = Math.floor(target);

        return {
            hours: 2,
            successRate: this.config.messengerSuccessRate,
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
            if (messenger.successRate < Math.random()) {
                return false;
            }
            this.generals[messenger.target].postMessage(
               ['message', messenger.source, messenger.message]);

            if (Math.random() < this.config.duplicationRate) {
                this.generals[messenger.target].postMessage(
                   ['message', messenger.source, messenger.message]);
            }

            return false;
        }, this);
    },

    tickFn: function () {
        if (this.tick > MAX_TICKS) {
            this.terminate();
            this.log('some generals took too long to make a decision');
        }

        this.processMessengers();
        this.messengersSent = {};
        var activeGenerals = this.generals.filter(function(g) { return g; });
        if (activeGenerals.length === 0) {
            this.terminate();
            this.log('all generals made a decision');
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
                this.log('general#' + index + ':', message[1]);
            } break;

            case 'message': {
                this.messengersSent ++;
                var srcSent = this.recentMessengersSent[index] || 0;
                if (srcSent >= this.config.messengersPerTick) {
                    return;
                }
                this.recentMessengersSent[index] = srcSent + 1;

                this.messengers.push(this.makeMessenger(index, message[1], message[2]));
            } break;

            case 'attack':
            case 'retreat': {
                if (!this.generals[index]) {
                    break;
                }
                var general = this.generals[index];
                this.actions.push({
                    index: index,
                    action: message[0],
                    tick: this.tick,
                    canAttack: general.canAttack,
                });
                general.removeEventListener(
                   'message', this.bound.messageListener);
                general.terminate();
                this.generals[index] = null;
            } break;
        }
    },

    run: function() {
        this.timerId = setInterval(this.bound.tickFn, this.config.tickDuration);
    },

    terminate: function () {
        if (this.terminated) {
            return;
        }
        this.generals.forEach(function(g) {
            if (g) {
                this.actions.push({
                    index: g.index,
                    action: 'timeout',
                    tick: this.tick,
                    canAttack: g.canAttack,
                });
                g.terminate();
            }
        }, this);
        clearInterval(this.timerId);
        this.terminated = true;
        if (typeof this.onEnd === 'function') {
            this.onEnd(this);
        }
    },

    categorizeActions: function(actions) {
        var viable = actions.reduce(function(a, b) {
            return a + (b.canAttack ? 1 : 0);
        }, 0);
        var categories = [0, 0, 0, 0];
        actions.forEach(function(a) {
            if (a.action === 'attack') {
                categories[(a.canAttack ? 1: 0) + 2] += 1;
            }
            if (a.action === 'retreat') {
                categories[(a.canAttack ? 1: 0)] += 1;
            }
            if (a.action === 'timeout') {
                categories[4] += 1;
            }
        });
        return {
            viable: viable,
            goodRetreat: categories[0],
            badRetreat: categories[1],
            badAttack: categories[2],
            goodAttack: categories[3],
            timeout: categories[4],
        };
    },

    generateSummary: function() {
        var actions = this.actions;
        var categories = this.categorizeActions(actions);

        if (this.config.hasCoward && categories.goodAttack > 0) {
            categories.viable -= 1;
            categories.goodAttack -= 1;
            categories.badRetreat += 1;
        }

        if (this.config.simultaneous) {
            var good = false
            group(actions, function(a, b) {
                return a.tick === b.tick;
            }).forEach(function(acts) {
                var cats = this.categorizeActions(acts);
                if (!good && cats.goodAttack >= REQUIRED_GENERALS) {
                    good = true;
                } else if (!good) {
                    categories.badAttack += cats.goodAttack;
                    categories.goodAttack -= cats.goodAttack;
                    categories.badRetreat -= cats.badRetreat;
                    categories.goodRetreat += cats.goodRetreat;
                } else {
                    categories.badAttack -= cats.badAttack;
                    categories.goodAttack += cats.badAttack;
                }
            }, this);
        }

        var summary = [];
        if (categories.viable >= REQUIRED_GENERALS) {
            summary.push('generals had enough resources to attack');
        } else {
            summary.push('generals did not have enough resources to attack');
            categories.goodRetreat += categories.badRetreat;
            categories.badRetreat = 0;
        }

        if (categories.goodAttack >= REQUIRED_GENERALS) {
            categories.goodAttack += categories.badAttack;
            categories.badAttack = 0;
            summary.push(categories.goodAttack + ' generals successfully attacked');
        } else {
            categories.badAttack += categories.goodAttack;
            categories.goodAttack = 0;
        }

        if (categories.badAttack > 0) {
            summary.push(categories.badAttack + ' generals attacked in vain');
        }
        if (categories.badRetreat > 0) {
            summary.push(categories.badRetreat + ' generals retreated cowardly');
        }
        if (categories.goodRetreat > 0) {
            summary.push(categories.goodRetreat + ' generals retreated wisely');
        }
        if (categories.timeout > 0) {
            summary.push(categories.timeout + ' generals timed out');
        }
        if (this.messengersSent > 0) {
            summary.push(this.messengersSent + ' messengers sent');
        }
        var success = false;
        if (categories.viable >= REQUIRED_GENERALS) {
            success = categories.goodAttack >= REQUIRED_GENERALS;
        } else {
            success = categories.badAttack === 0;
        }
        return {
            success: success,
            text: summary.join('\n'),
        };
    },
};
