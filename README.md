# Luma Blocks PWA — v1.2.4

Ett komplett fristående iPhone-anpassat HTML5/JavaScript-spel med offlinefunktion. Inga utvecklaravgifter, ingen kompilering och inga externa bibliotek.

## Rättad regel för rensning (viktigt)

- När en **enda rad eller kolumn blir full** tas bara dess åtta rutor bort. Andra rutor **ligger kvar**, poängen räknas och nivån höjs om nivåmålet nås.
- En nivå kräver nu **flera** rensade linjer: nivå 1 kräver 5; nivå 2 kräver 7; nivå 3 kräver 9; sedan ökar målet upp till högst 15 linjer per nivå.
- Vid ett uppnått nivåmål kommer en liten nivånotis och bonuspoäng. **Övriga block och de kvarvarande valbara blocken behålls**, även när nivån höjs.
- När brädet är låst kan du använda en NOVA för att ta bort en fylld ruta. Om brädet förblir låst erbjuds nästa laddning. När möjliga drag och NOVA är slut avslutas omgången. Ett nytt spel behåller rekordet.
- Rensade linjer belönas med en stigande fyrtonsmelodi. På enheter med Web Audio återanvänds samma ljudmotor.

## Uppdatera GitHub Pages

1. Packa upp `LumaBlocks-PWA-v1.2.4.zip`.
2. Gå till `https://github.com/jmoesch/luma-blocks`.
3. Välj **Add file → Upload files** och dra **alla filer och undermappar inuti mappen** till sidan, så att `index.html`, `engine.js`, `game.js`, `styles.css` och `sw.js` ligger direkt i repositoryts rot.
4. Bekräfta ändringarna med **Commit changes**.
5. GitHub Pages publicerar samma länk som tidigare: `https://jmoesch.github.io/luma-blocks/`.
6. Ladda om sidan. Om en installerad iPhone-PWA fortfarande visar gammal kod, öppna webbadressen i Safari när du är online, ladda om sidan och starta sedan om PWA:n. Hjälprutan visar installerad version.

**Radera inte webbplatsdata** för att tvinga en uppdatering: det kan ta bort lokala speldata.

## Testning

Kör `npm test` med Node.js 22 eller senare. Testerna omfattar spelmotorn och ett simulerat gränssnittsflöde för hjälp, NOVA och låst bräde. Den här versionen har inte provspelats på fysisk iPhone eller i mobil webbläsare.

## PWA och datalagring

`index.html` och `styles.css` – layout, `game.js` – dragstyrning och rendering, `engine.js` – spelregler, `sw.js` – offline-cache, `manifest.webmanifest` samt `assets/` – appikon och ljud. `tests/` – automatiska tester.

Speldata sparas lokalt i webbläsaren under samma nyckel som i tidigare versioner, så poäng och rekord kan normalt fortsätta i den nya versionen. Ett bräde som redan har tömts av den gamla buggen går dock inte att återskapa automatiskt.
