# Versionshistorik

## 1.2.1 — Nivåer, fungerande rensning och NOVA-varning (2026-11-14)
- Rättad animationsbugg som lämnade borttagna block synliga efter blinkningen.
- Tydlig nivåindikator med mätare för rensade linjer. Automatisk nivåväxling vid uppnått mål.
- Bevarar poäng och NOVA vid nivåbyte; ny tom spelplan samt bonuspoäng vid nästa nivå.
- Visar varning **Använd NOVA?** i stället för att avsluta när inga block passar men NOVA finns.
- Valet **NYTT SPEL** finns i varningsrutan om man vill börja om.
- Ingen automatisk omblandning när block inte passar.
- Bevarar äldre lokal lagring från 1.1.0 där det är möjligt.
- Versionshanterade skript och offline-cache för säkrare GitHub Pages-uppdatering.
- 19 godkända tester av spelmotorn samt mobilt webbläsartest av animationer, poäng, varningsruta och nivåväxling.

## 1.1.0 — PWA (2026-11-14)
- Omskrivet från Swift/SpriteKit till HTML5 Canvas och ES Modules.
- Spelbar på iPhone, Android och dator utan installation eller registrering.
- Egen appikon, hemskärmsläge, offline-cache med service worker.
- Pekdragning med lyftförskjutning, snäppläge och placeringsförhandsvisning.
- Alternativ tryck-för-att-välja/placera; ingen oavsiktlig sidrullning under spelet.
- Bevarar poängsystemet, 30 former, tre block, rack-påfyllning och NOVA.
- Åtgärdad ett kantfall: NOVA kan återaktivera ett tomt rack på ett fullt bräde.
- Nya uppladdningsindikatorer för NOVA, hjälpruta och tydlig omstartsbekräftelse.
- 14 automatiska logiktester och webbläsartester för flera mobilformat.

## 1.0.0 — Native Swift-prototyp (2026-11-14)
- Första iOS-prototypen med SpriteKit, SwiftUI och egen spelmotor.
