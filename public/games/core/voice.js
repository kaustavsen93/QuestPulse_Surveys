/* Voice notes: a respondent can answer a text question by speaking instead of typing (QP.questionForm, core/qp.js).
   In a published survey the recording is uploaded as soon as it stops; the server writes it down with Gemini and the
   transcript fills the answer box, so the respondent can check it, and the note's id goes into the response
   (record.voice). A Game Editor test play by a signed-in business writes the note down without saving it. Anywhere else
   (samples) the recording stays on this device. */
(function (root) {
  const QP = root.QP = root.QP || {};
  const UI = {
    record: 'Speak your answer', hint: 'No typing needed. Tap, talk, then tap Stop.', stop: 'Stop', recording: 'Recording {time}',
    writing: 'Writing down what you said…', attached: 'Voice note added. We wrote down what you said; fix anything we got wrong.',
    attachedOnly: 'Voice note added.', unclear: 'Voice note added, but we couldn\'t make out the words. You can type them too.',
    again: 'Record again', remove: 'Remove', retry: 'Try again', player: 'Your voice note',
    failed: 'We couldn\'t save your voice note. Please try again, or type your answer.',
    denied: 'Allow the microphone to record a voice note, or type your answer.',
    voiceAnswer: '(Voice note)'
  };
  const MAX_SECONDS = 90;
  // Opus in WebM (Chrome, Firefox, Android) or AAC in MP4 (Safari, iPhone); both are small and Gemini reads both.
  const TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];
  const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>';

  // Question id -> the id of the saved voice note that goes with its answer (read by QP.createSession).
  QP.voiceNotes = {};
  // Set by QP.boot for a published survey: { code, playToken }.
  QP.voiceUpload = null;

  const supported = () => !!(root.isSecureContext && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia && root.MediaRecorder);
  const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const signedInBusiness = () => {
    try { const u = JSON.parse(root.localStorage.getItem('qp_cur') || 'null'); return u && u.token && (u.role || 'business') === 'business' ? u : null; }
    catch (e) { return null; }
  };

  // Returns { id, transcript }: id is null when the note isn't saved, transcript null when it wasn't written down.
  async function send(q, blob) {
    const headers = { 'Content-Type': blob.type || 'audio/webm' };
    let url;
    if (QP.voiceUpload) {
      url = `/api/surveys/${encodeURIComponent(QP.voiceUpload.code)}/questions/${encodeURIComponent(q.id)}/voice`;
      headers['X-Play-Token'] = QP.voiceUpload.playToken;
    } else if (QP.mode === 'test' && signedInBusiness()) {
      url = `/api/voice/transcribe?question=${encodeURIComponent(q.prompt)}`;
      headers.Authorization = 'Bearer ' + signedInBusiness().token;
    } else return { id: null, transcript: null };
    const res = await fetch(url, { method: 'POST', headers, body: blob });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return { id: data.id || null, transcript: typeof data.transcript === 'string' ? data.transcript : null };
  }

  /* The voice part of a text question's form. textarea is the answer box; ready(value) is the form's.
     Returns { element, value() } where value() is the answer to submit, or null when this browser can't record. */
  QP.voiceRecorder = function (q, textarea, ready) {
    if (!supported() && QP.mode !== 'walkthrough') return null;
    const el = QP.el, ui = QP.copy(UI, QP.activeGame && QP.activeGame.config, 'voice');
    delete QP.voiceNotes[q.id];
    let attached = false, written = '', recorder = null, timer = null, blobUrl = null, lastBlob = null;

    const box = el('div', { class: 'qp-voice' });
    const status = el('p', { class: 'qp-voice-note', role: 'status' });
    const value = () => textarea.value.trim() || (attached ? ui.voiceAnswer : '');
    const update = () => ready(value());
    const button = (label, onclick, cls = 'ghost') => el('button', { type: 'button', class: cls, onclick }, label);
    const micButton = (label, onclick) => {
      const b = el('button', { type: 'button', class: 'qp-voice-btn', onclick });
      b.innerHTML = MIC;
      b.append(el('span', {}, label));
      return b;
    };
    const show = (...kids) => { box.innerHTML = ''; box.append(...kids.filter(Boolean)); };

    // Takes the last transcript out of the answer box, leaving anything the respondent typed.
    function unwrite() {
      const text = textarea.value.trim();
      if (written && text.endsWith(written)) textarea.value = text.slice(0, -written.length).trim();
      written = '';
    }
    function idle(message) {
      status.textContent = message || ui.hint;
      show(micButton(ui.record, start), status);
    }
    function remove() {
      attached = false; delete QP.voiceNotes[q.id]; unwrite();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = null; lastBlob = null;
      idle(); update();
      box.querySelector('button').focus();
    }

    async function start() {
      let stream;
      try { stream = await root.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { return idle(ui.denied); }
      const type = TYPES.find(t => root.MediaRecorder.isTypeSupported(t));
      const chunks = [];
      recorder = new root.MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : {});
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timer);
        upload(new Blob(chunks, { type: (recorder.mimeType || type || 'audio/webm').split(';')[0] }));
      };
      recorder.start();
      const began = Date.now();
      const stop = micButton(ui.stop, () => recorder.state === 'recording' && recorder.stop());
      stop.setAttribute('data-recording', '');
      stop.prepend(el('span', { class: 'qp-voice-dot', 'aria-hidden': 'true' }));
      stop.querySelector('svg').remove();
      const tick = () => {
        const s = Math.floor((Date.now() - began) / 1000);
        status.textContent = QP.fill(ui.recording, { time: `${clock(s)} / ${clock(MAX_SECONDS)}` });
        if (s >= MAX_SECONDS && recorder.state === 'recording') recorder.stop();
      };
      tick();
      timer = setInterval(tick, 250);
      show(stop, status);
      stop.focus();
    }

    async function upload(blob) {
      lastBlob = blob;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);
      status.textContent = ui.writing;
      show(el('span', { class: 'qp-voice-dot', 'aria-hidden': 'true' }), status);
      let note;
      try { note = await send(q, blob); }
      catch (e) {
        console.warn('Voice note not saved:', e.message);
        status.textContent = ui.failed;
        show(micButton(ui.retry, () => upload(lastBlob)), button(ui.remove, remove), status);
        return;
      }
      unwrite();
      if (note.transcript) {
        textarea.value = [textarea.value.trim(), note.transcript].filter(Boolean).join(' ');
        written = note.transcript;
        // Tall enough to show the whole transcript, which a spoken answer often runs past the box's usual height.
        textarea.style.height = '';
        if (textarea.scrollHeight > textarea.clientHeight) textarea.style.height = `${textarea.scrollHeight + 4}px`;
      }
      attached = true;
      if (note.id) QP.voiceNotes[q.id] = note.id; else delete QP.voiceNotes[q.id];
      status.textContent = note.transcript ? ui.attached : note.transcript === '' ? ui.unclear : ui.attachedOnly;
      const player = el('audio', { controls: '', src: blobUrl, 'aria-label': ui.player, preload: 'metadata' });
      show(player, el('div', { class: 'qp-voice-row' }, micButton(ui.again, start), button(ui.remove, remove)), status);
      update();
    }

    idle();
    return { element: box, value };
  };
})(window);
