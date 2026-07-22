import { CreateMLCEngine } from '@mlc-ai/web-llm';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL; // Optional backend proxy endpoint

export const AVAILABLE_LOCAL_MODELS = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 (1B)',
    size: '~880 MB',
    badge: 'Nieuw & Aanbevolen',
    desc: 'Meta\'s nieuwste lightweight on-device model. Zeer slim en efficiënt.',
    recommendedRAM: '2GB+'
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 (3B)',
    size: '~1.9 GB',
    badge: 'High Quality',
    desc: 'Bovenklasse redeneervermogen van Meta op het apparaat.',
    recommendedRAM: '4GB+'
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-1.5B-q4f16_1-MLC',
    name: 'DeepSeek R1 Distill (1.5B)',
    size: '~1.1 GB',
    badge: 'Reasoning AI',
    desc: 'Het populaire DeepSeek R1 redeneermodel, geoptimaliseerd voor mobiel.',
    recommendedRAM: '2.5GB+'
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (1.5B)',
    size: '~1.2 GB',
    badge: 'Top Meertalig',
    desc: 'Uitstekend in Nederlands en nauwkeurig opvolgen van instructies.',
    recommendedRAM: '2.5GB+'
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Google Gemma 2 (2B)',
    size: '~1.5 GB',
    badge: 'Google AI',
    desc: 'Google\'s 2e generatie Gemma model voor on-device taken.',
    recommendedRAM: '3GB+'
  },
  {
    id: 'SmolLM-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM (360M)',
    size: '~350 MB',
    badge: 'Ultra-Licht',
    desc: 'Super compact. Werkt soepel op vrijwel elk mobiel toestel.',
    recommendedRAM: '1GB+'
  }
];


const STORAGE_KEYS = {
  PROVIDER: 'ai_provider', // 'cloud' | 'local'
  MODEL_ID: 'ai_local_model' // Selected local model ID
};

let mlcEngine = null;
let currentEngineModelId = null;
let initializationPromise = null;

export function getAIProvider() {
  return localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'cloud';
}

export function setAIProvider(provider) {
  if (provider !== 'cloud' && provider !== 'local') return;
  localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
}

export function getSelectedLocalModelId() {
  return localStorage.getItem(STORAGE_KEYS.MODEL_ID) || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
}

export function setSelectedLocalModelId(modelId) {
  localStorage.setItem(STORAGE_KEYS.MODEL_ID, modelId);
}

export async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'WebGPU is niet ondersteund in deze browser of WebView. Gebruik Google Gemini (Cloud).'
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: 'Geen geschikte WebGPU grafische adapter gevonden op dit apparaat.'
      };
    }
    return { supported: true, reason: 'WebGPU is beschikbaar' };
  } catch (e) {
    return {
      supported: false,
      reason: `WebGPU controle mislukt: ${e.message}`
    };
  }
}

export async function initLocalEngine(modelId = null, onProgress = null) {
  const selectedModel = modelId || getSelectedLocalModelId();
  if (mlcEngine && currentEngineModelId === selectedModel) {
    return mlcEngine;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const gpuCheck = await checkWebGPUSupport();
    if (!gpuCheck.supported) {
      throw new Error(gpuCheck.reason);
    }
    const engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (progress) => {
        if (onProgress) {
          const text = progress.text || 'Laden...';
          const pct = Math.round((progress.progress || 0) * 100);
          onProgress(text, pct);
        }
      }
    });
    mlcEngine = engine;
    currentEngineModelId = selectedModel;
    return engine;
  })();

  try {
    return await initializationPromise;
  } catch (err) {
    mlcEngine = null;
    currentEngineModelId = null;
    throw new Error(`Fout bij laden van lokaal model (${selectedModel}): ${err.message}`);
  } finally {
    initializationPromise = null;
  }
}

export function isEngineLoaded() {
  return mlcEngine !== null;
}

export async function generateAIResponse({ prompt, history = [], systemInstruction = '', onProgress = null }) {
  const provider = getAIProvider();

  if (provider === 'local') {
    const engine = await initLocalEngine(null, onProgress);

    const formattedMessages = [];
    if (systemInstruction) {
      formattedMessages.push({ role: 'system', content: systemInstruction });
    }

    history.forEach((msg) => {
      const role = msg.role === 'model' ? 'assistant' : msg.role;
      const text = msg.parts ? msg.parts.map(p => p.text).join('\n') : (msg.text || '');
      if (text) {
        formattedMessages.push({ role: role, content: text });
      }
    });

    formattedMessages.push({ role: 'user', content: prompt });

    const completion = await engine.chat.completions.create({
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 256
    });

    return completion.choices[0]?.message?.content || 'Geen antwoord gegenereerd.';
  } else {
    // Cloud API via Google Gemini REST API
    if (!AI_PROXY_URL && (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLAK_HIER_JE_SLEUTEL')) {
      throw new Error('Google Gemini API-sleutel of Proxy URL ontbreekt in de configuratie.');
    }

    const contentsHistory = [];
    history.forEach(msg => {
      const role = msg.role === 'user' ? 'user' : 'model';
      const text = msg.parts ? msg.parts[0]?.text : (msg.text || '');
      contentsHistory.push({ role, parts: [{ text }] });
    });
    contentsHistory.push({ role: 'user', parts: [{ text: prompt }] });

    // Sanitize strictly alternating roles
    const historyClean = [];
    let lastRole = null;
    for (const msg of contentsHistory) {
      if (msg.role !== lastRole) {
        historyClean.push(msg);
        lastRole = msg.role;
      } else {
        historyClean[historyClean.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      }
    }

    const targetEndpoint = AI_PROXY_URL 
      ? AI_PROXY_URL 
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: historyClean,
        systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: { temperature: 0.7 }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Fout bij aanroepen van Gemini API');
    }

    const responseData = await response.json();
    return responseData.candidates?.[0]?.content?.parts?.[0]?.text || 'Geen antwoord ontvangen van Gemini Cloud.';
  }
}

function seekVideo(video, time, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video-seek duurde te lang.'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    }

    function handleSeeked() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error('Video-frame kon niet geladen worden.'));
    }

    video.addEventListener('seeked', handleSeeked, { once: true });
    video.addEventListener('error', handleError, { once: true });
    video.currentTime = time;
  });
}

