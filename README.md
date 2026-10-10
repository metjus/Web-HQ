# CloudPulse HQ

Súkromná iPhone PWA na sledovanie Cloudflare Web Analytics stránok (vrátane webov mimo Cloudflare hostingu).

## Použitie

1. Aplikácia beží na Cloudflare Worker `web-hq` (repo `metjus/Web-HQ`).
2. V Settings / Variables and Secrets Workera nastav `ADMIN_PASSWORD` a `SESSION_SECRET` ako šifrované Secrets.
3. Binding `CLOUDPULSE_KV` musí smerovať na Workers KV namespace `cloudpulse-private`. Binding je už v `wrangler.jsonc`, preto by ho deployment nemal zrušiť.
4. V Cloudflare vytvor **API token s Account → Analytics → Read** (prístup iba k svojmu účtu). Nepoužívaj Global API Key.
5. V dashboarde CloudPulse cez ⚙ zadaj názov webu, **Account ID**, **Web Analytics Site Tag** a API token. Site Tag patrí stránke Web Analytics, nie Zone ID. Account ID nájdeš v Cloudflare account overview / URL.
6. Stlač **Refresh**. Aktualizácie sa nespúšťajú automaticky.

Cloudflare RUM GraphQL node: `viewer.accounts.rumPageloadEventsAdaptiveGroups`. Metrika **visits** nie je počet unikátnych osôb; **count** označuje page-load events. Sedemdňové hodnoty sú súčtom denných údajov.

Pre nové statické weby môžeš nezávisle používať Cloudflare Workers Static Assets a napojiť ich na Web Analytics. Existujúce weby zostávajú na svojom hostingu.

## Bezpečnosť
Repozitár je verejný; žiadne tajomstvá doň neukladaj. Tokeny a zoznam webov sa ukladajú v Workers KV za overením heslom. Odporúčame Cloudflare Access / rate limiting pre `/api/login`. Používaj HTTPS. CloudPulse je osobný prototyp, nie auditované bezpečnostné riešenie.

## Overenie
Aktuálne zmeny sa automaticky nasadzujú z GitHubu; živé API odpovede treba otestovať s vlastným Cloudflare účtom. Neúspešné GraphQL volania sa zobrazujú ako chyby, nie ako vymyslené štatistiky.
