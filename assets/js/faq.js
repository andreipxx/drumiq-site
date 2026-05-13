document.querySelectorAll('.faq-q').forEach(function(q) {
  q.addEventListener('click', function() {
    q.parentElement.classList.toggle('open');
  });
});
