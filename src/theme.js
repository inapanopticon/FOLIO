// Locus — palette. Book-cover colors; text on each is a tint/shade of the same hue,
// never plain black or white.

window.LocusTheme = (() => {
  // Sampled from the "Library" reference, in its order.
  const PALETTE = [
    { name: 'mustard',   bg: '#f6cf46', fg: '#6b501a' },
    { name: 'apricot',   bg: '#f0a274', fg: '#7a4127' },
    { name: 'vermilion', bg: '#de6e4b', fg: '#ffead8' },
    { name: 'ochre',     bg: '#a26d2f', fg: '#f0dcbc' },
    { name: 'cobalt',    bg: '#2a59af', fg: '#c4d8f5' },
    { name: 'sage',      bg: '#d5dcd0', fg: '#4f524b' },
    { name: 'navy',      bg: '#061953', fg: '#c9d4e4' },
    { name: 'mist',      bg: '#d6e0e7', fg: '#4e5761' },
    // Second row: matcha, sage green, lake, sky, lavender, indigo, berry, charcoal.
    { name: 'matcha',    bg: '#b6c58c', fg: '#3e4b2a' },
    { name: 'sage-green',bg: '#c3cfc0', fg: '#455443' },
    { name: 'lake',      bg: '#72b6b1', fg: '#173f3c' },
    { name: 'sky',       bg: '#b8d6e7', fg: '#38596e' },
    { name: 'lavender',  bg: '#c9bfe1', fg: '#51436b' },
    { name: 'indigo',    bg: '#344b73', fg: '#dde6f6' },
    { name: 'berry',     bg: '#91465f', fg: '#f8e0e9' },
    { name: 'charcoal',  bg: '#303638', fg: '#dde3e3' },
  ];

  // A screenshot no drawer fits yet has no colour of its own.
  const PLAIN = { name: 'plain', bg: '#ffffff', fg: '#222220' };

  // A collection keeps the colour it was given; older data falls back to its position.
  function colorOf(collection, collections) {
    if (collection?.plain) return PLAIN;
    if (collection && Number.isInteger(collection.color)) return PALETTE[collection.color % PALETTE.length];
    const i = collections ? collections.findIndex((c) => c.id === collection?.id) : -1;
    return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
  }

  // Next colour for a new drawer: the least-used one, in palette order.
  function nextColor(collections) {
    const used = PALETTE.map((_, i) => collections.filter((c, j) => (Number.isInteger(c.color) ? c.color : j) % PALETTE.length === i).length);
    const min = Math.min(...used);
    return used.indexOf(min);
  }

  // Type scale (after Apple HIG, trimmed to four roles). Every text size in the app comes from here.
  const TYPE = { title: 28, body: 17, label: 15, caption: 13 };

  const TITLE_MAX = 60;
  const titleLength = (value) => Array.from(value || '').length;
  const shortTitle = (value) => {
    const chars = Array.from((value || '').trim());
    return chars.length > TITLE_MAX ? chars.slice(0, TITLE_MAX - 1).join('') + '…' : chars.join('');
  };
  // The thin line between cells on a page in a drawer's colour.
  const hairline = (fg) => `1px solid color-mix(in srgb, ${fg} 28%, transparent)`;
  const formatDate = (time = Date.now()) => new Date(time).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  return { PALETTE, colorOf, nextColor, TYPE, TITLE_MAX, titleLength, shortTitle, hairline, formatDate };
})();
