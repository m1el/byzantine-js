/* jshint browser:true */
/* globals World, console */

var levels = {
    nice: {},
    limitMessages: {messengersPerTick: 1},
    dropMessages: {
        messengersPerTick: 1,
        messengerSuccessRate: 0.5,
    },
    simultaneous: {
        messengersPerTick: 1,
        messengerSuccessRate: 0.5,
        simultaneous: true,
    },
    harsh: {
        messengersPerTick: 1,
        messengerSuccessRate: 0.5,
        duplicationRate: 0.2,
        simultaneous: true,
        hasCoward: true,
    }
};

var level = null;
var currentWorld = null;
function run() {
    if (currentWorld) {
        currentWorld.terminate();
    }

    var config = Object.assign({
        code: codeArea.value,
        log: console.log.bind(console),
    }, level);
    currentWorld = new World(config);
    currentWorld.onEnd = function(world) {
        console.log(world.generateSummary());
    };
    currentWorld.run();
}

var query = {
    parse: function(search) {
        search = search.replace(/^\?/, '');
        var obj = {};
        search.split('&').forEach(function (pair) {
            pair = pair.split('=');
            obj[decodeURIComponent(pair[0])] =
                pair.length > 1 ? decodeURIComponent(pair[1]) : true;
        });
        return obj;
    },

    dump: function(obj) {
        return Object.keys(obj).map(function(key) {
            if (obj[key] === true) {
                return encodeURIComponent(key);
            } else {
                return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
            }
        }).join('&');
    },
};

function throttle(fn, interval) {
    var fwd = [1, 2, 2];
    var bwd = [0, 0, 1];
    var state = 0;
    var relax = function() {
        if (state === 2) {
            fn();
            setTimeout(relax, interval);
        }
        state = bwd[state];
    };

    return function() {
        if (state === 0) {
            fn();
            setTimeout(relax, interval);
        }
        state = fwd[state];
    };
}

var levelName = query.parse(location.search).level;
if (!levels.hasOwnProperty(levelName)) {
    levelName = 'nice';
}
level = levels[level];

var runBtn, codeArea, levelSelect;
document.addEventListener('DOMContentLoaded', function () {
    runBtn = document.getElementById('run');
    codeArea = document.getElementById('code');
    if (localStorage.byzantineCode) {
        codeArea.value = localStorage.byzantineCode;
    }

    levelSelect = document.getElementById('level');
    runBtn.addEventListener('click', run);
    var levelDesc = document.getElementById('desc-' + levelName);
    levelDesc.classList.add('current');

    var autoSave = throttle(function() {
        localStorage.byzantineCode = codeArea.value;
    }, 300);
    codeArea.addEventListener('input', autoSave);
});
