import { getProfile } from './storage.js';

export const translations = {
  nl: {
    // Shared
    'btn.back': '← Terug',
    'btn.save': 'Opslaan',
    'btn.cancel': 'Annuleren',
    'btn.confirm': 'Bevestigen',
    'btn.next': 'Volgende →',
    'btn.quit': '✕ Stop',
    'btn.skip': 'Overslaan',
    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pauze',
    'btn.finish': 'Afronden ✓',
    'nav.home': 'Home',
    'nav.coach': 'Coach',
    'nav.community': 'Community',
    'nav.settings': 'Instellingen',
    
    // Home
    'home.greeting': 'Hoi',
    'home.minPerDay': 'min per dag',
    'home.daysPerWeek': 'dagen per week',
    'home.avgLevel': 'Gem. Niveau',
    'home.today': 'Vandaag',
    'home.doneToday': 'Vandaag al voltooid — goed bezig! 💚',
    'home.playAgain': '✓ Nogmaals oefenen',
    'home.workouts': 'Workouts',
    'home.weeks': 'Weken',
    'home.intensity': 'Intensiteit',
    'home.scienceBadge': 'Science-Backed (TUT)',
    'home.quote': '♥ Jouw consistentie vandaag, is je resultaat morgen. ♥',
    
    // Calendar
    'calendar.title': '📅 Schema',
    'calendar.reset': 'Voortgang resetten',
    'calendar.days': ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'],

    // Onboarding
    'ob.step.of': 'Stap {0} van {1}',
    'ob.welcome.title': 'Welkom!',
    'ob.welcome.sub': 'Laten we je Pilates routine instellen.',
    'ob.name.label': 'Hoe mogen we je noemen?',
    'ob.name.placeholder': 'Je naam...',
    'ob.gender.title': 'Wat is je geslacht?',
    'ob.gender.sub': 'Hier stemmen we de oefeningen op af.',
    'ob.gender.f': 'Vrouw',
    'ob.gender.m': 'Man',
    'ob.gender.n': 'Liever niet zeggen',
    'ob.goals.title': 'Waar wil je aan werken',
    'ob.goals.sub': 'Kies één of meer focusgebieden.',
    'ob.goals.legs': 'Billen & Benen',
    'ob.goals.core': 'Core, Buik & Armen',
    'ob.goals.back': 'Rug & Houding',
    'ob.goals.all': 'Alles',
    'ob.level.title': 'Wat is je startniveau?',
    'ob.level.sub': 'We bouwen de intensiteit vanaf hier langzaam op.',
    'ob.level.beg.title': 'Beginner (Makkelijk)',
    'ob.level.beg.desc': 'Start rustig aan.',
    'ob.level.int.title': 'Gemiddeld',
    'ob.level.int.desc': 'Je hebt al wat ervaring.',
    'ob.level.adv.title': 'Gevorderd',
    'ob.level.adv.desc': 'Klaar voor een uitdaging!',
    'ob.time.title': 'Tijd & frequentie',
    'ob.time.sub': 'Hoeveel tijd per dag en hoe vaak per week?',
    'ob.time.minLabel': 'Minuten per dag',
    'ob.time.daysLabel': 'Dagen per week',
    'ob.start.title': 'Wanneer begin je?',
    'ob.start.sub': 'Het schema start op deze datum.',
    'ob.btn.start': 'Starten! 🎉',

    // Settings
    'set.title': 'Instellingen',
    'set.name': 'Naam',
    'set.startDate': 'Startdatum Schema',
    'set.lvl.core': 'Niveau Core, Buik & Armen',
    'set.lvl.legs': 'Niveau Billen & Benen',
    'set.lvl.back': 'Niveau Rug & Houding',
    'set.gender': 'Geslacht',
    'set.goals': 'Focusgebieden',
    'set.stretch': 'Inclusief stretch',
    'set.resetAll': 'Alles resetten & opnieuw beginnen',
    'set.language': 'Taal',
    'set.theme': 'Thema',
    'set.theme.light': 'Licht',
    'set.theme.dark': 'Donker',
    'set.theme.auto': 'Automatisch',
    
    // Workout
    'wk.nextSection': 'Volgende sectie',
    'wk.hold': '🔒 Houd vast!',
    'wk.ofReps': 'van {0} reps',
    'wk.tapHint': 'Langzaam: ±4 sec. per rep',
    'wk.tut.tooFast': 'Te snel! Behoud de spierspanning (Time Under Tension).',
    'wk.seconds': 'seconden',
    'wk.intro.encouragement1': 'Laten we beginnen, {0}! 🌿',
    'wk.intro.encouragement2': 'Goed bezig, {0}! 💪',
    'wk.intro.encouragement3': 'Klaar voor de volgende? 🔥',
    'wk.intro.encouragement4': 'Je doet het geweldig! 🌟',
    'wk.intro.btn': 'Laten we gaan →',

    // Complete
    'comp.title': 'Routine Voltooid!',
    'comp.msg1': 'Geweldig gedaan, {0}! Je lichaam bedankt je. 💚',
    'comp.msg2': 'Weer een workout erop! Elke dag een stapje sterker.',
    'comp.msg3': 'Fantastisch! Consistentie is de sleutel. 🔑',
    'comp.workoutsTotal': 'Workouts totaal',
    'comp.currentWeek': 'Huidig',
    'comp.btn.home': 'Terug naar Home',
    'comp.btn.leaderboard': 'Bekijk Leaderboard 🏆',

    // Community
    'comm.title': 'Community 🏆',
    'comm.logout': 'Log uit',
    'comm.inviteCopy': '🔗 Invite Link Kopiëren',
    'comm.inviteCopied': '✓ Gekopieerd!',
    'comm.newGroup': '➕ Nieuwe Groep',
    'comm.loading': 'Laden...',
    'comm.empty': 'Nog niemand in deze groep.',
    'comm.you': '(Jij)',
    'comm.week': 'Week',
    'comm.lastActive': 'Laatst actief:',
    'comm.missed': 'gemist',

    // Auth
    'auth.title': 'Word lid van de Community',
    'auth.sub1': 'Log in om je voortgang te vergelijken, samen met vrienden te trainen in privé groepen, en gemotiveerd te blijven.',
    'auth.sub2': 'Log in om de uitnodiging voor groep <b>{0}</b> te accepteren!',
    'auth.google': 'Ga verder met Google',
    'auth.or': 'of',
    'auth.email': 'E-mailadres',
    'auth.pass': 'Wachtwoord',
    'auth.loginBtn': 'Inloggen',
    'auth.regBtn': 'Registreren',

    // Dialogs
    'dlg.quit.title': 'Routine stoppen?',
    'dlg.quit.msg': 'Je voortgang voor deze workout gaat verloren.',
    'dlg.quit.confirm': 'Doorgaan',
    'dlg.quit.cancel': 'Stoppen',
    'dlg.reset.title': 'Voortgang resetten?',
    'dlg.reset.msg': 'Je workout-voortgang wordt gewist. Je profiel blijft behouden.',
    'dlg.resetAll.title': 'Alles resetten (Lokaal & Cloud)?',
    'dlg.resetAll.msg': 'Je lokale profiel én je opgeslagen cloud-voortgang worden hiermee volledig gewist.',
    'dlg.science.title': '🧘 Principes van de Routine',
    'dlg.science.msg': 'Deze routine maakt gebruik van een <b>rustig herhalingstempo</b> en <b>geleidelijke opbouw</b>.<br><br><b>Rustig tempo:</b> Door gecontroleerd te bewegen focus je op balans, houding en spierbeheersing.<br><b>Geleidelijke opbouw:</b> Het programma verhoogt in stappen de intensiteit om je spieren op een veilige manier uit te dagen.<br><br>Daarom is te snel doorklikken geblokkeerd.',

    // Workout skip/fail
    'wk.skipWarning': 'Let op: als je nog meer oefeningen overslaat, telt deze workout niet meer mee voor je voortgang.',
    'wk.notCompleted.title': 'Niet voltooid',
    'wk.notCompleted.msg': 'Je hebt meer dan de helft van de oefeningen overgeslagen. Deze workout telt helaas niet mee voor je voortgang.',

    // Community prompts
    'comm.createPrompt': 'Naam:',
    'comm.createSuccess.title': 'Groep aangemaakt!',
    'comm.createSuccess.msg': 'Deel de invite link met je vrienden.',
    'comm.createError': 'Fout bij maken groep.',
    'auth.fieldsRequired': 'Vul je e-mail en wachtwoord in.',

    // Settings level labels
    'set.lvl.0': 'Uit (Niet trainen)',
    'set.lvl.1': 'Beginner (Makkelijk)',
    'set.lvl.2': 'Beginner+',
    'set.lvl.3': 'Licht Gemiddeld',
    'set.lvl.4': 'Gemiddeld',
    'set.lvl.5': 'Gemiddeld+',
    'set.lvl.6': 'Gevorderd',
    'set.lvl.7': 'Gevorderd+',
    'set.lvl.8': 'Expert',

    'side.been': 'been',
    'side.kant': 'kant',
  },
  en: {
    'side.been': 'leg',
    'side.kant': 'side',
    // Shared
    'btn.back': '← Back',
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.confirm': 'Confirm',
    'btn.next': 'Next →',
    'btn.quit': '✕ Quit',
    'btn.skip': 'Skip',
    'btn.start': '▶ Start',
    'btn.pause': '⏸ Pause',
    'btn.finish': 'Finish ✓',
    'nav.home': 'Home',
    'nav.coach': 'Coach',
    'nav.community': 'Community',
    'nav.settings': 'Settings',

    // Home
    'home.greeting': 'Hi',
    'home.minPerDay': 'min per day',
    'home.daysPerWeek': 'days per week',
    'home.avgLevel': 'Avg. Level',
    'home.today': 'Today',
    'home.doneToday': 'Already completed today — great job! 💚',
    'home.playAgain': '✓ Practice Again',
    'home.workouts': 'Workouts',
    'home.weeks': 'Weeks',
    'home.intensity': 'Intensity',
    'home.scienceBadge': 'Science-Backed (TUT)',
    'home.quote': '♥ Your consistency today is your result tomorrow. ♥',

    // Calendar
    'calendar.title': '📅 Schedule',
    'calendar.reset': 'Reset Progress',
    'calendar.days': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    // Onboarding
    'ob.step.of': 'Step {0} of {1}',
    'ob.welcome.title': 'Welcome!',
    'ob.welcome.sub': "Let's set up your Pilates routine.",
    'ob.name.label': 'What should we call you?',
    'ob.name.placeholder': 'Your name...',
    'ob.gender.title': 'What is your gender?',
    'ob.gender.sub': 'We tailor the exercises based on this.',
    'ob.gender.f': 'Female',
    'ob.gender.m': 'Male',
    'ob.gender.n': 'Prefer not to say',
    'ob.goals.title': 'What do you want to work on',
    'ob.goals.sub': 'Choose one or more focus areas.',
    'ob.goals.legs': 'Glutes & Legs',
    'ob.goals.core': 'Core, Abs & Arms',
    'ob.goals.back': 'Back & Posture',
    'ob.goals.all': 'Everything',
    'ob.level.title': 'What is your starting level?',
    'ob.level.sub': 'We will slowly build up the intensity from here.',
    'ob.level.beg.title': 'Beginner (Easy)',
    'ob.level.beg.desc': 'Start off slowly.',
    'ob.level.int.title': 'Intermediate',
    'ob.level.int.desc': 'You have some experience.',
    'ob.level.adv.title': 'Advanced',
    'ob.level.adv.desc': 'Ready for a challenge!',
    'ob.time.title': 'Time & Frequency',
    'ob.time.sub': 'How much time per day and how often per week?',
    'ob.time.minLabel': 'Minutes per day',
    'ob.time.daysLabel': 'Days per week',
    'ob.start.title': 'When are you starting?',
    'ob.start.sub': 'The routine will start on this date.',
    'ob.btn.start': 'Start! 🎉',

    // Settings
    'set.title': 'Settings',
    'set.name': 'Name',
    'set.startDate': 'Routine Start Date',
    'set.lvl.core': 'Level Core, Abs & Arms',
    'set.lvl.legs': 'Level Glutes & Legs',
    'set.lvl.back': 'Level Back & Posture',
    'set.gender': 'Gender',
    'set.goals': 'Focus Areas',
    'set.stretch': 'Include stretch',
    'set.resetAll': 'Reset Everything & Start Over',
    'set.language': 'Language',
    'set.theme': 'Theme',
    'set.theme.light': 'Light',
    'set.theme.dark': 'Dark',
    'set.theme.auto': 'Auto',

    // Workout
    'wk.nextSection': 'Next section',
    'wk.hold': '🔒 Hold it!',
    'wk.ofReps': 'of {0} reps',
    'wk.tapHint': 'Slow: ±4 sec. per rep',
    'wk.tut.tooFast': 'Too fast! Maintain Time Under Tension (TUT).',
    'wk.seconds': 'seconds',
    'wk.intro.encouragement1': "Let's begin, {0}! 🌿",
    'wk.intro.encouragement2': 'Great job, {0}! 💪',
    'wk.intro.encouragement3': 'Ready for the next one? 🔥',
    'wk.intro.encouragement4': "You're doing amazing! 🌟",
    'wk.intro.btn': "Let's go →",

    // Complete
    'comp.title': 'Routine Completed!',
    'comp.msg1': 'Amazing job, {0}! Your body thanks you. 💚',
    'comp.msg2': 'Another workout in the bag! A little stronger every day.',
    'comp.msg3': 'Fantastic! Consistency is key. 🔑',
    'comp.workoutsTotal': 'Total Workouts',
    'comp.currentWeek': 'Current',
    'comp.btn.home': 'Back to Home',
    'comp.btn.leaderboard': 'View Leaderboard 🏆',

    // Community
    'comm.title': 'Community 🏆',
    'comm.logout': 'Logout',
    'comm.inviteCopy': '🔗 Copy Invite Link',
    'comm.inviteCopied': '✓ Copied!',
    'comm.newGroup': '➕ New Group',
    'comm.loading': 'Loading...',
    'comm.empty': 'No one in this group yet.',
    'comm.you': '(You)',
    'comm.week': 'Week',
    'comm.lastActive': 'Last active:',
    'comm.missed': 'missed',

    // Auth
    'auth.title': 'Join the Community',
    'auth.sub1': 'Log in to compare your progress, work out with friends in private groups, and stay motivated.',
    'auth.sub2': 'Log in to accept the invite for group <b>{0}</b>!',
    'auth.google': 'Continue with Google',
    'auth.or': 'or',
    'auth.email': 'Email Address',
    'auth.pass': 'Password',
    'auth.loginBtn': 'Login',
    'auth.regBtn': 'Register',

    // Dialogs
    'dlg.quit.title': 'Quit routine?',
    'dlg.quit.msg': 'Your progress for this workout will be lost.',
    'dlg.quit.confirm': 'Continue Workout',
    'dlg.quit.cancel': 'Quit', 
    'dlg.reset.title': 'Reset progress?',
    'dlg.reset.msg': 'Your workout progress will be cleared. Your profile is kept.',
    'dlg.resetAll.title': 'Reset everything?',
    'dlg.resetAll.msg': 'Your profile and progress will be cleared.',
    'dlg.science.title': '🔬 The Science behind the Routine',
    'dlg.science.msg': 'This app relies on <b>Time Under Tension (TUT)</b> and <b>Progressive Overload</b>.<br><br><b>TUT:</b> Moving slowly and with control eliminates momentum, causing significantly higher muscle activation and metabolic stress.<br><b>Progressive Overload:</b> The app increases difficulty weekly, forcing your body to adapt (grow stronger).<br><br>This is why fast clicking is blocked. Enjoy the burn!',

    // Workout skip/fail
    'wk.skipWarning': 'Warning: if you skip more exercises, this workout will no longer count towards your progress.',
    'wk.notCompleted.title': 'Not Completed',
    'wk.notCompleted.msg': 'You skipped more than half of the exercises. This workout does not count towards your progress.',

    // Community prompts
    'comm.createPrompt': 'Name:',
    'comm.createSuccess.title': 'Group created!',
    'comm.createSuccess.msg': 'Share the invite link with your friends.',
    'comm.createError': 'Error creating group.',
    'auth.fieldsRequired': 'Please enter your email and password.',

    // Settings level labels
    'set.lvl.0': 'Off (Do not train)',
    'set.lvl.1': 'Beginner (Easy)',
    'set.lvl.2': 'Beginner+',
    'set.lvl.3': 'Light Intermediate',
    'set.lvl.4': 'Intermediate',
    'set.lvl.5': 'Intermediate+',
    'set.lvl.6': 'Advanced',
    'set.lvl.7': 'Advanced+',
    'set.lvl.8': 'Expert',
  }
};

export function getLanguage() {
  const profile = getProfile();
  return profile?.language || 'nl';
}

export function t(key, ...args) {
  const lang = getLanguage();
  let text = translations[lang][key] || translations['nl'][key] || key;
  
  if (args && args.length > 0) {
    args.forEach((arg, i) => {
      text = text.replace(`{${i}}`, arg);
    });
  }
  return text;
}
