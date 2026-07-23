import { app, showToast, showDialog, escapeHTML, registerScreenCleanup } from '../core.js';
import { getBottomNavHTML, attachBottomNavListeners } from '../components/navigation.js';
import { db } from '../../utils/firebase.js';
import { getCurrentUser } from '../../utils/auth.js';
import { getProfile, getTotalCompleted } from '../../utils/storage.js';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { 
  getAIProvider, 
  setAIProvider, 
  getSelectedLocalModelId, 
  setSelectedLocalModelId, 
  AVAILABLE_LOCAL_MODELS, 
  checkWebGPUSupport, 
  generateAIResponse,
  analyzeVideoForm
} from '../../utils/aiService.js';

let unsubscribeChat = null;

export function renderCoach() {
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }

  const currentProvider = getAIProvider();
  const currentModelId = getSelectedLocalModelId();

  app.innerHTML = `
    <div class="screen coach-screen">
      <div class="screen__header">
        <h1 class="screen__title">Kiné Coach</h1>
        <p class="screen__subtitle">Your private concierge & feedback.</p>
      </div>

      <div class="screen__content">
        <!-- Premium Video Form Check Card -->
        <div class="coach__premium-card" id="coach-form-check-card">
          <div class="coach__premium-icon">✨</div>
          <div class="coach__premium-text">
            <h2 class="coach__premium-title">Upload Video Form Check</h2>
            <p class="coach__premium-desc">Upload een video of foto van je Pilates oefening voor gepersonaliseerde, anatomische feedback via Gemini Multimodal AI.</p>
          </div>
          <button class="btn btn--primary coach__upload-btn" id="coach-upload-video-btn">
            🎥 Upload Video / Foto
          </button>
          <input type="file" id="form-check-file-input" accept="video/*,image/*" style="display: none;" />
        </div>

        <!-- AI Engine Bar -->
        <div class="coach__engine-bar" id="coach-engine-bar">
          <div class="coach__engine-info">
            <span class="coach__engine-icon">${currentProvider === 'local' ? '📱' : '☁️'}</span>
            <div class="coach__engine-details">
              <span class="coach__engine-title">${currentProvider === 'local' ? 'Lokale LLM (On-Device)' : 'Google Gemini (Cloud)'}</span>
              <span class="coach__engine-subtext" id="engine-subtext">
                ${currentProvider === 'local' ? getModelName(currentModelId) : 'Vereist internet & API-sleutel'}
              </span>
            </div>
          </div>
          <button class="btn btn--secondary coach__engine-btn" id="coach-engine-settings-btn">
            ⚙️ AI Kies
          </button>
        </div>

        <!-- Download / Processing Progress Bar -->
        <div class="coach__download-card" id="coach-download-card" style="display: none;">
          <div class="coach__download-header">
            <span class="coach__download-title" id="download-status-title">Model downloaden...</span>
            <span class="coach__download-pct" id="download-status-pct">0%</span>
          </div>
          <div class="coach__progress-bar">
            <div class="coach__progress-fill" id="download-progress-fill" style="width: 0%;"></div>
          </div>
          <p class="coach__download-detail" id="download-status-detail">Bestanden worden verwerkt...</p>
        </div>

        <div class="coach__chat" id="coach-chat-container">
          <div class="coach__loading">Connecting to Kiné Coach...</div>
        </div>
      </div>

      <div class="coach__input-area">
        <button class="coach__media-btn" id="coach-media-btn" title="Upload Video voor Form Check" aria-label="Upload video of foto voor Form Check">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </button>
        <input type="text" class="coach__input" id="coach-input" placeholder="Message your coach..." aria-label="Bericht voor Kiné Coach" />
        <button class="coach__send-btn" id="coach-send" aria-label="Verstuur bericht">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      <!-- Modal voor AI Selector -->
      <div class="modal" id="ai-settings-modal" style="display: none;">
        <div class="modal__content coach__modal-content">
          <div class="modal__header">
            <h3>AI Engine & Model Selectie</h3>
            <button class="modal__close" id="ai-modal-close">&times;</button>
          </div>
          <div class="modal__body">
            <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
              Kies hoe je AI Kiné Coach wil uitvoeren op je apparaat voor tekst-chat.
            </p>

            <div class="coach__option-group">
              <label class="coach__radio-card ${currentProvider === 'cloud' ? 'coach__radio-card--selected' : ''}" id="option-cloud">
                <input type="radio" name="ai_provider_radio" value="cloud" ${currentProvider === 'cloud' ? 'checked' : ''} />
                <div class="coach__radio-content">
                  <strong>☁️ Google Gemini Cloud (Aanbevolen)</strong>
                  <p>Directe antwoorden & Vorm Check. Lichtgewicht (0 MB download).</p>
                </div>
              </label>

              <label class="coach__radio-card ${currentProvider === 'local' ? 'coach__radio-card--selected' : ''}" id="option-local">
                <input type="radio" name="ai_provider_radio" value="local" ${currentProvider === 'local' ? 'checked' : ''} />
                <div class="coach__radio-content">
                  <strong>📱 Lokale LLM (On-Device via WebGPU)</strong>
                  <p>100% lokaal & privé. ⚠️ Vereist eenmalige download van 0.35 - 1.9 GB en WebGPU ondersteuning op je mobiel.</p>
                </div>
              </label>
            </div>

            <div class="coach__local-models-section" id="local-models-section" style="${currentProvider === 'local' ? 'display: block;' : 'display: none;'}">
              <h4 style="margin-top: 1.2rem; margin-bottom: 0.5rem;">Kies Lokaal Model (Llama 3.2 / DeepSeek R1 / Gemma 2 / Qwen 2.5)</h4>
              <div class="coach__model-list">
                ${AVAILABLE_LOCAL_MODELS.map(m => `
                  <div class="coach__model-card ${currentModelId === m.id ? 'coach__model-card--selected' : ''}" data-model-id="${m.id}">
                    <div class="coach__model-main">
                      <strong>${escapeHTML(m.name)}</strong>
                      <div>
                        ${m.badge ? `<span class="coach__model-badge">${escapeHTML(m.badge)}</span>` : ''}
                        <span class="coach__model-tag">${escapeHTML(m.size)}</span>
                      </div>
                    </div>
                    <p class="coach__model-desc">${escapeHTML(m.desc)}</p>
                    <span class="coach__model-ram">RAM advies: ${escapeHTML(m.recommendedRAM)}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="modal__footer" style="margin-top: 1.5rem; text-align: right;">
              <button class="btn btn--primary" id="ai-settings-save">Opslaan & Gebruiken</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${getBottomNavHTML('coach')}
  `;

  attachBottomNavListeners();

  const user = getCurrentUser();
  if (!user) {
    document.getElementById('coach-chat-container').innerHTML = `
      <div class="coach__message coach__message--received">
        <div class="coach__avatar">F</div>
        <div class="coach__bubble">Please log in to use the Kiné AI Coach.</div>
      </div>`;
    return;
  }

  // Setup Firebase Firestore chat stream
  const chatRef = collection(db, 'users', user.uid, 'chats');
  const q = query(chatRef, orderBy('createdAt', 'asc'));

  unsubscribeChat = onSnapshot(q, (snapshot) => {
    const container = document.getElementById('coach-chat-container');
    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="coach__message coach__message--received">
          <div class="coach__avatar">F</div>
          <div class="coach__bubble">
            Welcome to Kiné Premium. How can I assist you with your routine today?
          </div>
        </div>
      `;
      return;
    }

    let html = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isUser = data.role === 'user';
      html += `
        <div class="coach__message ${isUser ? 'coach__message--sent' : 'coach__message--received'}">
          ${!isUser ? '<div class="coach__avatar">F</div>' : ''}
          <div class="coach__bubble">
            ${escapeHTML(data.text || '').replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

    setTimeout(() => {
      const chatContainer = document.getElementById('coach-chat-container');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  });

  // Event Listeners voor AI Selector Modal
  const settingsBtn = document.getElementById('coach-engine-settings-btn');
  const modal = document.getElementById('ai-settings-modal');
  const modalClose = document.getElementById('ai-modal-close');
  const modalSave = document.getElementById('ai-settings-save');

  const optionCloud = document.getElementById('option-cloud');
  const optionLocal = document.getElementById('option-local');
  const localModelsSection = document.getElementById('local-models-section');

  if (settingsBtn && modal) {
    settingsBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
  }

  if (modalClose && modal) {
    modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
  }

  const radios = document.querySelectorAll('input[name="ai_provider_radio"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isLocal = e.target.value === 'local';
      localModelsSection.style.display = isLocal ? 'block' : 'none';
      optionCloud.classList.toggle('coach__radio-card--selected', !isLocal);
      optionLocal.classList.toggle('coach__radio-card--selected', isLocal);
    });
  });

  let selectedModelInModal = currentModelId;
  const modelCards = document.querySelectorAll('.coach__model-card');
  modelCards.forEach(card => {
    card.addEventListener('click', () => {
      modelCards.forEach(c => c.classList.remove('coach__model-card--selected'));
      card.classList.add('coach__model-card--selected');
      selectedModelInModal = card.dataset.modelId;
    });
  });

  if (modalSave) {
    modalSave.addEventListener('click', async () => {
      const chosenProvider = document.querySelector('input[name="ai_provider_radio"]:checked').value;
      setAIProvider(chosenProvider);
      setSelectedLocalModelId(selectedModelInModal);

      if (chosenProvider === 'local') {
        const gpuCheck = await checkWebGPUSupport();
        if (!gpuCheck.supported) {
          showToast(gpuCheck.reason, 'error');
          setAIProvider('cloud');
          renderCoach();
          return;
        }
      }

      modal.style.display = 'none';
      showToast(`AI Engine ingesteld op: ${chosenProvider === 'local' ? 'Lokale LLM' : 'Google Gemini Cloud'}`);
      renderCoach();
    });
  }

  // Video Upload & Form Check Handler
  const fileInput = document.getElementById('form-check-file-input');
  const uploadBtn = document.getElementById('coach-upload-video-btn');
  const mediaBtn = document.getElementById('coach-media-btn');

  const triggerUpload = () => {
    if (fileInput) fileInput.click();
  };

  if (uploadBtn) uploadBtn.addEventListener('click', triggerUpload);
  if (mediaBtn) mediaBtn.addEventListener('click', triggerUpload);

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      fileInput.value = '';

      showDialog(
        '🔒 Privacy & AI Form Check',
        'Vier stilstaande beelden uit je bestand worden verwerkt door Google Gemini AI voor anatomische feedback. Zorg dat er geen gevoelige beelden van derden zichtbaar zijn. Wil je doorgaan met de analyse?',
        'Ja, verwerk beelden',
        'Annuleren',
        async () => {
          const isVideo = file.type.startsWith('video/');
          const fileLabel = isVideo ? '🎥 [Videobestand geüpload voor Vorm-check]' : '📷 [Afbeelding geüpload voor Vorm-check]';

          try {
            await addDoc(chatRef, {
              role: 'user',
              text: fileLabel,
              createdAt: serverTimestamp()
            });

        const downloadCard = document.getElementById('coach-download-card');
        const downloadTitle = document.getElementById('download-status-title');
        const downloadPct = document.getElementById('download-status-pct');
        const downloadFill = document.getElementById('download-progress-fill');
        const downloadDetail = document.getElementById('download-status-detail');

        if (downloadCard) {
          downloadCard.style.display = 'block';
          downloadTitle.innerText = 'Video / Foto analyseren...';
          downloadPct.innerText = '10%';
          downloadFill.style.width = '10%';
          downloadDetail.innerText = 'Sleutelframes worden verwerkt...';
        }

        const chatContainer = document.getElementById('coach-chat-container');
        if (chatContainer) {
          const typingDiv = document.createElement('div');
          typingDiv.className = 'coach__typing';
          typingDiv.id = 'coach-typing-indicator';
          typingDiv.innerText = 'Kiné Gemini Multimodal is de houding aan het analyseren...';
          chatContainer.appendChild(typingDiv);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        const feedback = await analyzeVideoForm({
          file: file,
          exerciseName: 'Pilates Routine',
          onProgress: (text, pct) => {
            if (downloadCard) {
              downloadTitle.innerText = 'Kiné Form Check verwerken...';
              downloadPct.innerText = `${pct}%`;
              downloadFill.style.width = `${pct}%`;
              downloadDetail.innerText = text;
            }
          }
        });

        if (downloadCard) downloadCard.style.display = 'none';
        const indicator = document.getElementById('coach-typing-indicator');
        if (indicator) indicator.remove();

        const reportText = `✨ Kiné Anatomische Form Check Rapport:\n\n${feedback}`;
        await addDoc(chatRef, {
          role: 'model',
          text: reportText,
          createdAt: serverTimestamp()
        });

        showToast('Form Check analyse voltooid!', 'success');

      } catch (err) {
        console.error(err);
        const downloadCard = document.getElementById('coach-download-card');
        if (downloadCard) downloadCard.style.display = 'none';

        const indicator = document.getElementById('coach-typing-indicator');
        if (indicator) indicator.remove();

        await addDoc(chatRef, {
          role: 'model',
          text: `Fout bij Vorm-Check analyse: ${err.message}`,
          createdAt: serverTimestamp()
        });
        showToast(`Video-analyse mislukt: ${err.message}`, 'error');
      }
    });
  });

  // Send Message Logic
  const sendBtn = document.getElementById('coach-send');
  const input = document.getElementById('coach-input');

  registerScreenCleanup('coach', () => {
    if (unsubscribeChat) {
      unsubscribeChat();
      unsubscribeChat = null;
    }
  });

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    try {
      // Fetch previous chat history BEFORE adding current prompt to avoid prompt duplication in context
      const qContext = query(chatRef, orderBy('createdAt', 'desc'), limit(6));
      const contextSnap = await getDocs(qContext);
      const history = [];
      contextSnap.forEach(doc => {
        const d = doc.data();
        history.unshift({
          role: d.role === 'user' ? 'user' : 'model',
          parts: [{ text: d.text }]
        });
      });

      await addDoc(chatRef, {
        role: 'user',
        text: text,
        createdAt: serverTimestamp()
      });

      const chatContainer = document.getElementById('coach-chat-container');
      if (chatContainer) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'coach__typing';
        typingDiv.id = 'coach-typing-indicator';
        typingDiv.innerText = getAIProvider() === 'local' ? 'Lokale AI denkt na...' : 'Kiné Coach is typing...';
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      const profile = getProfile();
      const completed = getTotalCompleted();
      const userContext = `De gebruiker heet ${profile.name || 'deze sporter'} en heeft als doel ${profile.goals ? profile.goals.join(' en ') : 'fit worden'}. Ze hebben tot nu toe ${completed} workouts voltooid.`;
      const systemInstruction = `Je bent Kiné Coach, een high-end AI fitness en Pilates coach in een exclusieve app. Geef korte, professionele en aanmoedigende antwoorden in het Nederlands. Maximaal 2-3 zinnen. Context: ${userContext}`;

      const downloadCard = document.getElementById('coach-download-card');
      const downloadTitle = document.getElementById('download-status-title');
      const downloadPct = document.getElementById('download-status-pct');
      const downloadFill = document.getElementById('download-progress-fill');
      const downloadDetail = document.getElementById('download-status-detail');

      const replyText = await generateAIResponse({
        prompt: text,
        history: history,
        systemInstruction: systemInstruction,
        onProgress: (progressText, pct) => {
          if (downloadCard) {
            downloadCard.style.display = 'block';
            downloadTitle.innerText = 'Lokale LLM Laden / Downloaden...';
            downloadPct.innerText = `${pct}%`;
            downloadFill.style.width = `${pct}%`;
            downloadDetail.innerText = progressText;
          }
        }
      });

      if (downloadCard) downloadCard.style.display = 'none';
      const indicator = document.getElementById('coach-typing-indicator');
      if (indicator) indicator.remove();

      await addDoc(chatRef, {
        role: 'model',
        text: replyText,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      const downloadCard = document.getElementById('coach-download-card');
      if (downloadCard) downloadCard.style.display = 'none';

      const indicator = document.getElementById('coach-typing-indicator');
      if (indicator) indicator.remove();

      console.error("AI error:", e);
      showToast(getAIProvider() === 'local' ? 'Lokaal model kon geen antwoord genereren.' : 'Gemini Cloud verbinding mislukt.', 'error');
    }
  };

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}
}

function getModelName(id) {
  const found = AVAILABLE_LOCAL_MODELS.find(m => m.id === id);
  return found ? found.name : id;
}
