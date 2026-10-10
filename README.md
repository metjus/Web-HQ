# CloudPulse HQ

Súkromná iPhone PWA pre návštevnosť webov z Cloudflare. Hostovanie: Cloudflare Pages + Pages Functions + Workers KV. **Žiadne PHP ani automatický refresh.**

## Nasadenie

1. Cloudflare → Workers & Pages → Create → Pages → Import Git repository → `metjus/Web-HQ`, branch `main`.
2. Framework preset: None. Build command: `exit 0`. Output directory: `.`.
3. V Cloudflare vytvor Workers KV namespace, napr. `cloudpulse-private`.
4. V nastavení Pages projektu → Bindings → Add → KV namespace: variable **`CLOUDPULSE_KV`**, vyber vytvorený namespace.
5. V Pages → Settings → Variables and Secrets pridaj šifrované secrets **`ADMIN_PASSWORD`** (dlhé unikátne heslo) a **`SESSION_SECRET`** (náhodný dlhý reťazec, aspoň 32 znakov).
6. Redeploy projektu po uložení bindings a secrets. Na iPhone otvor HTTPS URL v Safari → Zdieľať → Pridať na plochu.
7. Cloudflare → Profile → API Tokens → Create Token s minimálne Zone → Analytics → Read a oprávnením iba na požadované zóny. Zone ID nájdeš na detailoch domény.
8. Po prihlásení pridaj doménu, Zone ID a API token. Klikni na Refresh.

## Poznámky k bezpečnosti

Repozitár môže byť verejný; tokeny a heslo sa tam nesmú commitovať. Tokeny sú uložené na serveri v Cloudflare Workers KV (šifrovanie úložiska poskytované Cloudflare), nie v browser localStorage. Prístup chráni jedno spoločné heslo a podpisované HttpOnly Secure cookie na 7 dní. Nasadzuj iba cez HTTPS. Odporúčané pre osobnú aplikáciu: Cloudflare Access ako ďalšia ochrana a silné unikátne heslo. Pri vystavení na verejnej adrese odporúčame zapnúť tiež rate limiting na endpoint /api/login; samotná aplikácia ho nezabezpečuje.

Čísla 7 dní sú súčtom denných unique visitor hodnôt, nie jedinečnými ľuďmi za celé obdobie. Dátum je podľa UTC. Chybové odpovede Cloudflare API sa zobrazujú, nevkladajú sa fiktívne dáta.
