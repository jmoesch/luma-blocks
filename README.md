# Luma Blocks PWA — v1.3.4

Ett komplett fristående iPhone-anpassat HTML5/JavaScript-spel med offlinefunktion. Inga utvecklaravgifter, ingen kompilering och inga externa bibliotek.

## Rättad regel för rensning (viktigt)

- När en **enda rad eller kolumn blir full** tas bara dess åtta rutor bort. Andra rutor **ligger kvar**, poängen räknas och nivån höjs om nivåmålet nås.
- En nivå kräver nu **flera** rensade linjer: nivå 1 kräver 5; nivå 2 kräver 7; nivå 3 kräver 9; sedan ökar målet upp till högst 15 linjer per nivå.
- Vid ett uppnått nivåmål kommer en liten nivånotis och bonuspoäng. **Övriga block och de kvarvarande valbara blocken behålls**, även när nivån höjs.
- När brädet är låst kan du använda en NOVA för att ta bort en fylld ruta. Om brädet förblir låst erbjuds nästa laddning. När möjliga drag och NOVA är slut avslutas omgången. Ett nytt spel behåller rekordet.
- Rensade linjer belönas med en stigande fyrtonsmelodi. Spelet spelar förinspelade WAV-ljud vid tryck eller släpp. När ljudet slås på hörs rensningsmelodin.

Stället genereras genom tre provdrag med rensningar på en kopia av brädet. De tre delarna blandas innan de visas. Större former får gradvis högre vikt och fortsätter öka långsammare efter nivå 13. Färgtemat ändras på nivå 5 och 9. Kombo gäller rensningar på drag direkt efter varandra.

## Uppdatera GitHub Pages

1. Packa upp `LumaBlocks-PWA-v1.3.4.zip`.
2. Gå till `https://github.com/jmoesch/luma-blocks`.
3. Publicera `index.html`, `game.js`, `engine.js`, `audio.js`, `styles.css`, `sw.js`, `manifest.webmanifest` och hela `assets/` direkt i repots rot. Förhandsbild, dokumentation, tester och skript behövs enbart lokalt.
4. Bekräfta ändringarna med **Commit changes**.
5. GitHub Pages publicerar samma länk som tidigare: `https://jmoesch.github.io/luma-blocks/`.
6. Ladda om sidan. Om en installerad iPhone-PWA fortfarande visar gammal kod, öppna webbadressen i Safari när du är online, ladda om sidan och starta sedan om PWA:n. Hjälprutan visar installerad version.

**Radera inte webbplatsdata** för att tvinga en uppdatering: det kan ta bort lokala speldata.

## Testning

Kör `npm test` med Node.js 22 eller senare. Testerna omfattar spelmotorn och ett simulerat gränssnittsflöde för hjälp, NOVA och låst bräde. Den här versionen har inte provspelats på fysisk iPhone eller i mobil webbläsare.

## PWA och datalagring

`index.html` och `styles.css` – layout, `game.js` – dragstyrning och rendering, `engine.js` – spelregler, `sw.js` – offline-cache, `manifest.webmanifest` samt `assets/` – appikon och ljud. `tests/` – automatiska tester.

Speldata sparas lokalt i webbläsaren under samma nyckel som i tidigare versioner, så poäng och rekord kan normalt fortsätta i den nya versionen. Ett bräde som redan har tömts av den gamla buggen går dock inte att återskapa automatiskt.

Inför en ny version, kör exempelvis `node scripts/release.mjs 1.3.4` från projektroten och uppdatera ändringsloggen.

Mobiltest med Chromium och pekemulering: kör `python tests/mobile_smoke.py` med Python Playwright och installerad Chromium. En egen Chromium-installation kan väljas med miljövariabeln CHROMIUM_PATH. Testet kontrollerar avbruten touch, glidning, förhandsvisning, släpp och NOVA.

### Provlista på iPhone

1. Välj en prick och tryck utan att glida på en ledig ruta i mitten. Upprepa längst upp och längst ned.
2. Håll och glid med ett valt block. Kontrollera att det lyfts och hamnar på den förhandsvisade platsen vid släpp.
3. Aktivera NOVA. Tryck på en tom ruta och kontrollera meddelandet och antalet laddningar. Tryck sedan på en fylld ruta och kontrollera att just den försvinner och en laddning förbrukas.
4. Öppna två flikar i samma Safari-profil. Spela i första fliken och gå till den andra. Kontrollera att bräde och poäng uppdateras utan meddelande om förlorat drag.
