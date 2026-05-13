document.querySelectorAll('.counter-num').forEach(function(el) {
  var target = parseInt(el.textContent, 10);
  var current = 0;
  var step = Math.max(1, Math.floor(target / 30));
  var interval = setInterval(function() {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 40);
});
