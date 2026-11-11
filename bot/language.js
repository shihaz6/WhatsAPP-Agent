// Works out which language a WhatsApp message is written in, so the agent can reply the same way.
//   en        English
//   si / ta   Sinhala / Tamil in their own script
//   singlish  Sinhala written in English letters ("class eka kawadada?")
//   tanglish  Tamil written in English letters ("class eppo start aagum?")
// Returns null when a message doesn't say ("ok", "thanks", "👍", a number): the contact keeps
// the language they last used. Detection is a small word list, not a model: it only has to be
// right often enough to pick the reply style, and the model also sees the message itself.

const SINHALA = /[඀-෿]/g;
const TAMIL = /[஀-௿]/g;

// Common romanized words that are clearly one language. Words both use ("amma", "enna",
// "ada", "hari"/"sari") are left out.
const SINGLISH = new Set(`
  eka ekak ekata eke ekka ekath ewa meka oka ara
  kohomada kohomd mokakda mokadda monawada monawda mokada mokak monawa kawadada kawadda kawda
  koheda kohe koi kiyada keeyada kiyak kiyada kiyanna kiyala kiwwa kiwa kiyannako
  thiyenawa tiyenawa thiyanawa thiyenawada tiyenawada thiyenne tiyenne thiyeda tiyeda thiyana
  nadda neda nedda nathda nathi naha nehe nane nemei
  mata mage mama oya oyage oyata api apita apige eyala eya eyage
  puluwan puluwanda puluwand bari barida
  ganna gannada denna dhenna denawa dennada karanna karanawa karannada kalaa kala
  yanna yanawa yannada enawa enawada awa aawa aawe giya
  heta anidda iye pereda dan dawase dawasa
  labanne labenawa labeda gewanna gewwa gewala salli rupiyal
  sthuthi sthuthiy istuti isthuthi bohoma hondai hodai honda hoda
  danna dannawa kiyanna balanna ona oney onna nam ithin ithing wenna wenne wena
  ow owu ov ehenam ehema mehema wage nisa passe kalin wela welawa welawata
  duwa putha daruwa lamaya lamai lamayata panthiya panthi pantiya
  ayyo aiyo machan malli nangi akka ayya sir-ge
`.split(/\s+/).filter(Boolean));

const TANGLISH = new Set(`
  eppo eppa eppadi epdi enga enge engey yenna yen ethukku edhuku ethuku evlo evvalavu evalavu
  irukku iruku irukka irukkaa irukkuma irukkumaa irukkinga irukeenga irundha
  illa illai illaya illaiya illana illai-na
  vanakkam nandri romba rombo konjam kojam
  sollunga sollu solla solren solreenga pannunga pannu panna pannalam pannanum pannuven pannren
  venum vennum vendum veenum venuma theriyuma theriyum theriyala teriyuma teriyum teriyala
  yaaru yaar naan naanga nanga unga ungal ungaluku ungalukku enakku enaku ennaku avanga
  paiyan ponnu magan magal pasanga pullainga kuzhandhai
  nalla nallathu seri aama aamaa aamam
  kidaikkuma kidaikum kidaikkum varuma varum vaanga vanga varen varalama poganum ponga
  naalai nalaiku naalaiku nalaikku inniki innaiku innikku indru ippo ippa appuram aprom
  panam kaasu kasu fees-ku sir-ku
  venumna venumnaa kelunga kelikonga ketkalaam kekkalam solunga sollunga theriyanum theriyanumna pathi
  inga anga edhavadhu ethavathu irundha irundhaa
  aagum agum aaguma aachu achu aayiduchu mudiyuma mudiyum mudiyala
`.split(/\s+/).filter(Boolean));

// Short English words that don't occur as romanized Sinhala/Tamil words.
const ENGLISH = new Set(`
  the is are was were what when where which who how why can could will would should
  please my your our their this that these those there here have has had does did do
  i you he she we they it me him her them and but or if for from with about into
  time fees fee class classes when's what's i'm i'd you're it's don't can't
  hello hi thanks thank morning evening tomorrow today next week month
`.split(/\s+/).filter(Boolean));

// English tutoring words that get a Sinhala/Tamil ending glued on: "classeka", "Saturdayta",
// "classku", "Saturdayla", "feesoda". Only these stems count, so real English words that
// happen to end the same way ("formula", "schedule") don't.
const STEMS = "class|classes|paper|exam|theory|revision|tuition|zoom|online|hall|school|fees|fee|payment|slip|" +
  "monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|week|month|time|sir|miss|teacher|" +
  "maths|math|physics|chemistry|science|english|grade|trial|link|recording|note|notes";
const SINGLISH_SUFFIX = new RegExp(`^(${STEMS})(eka|ekata|eke|ekak|ekath|ta|wala|walata|da)$`);
const TANGLISH_SUFFIX = new RegExp(`^(${STEMS})(ku|kku|ukku|la|le|ile|oda|ode|ah|a)$`);
// Sinhala verb endings: karanawa, yanawada, gannada.
const SINGLISH_VERB = /^[a-z]{2,}(nawa|nawada|nnada|nnako)$/;

function detectLanguage(text) {
  const t = String(text ?? "");
  const si = (t.match(SINHALA) || []).length;
  const ta = (t.match(TAMIL) || []).length;
  if (si || ta) return si >= ta ? "si" : "ta";

  const words = t.toLowerCase().match(/[a-z][a-z'-]*/g) || [];
  let singlish = 0, tanglish = 0, english = 0;
  for (const w of words) {
    if (SINGLISH.has(w)) singlish += 2;
    else if (TANGLISH.has(w)) tanglish += 2;
    else if (ENGLISH.has(w)) english += 1;
    else if (SINGLISH_SUFFIX.test(w) || SINGLISH_VERB.test(w)) singlish += 1;
    else if (TANGLISH_SUFFIX.test(w)) tanglish += 1;
  }

  if (singlish || tanglish) {
    if (singlish === tanglish) return null; // can't tell
    return singlish > tanglish ? "singlish" : "tanglish";
  }
  // Plain English needs two English words, so "ok" or "Kasun" alone doesn't switch it.
  return english >= 2 ? "en" : null;
}

const LANGUAGE_NAMES = {
  en: "English",
  si: "Sinhala (Sinhala script)",
  ta: "Tamil (Tamil script)",
  singlish: "Singlish (Sinhala written in English letters)",
  tanglish: "Tanglish (Tamil written in English letters)",
};

module.exports = { detectLanguage, LANGUAGE_NAMES };
