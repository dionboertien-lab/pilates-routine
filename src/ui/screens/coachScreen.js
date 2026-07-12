import { app, showToast, escapeHTML } from '../core.js';
import { getBottomNavHTML, attachBottomNavListeners } from '../components/navigation.js';
import { db } from '../../utils/firebase.js';
import { getCurrentUser } from '../../utils/auth.js';
import { getProfile, getTotalCompleted } from '../../utils/storage.js';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, limit, serverTimestamp } from 'firebase/firestore';

// Haal de API sleutel netjes uit de .env (toekomstbestendig!)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let unsubscribeChat = null;

export function renderCoach() {
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }

  app.innerHTML = `
    <div class="screen coach-screen">
      <div class="screen__header">
        <h1 class="screen__title">Kiné Coach</h1>
        <p class="screen__subtitle">Your private concierge & feedback.</p>
      </div>

      <div class="screen__content">
        <div class="coach__premium-card" style="display: none;">
          <div class="coach__premium-icon">✨</div>
          <h2 class="coach__premium-title">Upload Form Check</h2>
          <p class="coach__premium-desc">Upload a video of your routine for personalized, anatomical feedback from our experts.</p>
          <button class="btn btn--primary coach__upload-btn">Upload Video</button>
        </div>

        <div class="coach__chat" id="coach-chat-container">
          <div class="coach__loading">Connecting to Kiné Coach...</div>
        </div>
      </div>

      <div class="coach__input-area">
        <input type="text" class="coach__input" id="coach-input" placeholder="Message your coach..." />
        <button class="coach__send-btn" id="coach-send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
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
            ${escapeHTML(data.text || '')}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

    // Auto-scroll to bottom of chat container
    setTimeout(() => {
      const chatContainer = document.getElementById('coach-chat-container');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  });

  const sendBtn = document.getElementById('coach-send');
  const input = document.getElementById('coach-input');

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    try {
      // 1. Sla gebruikersbericht op
      await addDoc(chatRef, {
        role: 'user',
        text: text,
        createdAt: serverTimestamp()
      });

      // 2. Haal geschiedenis op voor context (laatste 5 berichten)
      const qContext = query(chatRef, orderBy('createdAt', 'desc'), limit(5));
      const contextSnap = await getDocs(qContext);
      const rawHistory = [];
      contextSnap.forEach(doc => {
        const d = doc.data();
        rawHistory.unshift({
          role: d.role === 'user' ? 'user' : 'model',
          parts: [{ text: d.text }]
        });
      });

      // Voeg het nieuwe bericht toe aan de context
      rawHistory.push({ role: 'user', parts: [{ text: text }] });

      // Gemini API eist strikt afwisselende rollen (user, model, user, model). 
      // Als er twee 'user' berichten achter elkaar staan (bijv. door een eerdere fout), voegen we ze samen.
      const history = [];
      let lastRole = null;
      for (const msg of rawHistory) {
        if (msg.role !== lastRole) {
          history.push(msg);
          lastRole = msg.role;
        } else {
          history[history.length - 1].parts[0].text += '\n' + msg.parts[0].text;
        }
      }

      // 3. Roep Gemini API direct aan
      if (GEMINI_API_KEY === 'PLAK_HIER_JE_SLEUTEL') {
        throw new Error('API sleutel ontbreekt! Vul hem in bovenaan coachScreen.js.');
      }
      
      // Toon typing indicator
      const chatContainer = document.getElementById('coach-chat-container');
      if (chatContainer) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'coach__typing';
        typingDiv.id = 'coach-typing-indicator';
        typingDiv.innerText = 'Kiné Coach is typing...';
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      const profile = getProfile();
      const completed = getTotalCompleted();
      const userContext = `De gebruiker heet ${profile.name || 'deze sporter'} en heeft als doel ${profile.goals ? profile.goals.join(' en ') : 'fit worden'}. Ze hebben tot nu toe ${completed} workouts voltooid.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: history,
          systemInstruction: {
            role: 'system',
            parts: [{ text: `Je bent Kiné Coach, een high-end AI fitness en Pilates coach in een exclusieve app. Geef korte, professionele en aanmoedigende antwoorden in het Nederlands. Maximaal 2-3 zinnen. Context: ${userContext}` }]
          },
          generationConfig: { temperature: 0.7 }
        })
      });
      
      // Verwijder typing indicator
      const indicator = document.getElementById('coach-typing-indicator');
      if (indicator) indicator.remove();

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Fout bij ophalen AI antwoord');
      }
      
      const responseData = await response.json();
      const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || 'Ik ben even offline. Probeer het later opnieuw.';

      // 4. Sla het AI-antwoord op in de database
      await addDoc(chatRef, {
        role: 'model',
        text: replyText,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      // Verwijder typing indicator bij error
      const indicator = document.getElementById('coach-typing-indicator');
      if (indicator) indicator.remove();

      console.error(e);
      // Toon de ECHTE error message in de chat interface zodat de gebruiker weet wat er mis is
      await addDoc(chatRef, {
        role: 'model',
        text: `Systeemfout: ${e.message}`,
        createdAt: serverTimestamp()
      });
    }
  };

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}
