/**
 * EduShare Anti-Debug Protection
 * Agar kimdir DevTools ochsa — debugger ga tushib qoladi
 * Hech narsa qila olmaydi, o'chirib ham bo'lmaydi
 */

(function () {
    'use strict';

    // ========== 1. CHEKSIZ DEBUGGER LOOP ==========
    // Bu eng asosiy himoya — DevTools ochilganda debugger ga tushadi
    // Va chiqib ketolmaydi, chunki har 1ms da qayta ishga tushadi

    function infiniteDebugger() {
        // Har xil usullar bilan debugger chaqirish
        // Extension yoki o'chirish bilan ham to'xtatib bo'lmaydi
        (function () {
            debugger;
        })();

        // Constructor orqali ham debugger
        try {
            (function () {
                return false;
            })
            ['constructor']('debugger')
            ['call']();
        } catch (e) { }

        // Function constructor orqali
        try {
            Function('debugger')();
        } catch (e) { }

        // eval orqali
        try {
            eval('debugger');
        } catch (e) { }

        // Nested debugger
        try {
            (function a() {
                debugger;
                try {
                    a();
                } catch (e) { }
            })();
        } catch (e) { }
    }

    // Bir necha timer bilan ishga tushirish — birini o'chirsa, boshqasi ishlaydi
    var timers = [];

    function startDebuggerLoops() {
        // Har 1ms da debugger
        timers.push(setInterval(infiniteDebugger, 1));
        timers.push(setInterval(infiniteDebugger, 10));
        timers.push(setInterval(infiniteDebugger, 50));
        timers.push(setInterval(infiniteDebugger, 100));
        timers.push(setInterval(infiniteDebugger, 200));
        timers.push(setInterval(infiniteDebugger, 500));
        timers.push(setInterval(infiniteDebugger, 1000));

        // setTimeout bilan ham
        function loop() {
            infiniteDebugger();
            setTimeout(loop, 1);
        }
        loop();

        // requestAnimationFrame bilan ham
        function rafLoop() {
            infiniteDebugger();
            requestAnimationFrame(rafLoop);
        }
        rafLoop();
    }

    startDebuggerLoops();

    // ========== 2. setInterval/setTimeout HIMOYASI ==========
    // Agar kimdir clearInterval qilmoqchi bo'lsa — yangi timerlar ochiladi

    var originalClearInterval = window.clearInterval;
    var originalClearTimeout = window.clearTimeout;

    window.clearInterval = function (id) {
        // Timer o'chirilganda yangilarini boshlash
        startDebuggerLoops();
        // Asl funksiyani chaqirmaslik
    };

    window.clearTimeout = function (id) {
        startDebuggerLoops();
    };

    // ========== 3. DEVTOOLS ANIQLASH ==========
    // DevTools ochilganini aniqlash uchun bir necha usul

    // Usul 1: window.outerWidth/outerHeight orqali
    function checkDevToolsBySize() {
        var threshold = 160;
        var widthDiff = window.outerWidth - window.innerWidth > threshold;
        var heightDiff = window.outerHeight - window.innerHeight > threshold;
        if (widthDiff || heightDiff) {
            // DevTools ochilgan — sahifani buzish
            document.title = '⛔ RUXSAT ETILMAGAN';
            infiniteDebugger();
        }
    }

    setInterval(checkDevToolsBySize, 500);

    // Usul 2: console.log bilan aniqlash
    function checkDevToolsByConsole() {
        var element = new Image();
        var devtoolsOpen = false;

        Object.defineProperty(element, 'id', {
            get: function () {
                devtoolsOpen = true;
                infiniteDebugger();
            }
        });

        console.log('%c', element);
        if (devtoolsOpen) {
            infiniteDebugger();
        }
    }

    setInterval(checkDevToolsByConsole, 1000);

    // Usul 3: Performance orqali
    function checkDevToolsByPerformance() {
        var start = performance.now();
        debugger;
        var end = performance.now();

        // Agar 100ms dan ko'p vaqt o'tsa, debugger to'xtagan — DevTools ochiq
        if (end - start > 100) {
            infiniteDebugger();
        }
    }

    setInterval(checkDevToolsByPerformance, 2000);

    // ========== 4. KLAVIATURA SHORTCUTLARNI BLOKLASH ==========
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+Shift+I (Inspect)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+Shift+C (Element picker)
        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+S (Save page)
        if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+Shift+K (Firefox Console)
        if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.keyCode === 75)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // Ctrl+Shift+M (Responsive Design Mode)
        if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm' || e.keyCode === 77)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        // F5 va Ctrl+R (Refresh — DevToolsdan qochmaslik uchun)
        // Bu ixtiyoriy — kerak bo'lsa yoqish mumkin
    }, true); // true = capturing phase — hech qanday extension bu eventni to'xtata olmaydi

    // Context menu protection removed to improve user experience
    /*
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }, true);
    */

    // ========== 6. CONSOLE METODLARINI BUZISH ==========
    // Agar kimdir consoleda biror narsa yozmoqchi bo'lsa

    var noop = function () {
        infiniteDebugger();
    };

    try {
        Object.defineProperty(window, 'console', {
            get: function () {
                infiniteDebugger();
                return {
                    log: noop,
                    warn: noop,
                    error: noop,
                    info: noop,
                    debug: noop,
                    dir: noop,
                    dirxml: noop,
                    table: noop,
                    trace: noop,
                    assert: noop,
                    clear: noop,
                    count: noop,
                    countReset: noop,
                    group: noop,
                    groupCollapsed: noop,
                    groupEnd: noop,
                    time: noop,
                    timeEnd: noop,
                    timeLog: noop,
                    timeStamp: noop,
                    profile: noop,
                    profileEnd: noop
                };
            },
            set: function () {
                infiniteDebugger();
            },
            configurable: false
        });
    } catch (e) {
        // Agar defineProperty ishlamasa, oddiy qilib o'zgartirish
        window.console = {
            log: noop, warn: noop, error: noop, info: noop,
            debug: noop, dir: noop, table: noop, trace: noop,
            assert: noop, clear: noop, count: noop,
            group: noop, groupEnd: noop, time: noop, timeEnd: noop
        };
    }

    // Selection protection removed
    /*
    document.addEventListener('selectstart', function (e) {
        // Faqat input va textarea ga ruxsat
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    }, true);
    */

    // ========== 8. DRAG & DROP BLOKLASH ==========
    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
    }, true);

    // Copy protection removed
    /*
    document.addEventListener('copy', function (e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    }, true);
    */

    // ========== 10. DEBUGGER BYPASS HIMOYASI ==========
    // Agar kimdir Function.prototype ni o'zgartirmoqchi bo'lsa

    try {
        Object.freeze(Function.prototype);
    } catch (e) { }

    // setInterval va setTimeout ni himoya qilish
    try {
        Object.defineProperty(window, 'setInterval', {
            value: window.setInterval,
            writable: false,
            configurable: false
        });
        Object.defineProperty(window, 'setTimeout', {
            value: window.setTimeout,
            writable: false,
            configurable: false
        });
    } catch (e) { }

    // ========== 11. ANTI-EXTENSION HIMOYA ==========
    // Extension orqali inject qilingan scriptlarni aniqlash

    // MutationObserver — yangi script taglar qo'shilganda tekshirish
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.tagName === 'SCRIPT') {
                    // Tashqi script qo'shilgan — Extension bo'lishi mumkin
                    if (node.src && !node.src.includes(window.location.hostname)) {
                        node.remove();
                    }
                    // Inline script — "debugger" so'zini o'chiruvchi bo'lishi mumkin
                    if (node.textContent && (
                        node.textContent.includes('clearInterval') ||
                        node.textContent.includes('clearTimeout') ||
                        node.textContent.includes('debugger')
                    )) {
                        node.remove();
                    }
                }
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Beforeunload warning removed
    /*
    window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        e.returnValue = 'Sahifani tark etmoqchimisiz?';
        return 'Sahifani tark etmoqchimisiz?';
    });
    */

    // ========== 13. YANGI OYNA / TAB BLOKLASH ==========
    // window.open ni buzish
    var originalOpen = window.open;
    window.open = function () {
        return null;
    };

    // ========== 14. XAR 3 SEKUNDDA HIMOYANI TEKSHIRISH ==========
    // Agar kimdir biror himoyani o'chirib yuborsa, qayta tiklash
    setInterval(function () {
        // Klaviatura listener borligini tekshirish
        // Debugger loop ishlayotganini tekshirish
        infiniteDebugger();

        // Context menu bloklash qayta qo'yish
        document.oncontextmenu = function () { return false; };
    }, 3000);

})();