export async function extractVideoKeyframes(videoFile, numFrames = 4) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(videoFile);
    video.preload = 'metadata';
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = Number(video.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
          throw new Error('De videoduur kon niet worden bepaald.');
        }

        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
          throw new Error('De video heeft geen geldige afmetingen.');
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(width, 800);
        canvas.height = Math.round((canvas.width / width) * height);
        const ctx = canvas.getContext('2d');

        const frames = [];
        const interval = duration / (numFrames + 1);

        for (let i = 1; i <= numFrames; i++) {
          const time = interval * i;
          await seekVideo(video, time, 8000);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          frames.push(dataUrl.split(',')[1]);
        }

        resolve(frames);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Fout bij het laden van het videobestand in de browser.'));
    };
  });
}

export async function extractImagePayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const separatorIndex = result.indexOf(',');
      if (separatorIndex < 0) {
        reject(new Error('Ongeldige afbeeldingsdata.'));
        return;
      }
      resolve({
        mimeType: file.type || 'image/jpeg',
        data: result.slice(separatorIndex + 1)
      });
    };
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 75 * 1024 * 1024;

export function validateFormCheckFile(file) {
  if (!(file instanceof File)) {
    throw new Error('Geen geldig bestand geselecteerd.');
  }

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('Selecteer een afbeelding of een videobestand.');
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Het bestand mag maximaal ${maxMb} MB zijn.`);
  }

  return { isImage, isVideo };
}

export async function analyzeVideoForm({ file, exerciseName = 'Pilates oefening', onProgress = null }) {
  if (!AI_PROXY_URL && (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLAK_HIER_JE_SLEUTEL')) {
    throw new Error('Google Gemini API-sleutel of Proxy URL ontbreekt in de configuratie voor video-analyse.');
  }

  const { isImage, isVideo } = validateFormCheckFile(file);
  let inlineParts = [];

  if (isVideo) {
    if (onProgress) onProgress('Video keyframes verwerken...', 30);
    const frames = await extractVideoKeyframes(file, 4);
    inlineParts = frames.map(f => ({
      inlineData: { mimeType: 'image/jpeg', data: f }
    }));
  } else if (isImage) {
    if (onProgress) onProgress('Afbeelding verwerken...', 50);
    const imgPayload = await extractImagePayload(file);
    inlineParts = [{
      inlineData: imgPayload
    }];
  }

  if (onProgress) onProgress('Anatomische analyse uitvoeren via Kiné Gemini Multimodal Cloud...', 70);

  const FORM_CHECK_SYSTEM_INSTRUCTION = `Je geeft uitsluitend algemene, educatieve bewegings- en houdingsfeedback.
Belangrijke beperkingen:
- Stel geen medische diagnose.
- Beoordeel geen blessures, pijnklachten of medische aandoeningen.
- Doe geen uitspraken alsof stilstaande beelden volledige zekerheid bieden.
- Benoem onzekerheid wanneer camerahoek of kleding de beoordeling beperkt.
- Adviseer te stoppen bij pijn of duizeligheid en verwijs bij klachten naar een bevoegde arts of fysiotherapeut.
- Gebruik neutrale termen zoals "mogelijk zichtbaar" en "op basis van deze beelden".`;

  const promptText = `${FORM_CHECK_SYSTEM_INSTRUCTION}

Analyseer de geüploade beelden van de oefening ("${exerciseName}"). Geef een heldere en educatieve beoordeling in het Nederlands met de volgende opbouw:

🧘 **Mogelijk Zichtbare Uitlijning**: Wat valt op aan de positie op basis van deze beelden?
⚠️ **Aandachtspunten**: Waar zit mogelijke compensatie (bijv. bekken, schouders, wervelkolom)?
💡 **3 Bewegingstips**: Geef 3 algemene tips om de controle te verbeteren.`;

  const targetEndpoint = AI_PROXY_URL 
    ? AI_PROXY_URL 
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(targetEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: promptText },
          ...inlineParts
        ]
      }],
      generationConfig: { temperature: 0.4 }
    })
  });

  if (onProgress) onProgress('Rapport genereren...', 95);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Fout bij verzenden van beelden naar Gemini Multimodal API.');
  }

  const responseData = await response.json();
  const feedbackText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!feedbackText) {
    throw new Error('Geen analyse-uitslag ontvangen van de Multimodale AI.');
  }

  return feedbackText;
}

