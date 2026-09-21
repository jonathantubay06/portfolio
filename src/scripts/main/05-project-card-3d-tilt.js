/* ═══════════════════════════════════════
   PROJECT CARD 3D TILT
═══════════════════════════════════════ */
document.querySelectorAll('.proj-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();

    // Normalise mouse position to −1..+1 relative to card center.
    // dx = -1 means far left, +1 means far right
    const dx = (e.clientX - rect.left  - rect.width  / 2) / (rect.width  / 2);
    const dy = (e.clientY - rect.top   - rect.height / 2) / (rect.height / 2);

    // perspective(700px): lower = more dramatic 3D. 700px gives a subtle but
    // visible depth without distorting text readability.
    // 7deg max rotation: noticeable tilt without making content hard to read.
    // -dy for rotateX so moving mouse UP tilts the top toward you (natural direction).
    card.style.transform  = `perspective(700px) rotateY(${dx * 7}deg) rotateX(${-dy * 7}deg) translateY(-8px) scale(1.02)`;

    // Shadow offsets mirror the tilt — shadow "falls away" from where mouse is,
    // reinforcing the 3D illusion
    card.style.boxShadow  = `${-dx * 8}px ${-dy * 8}px 30px rgba(0,212,255,0.12)`;
  });

  card.addEventListener('mouseleave', () => {
    // Reset to neutral — empty string removes the inline style and lets CSS take over
    card.style.transform = '';
    card.style.boxShadow = '';
  });
});

