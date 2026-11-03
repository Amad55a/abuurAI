<p align="center">
  <img src="./assets/abuur-ai-logo.svg" alt="Abuur AI — SDK JavaScript Af-Soomaali" width="640">
</p>

# Abuur AI

Abuur AI waa SDK JavaScript ah oo Af-Soomaali mudnaan siiya. Hal hab oo isku
mid ah ayuu kuugu oggolaanayaa inaad su'aalo waydiiso ama qoraal turjunto,
adigoo adeegsanaya toddoba adeeg AI. Waxa uu ka shaqeeyaa Node.js iyo
barnaamijyada browser-ka. Isticmaal Node.js 22 ama ka cusub marka aad
backend samaynayso.

## Ku rakib

```sh
npm install abuur-ai
```

## Codsigaaga koowaad

Habayntu waxay isticmaashaa magacyo Af-Soomaali ah:
`bixiye` (adeegga AI), `furahaAPI` (furaha API), `moodel` (aqoonsiga
moodelka), iyo `tilmaamo` (tilmaamaha jawaabta).

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
});

const jawaab = await ai.weydii("Salaan!");
console.log(jawaab.text);
```

## Furayaasha API iyo adeegyada la taageero

Abuur AI ma akhriyo faylasha `.env`. Furaha si ammaan ah ugu deji deegaanka
server-ka ama geli `furahaAPI`. Magacyada deegaanka waa kuwa adeeg-bixiyeyaashu
isticmaalaan:

| Adeeg | `bixiye` | Magaca furaha server-ka |
| --- | --- | --- |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` |
| Mistral | `mistral` | `MISTRAL_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| Cohere | `cohere` | `COHERE_API_KEY` |
| xAI | `xai` | `XAI_API_KEY` |

Door aqoonsiga moodelka saxda ah ee adeeggaaga iyo akoonkaaga taageeraan.
`gemini-2.5-flash` ayaa ah moodelka caadiga ah haddii aan mid kale la dooran.
Tusaalooyinka moodeladu ma caddaynayaan in si toos ah loo tijaabiyey. SDK-gu
moodel cusub iskama raadiyo, adeeg kalena si qarsoodi ah uguma wareego.

Tijaabooyinka otomaatigga ahi waxay tijaabiyaan toddobada adapter iyagoo
adeegsanaya jawaabo la matalay. Ma jiraan sheegashooyin ah in moodel gaar ah
si toos ah loogu tijaabiyey akoon dhab ah.

## Isticmaalka backend-ka

Ku kaydi furaha deegaanka server-ka ama si toos ah ugu gudbi `furahaAPI`:

```js
import { abuurAI } from "abuur-ai";

const ai = abuurAI({
  bixiye: "openai",
  furahaAPI: process.env.OPENAI_API_KEY,
  moodel: "gpt-4.1-mini",
  tilmaamo: "Si cad ugu jawaab Af-Soomaali haddii luqad kale la codsan waayo."
});

const jawaab = await ai.weydii("Waa maxay barashada mashiinka?");
console.log(jawaab.text);
```

Hubi moodelka saxda ah ee akoonkaagu isticmaali karo. SDK-gu `.env`
iskii uma soo geliyo.

## Isticmaalka browser-ka iyo digniinta furaha

Barnaamijyada browser-ka ku dhisan waxay adeegsan karaan gelitaanka browser-ka:

```js
import { abuurAI } from "abuur-ai/browser";

const ai = abuurAI({
  bixiye: "gemini",
  furahaAPI: import.meta.env.VITE_GEMINI_API_KEY,
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
});

