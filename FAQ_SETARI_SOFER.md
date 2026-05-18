# DrumIQ — Ghid Setari pentru Soferi Bolt

## 1. Prima pornire — ce trebuie activat?

### Accessibility Service (OBLIGATORIU)
DrumIQ citeste ecranul Bolt prin Accessibility Service. Fara asta, app-ul nu functioneaza.

**Pasi:**
1. Deschide **Settings > Accessibility > DrumIQ** pe telefon
2. Activeaza serviciul
3. Confirma permisiunea

### Overlay Permission (OBLIGATORIU)
Permite DrumIQ sa afiseze verdictul peste Bolt.

**Pasi:**
1. In DrumIQ: **Settings > Overlay Permission > Acorda**
2. Activeaza "Display over other apps" pentru DrumIQ
3. Revino in app — trebuie sa scrie "Acordata ✓"

### Target zilnic (OPTIONAL)
- Pe ecranul **Acasa**, seteaza un target (ex: 200 RON/zi)
- Overlay-ul va arata cat ai facut vs target in timp real

---

## 2. Carburant — setarile corecte

Intra in **Settings > Tip & pret carburant**.

### Alege tipul masinii tale:

| Tip | Cand il alegi |
|-----|---------------|
| **Benzina+GPL** | Dacia Sandero ECO-G, Logan GPL, orice masina cu instalatie GPL |
| **Benzina** | Masina doar pe benzina |
| **Diesel** | Masina pe motorina |
| **Electric** | BYD, Tesla, Dacia Spring, etc. |
| **Hybrid HEV** | Toyota Yaris Cross, Honda Jazz — fara priza |
| **Hybrid PHEV** | Masina hybrid cu priza (plug-in) |

### Valori recomandate pentru Benzina+GPL (Dacia Sandero):

| Camp | Valoare corecta | Ce inseamna |
|------|----------------|-------------|
| **Consum benzina** | **7.0** L/100km | Consumul pe benzina (pornire la rece, cateva secunde) |
| **Pret benzina** | **7.50** RON/L | Pretul curent la pompa |
| **Consum GPL** | **7.0** L/100km | Consumul pe GPL (80% din timp) |
| **Pret GPL** | **3.50** RON/L | Pretul curent GPL |
| **Uzura** | **0.35** RON/km | Anvelope + ulei + revizie + amortizare |

### De unde iau consumul real?
- **Din bordul masinii** — resetezi trip computer, mergi 100 km pe traseu mixt, citesti consumul
- **Dacia Sandero ECO-G 2023**: ~7.0 L/100km (WLTP), ~6.8 real pe drum, ~8.5 in oras pur

### Greseli frecvente:
- NU pune consum 9-10 L/100km — asta e consum urban exagerat, nu media ta reala
- NU pune uzura 1.00 RON/km — asta e de 3x mai mult decat realitatea

---

## 3. Taxe si Comision — LASA 0% !

Intra in **Settings > Taxe**.

| Camp | Valoare corecta | De ce |
|------|----------------|-------|
| **Taxe** | **0%** | Bolt iti arata deja suma NETA in oferta |
| **Comision Bolt** | **0%** | Bolt a scos deja comisionul de 25% inainte sa-ti arate suma |

### IMPORTANT:
Suma pe care o vezi in oferta Bolt (ex: "9,75 lei NET, taxe incluse") este **ce primesti tu in mana**. Bolt a scos deja:
- 25% comision Bolt
- TVA
- Orice taxa

**Daca pui 25% comision + 10% taxe**, app-ul va scadea INCA O DATA aceste sume = profit umflat artificial, verdicte gresite, curse bune marcate ca neprofitabile.

**Regula simpla: daca nu esti sigur, lasa ambele la 0%.**

---

## 4. Praguri acceptare

In **Settings > Praguri Acceptare** setezi minimul de profitabilitate:

| Prag | Recomandat | Ce face |
|------|-----------|---------|
| **Profit/km** | **2.20 RON/km** | Sub acest prag = overlay rosu (STOP) |
| **Profit/ora** | **25 RON/ora** | Optional, activat separat |

- Daca activezi **ambele**, cursa trebuie sa treaca de ambele ca sa fie "GO"
- Daca activezi doar profit/km, e suficient

### Cum stii daca pragul e corect?
- **Sub 1.60 RON/km** = pierzi bani (nu acoperi costurile)
- **1.60 - 2.20 RON/km** = la limita, gandeste-te (overlay galben)
- **Peste 2.20 RON/km** = cursa buna (overlay verde)

---

## 5. Filtre curse (PRO)

In **Settings > Filtre profitabilitate**:

