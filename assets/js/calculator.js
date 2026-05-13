function calculate() {
  var price = parseFloat(document.getElementById('price').value) || 0;
  var pickup = parseFloat(document.getElementById('pickup').value) || 0;
  var distance = parseFloat(document.getElementById('distance').value) || 0;
  var fuelPrice = parseFloat(document.getElementById('fuel').value) || 7;
  var consum = parseFloat(document.getElementById('consum').value) || 7;
  var wear = parseFloat(document.getElementById('wear').value) || 0.3;

  var totalKm = pickup + distance;
  var fuelCost = (totalKm * consum / 100) * fuelPrice;
  var wearCost = totalKm * wear;
  var totalCost = fuelCost + wearCost;
  var profit = price - totalCost;
  var profitPerKm = distance > 0 ? profit / distance : 0;

  var verdict = document.getElementById('verdict');
  var orb = document.getElementById('orb');
  var profitEl = document.getElementById('profit');
  var labelEl = document.getElementById('label');

  verdict.classList.remove('go', 'think', 'stop', 'show');

  var status;
  if (profitPerKm >= 2) { status = 'go'; orb.textContent = 'GO'; }
  else if (profitPerKm >= 1) { status = 'think'; orb.textContent = 'THINK'; }
  else { status = 'stop'; orb.textContent = 'STOP'; }

  setTimeout(function() {
    verdict.classList.add(status, 'show');
    profitEl.textContent = (profit >= 0 ? '+' : '') + profit.toFixed(2) + ' RON';
    labelEl.textContent = profitPerKm.toFixed(2) + ' RON/km · cost total ' + totalCost.toFixed(2) + ' RON';
  }, 50);

  verdict.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
