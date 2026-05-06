const canvas = document.getElementById("magic-canvas");
const context = canvas.getContext("2d");

const particlesCanvas = document.getElementById("particles-canvas");
const particlesContext = particlesCanvas.getContext("2d");

const frameCount = 212;
const currentFrame = (index) =>
    `./tinkerbell-2/ezgif-frame-${index.toString().padStart(3, "0")}.jpg`;

const images = [];
const magicalParticles = [];

let magicFrame = { frame: 0 };
let scrollFraction = 0;
let smoothScrollFraction = 0;

// High DPI Scaling
function setupCanvas(c, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    c.style.width = `${rect.width}px`;
    c.style.height = `${rect.height}px`;
}

// Resize Canvases
function resizeCanvases() {
    setupCanvas(canvas, context);
    setupCanvas(particlesCanvas, particlesContext);
    renderImage();
}
window.addEventListener('resize', resizeCanvases);

// Preload Images
for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = currentFrame(i);
    images.push(img);
}

// Initialize Canvases
resizeCanvases();

// Render Image Frame
function renderImage() {
    const img = images[magicFrame.frame];
    if (img && img.complete) {
        const rect = canvas.getBoundingClientRect();
        // Calculate crop to cover screen
        const hRatio = rect.width / img.width;
        const vRatio = rect.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShift_x = (rect.width - img.width * ratio) / 2;
        const centerShift_y = (rect.height - img.height * ratio) / 2;

        context.clearRect(0, 0, rect.width, rect.height);
        context.drawImage(img, 0, 0, img.width, img.height,
            centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

        // Enhanced dark cinematic bloom gradient from edges
        const gradient = context.createRadialGradient(
            rect.width / 2, rect.height / 2, rect.height * 0.2,
            rect.width / 2, rect.height / 2, rect.width * 0.8
        );
        gradient.addColorStop(0, "rgba(5, 5, 5, 0.1)");
        gradient.addColorStop(1, "rgba(10, 5, 15, 0.7)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, rect.width, rect.height);
    }
}

// Ensure the first frame renders when loaded
images[0].onload = renderImage;

// Interpolator for buttery smooth tracking
let targetFrame = 0;
let currentInterpolatedFrame = 0;

window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
    scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScrollTop));
    updateNavbar(scrollTop);
});

