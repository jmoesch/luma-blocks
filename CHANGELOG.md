# Ändringslogg

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
