/** @fileoverview Defines a function to generates a celebratory animation. */

/**
 * Start launch celebratory particles on repeat.
 *
 * @param {string[]} imgSrcs List of img sources.
 */
async function startCelebration(imgSrcs) {
  const container = document.createElement('div');
  container.classList.add('celebrate-container');

  const imgLoadPromises = [];
  for (let i = 0; i < 8; ++i) {
    const img = document.createElement('img');
    imgLoadPromises.push(new Promise((resolve) => {
      // Assuming load will always succeed.
      img.addEventListener('load', () => resolve(img));
    }));
    img.src = imgSrcs[i % imgSrcs.length];
    img.classList.add('celebrate-img');
    img.alt = '';

    container.appendChild(img);
  }
  await Promise.all(imgLoadPromises);

  document.body.appendChild(container);

  // Old browsers don't support animate. https://caniuse.com/web-animation
  if (!container.animate) {
    alert('You win!\nTo see the win animation, please upgrade to a '
      + 'recent version of a modern browser.');
    return;
  }
  container.childNodes.forEach(child => {
    animateChildForCelebrate(child);
  });
}

function animateChildForCelebrate(child) {
  if (!child.animate) return;
  const xStart = (Math.random() - 0.5) * 0.5 * (window.innerWidth - 36);
  const xExtra = (Math.random() - 0.5) * 0.5 * (window.innerWidth - 36);
  const twoFifthH = window.innerHeight * 0.4;
  const moveDist = twoFifthH + Math.random() * twoFifthH;
  const anim = child.animate(
    [
      { transform: `translate(${xStart}px, 0)`, opacity: 1},
      { opacity: 1, offset: 0.9},
      { transform: `translate(${(xStart + xExtra)}px, -${moveDist}px)`, opacity: 0},
    ], {
      duration: 1000 + Math.random() * 1000,
      // Like ease-out but stronger.
      easing: 'cubic-bezier(.07,.51,.54,.95)',
      iterations: 1,
    }
  );
  anim.onfinish = () => animateChildForCelebrate(child);
}
