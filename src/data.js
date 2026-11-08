// Mock data for Locus

window.LOCUS_DATA = (() => {
  const collections = [
    {
      id: 'shopping',
      name: 'Shopping Finds',
      hue: 28,  // warm
      glyph: '◐',
      count: 24, newCount: 5, lastSeen: '2 days ago',
      x: 0.30, y: 0.40, size: 28,  // star map position
      vibe: 'commerce, beauty, things you almost bought',
    },
    {
      id: 'reading',
      name: 'Reading & Articles',
      hue: 210,
      glyph: '◉',
      count: 18, newCount: 2, lastSeen: 'last week',
      x: 0.68, y: 0.28, size: 22,
      vibe: 'longform, ideas, quotes',
    },
    {
      id: 'design',
      name: 'Design Inspiration',
      hue: 160,
      glyph: '◍',
      count: 31, newCount: 0, lastSeen: '3 days ago',
      x: 0.50, y: 0.62, size: 32,
      vibe: 'type, color, layouts',
    },
    {
      id: 'travel',
      name: 'Travel & Places',
      hue: 280,
      glyph: '◎',
      count: 12, newCount: 0, lastSeen: 'last month',
      x: 0.78, y: 0.72, size: 18,
      vibe: 'maps, restaurants, would-go someday',
    },
    {
      id: 'food',
      name: 'Food & Recipes',
      hue: 12,
      glyph: '◌',
      count: 9, newCount: 1, lastSeen: 'last month',
      x: 0.22, y: 0.78, size: 16,
      vibe: 'menus, ramen joints, cooking notes',
    },
    {
      id: 'workouts',
      name: 'Workouts',
      hue: 95,
      glyph: '◉',
      count: 6, newCount: 0, lastSeen: '5 days ago',
      x: 0.85, y: 0.45, size: 14,
      vibe: 'pilates, mobility, things to try',
    },
  ];

  // Constellations — which collections are semantically linked
  const links = [
    ['shopping','design'],
    ['design','reading'],
    ['reading','travel'],
    ['food','travel'],
    ['shopping','food'],
    ['design','workouts'],
  ];

  // Captures
  const captures = [
    // Shopping
    { id:'c1', collection:'shopping', title:'Laneige Water Sleeping Mask', glyph:'🧴',
      tags:['skincare','mask','overnight','hydration'], date:'Mar 18, 2026', source:'Pinterest',
      summary:'A hydrating overnight sleeping mask that forms a moisture barrier while you sleep. Gel texture absorbs without residue. Standout pick for dry and combination skin during winter.',
      actions:[{kind:'link',label:'View product'},{kind:'note',label:'Add to wishlist'}],
      confidence:94 },
    { id:'c2', collection:'shopping', title:'Anessa Perfect UV Sunscreen SPF50+', glyph:'☀',
      tags:['sunscreen','mineral','SPF50','japan'], date:'Mar 17, 2026', source:'Twitter',
      summary:'Cult Japanese sunscreen, reapplies cleanly over makeup, water-resistant. Most reviews cite it as the gold standard for daily wear.',
      confidence:91 },
    { id:'c3', collection:'shopping', title:'The Ordinary Niacinamide 10%', glyph:'◐',
      tags:['serum','niacinamide','pore'], date:'Mar 16, 2026', source:'Instagram',
      summary:'Budget serum for oil control and pore appearance. Most users see results in 4–6 weeks. Pair with hydrating layers underneath.',
      confidence:88 },
    { id:'c4', collection:'shopping', title:'MAC Ruby Woo Matte Lipstick', glyph:'✦',
      tags:['lip','red','matte','classic'], date:'Mar 15, 2026', source:'Pinterest',
      summary:'Cult blue-red matte that works on every skin tone. Long-wearing but drying — prep lips first.',
      confidence:96 },
    { id:'c5', collection:'shopping', title:'Tatcha Organic Skincare Gift Set', glyph:'❀',
      tags:['natural','organic','gift'], date:'Mar 13, 2026', source:'Instagram',
      summary:'Travel-size sampler of Tatcha hero products. Often discounted around holidays — bookmark for next gifting cycle.',
      confidence:82 },
    { id:'c6', collection:'shopping', title:'Rare Beauty Soft Pinch Blush', glyph:'◉',
      tags:['blush','dewy','buildable'], date:'Mar 11, 2026', source:'Pinterest',
      summary:'Liquid blush, highly pigmented — start with a single dot. Dewy finish that doesn\'t move under powder.',
      confidence:90 },

    // Reading
    { id:'r1', collection:'reading', title:'The case against productivity', glyph:'❝',
      tags:['essay','attention','slow'], date:'Mar 14, 2026', source:'Substack',
      summary:'Long essay arguing optimization frameworks erode the conditions for original thought. Worth re-reading after a week away.',
      confidence:97 },
    { id:'r2', collection:'reading', title:'Why cities feel slow now', glyph:'◐',
      tags:['urbanism','infrastructure'], date:'Mar 09, 2026', source:'Twitter',
      summary:'Thread on regulatory drag in transit projects, with comparisons across Tokyo, Paris, and NYC.',
      confidence:85 },
    { id:'r3', collection:'reading', title:'On attention as currency', glyph:'❅',
      tags:['quote','attention'], date:'Mar 05, 2026', source:'Notion',
      summary:'Saved quote: "the easiest way to value your time is to notice what you give it to for free."',
      confidence:78 },

    // Design
    { id:'d1', collection:'design', title:'Aalto vase color study', glyph:'◍',
      tags:['color','glass','industrial'], date:'Mar 17, 2026', source:'Pinterest',
      summary:'Palette pulled from Alvar Aalto Iittala glassware — six tones from smoke grey to deep ochre.',
      confidence:92 },
    { id:'d2', collection:'design', title:'Variable type spec — Söhne', glyph:'A',
      tags:['type','variable','spec'], date:'Mar 15, 2026', source:'Notion',
      summary:'Reference spec for using Söhne across UI and print. Includes weight-axis curve and tracking pairs.',
      confidence:95 },
    { id:'d3', collection:'design', title:'Editorial grid — Apartamento', glyph:'▦',
      tags:['layout','grid','print'], date:'Mar 12, 2026', source:'Instagram',
      summary:'Three-column grid with deliberate column overflow. Captures a magazine-like rhythm in digital.',
      confidence:88 },

    // Travel
    { id:'t1', collection:'travel', title:'Onomichi day-trip from Kyoto', glyph:'⛰',
      tags:['japan','seto','cycling'], date:'Feb 28, 2026', source:'Twitter',
      summary:'Cycling route along the Shimanami Kaido. Best in late April, book the ferry the night before.',
      actions:[{kind:'calendar', label:'Save April reminder', date:'Apr 18'}],
      confidence:90 },
    { id:'t2', collection:'travel', title:'Lisbon bakery list', glyph:'☕',
      tags:['lisbon','food','bakeries'], date:'Feb 21, 2026', source:'Instagram',
      summary:'Curated 6-stop pastel-de-nata crawl through Alfama and Belém.',
      confidence:86 },

    // Food
    { id:'f1', collection:'food', title:'Mensho ramen — SF', glyph:'🍜',
      tags:['ramen','SF','tonkotsu'], date:'Feb 18, 2026', source:'Twitter',
      summary:'Vegan tonkotsu and chicken paitan. Go off-peak, queue can hit 90 min on weekends.',
      confidence:93 },
    { id:'f2', collection:'food', title:'Miso-glazed eggplant recipe', glyph:'◓',
      tags:['recipe','japanese','dinner'], date:'Feb 12, 2026', source:'Notion',
      summary:'Broil 8 min, glaze on at minute 6. Saved miso ratio: 2T white miso : 1T mirin : 1T sake : 1t sugar.',
      confidence:84 },
  ];

  // Triage queue — items not yet routed
  const triageQueue = [
    { id:'q1', glyph:'🧴', source:'Pinterest', user:'@kbeauty_diary',
      text:'Repurchased the Laneige Water Sleeping Mask for the 4th time. Winter skin saviour — locks in moisture all night.',
      tags:['skincare','overnight','mask'], aiGuess:'Shopping Finds', aiConfidence:94, color:'linear-gradient(135deg,#1a3a6a,#2d5a8a)' },
    { id:'q2', glyph:'☕', source:'Instagram', user:'@lisbon_bites',
      text:'Pastéis de Belém — the original, since 1837. Worth the queue if you go before 10am. Try the cinnamon version.',
      tags:['lisbon','bakery','travel'], aiGuess:'Travel & Places', aiConfidence:91, color:'linear-gradient(135deg,#2a3520,#4a5530)' },
    { id:'q3', glyph:'A', source:'Notion', user:'@type_today',
      text:'Söhne by Klim — the new workhorse sans. Variable axes for weight + grade. Pairs beautifully with Tiempos.',
      tags:['type','sans','klim'], aiGuess:'Design Inspiration', aiConfidence:96, color:'linear-gradient(135deg,#1f1a28,#382a4a)' },
    { id:'q4', glyph:'◐', source:'Twitter', user:'@urbanist',
      text:'Why does no one talk about how Tokyo built 35 new stations while NYC argued about one? Thread →',
      tags:['urbanism','transit'], aiGuess:'Reading & Articles', aiConfidence:88, color:'linear-gradient(135deg,#152030,#28384a)' },
    { id:'q5', glyph:'⛰', source:'Twitter', user:'@slow_travel',
      text:'Shimanami Kaido cycling route, 70km island-hopping over the Seto inland sea. Book the night ferry from Imabari.',
      tags:['japan','cycling','seto'], aiGuess:'Travel & Places', aiConfidence:92, color:'linear-gradient(135deg,#1a2840,#2a3a55)' },
    { id:'q6', glyph:'◍', source:'Pinterest', user:'@aalto_studies',
      text:'Color study from the Iittala collection — six tones, smoke grey through deep ochre. Saving for the next palette exploration.',
      tags:['color','glass','aalto'], aiGuess:'Design Inspiration', aiConfidence:90, color:'linear-gradient(135deg,#28201a,#3a3225)' },
    { id:'q7', glyph:'🍜', source:'Twitter', user:'@sfeats',
      text:'Mensho Ramen in Tenderloin — vegan tonkotsu broth is shockingly close to the real thing. Off-peak only or 90 min wait.',
      tags:['ramen','SF','food'], aiGuess:'Food & Recipes', aiConfidence:89, color:'linear-gradient(135deg,#2a1a1a,#3a2828)' },
    { id:'q8', glyph:'❝', source:'Substack', user:'@oliverc',
      text:'"The easiest way to value your time is to notice what you give it to for free." — saved this line, it lands.',
      tags:['quote','attention'], aiGuess:'Reading & Articles', aiConfidence:85, color:'linear-gradient(135deg,#1a1a28,#2a2a3a)' },
  ];

  return { collections, captures, triageQueue, links };
})();
