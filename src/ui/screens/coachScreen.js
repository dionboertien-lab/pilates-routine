import { app } from '../core.js';
import { getBottomNavHTML, attachBottomNavListeners } from '../components/navigation.js';

export function renderCoach() {
  app.innerHTML = `
    <div class="screen coach-screen">
      <div class="screen__header">
        <h1 class="screen__title">Forma Coach</h1>
        <p class="screen__subtitle">Your private concierge & feedback.</p>
      </div>

      <div class="screen__content">
        <div class="coach__premium-card">
          <div class="coach__premium-icon">✨</div>
          <h2 class="coach__premium-title">Upload Form Check</h2>
          <p class="coach__premium-desc">Upload a video of your routine for personalized, anatomical feedback from our experts.</p>
          <button class="btn btn--primary coach__upload-btn">Upload Video</button>
        </div>

        <div class="coach__chat">
          <div class="coach__message coach__message--received">
            <div class="coach__avatar">F</div>
            <div class="coach__bubble">
              Welcome to Forma. I noticed your HRV was optimal today. Ready to push your limits in today's routine?
            </div>
          </div>
          <div class="coach__message coach__message--sent">
            <div class="coach__bubble">
              Yes! But my lower back feels a bit stiff.
            </div>
          </div>
          <div class="coach__message coach__message--received">
            <div class="coach__avatar">F</div>
            <div class="coach__bubble">
              Noted. Focus on your transverse abdominis activation during the pelvic tilts. Let's keep the amplitude small today.
            </div>
          </div>
        </div>
      </div>

      <div class="coach__input-area">
        <input type="text" class="coach__input" placeholder="Message your coach..." />
        <button class="coach__send-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      ${getBottomNavHTML('coach')}
    </div>
  `;

  attachBottomNavListeners();
}
