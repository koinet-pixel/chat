    import { auth, db } from './firebase.js';

import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import {
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const totalUsers = document.getElementById('totalUsers');
const onlineUsers = document.getElementById('onlineUsers');
const totalMessages = document.getElementById('totalMessages');
const recentUsers = document.getElementById('recentUsers');
const recentMessages = document.getElementById('recentMessages');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, async(user)=>{

  if(!user){
    window.location.href = '../login.html';
    return;
  }

});

onSnapshot(collection(db,'users'),(snapshot)=>{

  totalUsers.innerText = snapshot.size;

  let online = 0;

  recentUsers.innerHTML = '';

  snapshot.forEach((doc)=>{

    const data = doc.data();

    if(data.online){
      online++;
    }

    recentUsers.innerHTML += `
      <div class="user-item">
        <strong>${data.username || 'User'}</strong><br>
        ${data.email || ''}<br>
        <small>
          ${data.online ? 'Online' : 'Offline'}
        </small>
      </div>
    `;

  });

  onlineUsers.innerText = online;

});

const q = query(
  collection(db,'messages'),
  orderBy('createdAt','desc')
);

onSnapshot(q,(snapshot)=>{

  totalMessages.innerText = snapshot.size;

  recentMessages.innerHTML = '';

  snapshot.forEach((doc)=>{

    const data = doc.data();

    recentMessages.innerHTML += `
      <div class="message-item">
        <strong>${data.username}</strong><br>
        ${data.text || data.type}<br>
        <small>${data.type}</small>
      </div>
    `;

  });

});

logoutBtn.addEventListener('click',async()=>{

  await signOut(auth);

  window.location.href = '../login.html';

});