const jawaab = await ai.weydii("Salaan!");
```

**Furaha lagu daro koodhka browser-ka dadka isticmaala way arki karaan.**
SDK-gu ma qarin karo furahaas. Haddii aad sidaas doorato, isticmaal furaha
tijaabada oo xaddidan; ha gelin furahaaga wax-soo-saarka. Furayaasha
xasaasiga ah ku hay server ammaan ah, kana wac server-kaas browser-ka.

Browser entry-gu wuxuu si toos ah u taageeraa Gemini. Browser iyo Node.js mid
walba wuxuu leeyahay entry gaar ah.

## Su'aal weydii

`weydii()` waxay soo celisaa jawaab leh qaybta `.text`:

```js
const jawaab = await ai.weydii("Sidee ayuu roobku u samaysmaa?");
console.log(jawaab.text);
```

## Turjun

`turjun()` waxay qaadataa qoraalka iyo luqadda loo turjumayo:

```js
const turjumaad = await ai.turjun("Good morning.", "Af-Soomaali");
console.log(turjumaad.text);
```

Habkani wuxuu moodelka ka codsadaa turjumaad keliya. Si kastaba, natiijada
moodelku way khaldami kartaa; dib u eeg turjumaadaha muhiimka ah.

## Dooro moodel, kuna dar tilmaamo

`moodel` ku qor aqoonsiga moodelka. `tilmaamo` wuxuu dejinayaa tilmaamo guud
oo codsiyada lagu daro. Tilmaamaha hawsha gaarka ah, sida in turjumaaddu
noqoto turjumaad keliya, weli way shaqeeyaan.

Habka otomaatiga ah, u deji moodel iyo fure adeeg kasta:

```js
const ai = abuurAI({
  mode: "auto",
  providers: {
    gemini: {
      furahaAPI: process.env.GEMINI_API_KEY,
      moodel: "gemini-2.5-flash"
    },
    anthropic: {
      furahaAPI: process.env.ANTHROPIC_API_KEY,
      moodel: "your-supported-anthropic-model"
    }
  },
  tilmaamo: "Si cad ugu jawaab."
});
```

Habka otomaatiga ahi wuxuu doortaa adeeg habaysan; adeeg kale iskuma dayo
haddii codsigu fashilmo.

## Khaladaadka

Codsigu wuxuu soo celin karaa khalad haddii habayntu khaldan tahay, fure
maqan yahay, adeeggu diido codsiga, ama shabakadu shaqayn weydo:

```js
try {
  const jawaab = await ai.weydii("Salaan!");
  console.log(jawaab.text);
} catch (error) {
  console.error("Codsiga Abuur AI wuu fashilmay:", error.message);
}
```

Ha ku qorin furayaasha API ama xogta xasaasiga ah diiwaannada khaladaadka.

## TypeScript

Xirmadu waxay la socotaa noocyada TypeScript:

```ts
import { abuurAI, type AbuurAIOptions } from "abuur-ai";

const habayn: AbuurAIOptions = {
  bixiye: "gemini",
  furahaAPI: process.env.GEMINI_API_KEY,
  moodel: "gemini-2.5-flash",
  tilmaamo: "Ku jawaab Af-Soomaali."
};

const ai = abuurAI(habayn);
const jawaab = await ai.weydii("Salaan!");
```

## Xallinta dhibaatooyinka

- **Fure maqan:** hubi in furaha adeeggu yaallo deegaanka server-ka, ama u
  gudbi `furahaAPI`.
- **Fure ama oggolaansho khaldan:** hubi furaha, akoonka, iyo xadka isticmaalka.
- **Moodel lama helin:** hubi aqoonsiga `moodel` iyo in akoonkaagu heli karo.
- **Browser-ku wuu diiday codsiga:** hubi shabakadda iyo CORS. Waddo server oo
  ammaan ahi waxay ka ilaalisaa furaha wax-soo-saarka browser-ka.
- **Adeeg aan browser-ka laga taageerin:** Gemini oo keliya ayaa si toos ah
  uga shaqeeya browser-ka hadda. Adeegyada kale uga wac server aad maamusho.

## Amniga

- Furayaasha dhabta ah ha gelin Git, browser bundle, URL, ama logs.
- Backend-ka ku isticmaal environment variable ama kayd sir ah oo hosting-ku
  bixiyo.
- Furayaasha browser-ku waa muuqdaan; xaddid oo beddel haddii ay bannaanka
  u baxaan.
- Xirmadu `.env` iskama akhrido.

Faahfaahin dheeraad ah ka eeg [SECURITY.md](./SECURITY.md).

## Horumarinta iyo tijaabooyinka

Ku rakib ku-tiirsanaanta mashruuca, kadib socodsii tijaabooyinka:

```sh
npm ci
npm test
```

Tijaabooyinku waxay daboolaan Node.js, browser entry, iyo adeegyada tooska ah.
Tijaabooyinka caadiga ahi ma wacaan adeegyada AI ee tooska ah.

Akhris dheeraad ah: [Advanced configuration](./ADVANCED.md) ·
[Browser demo](./examples/browser/README.md)
