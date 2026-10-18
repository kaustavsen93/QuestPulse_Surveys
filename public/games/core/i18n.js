/* Game interface text in other languages. English lives in each game's UI object; config.lang picks a translation here.
   Story and survey text always comes from the AI in the requested language. */
(function (root) {
  const QP = root.QP = root.QP || {};

  const HI = {
    common: { skip: 'इसे छोड़ें', textPlaceholder: 'अपना जवाब यहाँ लिखें', skipped: 'छोड़ा गया' },
    detective: {
      docTitle: 'केस फ़ाइल: {title}', detectiveTitle: 'जासूस', open: 'केस खोलें', submit: 'जवाब दर्ज करें',
      statementLogged: 'बयान दर्ज हुआ', newClue: 'नया सुराग बोर्ड पर लगा', next: 'अगला गवाह', solve: 'केस सुलझाएँ', solved: 'केस सुलझ गया।',
      thanks: 'आपके बयानों के लिए धन्यवाद।', restart: 'केस फिर से शुरू करें',
      progress: 'मिले सुराग: {total} में से {n}', closed: 'केस बंद', boardTitle: 'सबूत बोर्ड', slotMissing: 'सुराग {n} अभी नहीं मिला'
    },
    rpg: {
      docTitle: 'खोज: {title}', guide: 'आपके गाइड', begin: 'सफ़र शुरू करें', submit: 'जवाब दें',
      stopLabel: 'पड़ाव {n} / {total} · {place}', progress: 'पड़ाव {n} / {total}', received: 'आपको मिला', from: '{name} की ओर से',
      travel: '{place} की ओर चलें', travelLast: '{place} की ओर बढ़ें', travelling: '{place} जा रहे हैं…', arrived: '{place} पहुँच गए।',
      gained: '{item} आपके झोले में रखा गया।', journeyDone: 'सफ़र पूरा हुआ', endTitle: 'सफ़र का अंत',
      thanks: 'रास्ते भर अपने विचार बताने के लिए धन्यवाद।', restart: 'सफ़र फिर से शुरू करें',
      satchel: 'झोला', tally: 'मिली चीज़ें: {total} में से {n}', itemMissing: 'चीज़ {n} अभी नहीं मिली', itemFound: '{item}, {place} से',
      mapTitle: '{world} का नक्शा', mapDesc: '{name} अभी {place} पर हैं। {total} में से {visited} पड़ाव पूरे।', trailhead: 'शुरुआती रास्ता'
    },
    quiz: {
      episode: 'आज: {title}', begin: 'शो शुरू करें', submit: 'जवाब पक्का करें', round: 'राउंड {n} / {total}', points: 'अंक',
      rounds: 'राउंड', applause: 'तालियाँ', earned: 'भाग लेने के अंक', answerIn: 'धन्यवाद, आपका जवाब दर्ज हो गया।', next: 'अगला राउंड',
      toFinale: 'फ़िनाले की ओर', finale: 'शो समाप्त!', finalScore: 'अंतिम स्कोर', thanks: 'साथ खेलने के लिए धन्यवाद।',
      restart: 'शो फिर से देखें', scoreNow: '{score} अंक',
      lampDone: 'राउंड {n} खेला गया', lampTodo: 'राउंड {n} बाकी है'
    },
    platformer: {
      guide: 'आपके धावक', start: 'दौड़ शुरू करें', submit: 'जवाब दें', checkpoint: 'चेकपॉइंट {n} / {total}', starGot: 'सितारा मिला!',
      keepRunning: 'दौड़ते रहें', finishRun: 'फ़िनिश तक दौड़ें', levelClear: 'लेवल पूरा!', starsTotal: 'मिले सितारे: {total} में से {n}',
      thanks: 'हमारे साथ दौड़ने के लिए धन्यवाद।', restart: 'लेवल फिर से दौड़ें',
      skipRun: 'दौड़ना छोड़ें', help: 'दौड़ने के लिए तीर कुंजियाँ या A और D। कूदने के लिए Space या W।', jump: 'कूदें',
      left: 'बाएँ दौड़ें', right: 'दाएँ दौड़ें', respawn: 'पिछले चेकपॉइंट पर वापस।', starEarned: 'सितारा {n} मिला',
      starMissing: 'सितारा {n} अभी नहीं मिला',
      canvasRun: '{level}। {name} {next} की ओर दौड़ रहे हैं। दौड़ने के लिए तीर कुंजियाँ और कूदने के लिए Space दबाएँ, या "दौड़ना छोड़ें" दबाएँ।',
      canvasPaused: '{level}। खेल रुका हुआ है।', canvasDone: '{level}। {name} फ़िनिश तक पहुँच गए।', finish: 'फ़िनिश आर्च'
    },
    reward: {
      saving: 'आपके जवाब सहेजे जा रहे हैं…', saved: 'आपके जवाब सहेज लिए गए। धन्यवाद!', failed: 'हम आपके जवाब सहेज नहीं पाए।',
      retry: 'फिर से कोशिश करें', rewardKicker: '{company} की ओर से आपका इनाम', copy: 'कोड कॉपी करें', copied: 'कॉपी हो गया!',
      once: 'यह कोड अभी कॉपी करें या लिख लें। यह सिर्फ़ एक बार दिखेगा।', signIn: 'यह कूपन सहेजने के लिए साइन इन करें',
      keeping: 'आपके कूपनों में सहेजा जा रहा है…', kept: 'आपके कूपनों में सहेज लिया गया।', allCoupons: 'मेरे कूपन देखें',
      playerOnly: 'कूपन प्लेयर खातों में सहेजे जाते हैं, इसलिए यह कोड अभी लिख लें।', used: 'यह कूपन पहले ही किसी खाते में सहेजा जा चुका है।',
      claimFailed: 'यह कूपन सहेजा नहीं जा सका। कोड लिख लें, फिर दोबारा कोशिश करें।',
      tooFast: 'कूपन उन जवाबों के लिए हैं जो थोड़ा समय लेकर दिए गए हों, इसलिए इस बार कोड नहीं मिला।',
      limit: 'इस डिवाइस को आज इस सर्वे के सभी कूपन मिल चुके हैं।',
      expired: 'यह गेम सत्र समाप्त हो गया है। अपने जवाब सहेजने के लिए सर्वे का लिंक फिर से खोलें।',
      busy: 'इस डिवाइस से बहुत सारे जवाब आ चुके हैं। कृपया थोड़ी देर बाद फिर कोशिश करें।'
    },
    voice: {
      record: 'बोलकर जवाब दें', hint: 'लिखने की ज़रूरत नहीं। दबाएँ, बोलें, फिर "रोकें" दबाएँ।', stop: 'रोकें', recording: 'रिकॉर्डिंग {time}',
      writing: 'आपकी बात लिखी जा रही है…', attached: 'वॉइस नोट जुड़ गया। हमने आपकी बात लिख दी है; कुछ गलत हो तो ठीक कर दें।',
      attachedOnly: 'वॉइस नोट जुड़ गया।', unclear: 'वॉइस नोट जुड़ गया, पर हम शब्द समझ नहीं पाए। आप चाहें तो लिख भी सकते हैं।',
      again: 'फिर से रिकॉर्ड करें', remove: 'हटाएँ', retry: 'फिर से कोशिश करें', player: 'आपका वॉइस नोट',
      failed: 'हम आपका वॉइस नोट सहेज नहीं पाए। फिर से कोशिश करें, या अपना जवाब लिखें।',
      denied: 'वॉइस नोट रिकॉर्ड करने के लिए माइक्रोफ़ोन की अनुमति दें, या अपना जवाब लिखें।',
      voiceAnswer: '(वॉइस नोट)'
    },
    back: '← QuestPulse पर वापस'
  };

  const TABLES = { hi: HI };
  // Devanagari fonts that sit well next to each game's own type
  const FONTS = { hi: 'https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600;700&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap' };

  /* Older configs have no lang field; Devanagari in the title is a safe signal. */
  const langOf = config => (config && TABLES[config.lang]) ? config.lang
    : (config && /[ऀ-ॿ]/.test(String(config.title || '')) ? 'hi' : 'en');

  /* Fonts picked in the Game Editor (config.fonts, checked against QP.FONT_CHOICES): each is loaded from Google Fonts
     once and set as the page's --head-font or --body-font, which every game uses (core/scenes.css). */
  QP.fonts = {
    apply(config) {
      const root = document.documentElement, picked = (config && config.fonts) || {};
      ['heading', 'body'].forEach(role => {
        const font = QP.FONT_CHOICES && QP.FONT_CHOICES[role][picked[role]], prop = role === 'heading' ? '--head-font' : '--body-font';
        if (!font) return root.style.removeProperty(prop);
        const id = 'qp-font-' + picked[role];
        if (!document.getElementById(id)) {
          document.head.append(Object.assign(document.createElement('link'), { id, rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${font.query}&display=swap` }));
        }
        root.style.setProperty(prop, font.family);
      });
    }
  };

  QP.i18n = {
    langOf,
    strings(config, type) {
      const t = TABLES[langOf(config)];
      return t ? Object.assign({}, t.common, t[type]) : {};
    },
    text(config, key) { const t = TABLES[langOf(config)]; return t && t[key]; },
    /* Sets <html lang> (screen readers and line breaking) and loads the script's fonts once. */
    apply(config) {
      QP.fonts.apply(config);
      const lang = langOf(config);
      document.documentElement.lang = lang;
      if (FONTS[lang] && !document.getElementById('qp-font-' + lang)) {
        document.head.append(Object.assign(document.createElement('link'), { id: 'qp-font-' + lang, rel: 'stylesheet', href: FONTS[lang] }));
      }
      const back = document.querySelector('.qp-back');
      if (back) back.textContent = (TABLES[lang] && TABLES[lang].back) || '← Back to QuestPulse';
      return lang;
    }
  };
})(window);
