# Luma Blocks PWA — version 1.2.1

Mobilanpassat blockpussel med nivåer, NOVA och offlinefunktion. Källkoden är HTML/CSS/JavaScript och kräver ingen byggprocess eller Mac.

## Uppdatera ditt befintliga GitHub Pages-spel

1. Packa upp `LumaBlocks-PWA-v1.2.1.zip` på datorn.
2. Öppna GitHub: `https://github.com/jmoesch/luma-blocks`.
3. Öppna **Add file → Upload files** (eller välj uppladdning i filvyn).
4. Dra **alla filer och mappar inuti** den uppackade `LumaBlocks-PWA-v1.2.1` till uppladdningsytan. `index.html`, `game.js`, `engine.js`, `styles.css`, `sw.js` och `assets` ska ligga på repositoryts högsta nivå.
5. GitHub ska ersätta filer med samma namn. Låt mappen `assets` följa med. Klicka sedan **Commit changes**.
6. Öppna `https://jmoesch.github.io/luma-blocks/` och ladda om. Vid uppdatering av tidigare installerad webbapp kan det behövas ytterligare en omladdning när offline-cachen har bytts ut. Kontrollera att **NIVÅ 1** syns ovanför spelplanen.

**OBS:** Ta inte bort repositoryt eller rensa webbplatsdata i Safari för att uppdatera. Lokal sparning använder fortfarande nyckeln `luma.pwa.game.v1`, så poäng, rekord och pågående bräde behålls så långt det tidigare sparade tillståndet är giltigt. Pågående version 1.1-spel får nivå 1 som startnivå men behåller sina poäng.

## Regler

- Välj ett av tre block, dra det till rutnätet eller tryck först på blocket och sedan på rutan.
- Fyll en hel rad eller kolumn. Den rensas och ger poäng. Du får bonus för flera linjer och kombinationer.
- Varje nivå har ett mål i rensade rader/kolumner. Nivå 1: 1 linje; nivå 2: 2; nivå 3: 3; nivå 4: 4; nivå 5 och senare: 5. Vid uppnått mål börjar en ny nivå med tom spelplan. Poäng och NOVA behålls.
- Fyra rensade linjer ger en **NOVA**. Högst tre kan sparas. En NOVA tar bort en valfri upptagen ruta.
- **Om inget av de erbjudna blocken får plats:** Spelet kontrollerar om NOVA finns. Om ja visas **Använd NOVA?**, där du får välja en ruta att ta bort. Om det fortfarande inte finns något giltigt drag visas varningen på nytt när en NOVA finns kvar. Om NOVA saknas är omgången slut. Att använda en NOVA garanterar inte att de kvarvarande blocken får plats.
- Tre nya block delas ut när alla i gruppen har placerats. Inga automatiska omblandningar görs vid blockerat läge.
- Inga annonser, inga köpfunktioner, inget konto och ingen tredjepartsanalys.

## iPhone

Öppna webbplatsen i Safari. Använd **Dela → Lägg till på hemskärmen** för en appikon. PWA:n kan användas offline efter att filerna har cachelagrats. Håll den installerade webbappen uppdaterad genom att öppna den när du är online.

## Testning

- `npm test` kör automatiserade tester för spelmotor och sparning.
- I ett Chromium-test med mobil viewport har vi kontrollerat att rensade rutor faktiskt försvinner visuellt efter animationen, att poängen räknas, att nivåer byts och att NOVA-varningen fungerar.
- Fysisk iPhone med Safari återstår att kontrollera.

## Filer

`index.html` – appens UI; `styles.css` – utseende; `game.js` – interaktion och animation; `engine.js` – regler, poäng, nivåer och sparning; `sw.js` – offline-cache; `assets/` – ikoner och ljud; `tests/` – automatisk testning.
