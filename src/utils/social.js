import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { 
  doc, setDoc, getDoc, getDocs, 
  collection, query, orderBy, where, 
  arrayUnion, serverTimestamp 
} from 'firebase/firestore';

/**
 * Handle a new user login: merge their local profile/progress into Firestore
 * and process any pending invites.
 */
export async function initializeSocialUser(localProfile, localTotal, localWeek, localMissed) {
  try {
    const user = getCurrentUser();
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    let communities = ['global'];

    // Check for pending invite
    const pendingInvite = localStorage.getItem('pilates_pending_invite');

    if (!userSnap.exists()) {
      // New user
      if (pendingInvite) {
        communities.push(pendingInvite);
      }
      await setDoc(userRef, {
        name: localProfile.name || user.displayName || 'Pilates Fan',
        totalWorkouts: localTotal || 0,
        currentWeek: localWeek || 1,
        missedWorkouts: localMissed || 0,
        communities: communities,
        lastActive: serverTimestamp()
      });
    } else {
      // Existing user
      const data = userSnap.data();
      communities = data.communities || ['global'];
      if (pendingInvite && !communities.includes(pendingInvite)) {
        communities.push(pendingInvite);
      }
      await setDoc(userRef, {
        name: localProfile.name || data.name || user.displayName || 'Pilates Fan',
        totalWorkouts: Math.max(localTotal, data.totalWorkouts || 0),
        currentWeek: Math.max(localWeek, data.currentWeek || 1),
        missedWorkouts: localMissed || data.missedWorkouts || 0,
        communities: communities,
        lastActive: serverTimestamp()
      }, { merge: true });
    }

    // Clear pending invite
    if (pendingInvite) {
      localStorage.removeItem('pilates_pending_invite');
    }

    return communities;
  } catch (error) {
    console.error("Error initializing user:", error);
    import('../ui/core.js').then(module => module.showToast('Kan niet verbinden met de server.', 'error'));
    return ['global'];
  }
}

/**
 * Push the current user's progress to Firestore.
 */
export async function pushUserProgress(data) {
  const user = getCurrentUser();
  if (!user) return; // Only push if authenticated

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    let remoteTotal = 0;
    if (userSnap.exists()) {
      remoteTotal = userSnap.data().totalWorkouts || 0;
    }
    
    const displayName = data.name && data.name.trim() !== '' ? sanitizeText(data.name, 40) : 'Pilates Fan';

    await setDoc(userRef, {
      name: displayName || 'Pilates Fan',
      totalWorkouts: Math.max(remoteTotal, data.totalWorkouts || 0),
      currentWeek: data.currentWeek || 1,
      missedWorkouts: data.missedWorkouts || 0,
      lastActive: serverTimestamp()
    }, { merge: true });
    
  } catch (error) {
    console.error("Error pushing progress:", error);
    import('../ui/core.js').then(module => module.showToast('Voortgang niet lokaal gesynchroniseerd.', 'error'));
  }
}

/**
 * Fetch the leaderboard for a specific community.
 */
export async function getLeaderboard(communityCode = 'global') {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('communities', 'array-contains', communityCode)
    );
    const querySnapshot = await getDocs(q);
    
    const leaderboard = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Handle timestamp conversion safely
      let lastActiveStr = 'Onbekend';
      if (data.lastActive && data.lastActive.toDate) {
        lastActiveStr = data.lastActive.toDate().toLocaleDateString();
      } else if (data.lastActive) {
        lastActiveStr = new Date(data.lastActive).toLocaleDateString();
      }

      leaderboard.push({
        id: doc.id,
        name: data.name || 'Pilates Fan',
        totalWorkouts: data.totalWorkouts || 0,
        missedWorkouts: data.missedWorkouts || 0,
        currentWeek: data.currentWeek || 1,
        lastActive: lastActiveStr
      });
    });
    
    // Sort locally by totalWorkouts descending to avoid Firebase composite index requirement
    leaderboard.sort((a, b) => b.totalWorkouts - a.totalWorkouts);

    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    import('../ui/core.js').then(module => module.showToast('Kan leaderboard niet laden. Ben je offline?', 'error'));
    return [];
  }
}

/**
 * Create a new community
 */
function sanitizeText(str, maxLen = 40) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLen);
}

export async function createCommunity(name) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const cleanName = sanitizeText(name, 40);
    if (!cleanName) throw new Error("Ongeldige groepsnaam.");

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const commRef = doc(db, 'communities', code);
    await setDoc(commRef, {
      id: code,
      name: cleanName,
      ownerId: user.uid,
      createdAt: serverTimestamp()
    });

    // Add owner to this community
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      communities: arrayUnion(code)
    }, { merge: true });

    return code;
  } catch (error) {
    console.error("Error creating community:", error);
    import('../ui/core.js').then(module => module.showToast('Fout bij maken groep.', 'error'));
    throw error;
  }
}

/**
 * Join an existing community by code
 */
export async function joinCommunity(code) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const formattedCode = code.trim().toUpperCase();

    // Optionally verify if community exists
    const commRef = doc(db, 'communities', formattedCode);
    const commSnap = await getDoc(commRef);
    
    if (!commSnap.exists() && formattedCode !== 'GLOBAL') {
      throw new Error("Community niet gevonden!");
    }

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      communities: arrayUnion(formattedCode)
    }, { merge: true });

    return formattedCode;
  } catch (error) {
    console.error("Error joining community:", error);
    import('../ui/core.js').then(module => module.showToast(error.message || 'Fout bij joinen groep.', 'error'));
    throw error;
  }
}

/**
 * Get user's communities details
 */
export async function getUserCommunities() {
  try {
    const user = getCurrentUser();
    if (!user) return [];

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [{ id: 'global', name: 'Global' }];

    const data = userSnap.data();
    const codes = data.communities || ['global'];

    const results = [];
    for (const code of codes) {
      if (code === 'global' || code === 'GLOBAL') {
        results.push({ id: 'global', name: 'Global Community' });
      } else {
        const commRef = doc(db, 'communities', code);
        const commSnap = await getDoc(commRef);
        if (commSnap.exists()) {
          results.push({ id: code, name: commSnap.data().name });
        } else {
          results.push({ id: code, name: `Groep ${code}` }); // Fallback
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error getting user communities:", error);
    import('../ui/core.js').then(module => module.showToast('Kan groepen niet laden.', 'error'));
    return [{ id: 'global', name: 'Global' }];
  }
}
