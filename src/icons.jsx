// Locus — drawer icons: one consistent line set (24px grid, 1.6 stroke, round joins)

const ICON_P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const DRAWER_ICONS = {
  bag: (<g {...ICON_P}><path d="M5.5 8h13l-1 12h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></g>),
  book: (<g {...ICON_P}><path d="M4 5.5c2.8-1 5.4-.8 8 1 2.6-1.8 5.2-2 8-1v13c-2.8-1-5.4-.8-8 1-2.6-1.8-5.2-2-8-1z"/><path d="M12 6.5v13"/></g>),
  pen: (<g {...ICON_P}><path d="M12 3.5l5.5 8-5.5 9-5.5-9z"/><circle cx="12" cy="12" r="1.6"/><path d="M12 3.5v6.9"/></g>),
  plane: (<g {...ICON_P}><path d="M3.5 13.5l17-7-4.5 13-4-5z"/><path d="M12 14.5l8.5-8"/></g>),
  pin: (<g {...ICON_P}><path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/></g>),
  fork: (<g {...ICON_P}><path d="M7 3.5v6a2 2 0 0 0 4 0v-6"/><path d="M9 11.5v9"/><path d="M16.5 20.5v-17c-2 1-3 3.5-3 6.5 0 2 1 3 3 3"/></g>),
  dumbbell: (<g {...ICON_P}><path d="M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11"/></g>),
  music: (<g {...ICON_P}><path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></g>),
  film: (<g {...ICON_P}><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M8 5v14M16 5v14"/></g>),
  note: (<g {...ICON_P}><path d="M6 3.5h9l3 3v14H6z"/><path d="M9 10h6M9 13.5h6M9 17h4"/></g>),
  heart: (<g {...ICON_P}><path d="M12 19.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 7a4 4 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/></g>),
  home: (<g {...ICON_P}><path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 9.5v10h11v-10"/><path d="M10 19.5v-5h4v5"/></g>),
  leaf: (<g {...ICON_P}><path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14z"/><path d="M5 19l8-8"/></g>),
  camera: (<g {...ICON_P}><path d="M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.3"/></g>),
  spark: (<g {...ICON_P}><path d="M12 3.5l1.8 6.7 6.7 1.8-6.7 1.8-1.8 6.7-1.8-6.7-6.7-1.8 6.7-1.8z"/></g>),
  folder: (<g {...ICON_P}><path d="M3.5 7.5a2 2 0 0 1 2-2H10l2 2.5h6.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></g>),
};

const ICON_KEYS = Object.keys(DRAWER_ICONS);

// Guess an icon from the drawer's name (English or Chinese); the user can change it later.
const ICON_RULES = [
  [/shop|buy|wish|beauty|购|买|美妆|好物/i, 'bag'],
  [/read|article|book|essay|quote|阅读|书|文章|摘抄/i, 'book'],
  [/design|art|type|color|inspir|设计|灵感|排版|配色/i, 'pen'],
  [/travel|trip|flight|旅|行程|出行/i, 'plane'],
  [/place|map|city|地点|地方|城市|探店/i, 'pin'],
  [/food|recipe|cook|eat|ramen|café|cafe|食|菜|饭|吃|咖啡/i, 'fork'],
  [/work ?out|gym|fit|sport|pilates|yoga|健身|运动|锻炼/i, 'dumbbell'],
  [/music|song|playlist|音乐|歌/i, 'music'],
  [/movie|film|show|watch|电影|剧/i, 'film'],
  [/note|idea|memo|笔记|想法|备忘/i, 'note'],
  [/home|house|interior|家|装修|家居/i, 'home'],
  [/plant|garden|nature|植物|自然/i, 'leaf'],
  [/photo|camera|picture|摄影|照片/i, 'camera'],
  [/love|health|care|健康|喜欢/i, 'heart'],
];

function iconFor(collection) {
  if (collection?.icon && DRAWER_ICONS[collection.icon]) return collection.icon;
  const name = collection?.name || '';
  const hit = ICON_RULES.find(([re]) => re.test(name));
  return hit ? hit[1] : 'folder';
}

// Round badge with the drawer's icon: a soft tint of the card's text colour behind a line icon.
// `solid` = filled with the drawer colour, for use on the cream page (list view, menus).
function DrawerBadge({ collection, col, size = 36, solid = false }) {
  const key = iconFor(collection);
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: col.fg, background: solid ? col.bg : `color-mix(in srgb, ${col.fg} 14%, transparent)`,
    }}>
      <svg viewBox="0 0 24 24" width={size * 0.52} height={size * 0.52} aria-hidden="true">{DRAWER_ICONS[key]}</svg>
    </span>
  );
}

window.LocusIcons = { DRAWER_ICONS, ICON_KEYS, iconFor, DrawerBadge };
