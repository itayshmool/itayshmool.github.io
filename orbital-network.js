// orbital-network.js — Orbital Network full-page background effect
// Dots drift in elliptical orbits; mouse proximity activates constellation lines.
// Pure vanilla canvas, zero dependencies. Progressive enhancement.

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var IS_MOBILE = window.innerWidth < 768;
  var DOT_COUNT = IS_MOBILE ? 25 : 50;
  var CONNECTION_DIST = 265;
  var PROXIMITY_RADIUS = IS_MOBILE ? 0 : 391;
  var ORBIT_SPEED = 0.5;
  var ORBIT_SCALE = 50;
  var LINE_OPACITY = 0.15;

  function getTheme() {
    var isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    return {
      isLight: isLight,
      dotColor: isLight ? '#c0c0c0' : '#3a3a3a',
      activeColor: isLight ? '#0066FF' : '#4d94ff',
      canvasOpacity: isLight ? 0.55 : 0.65
    };
  }

  function lerpColor(a, b, t) {
    var ah = parseInt(a.replace('#', ''), 16);
    var ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    var bh = parseInt(b.replace('#', ''), 16);
    var br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    var rr = Math.round(ar + t * (br - ar));
    var rg = Math.round(ag + t * (bg - ag));
    var rb = Math.round(ab + t * (bb - ab));
    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1);
  }

  // Create fixed canvas covering entire viewport
  var canvas = document.createElement('canvas');
  canvas.id = 'orbital-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext('2d');

  var width = 0, height = 0;
  var mouse = { x: -9999, y: -9999 };
  var dots = [];
  var ripples = [];
  var animId = null;
  var paused = false;

  function Dot() {
    this.anchorX = Math.random() * width;
    this.anchorY = Math.random() * height;
    this.a = (0.5 + Math.random() * 0.5) * ORBIT_SCALE;
    this.b = (0.3 + Math.random() * 0.4) * ORBIT_SCALE;
    this.angle = Math.random() * Math.PI * 2;
    this.rotation = Math.random() * Math.PI * 2;
    this.angularVelocity = 0.01 + Math.random() * 0.02;
    this.activeState = 0;
    this.x = 0;
    this.y = 0;
    this.size = 1 + Math.random();
  }

  function initDots() {
    dots = [];
    for (var i = 0; i < DOT_COUNT; i++) {
      dots.push(new Dot());
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (dots.length === 0) initDots();
  }

  function draw() {
    if (paused) { animId = null; return; }

    var theme = getTheme();
    canvas.style.opacity = String(theme.canvasOpacity);

    ctx.clearRect(0, 0, width, height);

    // Update ripples
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r];
      rp.radius += rp.speed;
      rp.strength -= 0.015;
      if (rp.radius > rp.maxRadius || rp.strength <= 0) {
        ripples.splice(r, 1);
      }
    }

    // Update dots
    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      dot.angle += dot.angularVelocity * ORBIT_SPEED;

      // Rotated ellipse orbit
      var cosA = Math.cos(dot.angle);
      var sinA = Math.sin(dot.angle);
      var cosR = Math.cos(dot.rotation);
      var sinR = Math.sin(dot.rotation);

      dot.x = dot.anchorX + (dot.a * cosA * cosR - dot.b * sinA * sinR);
      dot.y = dot.anchorY + (dot.a * cosA * sinR + dot.b * sinA * cosR);

      // Mouse proximity activation
      var dx = dot.x - mouse.x;
      var dy = dot.y - mouse.y;
      var distSq = dx * dx + dy * dy;
      var targetActive = distSq < PROXIMITY_RADIUS * PROXIMITY_RADIUS ? 1 : 0;

      // Ripple activation
      for (var ri = 0; ri < ripples.length; ri++) {
        var rip = ripples[ri];
        var rdx = dot.x - rip.x;
        var rdy = dot.y - rip.y;
        var rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rdist < rip.radius && rdist > rip.radius - 50) {
          targetActive = Math.max(targetActive, rip.strength);
        }
      }

      // Smooth easing
      if (dot.activeState < targetActive) {
        dot.activeState += 0.05;
      } else {
        dot.activeState -= 0.02;
      }
      dot.activeState = Math.max(0, Math.min(1, dot.activeState));
    }

    // Draw constellation lines between active dots
    ctx.lineWidth = 0.5;
    for (var a = 0; a < dots.length; a++) {
      var da = dots[a];
      if (da.activeState <= 0.1) continue;

      for (var b = a + 1; b < dots.length; b++) {
        var db = dots[b];
        if (db.activeState <= 0.1) continue;

        var ldx = da.x - db.x;
        var ldy = da.y - db.y;
        var ldistSq = ldx * ldx + ldy * ldy;

        if (ldistSq < CONNECTION_DIST * CONNECTION_DIST) {
          var ldist = Math.sqrt(ldistSq);
          var opacity = (1 - ldist / CONNECTION_DIST) * LINE_OPACITY * Math.min(da.activeState, db.activeState);
          var hex = Math.floor(opacity * 255).toString(16);
          if (hex.length < 2) hex = '0' + hex;
          ctx.strokeStyle = theme.activeColor + hex;
          ctx.beginPath();
          ctx.moveTo(da.x, da.y);
          ctx.lineTo(db.x, db.y);
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (var d = 0; d < dots.length; d++) {
      var dot2 = dots[d];
      ctx.beginPath();
      ctx.arc(dot2.x, dot2.y, dot2.size, 0, Math.PI * 2);
      if (dot2.activeState > 0) {
        ctx.fillStyle = lerpColor(theme.dotColor, theme.activeColor, dot2.activeState);
      } else {
        ctx.fillStyle = theme.dotColor;
      }
      ctx.fill();
    }

    animId = requestAnimationFrame(draw);
  }

  // Mouse tracking on entire document
  document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  document.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Click ripple anywhere on page (desktop only)
  document.addEventListener('click', function (e) {
    if (IS_MOBILE) return;
    // Skip ripple if clicking an interactive element
    var tag = e.target.tagName;
    if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT') return;
    if (e.target.closest('a, button')) return;
    ripples.push({
      x: e.clientX,
      y: e.clientY,
      radius: 0,
      maxRadius: 400,
      strength: 1,
      speed: 8
    });
  });

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      paused = true;
    } else {
      paused = false;
      if (!animId) animId = requestAnimationFrame(draw);
    }
  });

  // Resize
  window.addEventListener('resize', function () { resize(); });

  // Init
  resize();
  animId = requestAnimationFrame(draw);
})();
