// The words the frame itself says (intro kicker, top bar, outro, spoken title),
// per language. A series picks one in series.config.mjs and may override any key.
// Add a language by copying a preset; keep the spoken title short — it is voiced.

const AR_ORDINALS = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة", "الحادية عشرة", "الثانية عشرة"];
const EN_ORDINALS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export const STRINGS = {
  en: {
    kicker: (n, total) => `Getting started · Episode ${n} of ${total}`,
    episodeOf: (n, total) => `Episode ${n} of ${total}`,
    nextUp: "Next episode",
    seriesEnd: "That's the series",
    seriesEndTitle: "You're ready to start",
    spokenTitle: (n, title) => `Episode ${EN_ORDINALS[n - 1] ?? n}: ${title}.`,
  },
  // Modern Standard Arabic.
  "ar-msa": {
    kicker: (n, total) => `دليل البدء · الحلقة ${n} من ${total}`,
    episodeOf: (n, total) => `الحلقة ${n} من ${total}`,
    nextUp: "في الحلقة التالية",
    seriesEnd: "انتهت السلسلة",
    seriesEndTitle: "كل شيء جاهز لبدء العمل",
    spokenTitle: (n, title) => `الحلقة ${AR_ORDINALS[n - 1] ?? n}: ${title}.`,
  },
  // Egyptian colloquial for the voice-led parts; the kicker and top bar stay MSA (they are labels).
  "ar-egyptian": {
    kicker: (n, total) => `دليل البدء · الحلقة ${n} من ${total}`,
    episodeOf: (n, total) => `الحلقة ${n} من ${total}`,
    nextUp: "في الحلقة الجاية",
    seriesEnd: "كده خلّصنا السلسلة",
    seriesEndTitle: "كده جاهزين نبدأ الشغل",
    spokenTitle: (n, title) => `الحلقة ${AR_ORDINALS[n - 1] ?? n}: ${title}.`,
  },
};
