# CloudPulse HQ

Súkromná iPhone PWA na sledovanie Cloudflare Web Analytics stránok (vrátane webov mimo Cloudflare hostingu).

## Použitie

1. Aplikácia beží na Cloudflare Worker `web-hq` (repo `metjus/Web-HQ`).
2. V Settings / Variables and Secrets Workera nastav `ADMIN_PASSWORD` a `SESSION_SECRET` ako šifrované Secrets.
3. Binding `CLOUDPULSE_KV` musí smerovať na Workers KV namespace `cloudpulse-private`. Binding je už v `wrangler.jsonc`, preto by ho deployment nemal zrušiť.
4. V Cloudflare vytvor **API token s Account → Analytics → Read** (prístup iba k svojmu účtu). Nepoužívaj Global API Key.
5. V dashboarde CloudPulse cez ⚙ zadaj názov webu, **Account ID**, **Web Analytics Site Tag** a API token. Site Tag patrí stránke Web Analytics, nie Zone ID. Account ID nájdeš v Cloudflare account overview / URL.
6. Stlač **Refresh**. Aktualizácie sa nespúšťajú automaticky.

Cloudflare RUM GraphQL node: `viewer.accounts.rumPageloadEventsAdaptiveGroups`. Metrika **visits** nie je počet unikátnych osôb; **count** označuje page-load events. Sedemdňové hodnoty sú agregáciou posledných 168 hodín.

Pre nové statické weby môžeš nezávisle používať Cloudflare Workers Static Assets a napojiť ich na Web Analytics. Existujúce weby zostávajú na svojom hostingu.

## Bezpečnosť
Repozitár je verejný; žiadne tajomstvá doň neukladaj. Tokeny a zoznam webov sa ukladajú v Workers KV za overením heslom. Odporúčame Cloudflare Access / rate limiting pre `/api/login`. Používaj HTTPS. CloudPulse je osobný prototyp, nie auditované bezpečnostné riešenie.

## Overenie
Aktuálne zmeny sa automaticky nasadzujú z GitHubu; živé API odpovede treba otestovať s vlastným Cloudflare účtom. Neúspešné GraphQL volania sa zobrazujú ako chyby, nie ako vymyslené štatistiky.

## Zosúladenie s Cloudflare Web Analytics

- Posledných 24 hodín a posledných 7 × 24 hodín do spoločného času obnovenia pre všetky weby.
- Filter `bot: 0` na oboch súčtoch aj trende (Exclude Bots: Yes).
- Oba súčty pochádzajú zo samostatných agregácií celých intervalov, nie zo sčítania denných hodnôt.
- Trend: denné UTC intervaly v rámci posledných 168 hodín, až 8 stĺpcov s neúplnými okrajovými dňami.
- Staré Zone Analytics záznamy zobrazia výzvu na nové pridanie cez Web Analytics; rozdielne metriky sa nesčítavajú.
- Pri chybe API sa zobrazí chyba, bez návratu na nefiltrované dáta.

## Nasadenie tejto úpravy

Nahraď `functions/api/[action].js`, `index.html`, `public/index.html` a `README.md` v Git repozitári. Zachovaj Cloudflare secrets a existujúci KV binding. Po úspešnom deploymente znovu načítaj appku a stlač Refresh. Zoznam webov a tokeny sa touto úpravou nemenia. Správny Site Tag pre gta6rp.sk je `242755ce734c49bbad021dba411b4ce8`.

Pri porovnaní nastav Cloudflare Web Analytics na Last 24 hours alebo Last 7 days a Exclude Bots: Yes, bez ďalších filtrov. Čas načítania, oneskorené spracovanie a adaptívne vzorkovanie môžu viesť k menším rozdielom; presná zhoda nie je garantovaná. Živé API over po nasadení. Lokálne testy používajú simulované odpovede.

## Detail, úpravy a overenie prepojenia

Klikni na názov webu v prehľade alebo jeho hornú záložku. Detail používa už načítaný prehľad: súčty za 24/168 hodín, väčší graf návštev alebo zobrazení a denný rozpis. Nespúšťa ďalšie analytické dotazy.

V správe webov použi Upraviť. Prázdny token zachová pôvodný token, neprázdny ho nahradí. ID záznamu zostáva rovnaké. Po uložení sa staré údaje upraveného webu odstránia z obrazovky; nové načíta Refresh.

Overiť prepojenie kontroluje analytiku aj metadata Site Tagu. REST metadata vyžadujú Account Settings: Read navyše k Account Analytics: Read. Bez tohto oprávnenia zostáva analytika funkčná, ale appka nebude tvrdiť, že overila priradenie k doméne. Ak sú dostupné, zobrazí domény z Cloudflare na porovnanie s názvom záznamu. Pri prázdnych dátach bez metadát je výsledok neoverený, nie úspech. Overenie neukladá zmeny, nevracia token klientovi a výsledok platí k zobrazenému času. Tlačidlo Overiť údaje kontroluje aj rozpracovaný formulár.

Regresné testy API (Node 22+): `node tests/api.mjs`. Používajú simulované Cloudflare odpovede a KV, nie živé prihlasovacie údaje. Existujúci KV model je zachovaný; súbežné úpravy nastavení z viacerých zariadení nie sú transakčné.

Testy ovládania oboch HTML vstupov: s dostupným balíkom `jsdom` spusti `node tests/ui.cjs`. Testujú DOM, nie vykreslenie v Safari. Koreňový index je zjednotený s public/index.html, aby oba vstupy používali Account ID / Site Tag.

## Cloudflare branch previews

`wrangler preview` potrebuje blok `previews`. Náhľad používa rovnaký KV namespace, ale `PREVIEW_READ_ONLY=true` na serveri zakazuje POST/PATCH/DELETE pre weby, aby náhľad nemenil produkčné nastavenia. Produkčné nastavenie túto premennú nemá. Pre prihlásenie do náhľadu nastav ADMIN_PASSWORD a SESSION_SECRET v Cloudflare Previews Base; produkčné secrets sa automaticky neprenášajú. Bez nich API bezpečne vráti 503. Hodnoty secrets nepatria do Gitu.