function updateNavbar(scrollTop) {
    const navbar = document.querySelector('.navbar');
    if (scrollTop > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

function updateScenes(fraction) {
    const scenes = document.querySelectorAll('.scene');
    // Math for 6 scenes across 0 to 1
    const step = 0.16; // 1 / 6
    scenes.forEach((scene, index) => {
        const start = index * step;
        const end = start + step;

        // Strict boundary to absolutely avoid overlapping text
        if (fraction >= start && fraction < end) {
            scene.classList.add('active');
            scene.classList.remove('exit');
            const localFraction = (fraction - start) / step; // 0 to 1
            // Use sine wave to fade in at 0, peak at 0.5, fade out at 1
            const fade = Math.sin(localFraction * Math.PI);
            scene.style.opacity = fade * 1.5; // Boost opacity slightly
            const sceneContent = scene.querySelector('.scene-content');
            if (sceneContent) {
                sceneContent.style.transform = `translateY(${(0.5 - localFraction) * 60}px) scale(${1 + localFraction * 0.05})`;
            }
        } else if (fraction < start) {
            scene.classList.remove('active');
            scene.classList.remove('exit');
            scene.style.opacity = 0;
            const sceneContent = scene.querySelector('.scene-content');
            if (sceneContent) {
                sceneContent.style.transform = `translateY(40px) scale(0.95)`;
            }
        } else {
            scene.classList.remove('active');
            scene.classList.add('exit');
            scene.style.opacity = 0;
            const sceneContent = scene.querySelector('.scene-content');
            if (sceneContent) {
                sceneContent.style.transform = `translateY(-40px) scale(1.05)`;
            }
        }
    });

    // Update floating photos based on fraction
    const photos = document.querySelectorAll('.memory-photo');
    if (photos.length > 0) {
        photos.forEach((photo, i) => {
            // Only active during scene 2 and 3 (scroll 0.32 to 0.64)
            if (fraction > 0.30 && fraction < 0.70) {
                photo.classList.add('visible');
                // Calculate drift inside the view boundary
                const depth = (i % 3) + 1;
                const localProgress = (fraction - 0.30) / 0.40; // 0 to 1 over the active zone

                // Keep the Y-offset tightly bounded from 20% to -20% of window so it crosses the screen but stays in view
                const yOffset = (0.5 - localProgress) * 400 * depth;
                const rotation = (Math.sin(fraction * 10 + i) * 10);
                photo.style.transform = `translate(0, ${yOffset}px) rotate(${rotation}deg) scale(${1 + localProgress * 0.2})`;
            } else {
                photo.classList.remove('visible');
            }
        });
    }
}

// -- Particles System for Magical Depth --
class Particle {
    constructor(x, y, isExplosion = false) {
        this.isExplosion = isExplosion;
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x !== undefined ? x : Math.random() * window.innerWidth;
        this.y = y !== undefined ? y : (window.innerHeight + Math.random() * 100);
        this.size = Math.random() * 4 + 1;

        if (this.isExplosion) {
            // Explosive outward radial velocity
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 10 + 5;
            this.speedX = Math.cos(angle) * velocity;
            this.speedY = Math.sin(angle) * velocity;
            this.life = 1.0; // Decay timer
        } else {
            this.speedY = -(Math.random() * 2 + 0.5);
            this.speedX = (Math.random() - 0.5) * 1.5;
            this.alpha = Math.random() * 0.5 + 0.1;
        }

        const colors = ['#FF7AC6', '#FFD97A', '#8BE9FF', '#FFFFFF', '#FF9966', '#FF0055'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        if (this.isExplosion) {
            this.x += this.speedX;
            this.y += this.speedY;
            this.speedY += 0.2; // Gravity applied to confetti
            this.life -= 0.015;
            this.alpha = Math.max(0, this.life);
        } else {
            this.y += this.speedY;
            this.x += this.speedX + (smoothScrollFraction * (Math.random() - 0.5));
            this.x += Math.sin(this.y * 0.01) * 0.5;
            this.alpha += (Math.random() - 0.5) * 0.02;
            this.alpha = Math.max(0.1, Math.min(this.alpha, 0.8));
            if (this.y < -50) {
                this.reset();
            }
        }
    }

    draw() {
        if (this.isExplosion && this.life <= 0) return;
        particlesContext.save();
        particlesContext.globalAlpha = this.alpha;
        particlesContext.fillStyle = this.color;
        particlesContext.shadowBlur = this.isExplosion ? 20 : 15;
        particlesContext.shadowColor = this.color;

        particlesContext.beginPath();
        particlesContext.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        particlesContext.fill();
        particlesContext.restore();
    }
}

for (let i = 0; i < 150; i++) {
    magicalParticles.push(new Particle());
}

function triggerConfettiExplosion() {
    for (let i = 0; i < 300; i++) {
        magicalParticles.push(new Particle(window.innerWidth / 2, window.innerHeight / 2, true));
    }
}

function renderParticles() {
    particlesContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    // Remove dead explosions
    for (let i = magicalParticles.length - 1; i >= 0; i--) {
        let p = magicalParticles[i];
        p.update();
        p.draw();
        if (p.isExplosion && p.life <= 0) {
            magicalParticles.splice(i, 1);
        }
    }
}

// Animation Loop for interpolation and particles
function tick() {
    // Heavy linear interpolation on scrollFraction to give a floating gliding feel
    smoothScrollFraction += (scrollFraction - smoothScrollFraction) * 0.04;

    // Derived target frame from smoothed scroll
    targetFrame = Math.min(
        frameCount - 1,
        Math.floor(smoothScrollFraction * frameCount)
    );

    // Frame interpolation
    currentInterpolatedFrame += (targetFrame - currentInterpolatedFrame) * 0.1;

    if (Math.abs(currentInterpolatedFrame - magicFrame.frame) > 0.05) {
        magicFrame.frame = Math.round(currentInterpolatedFrame);
        renderImage();
    }

    updateScenes(smoothScrollFraction);
    renderParticles();
    requestAnimationFrame(tick);
}

// Initialize the first scene and start animation
updateScenes(0);
tick();

// Cake and Logic
document.addEventListener("DOMContentLoaded", () => {
    // Generate Floating Gallery
    const photosContainer = document.querySelector('.photos-container');
    if (photosContainer) {
        const jkImages = [
            "WhatsApp Image 2026-05-06 at 11.22.25 PM.jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.31 PM.jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.32 PM.jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.33 PM (1).jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.33 PM (2).jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.33 PM.jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.34 PM (1).jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.34 PM (2).jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.34 PM.jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.35 PM (1).jpeg",
            "WhatsApp Image 2026-05-06 at 11.30.35 PM.jpeg"
        ];

        jkImages.forEach((imgSrc, i) => {
            const img = document.createElement('img');
            img.src = `./jk_img/${imgSrc}`;
            img.className = `memory-photo photo-${i}`;
            const isLeft = i % 2 === 0;
            // Center absolute positioning
            img.style.left = isLeft ? `${Math.random() * 15 + 5}%` : `${Math.random() * 15 + 75}%`;
            img.style.top = `30vh`; // Lock initial position in center viewport height
            photosContainer.appendChild(img);
        });
    }

    // --- STORY & MEMORY STACK TOSSING ---
    const storyImages = [
        "WhatsApp Image 2026-05-07 at 12.41.03 AM (1).jpeg",
        "WhatsApp Image 2026-05-07 at 12.41.03 AM.jpeg",
        "WhatsApp Image 2026-05-07 at 12.41.04 AM (1).jpeg",
        "WhatsApp Image 2026-05-07 at 12.41.04 AM (2).jpeg",
        "WhatsApp Image 2026-05-07 at 12.41.04 AM.jpeg"
    ];
    const memoryImages = [
        "WhatsApp Image 2026-05-07 at 12.43.48 AM (1).jpeg",
        "WhatsApp Image 2026-05-07 at 12.43.48 AM.jpeg",
        "WhatsApp Image 2026-05-07 at 12.43.49 AM (1).jpeg",
        "WhatsApp Image 2026-05-07 at 12.43.49 AM.jpeg"
    ];
    const storyQuotes = [
        "Our journey began with a single smile.",
        "Every step feels magical with you.",
        "Our story is my favorite fairytale.",
        "You are the light of my life.",
        "Forever and always, my love."
    ];
    const memoryQuotes = [
        "Unforgettable moments together.",
        "I'll cherish photo forever.",
        "Dont look at me like thatttttt",
        "the fat lips of yours hehehe"
    ];

    function buildStack(containerId, folder, images, quotes) {
        const container = document.getElementById(containerId);
        const descEl = document.getElementById(containerId.replace('stack', 'desc'));
        if (!container || !descEl) return;

        let currentIndex = images.length - 1;
        images.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'stack-card';
            div.style.backgroundImage = `url('./${folder}/${img}')`;
            div.style.zIndex = index;
            // Slight tilt
            const rotate = (Math.random() - 0.5) * 10;
            const tx = (Math.random() - 0.5) * 10;
            const ty = (Math.random() - 0.5) * 10;
            div.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotate}deg)`;
            container.appendChild(div);

            div.addEventListener('click', () => {
                div.classList.add('tossed');
                setTimeout(() => {
                    // Send to back
                    Array.from(container.children).forEach(c => c.style.zIndex = parseInt(c.style.zIndex) + 1);
                    div.style.zIndex = 0;
                    div.classList.remove('tossed');

                    descEl.style.opacity = 0;
                    setTimeout(() => {
                        currentIndex = (currentIndex - 1 < 0) ? quotes.length - 1 : currentIndex - 1;
                        descEl.innerText = quotes[currentIndex];
                        descEl.style.opacity = 1;
                    }, 200);
                }, 600);
            });
        });
        descEl.innerText = quotes[currentIndex];
    }

    buildStack('story-stack', 'story', storyImages, storyQuotes);
    buildStack('memories-stack', 'Memories', memoryImages, memoryQuotes);

    const jk2 = [
        "WhatsApp Image 2026-05-06 at 11.42.51 PM.jpeg",
        "WhatsApp Image 2026-05-06 at 11.43.22 PM.jpeg",
        "WhatsApp Image 2026-05-06 at 11.53.30 PM.jpeg",
        "WhatsApp Image 2026-05-06 at 11.54.03 PM.jpeg"
    ];
    // Scene 5 Post-Magic Photos
    const staticGallery = document.querySelector('.photos-container-static');
    if (staticGallery) {
        jk2.forEach(src => {
            const img = document.createElement('img');
            img.src = `./jk_img_2/${src}`;
            img.style.height = '180px';
            img.style.width = 'auto';
            img.style.borderRadius = '10px';
            img.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
            img.style.border = '2px solid rgba(255,122,198,0.4)';
            staticGallery.appendChild(img);
        });
    }

    // Game Logic
    const gameArea = document.querySelector('.game-area');
    const gameQuotes = [
        "You are my absolute everything. ❤️",
        "Your smile is my favorite view. ✨",
        "Every second with you is magic. 🦋",
        "Happy Birthday my princess! 🎂",
        "You are the softest chapter of my life. 🌸",
        "Every heartbeat of mine whispers your name. 💫",
        "I fall in love with you a little more every single day. 🌹",
        "With you, forever doesn’t feel long enough. 🌙"
    ];
    let clicks = 0;
    if (gameArea) {
        for (let i = 0; i < 8; i++) {
            const h = document.createElement('div');
            h.innerHTML = '❤️';
            h.className = 'game-heart';
            h.style.left = `${Math.random() * 80 + 10}%`;
            h.style.top = `${Math.random() * 80 + 10}%`;
            gameArea.appendChild(h);

            h.addEventListener('click', () => {
                h.classList.add('popped');
                const quoteText = document.querySelector('.game-quote');
                if (quoteText) {
                    quoteText.innerText = gameQuotes[clicks % gameQuotes.length];
                    clicks++;
                }
            });
        }
    }

    // --- CANDY CRUSH LOGIC ---
    const board = document.getElementById('candy-board');
    const scoreDisplay = document.getElementById('cc-score');
    if (board && scoreDisplay) {
        const candies = ['🍬', '🍭', '🍓', '🍰', '💖', '✨'];
        const rows = 6, cols = 6;
        let score = 0;
        let selectedCell = null;
        let grid = [];
        let winTriggered = false;
        let isAnimating = false;

        function findMatches() {
            let matchedSet = new Set();
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols - 2; c++) {
                    let type = grid[r][c].innerText;
                    if (type === grid[r][c + 1].innerText && type === grid[r][c + 2].innerText) {
                        matchedSet.add(grid[r][c]); matchedSet.add(grid[r][c + 1]); matchedSet.add(grid[r][c + 2]);
                    }
                }
            }
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows - 2; r++) {
                    let type = grid[r][c].innerText;
                    if (type === grid[r + 1][c].innerText && type === grid[r + 2][c].innerText) {
                        matchedSet.add(grid[r][c]); matchedSet.add(grid[r + 1][c]); matchedSet.add(grid[r + 2][c]);
                    }
                }
            }
            return matchedSet;
        }

        function resolveMatches() {
            const matches = findMatches();
            if (matches.size === 0) { isAnimating = false; return; }

            isAnimating = true;
            score += matches.size * 50;
            scoreDisplay.innerText = score;
            matches.forEach(m => m.classList.add('match-pop'));

            setTimeout(() => {
                matches.forEach(m => {
                    m.classList.remove('match-pop');
                    // Refill safely
                    let pick, tries = 0;
                    const r = parseInt(m.dataset.r), c = parseInt(m.dataset.c);
                    do {
                        pick = candies[Math.floor(Math.random() * candies.length)];
                        tries++;
                    } while (
                        tries < 20 && (
                            (r >= 2 && grid[r - 1] && grid[r - 1][c] && grid[r - 1][c].innerText === pick &&
                                grid[r - 2] && grid[r - 2][c] && grid[r - 2][c].innerText === pick) ||
                            (c >= 2 && grid[r] && grid[r][c - 1] && grid[r][c - 1].innerText === pick &&
                                grid[r][c - 2] && grid[r][c - 2].innerText === pick)
                        )
                    );
                    m.innerText = pick;
                });

                if (score >= 1500 && !winTriggered) {
                    winTriggered = true;
                    isAnimating = false;
                    triggerConfettiExplosion();
                    const wo = document.getElementById('win-overlay');
                    if (wo) wo.classList.add('show');
                } else {
                    isAnimating = false;
                }
            }, 380);
        }

        function initBoard() {
            board.innerHTML = '';
            grid = [];
            for (let r = 0; r < rows; r++) {
                grid[r] = [];
                for (let c = 0; c < cols; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'candy-cell';
                    cell.dataset.r = r;
                    cell.dataset.c = c;

                    let pick, tries = 0;
                    do {
                        pick = candies[Math.floor(Math.random() * candies.length)];
                        tries++;
                    } while (
                        tries < 20 && (
                            (r >= 2 && grid[r - 1][c] && grid[r - 1][c].innerText === pick && grid[r - 2][c] && grid[r - 2][c].innerText === pick) ||
                            (c >= 2 && grid[r][c - 1] && grid[r][c - 1].innerText === pick && grid[r][c - 2] && grid[r][c - 2].innerText === pick)
                        )
                    );
                    cell.innerText = pick;
                    board.appendChild(cell);
                    grid[r][c] = cell;

                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (winTriggered || isAnimating) return;

                        if (!selectedCell) {
                            selectedCell = cell;
                            cell.classList.add('selected');
                        } else {
                            const prevSel = selectedCell;
                            selectedCell.classList.remove('selected');
                            selectedCell = null;

                            const r1 = parseInt(prevSel.dataset.r), c1 = parseInt(prevSel.dataset.c);
                            const r2 = parseInt(cell.dataset.r), c2 = parseInt(cell.dataset.c);
                            const adj = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;

                            if (adj && prevSel !== cell) {
                                const temp = prevSel.innerText;
                                prevSel.innerText = cell.innerText;
                                cell.innerText = temp;

                                if (findMatches().size > 0) {
                                    resolveMatches();
                                } else {
                                    // Bounce back invalid swap
                                    isAnimating = true;
                                    setTimeout(() => {
                                        cell.innerText = prevSel.innerText;
                                        prevSel.innerText = temp;
                                        isAnimating = false;
                                    }, 220);
                                }
                            }
                        }
                    });
                }
            }
        }

        initBoard();

        const btnReplay = document.getElementById('btn-replay');
        const btnHome = document.getElementById('btn-home');
        if (btnReplay) {
            btnReplay.addEventListener('click', (e) => {
                e.stopPropagation();
                score = 0; scoreDisplay.innerText = 0;
                winTriggered = false; isAnimating = false; selectedCell = null;
                document.getElementById('win-overlay').classList.remove('show');
                initBoard();
            });
        }
        if (btnHome) {
            btnHome.addEventListener('click', (e) => {
                e.stopPropagation();
                score = 0; scoreDisplay.innerText = 0;
                winTriggered = false; isAnimating = false; selectedCell = null;
                document.getElementById('win-overlay').classList.remove('show');
                document.getElementById('modal-candycrush').classList.remove('show');
                initBoard();
            });
        }
    }

    const primaryBtn = document.querySelector('.primary-btn');
    const cakeModal = document.querySelector('.cake-modal');
    const closeModal = document.querySelector('.close-modal');

    if (primaryBtn && cakeModal) {
        primaryBtn.addEventListener('click', () => {
            cakeModal.classList.add('show');
            for (let i = 0; i < 50; i++) {
                magicalParticles.push(new Particle());
            }
            // Restore flames
            document.querySelectorAll('.flame').forEach(f => f.style.opacity = '1');
            const envModal = document.getElementById('envelope-modal');
            if (envModal) envModal.classList.remove('show');
        });
    }

    // Cake Blow via Click
    const cakeContainer = document.querySelector('.cake-container');
    if (cakeContainer) {
        cakeContainer.addEventListener('click', () => {
            document.querySelectorAll('.flame').forEach(f => f.style.opacity = '0');
            triggerConfettiExplosion();

            setTimeout(() => {
                const envModal = document.getElementById('envelope-modal');
                if (envModal) {
                    envModal.classList.add('show');
                    const envClosed = document.getElementById('envelope-closed');
                    const envOpen = document.getElementById('envelope-open');

                    if (envClosed && envOpen) {
                        envClosed.style.display = 'flex';
                        envClosed.style.opacity = '1';
                        envOpen.style.display = 'none';
                        envOpen.classList.remove('pop-out');

                        // Wait for click on closed envelope
                        envClosed.onclick = () => {
                            envClosed.style.opacity = '0';
                            setTimeout(() => {
                                envClosed.style.display = 'none';
                                envOpen.style.display = 'block';
                                envOpen.classList.add('pop-out');
                            }, 300);
                        };
                    }
                }
            }, 800); // give it a moment after blowing
        });
    }

    if (closeModal && cakeModal) {
        closeModal.addEventListener('click', () => {
            cakeModal.classList.remove('show');
            magicalParticles.splice(magicalParticles.length - 50, 50);
            const envModal = document.getElementById('envelope-modal');
            if (envModal) envModal.classList.remove('show');
        });
    }

    const closeEnv = document.getElementById('close-envelope');
    if (closeEnv) {
        closeEnv.addEventListener('click', () => {
            document.getElementById('envelope-modal').classList.remove('show');
        });
    }

    // Prevent clicks inside any tab modal content from bubbling and closing the modal
    document.querySelectorAll('.tab-modal-content').forEach(el => {
        el.addEventListener('click', e => e.stopPropagation());
    });

    // Navigation Tab Modals
    document.querySelectorAll('.nav-links a').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = 'modal-' + link.getAttribute('href').replace('#', '');
            const targetModal = document.getElementById(targetId);
            if (targetModal) {
                targetModal.classList.add('show');
            }
        });
    });

    // Close buttons for tabs
    document.querySelectorAll('.close-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            btn.closest('.tab-modal').classList.remove('show');
        });
    });

    // Birthday Wish Card Carousel
    const wishTrack = document.getElementById('wish-cards');
    const wishPrev  = document.getElementById('wish-prev');
    const wishNext  = document.getElementById('wish-next');
    if (wishTrack && wishPrev && wishNext) {
        const totalCards = wishTrack.children.length;
        let wishIdx = 0;
        const updateWish = () => {
            wishTrack.style.transform = `translateX(-${wishIdx * 100}%)`;
            wishPrev.disabled = wishIdx === 0;
            wishNext.disabled = wishIdx === totalCards - 1;
        };
        wishPrev.addEventListener('click', (e) => { e.stopPropagation(); if (wishIdx > 0) { wishIdx--; updateWish(); } });
        wishNext.addEventListener('click', (e) => { e.stopPropagation(); if (wishIdx < totalCards - 1) { wishIdx++; updateWish(); } });
        updateWish();
    }

    // Secondary Btn behaviour
    const secondaryBtn = document.querySelector('#close-scene-btn');
    if (secondaryBtn) {
        secondaryBtn.addEventListener('click', () => {
            // Scroll exactly nicely to enjoy the end without text
            window.scrollBy({ top: window.innerHeight * 1.5, behavior: 'smooth' });
        });
    }

    // Navbar CTA button
    const navCtaBtn = document.querySelector('.cta-button');
    if (navCtaBtn && cakeModal) {
        navCtaBtn.addEventListener('click', () => {
            cakeModal.classList.add('show');
            for (let i = 0; i < 100; i++) {
                magicalParticles.push(new Particle());
            }
        });
    }
});
