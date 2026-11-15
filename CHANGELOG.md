# Ändringslogg

## v1.3.2 (test)

- Kort tryck placerar vid fingret. Glidning från 7 px lyfter biten. Muspekaren visar placeringen vid hovring.
- Hela utdelningens former sparas så kvarvarande bitar behåller sin skala.
- Utökad provlista och tester för kantrutor, återställd sparjournal och fliksynkronisering.

## v1.3.1

- Tryckplacering följer fingret med lyft och verkställs vid släpp. NOVA träffar den berörda rutan.
- Snäpptolerans 0,6 ruta och gemensam rutstorlek för stället. Resultatknapp efter visning av slutbrädet.
- Vikterna fortsätter öka efter nivå 13. Varje ställ har fortfarande en lösning.
- Senaste draget mellanlagras omedelbart före den samordnade skrivningen mellan flikar.

## v1.3.0

- Lösbara blockställ, nivåberoende vikter och teman på nivå 5 och 9.
- NOVA visar MAX vid tre laddningar. Förhandsvisning, tangentbordsplacering, större bitar och försiktig snäppning vid släpp.
- Separat rekord, fliksynkronisering och slutstatistik med möjlighet att visa brädet.
- Delvis överlappande WAV-ljud, Canvas-reservväg och separata maskbara ikoner.

## v1.2.5

- Placering och rensning spelar WAV direkt vid spelarens tryck eller släpp.
- Högtalarknappen spelar rensningsmelodin när ljudet slås på. Offlinecachen stöder delhämtning av ljud.

## v1.2.4

- Nivån höjs när linjemålet nås. Låst bräde ger NOVA-val eller avslutad omgång.
- Ny rensningsmelodi och återanvändbar ljudmotor med återaktivering efter avbrott.

## v1.2.3

- Varningen för låst bräde återkommer efter hjälp eller avbrutet NOVA-val.
- Ett tomt blockställ fylls vid återläsning på en spelbar plan.
- NOVA-notisen följer antalet faktiskt intjänade laddningar även vid dubbelrensning.
- Ett pågående drag avbryts när en dialog öppnas eller pekarkontakten förloras.
- Att stänga en äldre flik skriver inte längre över det senast sparade draget.
- Installationen hämtar spelsidan och modulerna ur samma versionscache vid offlinebruk.

## v1.2.2 — korrigerad rensning och nivåbyte

- **Rättad felaktig nivågräns:** nivå 1 behöver nu 5 rensade linjer, inte 1.
- **Rättad för tidig radering av hela spelplanen:** efter varje rensning stannar andra block kvar.
- **Nivåhöjning lämnar spelplanen och erbjudna block orörda.** Ny spelplan startas endast explicit när spelaren fortsätter från låst läge eller väljer ett helt nytt spel.
- När inga block kan placeras erbjuds NOVA om sådan finns, annars fortsättning på nästa nivå utan att tappa poäng.
- Låst tillstånd från gammal version kan fortsätta i ny version.
- Versionerade filer och service-worker-cache höjda till v1.2.2.
- 22 automatiska testfall och interaktionstester i mobilvy.

## v1.2.1

Försök till korrigerad rensningsanimation, nivåer och NOVA-varning. Hade en regelfelaktig nivågräns som gjorde att spelplanen tömdes efter första rensade raden.
