# LUMA BLOCKS — PWA för iPhone (version 1.1.0)

En fristående version av Luma Blocks, omskriven från **Swift + SpriteKit** till **HTML5 Canvas + JavaScript**. Kräver inga appar, ingen Mac, ingen Node-installation för publicering och **ingen Apple Developer-avgift**. Samma spelregler, poäng och NOVA som i det ursprungliga iOS-projektet.

Ingen extern spelmotor, inga tredjepartsbibliotek, ingen tracking, inga annonser och inga externa typsnitt används. Spelet är ett eget pusselspel inspirerat av blockpussel-genren, med egen ikon, färgsättning, ljudeffekter och NOVA-mekanik.

## 1. Publicera gratis på GitHub Pages

1. Logga in på GitHub på din Windows-PC.
2. Skapa ett nytt **Public** repository, till exempel `luma-blocks`.
3. Packa upp `LumaBlocks-PWA-v1.1.0.zip`.
4. Ladda upp innehållet i mappen `LumaBlocks-PWA` i **roten av GitHub-repot**. **Viktigt:** `index.html`, `game.js`, `engine.js`, `styles.css`, `sw.js`, `manifest.webmanifest` och mappen `assets` ska ligga på samma översta nivå. Du behöver inte ladda upp tester eller dokumentation, men det går bra.
5. Öppna **Settings → Pages** på GitHub. Under **Build and deployment** välj **Deploy from a branch**, därefter **main** och **/(root)**. Spara.
6. Öppna GitHub Pages-adressen för ditt repo. Med användarnamnet `jmoesch` och repo `luma-blocks` skulle adressen normalt bli `https://jmoesch.github.io/luma-blocks/`.
7. Öppna samma webbadress i Safari på din iPhone.

> Ingen byggprocess behövs: GitHub Pages serverar de färdiga filerna direkt. En HTTPS-adress behövs för offline-cache, och GitHub Pages erbjuder HTTPS.

## 2. Installera på iPhone (utan App Store)

1. Öppna spelets GitHub Pages-adress i **Safari** på din iPhone.
2. Tryck på **Dela** (du kan först behöva öppna sidmenyn beroende på iOS-version).
3. Välj **Lägg till på hemskärmen**. Välj **Öppna som webbapp** om valet visas.
4. Tryck på **Lägg till**.
5. Starta **Luma Blocks** med ikonen på hemskärmen.

Spelet öppnas som en egen app utan Safaris vanliga adressfält. När sidan har öppnats online och offline-cachen har hunnit aktiveras fungerar den även utan internet. Testa genom att slå på flygplansläge och sedan öppna spelet från hemskärmen.

## 3. Spelregler

- 8 × 8 rutor, tre block i racket.
- Dra ett block till brädet. Alternativt: tryck på blocket och tryck på en ledig plats på brädet.
- En helt fylld rad eller kolumn rensas; rader och kolumner kan rensas samtidigt.
- Varje placerad ruta ger 10 poäng; rensade linjer ger bonus, och rensningar i följd ger kombobonus.
- När de tre blocken har placerats får du tre nya.
- **NOVA:** fyra rensade rader/kolumner ger en NOVA. Välj NOVA och tryck sedan på en ifylld ruta för att ta bort den. Du kan spara upp till tre NOVA. Använd funktionen strategiskt när brädet fylls.
- Om ingen bricka kan placeras och du saknar NOVA avslutas omgången.
- Ditt pågående spel, rekord och ljudinställning sparas automatiskt **lokalt i webbläsaren**, på den enhet där du spelar.
- Ingen tidsbegränsning.

## 4. Uppdatera spelet

För att publicera en ny version: ladda upp ersättningsfilerna till samma GitHub-repo. När koden ändras, ändra även cacheversionsnamnet längst upp i `sw.js` (t.ex. `luma-blocks-v1.1.1`). Då hämtas nya filer av offline-cachen nästa gång webbläsaren söker uppdateringar.

**Viktigt:** Ändra inte lagringsnyckeln `luma.pwa.game.v1` om du vill bevara pågående omgångar. Sidan lagrar poängen lokalt. Om du rensar Safaris webbplatsdata, avinstallerar webbappen med dess data eller byter telefon kan de lokalt sparade uppgifterna försvinna. Ingen synkronisering mellan enheter ingår.

## 5. Lokalt testa på datorn

Du kan testa spelets visuella gränssnitt genom att publicera på GitHub Pages (enklast). Lokalt behöver PWA-filer serveras via HTTP för att ES Modules och service worker ska fungera; dubbelklicka **inte** på `index.html` med `file://` och anta att det är ett normalt test.

Om du har Python installerat:

```bash
cd LumaBlocks-PWA
python -m http.server 8080
```

Öppna sedan `http://localhost:8080/` i webbläsaren.

För att köra logiktesterna med Node.js:

```bash
npm test
```

## 6. Vad som är kontrollerat

- **14 automatiska Node.js-tester**: spelmekanik, 30 blockformer, poäng, rensningar, kombinationer, rack, NOVA, slutläge, sparning och slumpmässig spelgång.
- **Mobilgränssnittet** kontrollerat i Chromium med simulerade iPhone-mått: 375×667, 390×844 och 430×932, samt på bred skärm. Ingen horisontell eller vertikal sidrullning sågs i dessa tester.
- **Pekdragning**, tryck-för-att-placera, NOVA och omstart från game-over har körts i automatiserat webbläsartest utan JavaScript-fel.
- Den medföljande `sw.js` förladdar alla spel- och tillgångsfiler för offlineanvändning.

**Inte testat här:** riktig iPhone med Safari/iOS i fysisk enhet, och offlinefunktion efter GitHub Pages-publicering. Det sista behöver kontrolleras på din telefon när du har laddat upp spelet. Safari har inte alltid samma ljud- och haptikfunktioner som native-appar; haptisk feedback utlovas därför inte.

## Projektfiler

```
index.html                 Appens UI
styles.css                 Mobilanpassad design + safe-area-stöd
game.js                    Rendering, gester, ljudeffekter, dialoger
engine.js                  Fristående spelmotor + poäng + lagring
manifest.webmanifest       PWA-manifest + hemskärmsmetadata
sw.js                      Offline-cache och versionshantering
assets/                    Ikoner och originalkomponerade ljudeffekter
tests/engine.test.js        Automatiska Node.js-tester
package.json               Lokala testkommandon
PREVIEW.png                Skärmbild av den mobila spelvyn
README.md                  Denna instruktion
CHANGELOG.md               Versionshistorik
```

## Integritet och kostnad

Spelet gör inga API-anrop och skickar ingen spelinformation till någon server. Det använder webbläsarens `localStorage` för att spara speldatan. GitHub Pages är en extern hostingtjänst och hanterar normalt nätverksanrop och sedvanliga serverloggar enligt sina egna villkor. Spelet är gratis att publicera som ett publikt GitHub Pages-repository inom GitHubs gällande villkor. Det krävs inget Apple Developer Program.
