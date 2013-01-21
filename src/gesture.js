(function () {

  var gesture = { started: false, fingers: 0, identifiers: [], position: {}, haltInput: false,
    createLock: function (eventObject) {
      if (lock == null)
        lock = eventObject;
    },
    clearLock: function () {
      lock = null;
    },
    isLocked: function (eventObject) {
      if (this.haltInput) return true;

      return (lock != eventObject && lock != null);
    }
  },
      body,
      moveEvents = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: []
      },
      endEvents = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: []
      },
      tiltEvents = [],
      shakeEvents = [],
      zBuffer = [],
      shakeEnabled = true,
      lock = null;

  window.addEventListener('load', function () {
    body = document.getElementsByTagName('body')[0];
    body.addEventListener('touchstart', touchStart, false);
    body.addEventListener('touchmove', touchMove, false);
    body.addEventListener('touchend', touchEnd, false);

    window.addEventListener('devicemotion', function (e) {

      zBuffer.unshift(e.accelerationIncludingGravity.z);
      zBuffer.splice(5, 1);

      if (zBuffer.length == 5 && shakeEnabled) {
        var jumps = 0, first = zBuffer[0];
        for (var i = 1; i < zBuffer.length; i++) {
          if (zBuffer[i] > (first + 4) || zBuffer[i] < (first - 4)) jumps += 1;

          first = zBuffer[i];
        }

        if (jumps >= 3) {
          zBuffer = [];
          shakeEnabled = false;
          for (var i = 0; i < shakeEvents.length; i++) {
            shakeEvents[i]();
          }
          setTimeout(function () {
            shakeEnabled = true;
          }, 500);
        }
      }

      for (var i = 0; i < tiltEvents.length; i++) {
        tiltEvents[i](e.accelerationIncludingGravity);
      }
    }, false);

  }, false);

  var fiveFingerGesture = function (ele, obj, contract) {

    var startDistances = {}, currentDistances = {}, actioned;

    var calculateCentre = function () {
      var lowerX = null, lowerY = null, upperX = null, upperY = null;

      for (var i = 0; i < gesture.identifiers.length; i++) {
        var finger = gesture.position[gesture.identifiers[i]];

        if (finger.currentX < lowerX || lowerX == null) lowerX = finger.currentX;
        if (finger.currentX > upperX || upperX == null) upperX = finger.currentX;

        if (finger.currentY < lowerY || lowerY == null) lowerY = finger.currentY;
        if (finger.currentY > upperY || upperY == null) upperY = finger.currentY;
      }

      return {
        x: ((upperX - lowerX) / 2) + lowerX,
        y: ((upperY - lowerY) / 2) + lowerY
      };
    };

    addEvent(ele, 5, {
      onStart: function (e) {
        actioned = false;
        var center = calculateCentre();

        for (var i = 0; i < gesture.identifiers.length; i++) {
          var finger = gesture.position[gesture.identifiers[i]],
              a = (finger.originX - center.x),
              b = (finger.originY - center.y);

          startDistances[i] = Math.sqrt((a * a) + (b * b));
        }

        if (obj.onStart) obj.onStart(gesture);
      },

      onMove: function () {
        if (actioned) return;

        var center = calculateCentre();

        var decreases = 0, increases = 0;
        for (var i = 0; i < gesture.identifiers.length; i++) {
          var finger = gesture.position[gesture.identifiers[i]],
              a = (finger.currentX - center.x),
              b = (finger.currentY - center.y);

          currentDistances[i] = Math.sqrt((a * a) + (b * b));

          if (currentDistances[i] < (startDistances[i] / 1.5)) decreases += 1;

          if (currentDistances[i] > (startDistances[i] * 1.5)) increases += 1;
        }

        if (contract && decreases >= 3) {
          actioned = true;
          obj.onHonk(gesture);
        }

        if (!contract && increases >= 3) {
          actioned = true;
          obj.onExpand(gesture);
        }

        if (obj.onMove) obj.onMove(gesture);
      },

      onEnd: function () {
        if (obj.onEnd) obj.onEnd(gesture);
      }
    });
  };

  var addHonk = function (ele, obj) {
    fiveFingerGesture(ele, obj, true);
  };

  var addExpand = function (ele, obj) {
    fiveFingerGesture(ele, obj, false);
  };

  var addPinch = function (ele, obj) {
    var scale, started;

    var getFingers = function () {
      return [
        gesture.position[gesture.identifiers[0]],
        gesture.position[gesture.identifiers[1]]
      ];
    };

    var getCurrentLength = function () {
      var fingers = getFingers(),
          a = (fingers[0].currentX - fingers[1].currentX),
          b = (fingers[0].currentY - fingers[1].currentY);

      return Math.sqrt((a * a) + (b * b));
    };

    var getOriginLength = function () {
      var fingers = getFingers(),
          a = (fingers[0].originX - fingers[1].originX),
          b = (fingers[0].originY - fingers[1].originY);

      return Math.sqrt((a * a) + (b * b));
    };

    addEvent(ele, 2, {
      onStart: function () {
        if (obj.onStart) obj.onStart(gesture, 1);
      },
      onMove: function () {
        var result = getCurrentLength();
        scale = (1 / getOriginLength()) * result;

        if (scale >= 1.4 || scale <= 0.6 || started) {
          started = true;
          if (obj.onMove) obj.onMove(gesture, scale);
        }
      },
      onEnd: function () {
        started = false;
        if (obj.onEnd) obj.onEnd(gesture, scale);
      }
    });
  };

  var addSwipe = function (ele, obj) {
    var actioned = false;

    if (typeof obj.sensitivity == "undefined") obj.sensitivity = 100;

    addEvent(ele, 1, {
      onStart: function () {
        actioned = false;
        if (typeof obj.onStart != "undefined") obj.onStart(gesture);
      },

      onMove: function () {
        if (actioned) return;

        if (typeof obj.onMove != "undefined") obj.onMove(gesture);

        if (gesture.position[gesture.identifiers[0]].diffX >= obj.sensitivity) {
          obj.onSwipe("right", gesture);
          actioned = true;
        }

        if (gesture.position[gesture.identifiers[0]].diffX <= -obj.sensitivity) {
          obj.onSwipe("left", gesture);
          actioned = true;
        }
      },

      onEnd: function () {
        if (typeof obj.onEnd != "undefined") obj.onEnd(gesture);
      }
    });

  };

  var addTwoFingeredSwipe = function (ele, obj) {
    var actioned = false;

    if (typeof obj.sensitivity == "undefined") obj.sensitivity = 100;

    addEvent(ele, 2, {
      onStart: function () {
        actioned = false;
        if (typeof obj.onStart != "undefined") obj.onStart(gesture);
      },

      onMove: function () {
        if (actioned) return;

        if (typeof obj.onMove != "undefined") obj.onMove(gesture);

        if (gesture.position[gesture.identifiers[0]].diffX >= obj.sensitivity && gesture.position[gesture.identifiers[1]].diffX >= obj.sensitivity) {
          obj.onSwipe("right", gesture);
          actioned = true;
        }

        if (gesture.position[gesture.identifiers[0]].diffX <= -obj.sensitivity && gesture.position[gesture.identifiers[1]].diffX <= -obj.sensitivity) {
          obj.onSwipe("left", gesture);
          actioned = true;
        }
      },

      onEnd: function () {
        if (typeof obj.onEnd != "undefined") obj.onEnd(gesture);
      }
    });

  };

  var determineDirection = function (e) {
    switch (window.orientation) {
      case -90:
        return { x: -e.y, y: -e.x, z: e.z };
      case 0:
        return { x: e.x, y: e.y, z: e.z };
      case 90:
        return { x: e.y, y: e.x, z: e.z };
      case 180:
        return { x: -e.x, y: -e.y, z: e.z };
    }
  };

  var addYTilt = function (tilt) {
    tiltEvents.push(function (e) {
      tilt(determineDirection(e).y);
    });
  };

  var addXTilt = function (tilt) {
    tiltEvents.push(function (e) {
      tilt(determineDirection(e).x);
    });
  };

  var addShakeEvent = function (callback) {
    shakeEvents.push(function (e) {
      callback();
    });
  };

  var addEvent = function (ele, fingers, obj) {
    obj.started = false;

    var start = function (e) {
      if (gesture.isLocked(obj)) return;
      if (e.touches.length != fingers) return;
      obj.started = true;

      if (obj.onStart) obj.onStart(gesture, e);
    };

    var move = function (g, e) {
      if (gesture.isLocked(obj)) return;
      if (obj.started && obj.onMove) obj.onMove(g, e);
    };

    var end = function (g, e) {
      if (gesture.isLocked(obj)) return;
      if (!obj.started) return;

      obj.started = false;
      if (obj.onEnd) obj.onEnd(g, e);
    };

    ele.addEventListener('touchstart', start, false);
    moveEvents[fingers].push(move);
    endEvents[fingers].push(end);

    ele.addEventListener('DOMNodeRemovedFromDocument', function () {
      ele.removeEventListener('touchstart', start);
      moveEvents[fingers].splice(moveEvents[fingers].indexOf(move), 1);
      endEvents[fingers].splice(endEvents[fingers].indexOf(end), 1);
    }, false);
  };

  var moveHandler = function (fingers, e) {
    for (var i in moveEvents[fingers]) {
      moveEvents[fingers][i](gesture, e);
    }
  };

  var endHandler = function (fingers, e) {
    for (var i in endEvents[fingers]) {
      endEvents[fingers][i](gesture, e);
    }
  };

  var currentFingers;
  var touchStart = function (e) {
    if (currentFingers != e.touches.length) endHandler(currentFingers, e);

    currentFingers = e.touches.length;

    if (e.touches.length > 5) return;

    gesture.started = true;
    gesture.fingers = e.touches.length;
    gesture.identifiers = [];

    for (var i = 0; i < e.touches.length; i++) {
      var touch = e.touches[i];

      gesture.identifiers.push(touch.identifier);
      gesture.position[touch.identifier] = {
        originX: touch.pageX,
        originY: touch.pageY,
        currentX: touch.pageX,
        currentY: touch.pageY,
        diffX: 0,
        diffY: 0
      };
    }
  };

  var touchMove = function (e) {
    e.preventDefault();

    if (gesture.started) {

      if (gesture.fingers != e.touches.length) return;

      for (var i = 0; i < e.touches.length; i++) {
        var touch = e.touches[i];

        if (typeof gesture.position[touch.identifier] == "undefined") continue;

        gesture.position[touch.identifier].currentX = touch.pageX;
        gesture.position[touch.identifier].currentY = touch.pageY;

        gesture.position[touch.identifier].diffX = gesture.position[touch.identifier].currentX - gesture.position[touch.identifier].originX;
        gesture.position[touch.identifier].diffY = gesture.position[touch.identifier].currentY - gesture.position[touch.identifier].originY;
      }

      moveHandler(gesture.fingers, e);
      return;
    }

  };

  var touchEnd = function (e) {
    for (var i = 0; i < gesture.identifiers.length; i++) {
      for (var t = 0; t < e.changedTouches.length; t++) {
        var touch = e.changedTouches[t].identifier;
        if (touch == gesture.identifiers[i]) {
          gesture.identifiers.splice(i, 1);
        }
      }
    }

    if (gesture.started && gesture.identifiers.length == 0) {
      endHandler(gesture.fingers, e);

      gesture.started = false;
      gesture.eventFired = false;
      gesture.position = {};
      gesture.fingers = 0;
    }
  };

  window.Gesture = {
    addEvent: addEvent,
    addPinch: addPinch,
    addSwipe: addSwipe,
    addTwoFingeredSwipe: addTwoFingeredSwipe,
    addHonk: addHonk,
    addExpand: addExpand,
    obj: gesture
  };

  window.Motion = {
    addYTilt: addYTilt,
    addXTilt: addXTilt,
    addShake: addShakeEvent
  };

})();