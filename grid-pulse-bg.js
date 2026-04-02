/**
 * Grid Pulse Background Effect
 * Adapted from Clay output for production use.
 * Usage: new GridPulseBg(canvasElement)
 */
(function () {
  'use strict';

  // Respect prefers-reduced-motion — skip entirely
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function GridPulseBg(canvas) {
    var ctx = canvas.getContext('2d');
    var width, height, dpr;
    var dots = [];
    var pulses = [];
    var lastAutoPulse = 0;
    var isMobile = window.innerWidth < 768;
    var lastTime = 0;
    var paused = false;

    // ── Theme detection ──
    function isDark() {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // ── Pulse class ──
    function Pulse(x, y, maxR, isClick) {
      this.x = x;
      this.y = y;
      this.radius = 0;
      this.maxRadius = maxR;
      this.isClick = isClick;
      this.active = true;
    }
    Pulse.prototype.update = function (speed) {
      this.radius += speed;
      if (this.radius > this.maxRadius) this.active = false;
    };

    // ── Dot class ──
    function Dot(x, y) {
      this.x = x;
      this.y = y;
      this.highlight = 0;
    }
    Dot.prototype.update = function (dt) {
      this.highlight = Math.max(0, this.highlight - dt / 0.4);
    };

    // ── Grid init ──
    function initGrid() {
      dots = [];
      var spacing = isMobile ? 64 : 48;
      var cols = Math.ceil(width / spacing) + 1;
      var rows = Math.ceil(height / spacing) + 1;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          dots.push(new Dot(i * spacing, j * spacing));
        }
      }
    }

    // ── Resize ──
    function resize() {
      dpr = window.devicePixelRatio || 1;
      var parent = canvas.parentElement;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      isMobile = window.innerWidth < 768;
      initGrid();
    }

    // ── Add pulse ──
    function addPulse(x, y, isClick) {
      var maxR = isClick ? 600 : 400;
      if (pulses.length >= 2) pulses.shift();
      pulses.push(new Pulse(x, y, maxR, isClick));
    }

    // ── Auto pulse ──
    function triggerAutoPulse() {
      if (dots.length === 0) return;
      var d = dots[Math.floor(Math.random() * dots.length)];
      addPulse(d.x, d.y, false);
    }

    // ── Mouse events (listen on wrapper so canvas can be pointer-events:none) ──
    var wrapper = canvas.parentElement;
    wrapper.addEventListener('mousemove', function (e) {
      if (isMobile) return;
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (width / rect.width);
      var y = (e.clientY - rect.top) * (height / rect.height);
      var tooClose = pulses.some(function (p) {
        return !p.isClick && Math.hypot(p.x - x, p.y - y) < 50;
      });
      if (pulses.length === 0 || !tooClose) addPulse(x, y, false);
    });

    wrapper.addEventListener('mousedown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (width / rect.width);
      var y = (e.clientY - rect.top) * (height / rect.height);
      addPulse(x, y, true);
    });

    // ── IntersectionObserver — pause when off-screen ──
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (entries) {
        paused = !entries[0].isIntersecting;
      }, { threshold: 0 }).observe(canvas);
    }

    // ── Draw loop ──
    function draw(timestamp) {
      requestAnimationFrame(draw);
      if (paused) return;

      var dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      if (dt > 0.1) dt = 0.016; // clamp after tab-switch

      ctx.clearRect(0, 0, width, height);

      var dark = isDark();
      var dotColor = dark ? '#e89070' : '#d97757';
      var baseOpacity = dark ? 0.08 : 0.06;
      var activeOpacity = dark ? 0.3 : 0.25;
      var interval = 8000;
      var speed = 3;

      // Auto pulse
      if (timestamp - lastAutoPulse > interval) {
        triggerAutoPulse();
        lastAutoPulse = timestamp;
      }

      // Update pulses
      for (var pi = pulses.length - 1; pi >= 0; pi--) {
        pulses[pi].update(speed);
        if (!pulses[pi].active) pulses.splice(pi, 1);
      }

      // Update dots
      for (var di = 0; di < dots.length; di++) {
        var dot = dots[di];
        dot.update(dt);
        for (var pk = 0; pk < pulses.length; pk++) {
          var p = pulses[pk];
          var dist = Math.hypot(dot.x - p.x, dot.y - p.y);
          if (Math.abs(dist - p.radius) < 30) {
            var str = p.isClick ? 1.5 : 1.0;
            if (str > dot.highlight) dot.highlight = str;
          }
        }
      }

      // Render dots
      ctx.fillStyle = dotColor;
      for (var ri = 0; ri < dots.length; ri++) {
        var d = dots[ri];
        var h = d.highlight;
        var size, opacity;
        if (h > 1) {
          var t = Math.min(1, h - 1);
          size = 3 + t * 2;
          opacity = activeOpacity + t * 0.15;
        } else {
          size = 1.5 + h * 1.5;
          opacity = baseOpacity + h * (activeOpacity - baseOpacity);
        }
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(d.x, d.y, size, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Init ──
    resize();
    var ro = new ResizeObserver(function () { resize(); });
    ro.observe(canvas.parentElement);
    requestAnimationFrame(draw);
  }

  // Auto-init: look for canvas#hero-bg
  document.addEventListener('DOMContentLoaded', function () {
    var c = document.getElementById('hero-bg');
    if (c) new GridPulseBg(c);
  });

  window.GridPulseBg = GridPulseBg;
})();
