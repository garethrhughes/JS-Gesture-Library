(function () {

  var utility = {};

  var addYTiltScroll = function (e) {
    var ele = $(e).get(0),
        wrapper = $(ele.parentNode);

    utility.initElement(ele);
    wrapper.css('overflow', 'hidden');

    Motion.addYTilt(function (tilt) {

      if (tilt > 1 || tilt < -1) {
        utility.moveY(ele, $(ele).offset().top - (tilt * Math.abs(tilt)) - wrapper.offset().top, 0);
      }
    });
  };

  var addXTiltScroll = function (e) {
    var ele = $(e).get(0),
        wrapper = $(ele.parentNode);

    utility.initElement(ele);
    wrapper.css('overflow', 'hidden');

    Motion.addXTilt(function (tilt) {
      if (tilt > 1 || tilt < -1) {
        utility.moveX(ele, $(ele).offset().left - (tilt * Math.abs(tilt)) - wrapper.offset().left, 0);
      }
    });
  };

  var addScroll = function (e, move, dirCheck, outer, diffDir) {
    var ele = $(e).get(0),
        start,
        wrapper = $(ele.parentNode),
        started = false,
        buffer = 50,
        scrollBuffer,
        diff,
        speedTrack = [],
        inertia,
        upperBound, lowerBound;

    utility.initElement(ele);
    wrapper.css('overflow', 'hidden');

    var getDistance = function () {
      return start + diff - scrollBuffer - wrapper.offset()[outer];
    };

    var checkBounds = function () {
      var distance = getDistance();

      lowerBound = false;
      upperBound = false;

      if (distance > 0 || $(e)[dirCheck]() <= wrapper[dirCheck]()) upperBound = true;
      else if ((wrapper[dirCheck]() - distance) > $(e)[dirCheck]() && $(e)[dirCheck]() > wrapper[dirCheck]()) lowerBound = true;

      //console.log(dirCheck + "wrapper :" + wrapper[dirCheck]() + " " + dirCheck + "ele :" + $(e)[dirCheck]() + " distance: " + distance + " lb: " + lowerBound + " ub: " + upperBound);

    };

    var checkBoundsAndConstrain = function (scrollBack) {
      checkBounds();

      if (lowerBound) {
        clearInterval(inertia);
        if (scrollBack) {
          ele.webkitTransitionTimingFunction = 'ease-in';
          move(ele, -($(e)[dirCheck]() - wrapper[dirCheck]()), -diff + 50, function () {
            ele.webkitTransitionTimingFunction = '';
          });
        } else {
          move(ele, -($(e)[dirCheck]() - wrapper[dirCheck]()), 0);
        }

        return false;
      }

      if (upperBound) {
        clearInterval(inertia);
        if (scrollBack) {
          ele.webkitTransitionTimingFunction = 'ease-in';
          move(ele, 0, Math.abs(diff) + 50, function () {
            ele.webkitTransitionTimingFunction = '';
          });
        } else {
          move(ele, 0, 0);
        }

        return false;
      }

      return true;
    };

    Gesture.addEvent(ele, 1, {
      onStart: function () {
        start = $(ele).offset()[outer];

        speedTrack = [];
        clearInterval(inertia);
      },

      onMove: function (gesture) {
        diff = gesture.position[gesture.identifiers[0]][diffDir];

        speedTrack.unshift({ diff: diff, time: new Date().valueOf() });
        speedTrack.splice(5, 1);

        if (diff <= -buffer || diff >= buffer || started) {
          gesture.createLock(this);

          if (!started) scrollBuffer = (diff < 0) ? -buffer : buffer;
          started = true;

          move(ele, getDistance(), 0);
        }
      },

      onEnd: function (gesture) {
        if (!started) return;
        started = false;
        gesture.clearLock();

        if (!checkBoundsAndConstrain(true)) return;

        var end = speedTrack[0];
        var start = speedTrack[1];

        var timeDiff = end.time - start.time;
        var distanceDiff = end.diff - start.diff;

        if (distanceDiff < 1 && distanceDiff > -1) return;

        inertia = setInterval(function () {
          diff += distanceDiff;

          if (!checkBoundsAndConstrain(false)) {
            clearInterval(inertia);
            return;
          }

          move(ele, getDistance(), 0);
          distanceDiff = (distanceDiff / 1.1);

          if (distanceDiff < 1 && distanceDiff > -1) clearInterval(inertia);

        }, timeDiff);
      }
    });
  };

  var addXScroll = function (e) {
    addScroll(e, utility.moveX, 'width', 'left', 'diffX');
  };

  var addYScroll = function (e) {
    addScroll(e, utility.moveY, 'height', 'top', 'diffY');
  };

  var addPinch = function (e, callback) {
    var ele = $(e).get(0);

    Gesture.addPinch(ele, {
      onMove: function (gesture, scale) {
        callback(scale);
      }
    });
  };

  var addSwipe = function (e, obj) {
    var ele = $(e).get(0);

    Gesture.addSwipe(ele, {
      sensitivity: 100,
      onSwipe: function (direction, gesture) {
        if (direction == "right" && typeof obj.right == "function") obj.right(gesture);
        if (direction == "left" && typeof obj.left == "function") obj.left(gesture);
      }
    });
  };

  var addTwoFingeredSwipe = function (e, obj) {
    var ele = $(e).get(0);

    Gesture.addTwoFingeredSwipe(ele, {
      sensitivity: 100,
      onSwipe: function (direction, gesture) {
        if (direction == "right" && typeof obj.right == "function") obj.right(gesture);
        if (direction == "left" && typeof obj.left == "function") obj.left(gesture);
      }
    });
  };

  var addHonk = function (e, honk) {
    var ele = $(e).get(0);

    Gesture.addHonk(ele, {
      onHonk: function () {
        honk();
      }
    });
  };

  var addExpand = function (e, expand) {
    var ele = $(e).get(0);

    Gesture.addExpand(ele, {
      onExpand: function () {
        expand();
      }
    });
  };

  utility.moveX = function (ele, x, time, callback) {
    utility.move3d(ele, time, callback, 'translate3d(' + x + 'px, 0, 0)');
  };

  utility.moveY = function (ele, y, time, callback) {
    utility.move3d(ele, time, callback, 'translate3d(0, ' + y + 'px, 0)');
  };

  var ajaxRequest = function (href, callback) {
    if (!window.XMLHttpRequest) alert("Unsupported browser in use");

    var requestObject = new XMLHttpRequest();
    requestObject.onreadystatechange = function () {
      if (requestObject.readyState == 4) callback(requestObject.responseText);
    };
    requestObject.open('GET', href, true);
    requestObject.send();
  };

  utility.initElement = function (ele) {
    ele.style.position = 'relative';
    ele.style.webkitTransform = 'translate3d(0,0,0)';
  };

  utility.move3d = function (ele, time, callback, translation) {
    ele = $(ele).get(0);
    if (typeof time == 'undefined') time = 500;

    ele.style.webkitTransitionDuration = time + 'ms';
    ele.style.webkitTransform = translation;

    if (time == 0) return;

    setTimeout(function () {
      ele.style.webkitTransitionDuration = '0ms';
      if (callback && typeof callback != 'undefined') callback();
    }, time + 50);
  };

  window.Mobile = {
    event: {
      yScroll: addYScroll,
      xScroll: addXScroll,

      pinch: addPinch,
      swipe: addSwipe,
      twoFingeredSwipe: addTwoFingeredSwipe,
      honk: addHonk,
      expand: addExpand,

      yTiltScroll: addYTiltScroll,
      xTiltScroll: addXTiltScroll
    },

    utility: utility,
    load: ajaxRequest
  };

  window.$M = window.Mobile;

})();