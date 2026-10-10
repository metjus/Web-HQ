# ViceCore — 2026 redizajn (v2)

**Toto je nové spracovanie z 9. októbra 2026.** Dizajn je od základu prepracovaný podľa požiadavky na výraznú, animovanú modernú stránku.

- Úvodný fullscreen hero má **reálny HTML obrázok** `assets/img/leonida-sunset.webp` (s palmovou panorámou) a samostatne ladený gradient. Obrázok funguje bez JavaScriptu a je fyzicky v ZIPe.
- Nový moderný vizuál: výrazná editorial typografia, asymetrické fotografie, premyslené CTA, vizuálne sekcie, oceánska tyrkysová a koralové akcenty.
- Pohyb: entrance animations, scroll reveal (IntersectionObserver), parallax hero, scroll progress indikátor, kinetický ticker, jemné hover prechody, kurzorové svetlo a responzívna navigácia.
- **Prístupnosť:** rešpektované `prefers-reduced-motion`; animácie sú iba vizuál, obsah a odkazy fungujú aj bez nich.
- CSS `assets/css/2026.css` je samostatná vrstva nad pôvodným štýlom, skript `assets/js/motion.js` má všetky nové interakcie.
- Responzívne breakpointy pre desktop, tablet a telefón.
- Ak sa obrázok na hostingu nezobrazuje: over, že existuje `/assets/img/leonida-sunset.webp` a nebol vynechaný priečinok `assets` pri FTP prenose.
- Nadpisové fonty sa načítavajú z Google Fonts, ale CSS má lokálne systémové alternatívy, takže web je použiteľný aj bez externého fontu.

---

# ViceCore — SK/CZ GTA VI fan portal

Moderný responzívny web ViceCore s tmavou grafikou inšpirovanou pobrežím Leonidy. **Toto je funkčná statická verzia webu, pripravená na FTP hosting.** Nie je potrebné Node.js, databáza ani žiadne serverové balíky.

## Čo už funguje

- 52 samostatných statických lokalizovaných stránok (`/sk/`, `/cz/`), plus vstupná stránka a stránka 404.
- Úvod, novinky, databáza, teórie, komunita, o projekte, ochrana súkromia.
- 7 redakčných článkov, 8 záznamov databázy, 4 teórie — **každá položka má skutočnú SK a CZ textovú verziu** (nie automatický strojový preklad v prehliadači).
- Prepínanie SK / CZ na ekvivalentnej stránke, responzívna navigácia, vyhľadávanie v 38 jazykových záznamoch, filtrovanie článkov a databázy.
- Ukladanie článkov a vzorová anketa do `localStorage` iba na vlastnom zariadení; bez nepravdivých počítadiel komunitných hlasov.
- Základné SEO: unikátne `title`, description, Open Graph, hreflang, canonical, sitemap.xml, robots.txt.
- Grafika vo WebP. Vizuály sú vytvorené pre návrh stránky, nejde o oficiálne screenshoty Rockstar Games.

## Rýchle nasadenie na hosting

1. Stiahni ZIP **vicecore_web_ready.zip** a rozbaľ ho.
2. Nahraj **obsah ZIPu** (nie celú vnorenú zložku) do koreňového priečinka webu, typicky `public_html`, `www` alebo `htdocs`.
3. Keď otvoríš doménu, úvodný `index.html` presmeruje používateľa na `/sk/`. Česká verzia bude na `/cz/`.
4. Skontroluj na doméne, či hosting servíruje `index.html` z priečinkov a či vidno súbory `/assets/...`.
5. Pred ostrým spustením aktualizuj ukážkový obsah, kontaktné a právne údaje a všetky zdroje.

Zložka *source* a súbor *build.py* **nie sú potrebné na hostingu**. Sú dostupné iba v plnom zdrojovom archíve.

## Lokálne spustenie

Najjednoduchšie cez VS Code + rozšírenie Live Server, alebo z adresára webu:

```sh
python -m http.server 8000
```

Potom otvor `http://localhost:8000`. Prípadne stačí otvoriť jednotlivé HTML súbory, ale pri prechode na ďalšie stránky môžu niektoré prehliadače na `file://` adresách zobrazovať výpis priečinka. Preto je lokálny HTTP server spoľahlivejší.

## Ako pridať ďalší článok

V plnom projekte uprav `source/content.py`. Každá položka obsahuje `slug`, `kind` (`news`, `database`, `theories`), `category`, `image`, `title`, `excerpt`, `paragraphs` pre `sk` aj `cz`. Následne na počítači s Python 3 vykonaj:

```sh
pip install Jinja2
python build.py
```

Script znovu vygeneruje všetky statické HTML, `search-index.js` a `sitemap.xml`. Potom na hosting nahraj aktualizované verejné súbory.

Pre úpravu dizajnu pozri `assets/css/style.css`; pre UI interakcie `assets/js/site.js`. Vizuálna identita je nastavená cez CSS premenné v `:root`.

## Čo ešte NIE je hotové pred reálnym spustením

- **Aktuálne správy:** existujúce články sú úvodné redakčné texty; nie sú to overené novinky z októbra 2026. Pred spustením doplň aktuálne dátumy, zdroje a redakčné aktualizácie. Nič nepublikuj ako „čerstvú správu“ bez overenia.
- **Backend a redakčný systém:** web zatiaľ nemá administráciu, prihlasovanie, spoločné komentáre, verejné hlasovanie, odosielanie e-mailov ani živé vyťahovanie noviniek. Tieto funkcie vyžadujú server alebo externe spravovanú službu.
- **Právne údaje:** informácie o prevádzkovateľovi, zásady ochrany osobných údajov a prípadné obchodné podmienky treba doplniť podľa reálneho hostingu a služieb. Súčasná stránka opisuje túto statickú verziu.
- **Licencie médií:** pred zverejnením každého nového obrázka over právo na jeho používanie. Dodané obrázky sú ilustračné vizuály vytvorené počas návrhu; nedávaj im titulky ako „oficiálny screenshot“. Použitá pôvodná cudzozdrojová referenčná tapeta **nie je v balíku**.
- **Doména:** `vicecore.sk` je uvedená vo `canonical`, `og:image`, `robots.txt` a `sitemap.xml` ako plánovaná doména. Ak sa projekt nasadí inde, tieto URL treba zmeniť. Nie je overené, či doménu vlastníš.

## Štruktúra

```text
index.html
404.html
robots.txt
sitemap.xml
manifest.webmanifest
assets/
  css/style.css
  js/site.js
  js/search-index.js
  img/*.webp
  favicon.svg
sk/
  index.html
  novinky/...
  databaza/...
  teorie/...
  komunita/...
  o-projekte/...
  ochrana-sukromia/...
cz/
  index.html
  novinky/...
  databaza/...
  teorie/...
  komunita/...
  o-projektu/...
  ochrana-soukromi/...
source/    # len plný projekt, neuploadovať
build.py   # len plný projekt, neuploadovať
```

## Použité technológie

HTML5, moderné CSS, vanilla JavaScript, obrázky WebP, statický Python/Jinja2 generátor. Na produkciu netreba žiadny build ani vývojový server.
