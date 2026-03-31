// --- KONFIGURASI FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
// UPDATE: Tambah import Firestore & Auth
import { getFirestore, collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Update import Auth untuk mendukung Session & Logout
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQJ0dFT8ohAkwDODrdfDa2GEwzk0kZRm0",
  authDomain: "labelmusic-ee1b2.firebaseapp.com",
  databaseURL: "https://labelmusic-ee1b2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "labelmusic-ee1b2",
  storageBucket: "labelmusic-ee1b2.firebasestorage.app",
  messagingSenderId: "634541524714",
  appId: "1:634541524714:web:a2fc9d47a91e37f44a7993",
  measurementId: "G-MMFG3N1VV9"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app); 
const dbFirestore = getFirestore(app); 
const auth = getAuth(app); 

/* --- GLOBAL AUDIO PLAYER SYSTEM --- */
const globalAudio = new Audio();
let currentPlayingId = null;

/* --- STATE AUTH WIZARD (TAMBAHAN) --- */
let isLoginMode = true;
let currentStep = 1;

/* --- FUNGSI HELPER PENDAFTARAN --- */
const showSopanAlert = (msg) => {
    const alertBox = document.getElementById('custom-alert');
    if(alertBox) {
        alertBox.innerHTML = `<i class="fa-solid fa-circle-info" style="color: #00ff88; margin-right: 10px;"></i> ${msg}`;
        alertBox.style.display = 'block';
        setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
    }
};

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'admin_super'); 
    const res = await fetch(`https://api.cloudinary.com/v1_1/dt2u1r8ni/auto/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
}

// FUNGSI LOGOUT
window.handleLogout = () => {
    signOut(auth).then(() => {
        showSopanAlert("Berhasil Keluar!");
        setTimeout(() => { window.location.reload(); }, 1000);
    });
};

/* --- FUNGSI PLAY GLOBAL (Untuk Bottom Player & Tracklist) --- */
window.playGlobal = (url, title, img, artist, id) => {
    const pIcon = document.getElementById('play-pause-icon');
    const bPlayer = document.getElementById('bottom-player');

    if (currentPlayingId === id) {
        if (globalAudio.paused) {
            globalAudio.play();
            if(pIcon) pIcon.innerHTML = '<i class="fa-solid fa-pause"></i>';
        } else {
            globalAudio.pause();
            if(pIcon) pIcon.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
    } else {
        globalAudio.src = url;
        globalAudio.play();
        currentPlayingId = id;
        
        if(pIcon) pIcon.innerHTML = '<i class="fa-solid fa-pause"></i>';
        if(bPlayer) {
            bPlayer.style.display = 'flex';
            document.getElementById('player-title').innerText = title;
            document.getElementById('player-artist').innerText = artist;
            document.getElementById('player-img').src = img;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {

    /* --- 0. AUTH SESSION OBSERVER --- */
    onAuthStateChanged(auth, (user) => {
        const profileNav = document.getElementById('user-profile-nav');
        const joinLink = document.querySelector('a[href="#contact"]'); 

        if (user) {
            const userRef = ref(db, 'users/' + user.uid);
            onValue(userRef, (snapshot) => {
                const userData = snapshot.val();
                if (userData && profileNav) {
                    const navImg = document.getElementById('user-nav-img');
                    const navName = document.getElementById('user-nav-name');
                    if(navImg) navImg.src = userData.profilePic || '';
                    if(navName) navName.innerText = userData.username;
                    profileNav.style.display = 'flex';
                    if(joinLink) joinLink.style.display = 'none';
                }
            });
        } else {
            if(profileNav) profileNav.style.display = 'none';
            if(joinLink) joinLink.style.display = 'block';
        }
    });
    renderMemberList(); 
    /* --- 1. Page Loader --- */
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('loader-progress');
    const percentageText = document.getElementById('loader-percentage');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5;
        if(progress > 100) progress = 100;
        if(progressBar) progressBar.style.width = progress + '%';
        if(percentageText) percentageText.innerText = progress + '%';
        if(progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                if(loader) loader.classList.add('hidden');
                document.body.classList.remove('loading');
                triggerInitialAnimations();
            }, 500);
        }
    }, 100);

    /* --- 2. Custom Cursor --- */
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    let isTouchDevice = 'ontouchstart' in window;

    if (!isTouchDevice) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            if(cursorDot) { cursorDot.style.left = `${posX}px`; cursorDot.style.top = `${posY}px`; }
            if(cursorOutline) {
                cursorOutline.animate({ left: `${posX}px`, top: `${posY}px` }, { duration: 200, fill: "forwards" });
            }
        });
        const hoverTargets = document.querySelectorAll('.hover-target');
        hoverTargets.forEach(target => {
            target.addEventListener('mouseenter', () => { document.body.classList.add('cursor-hover'); });
            target.addEventListener('mouseleave', () => { document.body.classList.remove('cursor-hover'); });
        });
    } else {
        if(cursorDot) cursorDot.style.display = 'none';
        if(cursorOutline) cursorOutline.style.display = 'none';
    }

    /* --- 3. Theme System --- */
    const themeBtn = document.getElementById('theme-switch');
    const htmlEl = document.documentElement;
    const savedTheme = localStorage.getItem('portfolio_theme') || 'dark';
    htmlEl.setAttribute('data-theme', savedTheme);
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = htmlEl.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            htmlEl.setAttribute('data-theme', newTheme);
            localStorage.setItem('portfolio_theme', newTheme);
        });
    }

    /* --- 4. Navbar & Mobile Menu --- */
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinksContainer = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-link');
    const backToTopBtn = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            if(navbar) navbar.classList.add('scrolled');
            if(backToTopBtn) backToTopBtn.classList.add('visible');
        } else {
            if(navbar) navbar.classList.remove('scrolled');
            if(backToTopBtn) backToTopBtn.classList.remove('visible');
        }
        let current = '';
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            if (window.pageYOffset >= section.offsetTop - 150) { current = section.getAttribute('id'); }
        });
        navLinks.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').includes(current)) { item.classList.add('active'); }
        });
    });

    if(hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
        });
    }
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinksContainer.classList.remove('active');
        });
    });
    if(backToTopBtn) backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    /* --- 5. Typing Effect --- */
    const typingTextEl = document.getElementById('typing-text');
    const textArray = ["Music Collective.", "Team Production.", "Sopan Remix Team."];
    let textIndex = 0, charIndex = 0, isDeleting = false;

    function typeEffect() {
        if(!typingTextEl) return;
        const currentText = textArray[textIndex];
        typingTextEl.innerText = isDeleting ? currentText.substring(0, charIndex - 1) : currentText.substring(0, charIndex + 1);
        charIndex = isDeleting ? charIndex - 1 : charIndex + 1;
        let typeSpeed = isDeleting ? 50 : 100;
        if (!isDeleting && charIndex === currentText.length) { typeSpeed = 2000; isDeleting = true; }
        else if (isDeleting && charIndex === 0) { isDeleting = false; textIndex = (textIndex + 1) % textArray.length; typeSpeed = 500; }
        setTimeout(typeEffect, typeSpeed);
    }
    setTimeout(typeEffect, 1000);

    /* --- 6. REAL-TIME DATABASE: ARTIST DISPLAY --- */
    let artistData = [];
    let currentArtistIdx = 0;
    const displayBox = document.getElementById('artist-display-box');
    const artistNameEl = document.getElementById('artist-name-display');
    const artistCountEl = document.getElementById('artist-count');

    onValue(ref(db, 'users'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            artistData = Object.entries(data).map(([id, val]) => ({ id, ...val })).filter(u => u.profilePic);
            if (artistCountEl) artistCountEl.innerText = artistData.length;
            if (artistData.length > 0) updateArtistUI();
        }
    });

    function updateArtistUI() {
        if (artistData.length === 0 || !displayBox) return;
        displayBox.classList.add('glitch-active');
        if(artistNameEl) { artistNameEl.style.opacity = '0'; artistNameEl.style.transform = 'translateY(10px)'; }
        setTimeout(() => {
            const currentArtist = artistData[currentArtistIdx];
            displayBox.innerHTML = `
                <a href="artist.html?id=${currentArtist.id}" class="hover-target">
                    <img src="${currentArtist.profilePic}" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit;">
                </a>`;
            if(artistNameEl) {
                artistNameEl.innerText = currentArtist.username || "Sopan Artist";
                artistNameEl.style.opacity = '1'; artistNameEl.style.transform = 'translateY(0)';
            }
            currentArtistIdx = (currentArtistIdx + 1) % artistData.length;
            setTimeout(() => { displayBox.classList.remove('glitch-active'); }, 400);
        }, 200);
    }
    setInterval(() => { if (artistData.length > 0) updateArtistUI(); }, 5000);

    /* --- 7. Scroll Reveal --- */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-fade, .reveal-scale, .reveal-left, .reveal-right');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                if(entry.target.classList.contains('skill-category')) {
                    entry.target.querySelectorAll('.progress').forEach(bar => { bar.style.width = bar.getAttribute('data-width'); });
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
    revealElements.forEach(el => revealObserver.observe(el));
    function triggerInitialAnimations() { const hero = document.querySelector('.hero'); if(hero) revealObserver.observe(hero); }

    /* --- 8. FUNGSI AUTH & JOIN SYSTEM --- */
    window.toggleAuth = (type) => {
        isLoginMode = (type === 'login');
        document.getElementById('login-form').classList.toggle('active', isLoginMode);
        document.getElementById('join-form').classList.toggle('active', !isLoginMode);
        document.getElementById('tab-login').classList.toggle('active', isLoginMode);
        document.getElementById('tab-join').classList.toggle('active', !isLoginMode);
        document.getElementById('mainBtn').innerText = isLoginMode ? 'Masuk' : 'Berikutnya';
    };

    window.moveStep = (n) => {
        if (n === 1) {
            if (currentStep === 1) {
                const name = document.getElementById('regName').value;
                if(!name || !document.getElementById('regAvatar').files[0]) return showSopanAlert("Foto & Nama wajib diisi!");
                if(!name.toUpperCase().endsWith("SOPAN")) document.getElementById('regName').value = name.trim() + " SOPAN";
            }
            if (currentStep === 2) {
                if(!document.getElementById('regEmailAktif').value || !document.getElementById('regAudio').files[0]) return showSopanAlert("Email & Audio Demo wajib!");
                renderReview();
            }
        }
        currentStep += n;
        document.querySelectorAll('.auth-form-step').forEach(f => f.classList.remove('active'));
        document.getElementById(`step${currentStep}`).classList.add('active');
        document.getElementById('mainBtn').innerText = currentStep === 3 ? 'SUBMIT' : 'Berikutnya';
        document.getElementById('backBtn').style.display = currentStep > 1 ? 'block' : 'none';
    };

    function renderReview() {
        const name = document.getElementById('regName').value;
        const gEmail = name.toLowerCase().replace(/\s+/g, '') + "@teamsopan.com";
        const gPass = Math.random().toString(36).slice(-8);
        const preview = document.getElementById('previewData');
        if(preview) {
            preview.innerHTML = `<div class="preview-item"><span>Artist:</span><b>${name}</b></div><div class="preview-item"><span>ID:</span><b>${gEmail}</b></div>`;
            preview.dataset.genEmail = gEmail; preview.dataset.genPass = gPass;
        }
    }

    window.handleAuth = async () => {
        const btn = document.getElementById('mainBtn');
        if (isLoginMode) {
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;
            try {
                btn.disabled = true; btn.innerText = "Checking...";
                await signInWithEmailAndPassword(auth, email, pass);
                showSopanAlert("Login Berhasil!"); window.location.reload();
            } catch (e) { showSopanAlert("Login Gagal!"); btn.disabled = false; btn.innerText = "Masuk"; }
        } else {
            if (currentStep < 3) return moveStep(1);
            btn.disabled = true; btn.innerText = "Processing...";
            try {
                const img = await uploadToCloudinary(document.getElementById('regAvatar').files[0]);
                const audio = await uploadToCloudinary(document.getElementById('regAudio').files[0]);
                const email = document.getElementById('previewData').dataset.genEmail;
                const pass = document.getElementById('previewData').dataset.genPass;
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                await set(ref(db, 'users/' + cred.user.uid), {
                    username: document.getElementById('regName').value, email: email, profilePic: img, demoAudio: audio, role: "member", status: "pending", createdAt: new Date().toISOString()
                });
                showSopanAlert("Pendaftaran Berhasil!"); location.reload();
            } catch (err) { showSopanAlert("Error: " + err.message); btn.disabled = false; btn.innerText = "SUBMIT"; }
        }
    };

    /* --- 9. FIRESTORE: TEAM ALBUMS --- */
    const projectsGrid = document.getElementById('projects-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');

    function createProjectHTML(data, id) {
        return `
            <div class="project-card reveal-up active" data-category="${data.type || 'all'}">
                <div class="project-img">
                    <img src="${data.avatar}" alt="${data.judul}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    <div class="project-overlay">
                        <div class="project-links">
                            <button class="btn-icon play-btn hover-target" onclick="window.playGlobal('${data.audio}', '${data.judul}', '${data.avatar}', '${data.artis}', '${id}')">
                                <i class="fa-solid fa-play"></i>
                            </button>
                            <a href="${data.youtube || '#'}" target="_blank" class="btn-icon hover-target"><i class="fa-brands fa-youtube"></i></a>
                        </div>
                    </div>
                </div>
                <div class="project-info">
                    <div class="project-tags"><span>${data.type || 'Single'}</span><span>2026</span></div>
                    <h3 class="project-title">${data.judul}</h3>
                    <p class="project-desc">Produced by <strong>${data.artis}</strong></p>
                </div>
            </div>`;
    }

    if (projectsGrid) {
        onSnapshot(collection(dbFirestore, "products"), (snapshot) => {
            let prods = [];
            snapshot.forEach((doc) => { if (doc.data().artis && doc.data().avatar && doc.data().audio) prods.push({ ...doc.data(), id: doc.id }); });
            const shuffled = prods.sort(() => 0.5 - Math.random()).slice(0, 10);
            projectsGrid.innerHTML = '';
            shuffled.forEach(item => projectsGrid.insertAdjacentHTML('beforeend', createProjectHTML(item, item.id)));
            const newCards = projectsGrid.querySelectorAll('.reveal-up');
            newCards.forEach(card => revealObserver.observe(card));
        });
    }

    /* --- 10. HALAMAN ARTIST PROFILE LOGIC --- */
    if (window.location.pathname.includes('artist.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const artistId = urlParams.get('id');
        if (artistId) {
            get(child(ref(db), `users/${artistId}`)).then((snap) => {
                if (snap.exists()) {
                    const user = snap.val();
                    document.getElementById('artist-name').innerText = user.username;
                    const avatar = document.getElementById('artist-avatar');
                    if(avatar) { avatar.style.backgroundImage = `url(${user.profilePic})`; avatar.style.backgroundSize = 'cover'; }
                    const bio = document.getElementById('artist-bio');
                    if(user.bio && bio) bio.innerText = user.bio;
                    const role = document.getElementById('stat-role');
                    if(role) role.innerText = (user.role || "Member").toUpperCase();
                    loadArtistTracks(user.username);
                }
            });
        }
    }

    async function loadArtistTracks(artistName) {
        const trackList = document.getElementById('track-list');
        const statTracks = document.getElementById('stat-tracks');
        if(!trackList) return;

        onSnapshot(collection(dbFirestore, "products"), (snapshot) => {
            trackList.innerHTML = '';
            let count = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.artis && data.artis.toLowerCase().includes(artistName.toLowerCase())) {
                    count++;
                    trackList.innerHTML += `
                        <div class="track-item glass-card hover-target" onclick="window.playGlobal('${data.audio}', '${data.judul}', '${data.avatar}', '${data.artis}', '${doc.id}')">
                            <img src="${data.avatar}" class="track-img">
                            <div class="track-details"><span class="track-title">${data.judul}</span><span class="track-author">${data.artis}</span></div>
                            <div class="track-actions"><i class="fa-solid fa-play"></i></div>
                        </div>`;
                }
            });
            if(statTracks) statTracks.innerText = count;
            if(count === 0) trackList.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">Belum ada album.</p>';
        });
    }

    /* --- 11. Filtering & Global Audio Ended --- */
    globalAudio.onended = () => { 
        currentPlayingId = null; 
        const pIcon = document.getElementById('play-pause-icon'); 
        if(pIcon) pIcon.innerHTML = '<i class="fa-solid fa-play"></i>'; 
    };

    if(filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
                const filter = btn.getAttribute('data-filter');
                document.querySelectorAll('.project-card').forEach(card => {
                    const cat = card.getAttribute('data-category');
                    if (filter === 'all' || cat === filter) { card.style.display = 'block'; setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 10); }
                    else { card.style.opacity = '0'; card.style.transform = 'scale(0.8)'; setTimeout(() => { card.style.display = 'none'; }, 300); }
                });
            });
        });
    }
});
/* --- FUNGSI TAMPILKAN DAFTAR MEMBER (MINIMALIST & AUTO-THEME) --- */
const renderMemberList = () => {
    const memberGrid = document.getElementById('member-list-grid');
    if (!memberGrid) return;

    onValue(ref(db, 'users'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            memberGrid.innerHTML = ''; 

            memberGrid.style.display = 'flex';
            memberGrid.style.flexWrap = 'wrap'; 
            memberGrid.style.justifyContent = 'center'; 
            memberGrid.style.gap = '20px'; 
            memberGrid.style.padding = '0'; 
            memberGrid.style.marginTop = '40px'; 

            Object.entries(data).forEach(([id, user]) => {
                if (user.username && user.profilePic) {
                    
                    const itemHTML = `
                        <a href="artist.html?id=${id}" class="hover-target minimalist-item roster-item" 
                           style="display: flex; flex-direction: column; align-items: center; text-decoration: none; width: auto; max-width: 90px; text-align: center;">
                            
                            <div class="member-photo-wrapper" 
                                 style="width: 55px; height: 55px; border-radius: 50%; overflow: hidden; border: 2px solid var(--accent); background: #1a1a1a; margin-bottom: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                                <img src="${user.profilePic}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'">
                            </div>
                            
                            <h3 class="member-name" 
                                style="font-size: 0.75rem; 
                                       /* FIX: Pakai variabel CSS biar berubah sesuai tema */
                                       color: var(--text-primary, var(--text, #fff)); 
                                       font-family: 'Inter', sans-serif; 
                                       font-weight: 500; 
                                       text-transform: capitalize; 
                                       margin: 0; 
                                       line-height: 1.2; 
                                       word-break: break-word;">
                                ${user.username}
                            </h3>
                        </a>
                    `;
                    memberGrid.insertAdjacentHTML('beforeend', itemHTML);
                }
            });

            const newHovers = memberGrid.querySelectorAll('.hover-target');
            newHovers.forEach(target => {
                target.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
                target.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
            });

            // Initialize random roster animations
            initRandomRosterAnimations();
        }
    });
};

/* ========== RANDOM ROSTER ANIMATION SYSTEM ========== */
const initRandomRosterAnimations = () => {
    const memberGrid = document.getElementById('member-list-grid');
    const items = memberGrid.querySelectorAll('.roster-item');
    
    if (items.length === 0) return;

    // Inject animation styles (if not already injected)
    if (!document.getElementById('random-roster-animations')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'random-roster-animations';
        styleTag.textContent = `
            /* ENTER ANIMATIONS */
            @keyframes fadeSlideUp {
                from { opacity: 0; transform: translateY(40px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeSlideLeft {
                from { opacity: 0; transform: translateX(-40px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes fadeZoomIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes rotateFadeIn {
                from { opacity: 0; transform: rotate(-10deg) scale(0.9); }
                to { opacity: 1; transform: rotate(0deg) scale(1); }
            }
            @keyframes scaleBlurIn {
                from { opacity: 0; transform: scale(1.1); filter: blur(8px); }
                to { opacity: 1; transform: scale(1); filter: blur(0px); }
            }
            @keyframes fadeSlideRight {
                from { opacity: 0; transform: translateX(40px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes fadeSlideDown {
                from { opacity: 0; transform: translateY(-40px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* EXIT ANIMATIONS */
            @keyframes exitFadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(30px); }
            }
            @keyframes exitSlideDown {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(40px); }
            }
            @keyframes exitZoomOut {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.8); }
            }
            @keyframes exitRotateOut {
                from { opacity: 1; transform: rotate(0deg) scale(1); }
                to { opacity: 0; transform: rotate(10deg) scale(0.9); }
            }
            @keyframes exitSlideUp {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-40px); }
            }

            /* INITIAL STATE */
            .roster-item {
                opacity: 0;
            }

            /* ANIMATION CLASSES */
            .roster-animate-1 { animation: fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .roster-animate-2 { animation: fadeSlideLeft 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .roster-animate-3 { animation: fadeZoomIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .roster-animate-4 { animation: rotateFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .roster-animate-5 { animation: scaleBlurIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .roster-animate-6 { animation: fadeSlideRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .roster-animate-7 { animation: fadeSlideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

            .roster-exit-1 { animation: exitFadeOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .roster-exit-2 { animation: exitSlideDown 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .roster-exit-3 { animation: exitZoomOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .roster-exit-4 { animation: exitRotateOut 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
            .roster-exit-5 { animation: exitSlideUp 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        `;
        document.head.appendChild(styleTag);
    }

    // Animation variation pools
    const enterAnimations = ['roster-animate-1', 'roster-animate-2', 'roster-animate-3', 'roster-animate-4', 'roster-animate-5', 'roster-animate-6', 'roster-animate-7'];
    const exitAnimations = ['roster-exit-1', 'roster-exit-2', 'roster-exit-3', 'roster-exit-4', 'roster-exit-5'];

    // Helper function to get random animation
    const getRandomAnimation = (pool) => pool[Math.floor(Math.random() * pool.length)];

    // Track visibility state
    const itemStates = new Map();
    const itemAnimations = new Map(); // Store selected animations for each item
    items.forEach(item => {
        itemStates.set(item, 'hidden');
        itemAnimations.set(item, {
            enter: getRandomAnimation(enterAnimations),
            exit: getRandomAnimation(exitAnimations)
        });
    });

    // IntersectionObserver configuration
    const observerOptions = {
        root: null,
        rootMargin: '80px',
        threshold: 0.25
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const item = entry.target;
            const itemIndex = Array.from(items).indexOf(item);
            const staggerDelay = itemIndex * 75; // 75ms stagger between items
            const currentState = itemStates.get(item);

            if (entry.isIntersecting) {
                // Item entering viewport
                if (currentState !== 'visible') {
                    // Reset animation classes
                    item.classList.remove(...exitAnimations);
                    
                    // Select random enter animation
                    const enterAnim = getRandomAnimation(enterAnimations);
                    itemAnimations.set(item, {
                        ...itemAnimations.get(item),
                        enter: enterAnim
                    });

                    // Apply animation
                    item.classList.add(enterAnim);
                    item.style.animationDelay = staggerDelay + 'ms';
                    itemStates.set(item, 'visible');

                    // Add hover effect (scale + glow)
                    if (!item.hasAttribute('data-hover-setup')) {
                        item.setAttribute('data-hover-setup', 'true');
                        item.addEventListener('mouseenter', function() {
                            this.style.transform = 'scale(1.15)';
                            this.style.filter = 'drop-shadow(0 0 20px rgba(107, 33, 168, 0.8)) brightness(1.1)';
                            this.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        });
                        item.addEventListener('mouseleave', function() {
                            this.style.transform = 'scale(1)';
                            this.style.filter = 'drop-shadow(0 0 0px)';
                        });
                    }
                }
            } else {
                // Item leaving viewport
                if (currentState !== 'hidden') {
                    // Reset animation classes
                    item.classList.remove(...enterAnimations);
                    
                    // Select random exit animation
                    const exitAnim = getRandomAnimation(exitAnimations);
                    itemAnimations.set(item, {
                        ...itemAnimations.get(item),
                        exit: exitAnim
                    });

                    // Apply animation
                    item.classList.add(exitAnim);
                    item.style.animationDelay = staggerDelay + 'ms';
                    itemStates.set(item, 'hidden');
                    
                    // Reset hover transform
                    item.style.transform = 'scale(1)';
                    item.style.filter = 'none';
                }
            }
        });
    }, observerOptions);

    // Observe all items
    items.forEach(item => observer.observe(item));
    
    // Store observer reference for cleanup if needed
    window.rosterAnimationObserver = observer;
};