| Filtru | Plan | Recomandat | Efect |
|--------|------|-----------|-------|
| **Min profit/km** | Trial + PRO | **2.50 RON/km** | Refuza automat cursele sub prag |
| **Min profit/min** | PRO | **0.50 RON/min** | Refuza cursele prea lungi pt banii lor |
| **Max pickup km** | PRO | **3.0 km** | Refuza daca esti prea departe de pasager |
| **Min rating pasager** | PRO | **4.5** | Refuza pasageri cu rating scazut |

**Sfat:** Activeaza cel putin filtrul **Min profit/km** — e gratuit si pe Trial.

---

## 6. Overlay — simplu vs complet

In **Settings > PRO > Card complet**:

| Mod | Ce vezi | Plan |
|-----|---------|------|
| **Bulina simpla** | Simbol ($/X/?) + profit/km | Trial + PRO |
| **Card complet** | Pickup, trip, durata, brut, net, sursa | Doar PRO |

- Card complet e util sa intelegi DE CE o cursa e buna/proasta
- Bulina simpla e mai discreta si nu acopera ecranul Bolt

---

## 7. Mod de lucru

In **Settings > Mod de lucru**:

| Mod | Cand il alegi |
|-----|---------------|
| **Individual / PFA / SRL** | Masina ta, fara costuri fixe saptamanale |
| **Flota / masina inchiriata** | Platesti chirie saptamanala pt masina — adaugi costul |

Daca esti pe masina ta, lasa **Individual** si nu adauga costuri fixe.

---

## 8. Consum adaptiv (OPTIONAL)

In **Settings > Consum adaptiv**:

- **Dezactivat** (default) = foloseste consumul fix din setarile carburant
- **Activat** = calculeaza diferit pt curse scurte (oras) vs lungi (exterior):
  - Sub 5 km = consum oras (ex: 8.5 L/100km)
  - Peste 30 km = consum exterior (ex: 6.5 L/100km)
  - 5-30 km = media

**Cand sa activezi:** daca faci multe curse scurte in oras SI curse lungi pe drum national. Altfel, nu merita complicatia.

---

## 9. Checklist rapid — setari corecte

- [ ] Accessibility Service: **ACTIVAT**
- [ ] Overlay Permission: **ACORDAT**
- [ ] Tip carburant: **corect pt masina ta**
- [ ] Consum: **din bordul masinii** (nu default-ul exagerat)
- [ ] Uzura: **0.30 - 0.50 RON/km** (nu 1.00!)
- [ ] Taxe: **0%**
- [ ] Comision Bolt: **0%**
- [ ] Prag profit/km: **2.20 RON/km** (activat)
- [ ] Filtru min profit/km: **2.50 RON/km** (activat)
- [ ] Target zilnic: **setat** (optional, dar motivant)

---

## 10. Intrebari frecvente

### "De ce imi arata profit mai mic decat castigul real?"
Verifica la **Settings > Taxe** ca ai 0% la ambele. Daca ai 25% comision + 10% taxe, app-ul scade dublu.

### "De ce sunt toate cursele marcate STOP?"
Probabil ai consum prea mare (9-10 L) sau uzura prea mare (1.00 RON/km). Pune valori realiste.

### "De ce nu functioneaza Google trafic real?"
Trebuie plan **PRO** + Google Routes API activat in Cloud Console cu billing. Verifica in **Settings > Diagnostic > Accessibility Test** — daca vezi "src: fallback" la fiecare cursa, API-ul nu functioneaza.

### "Overlay-ul nu apare peste Bolt"
1. Verifica Overlay Permission (Settings > Overlay Permission)
2. Verifica Accessibility Service (Settings telefon > Accessibility)
3. Reporneste DrumIQ
4. Pe unele telefoane Samsung/Xiaomi: dezactiveaza "Battery optimization" pentru DrumIQ

### "Tracker-ul arata 0 curse finalizate dar am facut curse"
App-ul detecteaza finalizarea cand Bolt afiseaza ecranul "Confirma tariful" sau "Evalueaza pasagerul". Daca nu treci prin aceste ecrane (ex: inchizi Bolt inainte), cursa ramane ca "oferita" nu "finalizata".

### "Ce inseamna simbolurile overlay?"
- **$** (verde) = GO — cursa profitabila, accepta
- **?** (galben) = THINK — la limita, gandeste-te
- **X** (rosu) = STOP — neprofitabila, refuza

### "Rata mea de acceptare e sub 70%, ce fac?"
Bolt poate bloca contul sub 70% rata acceptare. DrumIQ afiseaza warning pe ecranul Acasa. Accepta cateva curse la rand (chiar si mici) ca sa ridici rata inapoi peste 75%.
