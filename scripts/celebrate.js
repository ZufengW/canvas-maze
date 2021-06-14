/** @fileoverview Defines a function to generates a celebratory animation. */

/**
 * Start launch celebratory particles on repeat.
 *
 * @param {string[]} imgSrcs List of img sources.
 */
function startCelebration(imgSrcs) {
  const container = document.createElement('div');
  container.classList.add('celebrate-container');
  for (let i = 0; i < 8; ++i) {
    const img = document.createElement('img');
    img.src = imgSrcs[i % imgSrcs.length];
    img.classList.add('celebrate-img');
    img.alt = '';
    container.appendChild(img);
  }

  document.body.appendChild(container);

  container.childNodes.forEach(child => {
    animateChildForCelebrate(child);
  });
}

function animateChildForCelebrate(child) {
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
