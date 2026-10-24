# Merkoslux – Website (mehrseitig)

Statische Seite für GitHub Pages (+ Cloudflare). Kein Build nötig: Ordnerinhalt ins Repository legen, fertig.

Seiten: index, leistungen, ueber-uns, kontakt, impressum, datenschutz.
Sprachen: DE (im HTML), FR/LB/EN in `js/i18n.js`. Die Übersetzungen sind von Claude und sollten von Muttersprachlern gegengelesen werden (besonders Luxemburgisch).

## Noch offen (gelb markiert in Impressum/Datenschutz bzw. in `js/main.js`)
1. E-Mail-Adresse (Impressum, ggf. Kontaktseite)
2. TVA-Nummer, zuständige Kammer, Berufshaftpflicht (Impressum)
3. Kontaktformular: in `js/main.js` bei `CONFIG` die Adresse eines Formular-Dienstes eintragen
   (Web3Forms: `formEndpoint: "https://api.web3forms.com/submit"` + eigener `formAccessKey`; Formspree: nur `formEndpoint`).
   Den Schlüssel von Kosaco NICHT verwenden. Dienst in der Datenschutzerklärung nennen.
4. Domain: Datei `CNAME` liegt bereits im Projekt (merkoslux.com). In GitHub unter Settings > Pages die Custom domain eintragen, in Cloudflare DNS-Einträge setzen (A-Records auf GitHub Pages, www als CNAME).
5. Datenschutz und Impressum sind nur auf Deutsch; bei Bedarf Französisch ergänzen.

## Bilder
`img/*.jpg` (17 Baustellenfotos). Neue Fotos: Datei in `img/` legen und in `projekte.html` einen `<li>` kopieren.
