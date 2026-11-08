// Mock data for Locus

window.LOCUS_DATA = (() => {
  const collections = [
    {
      id: 'shopping',
      name: 'Shopping Finds',
      glyph: '◐',
      vibe: 'commerce, beauty, things you almost bought',
    },
    {
      id: 'reading',
      name: 'Reading & Articles',
      glyph: '◉',
      vibe: 'longform, ideas, quotes',
    },
    {
      id: 'design',
      name: 'Design Inspiration',
      glyph: '◍',
      vibe: 'type, color, layouts',
    },
    {
      id: 'travel',
      name: 'Travel & Places',
      glyph: '◎',
      vibe: 'maps, restaurants, would-go someday',
    },
    {
      id: 'food',
      name: 'Food & Recipes',
      glyph: '◌',
      vibe: 'menus, ramen joints, cooking notes',
    },
    {
      id: 'workouts',
      name: 'Workouts',
      glyph: '◉',
      vibe: 'pilates, mobility, things to try',
    },
  ];

  // Captures. Sample titles are kept short enough to fit the two lines a drawer row shows.
  const captures = [
    // Shopping
    { id:'c1', collection:'shopping', kind:'shopping', title:'Washed linen shirt for summer', glyph:'👕',
      tags:['shopping','clothes','summer'], date:'Mar 18, 2026', source:'Xiaohongshu',
      summary:'Stays cool above 30 degrees and softens after a few washes. The fit runs boxy, so size down if you want it closer.',
      details:[{label:'Product',value:'Washed linen shirt'},{label:'Price',value:'¥219'},{label:'Size',value:'M fits 165 to 172 cm'}],
      confidence:94 },
    { id:'c2', collection:'shopping', kind:'shopping', title:'Stoneware pour-over coffee set', glyph:'☕',
      tags:['shopping','coffee','home'], date:'Mar 17, 2026', source:'Taobao',
      summary:'Dripper and server sized for two cups. Holds heat better than glass, but the handle gets warm on a full pour.',
      details:[{label:'Product',value:'Pour-over dripper and server'},{label:'Price',value:'¥168'},{label:'Discount',value:'¥20 off until end of March'}],
      confidence:91 },
    { id:'c3', collection:'shopping', kind:'shopping', title:'Rainproof backpack for commuting', glyph:'🎒',
      tags:['shopping','bags','commute'], date:'Mar 16, 2026', source:'Xiaohongshu',
      summary:'Roll-top keeps a laptop dry through a full downpour. Flat back panel makes it easy to carry on a crowded train.',
      details:[{label:'Product',value:'Roll-top backpack, 20 L'},{label:'Price',value:'¥329'},{label:'Size',value:'Fits a 14 inch laptop'}],
      confidence:88 },
    { id:'c4', collection:'shopping', kind:'shopping', title:'Dimmable warm desk lamp', glyph:'💡',
      tags:['shopping','home','desk'], date:'Mar 15, 2026', source:'JD',
      summary:'Warm setting is easy on the eyes at night, and the arm reaches across a full-size desk without tipping.',
      details:[{label:'Product',value:'Dimmable LED desk lamp'},{label:'Price',value:'¥199'}],
      confidence:96 },
    { id:'c5', collection:'shopping', kind:'shopping', title:'Cushioned shoes for long walks', glyph:'👟',
      tags:['shopping','shoes','travel'], date:'Mar 13, 2026', source:'Xiaohongshu',
      summary:'Reviewer walked 20,000 steps a day for a week without sore feet. Wide toe box, so go half a size down.',
      details:[{label:'Product',value:'Everyday walking shoes'},{label:'Price',value:'¥459'},{label:'Size',value:'Half a size down'}],
      confidence:82 },
    { id:'c6', collection:'shopping', kind:'shopping', title:'First cast iron pan to buy', glyph:'🍳',
      tags:['shopping','kitchen','cooking'], date:'Mar 11, 2026', source:'Taobao',
      summary:'A 24 cm pan comes pre-seasoned and heats evenly. Heavy, but the short helper handle makes it manageable.',
      details:[{label:'Product',value:'Cast iron skillet, 24 cm'},{label:'Price',value:'¥139'}],
      confidence:90 },

    // Reading
    { id:'r1', collection:'reading', kind:'article_quote', title:'Why deep work needs idle time', glyph:'📖',
      tags:['reading','work','focus'], date:'Mar 14, 2026', source:'WeChat',
      summary:'Argues that a packed calendar cuts the slow thinking good ideas depend on. Suggests protecting one empty afternoon a week.',
      details:[{label:'Main argument',value:'Idle time is part of the work, not a break from it'}],
      confidence:97 },
    { id:'r2', collection:'reading', kind:'article_quote', title:'How rail stations shape a city', glyph:'🚉',
      tags:['reading','cities','transport'], date:'Mar 09, 2026', source:'Zhihu',
      summary:'Neighbourhoods within a ten-minute walk of a station grow denser and keep more small shops than those built around roads.',
      confidence:85 },
    { id:'r3', collection:'reading', kind:'study', title:'Why handwriting helps you remember', glyph:'✍️',
      tags:['reading','study','memory'], date:'Mar 05, 2026', source:'Xiaohongshu',
      summary:'Writing by hand is slower, which forces you to summarize instead of copying. That extra step is what makes notes stick.',
      details:[{label:'Key points',value:'Summarize, do not transcribe\nReview within a day\nRewrite the parts you forgot'}],
      confidence:78 },

    // Design
    { id:'d1', collection:'design', kind:'design', title:'Six colours from old glassware', glyph:'🎨',
      tags:['design','colour','inspiration'], date:'Mar 17, 2026', source:'Pinterest',
      summary:'A palette running from smoke grey to deep amber. The muted tones sit well together on a cream background.',
      details:[{label:'Style',value:'Muted, warm, translucent'}],
      confidence:92 },
    { id:'d2', collection:'design', kind:'design', title:'Pairing a serif with a clean sans', glyph:'🔤',
      tags:['design','typography'], date:'Mar 15, 2026', source:'Notion',
      summary:'Use the serif only for headlines and the sans for everything else. Matching their x-heights keeps the page calm.',
      details:[{label:'Style',value:'Serif headline, sans body'}],
      confidence:95 },
    { id:'d3', collection:'design', kind:'design', title:'Three-column magazine grid', glyph:'📰',
      tags:['design','layout','print'], date:'Mar 12, 2026', source:'Instagram',
      summary:'Images break across columns on purpose while text stays locked to the grid, which gives the page its rhythm.',
      confidence:88 },

    // Travel
    { id:'t1', collection:'travel', kind:'travel', title:'Cycling the Shimanami Kaido', glyph:'🚲',
      tags:['travel','japan','cycling'], date:'Feb 28, 2026', source:'Xiaohongshu',
      summary:'About 70 km of bridges and islands between Onomichi and Imabari. Two days is relaxed, with a night on one of the islands.',
      details:[{label:'Place',value:'Shimanami Kaido'},{label:'City or area',value:'Onomichi to Imabari'},{label:'Best time',value:'Spring or autumn'},{label:'Tips',value:'Rent the bike a day ahead on weekends'}],
      confidence:90 },
    { id:'t2', collection:'travel', kind:'travel', title:'A custard tart walk in Lisbon', glyph:'🥧',
      tags:['travel','portugal','food'], date:'Feb 21, 2026', source:'Instagram',
      summary:'Six bakeries from Alfama to Belém, planned as one long morning on foot. Eat them warm, with cinnamon.',
      details:[{label:'Place',value:'Alfama to Belém'},{label:'City or area',value:'Lisbon'},{label:'Tips',value:'Start early, most sell out by afternoon'}],
      confidence:86 },

    // Food
    { id:'f1', collection:'food', kind:'recipe', title:'Rich chicken ramen at home', glyph:'🍜',
      tags:['recipe','japan','dinner'], date:'Feb 18, 2026', source:'Xiaohongshu',
      summary:'Simmering wings hard for two hours gives a creamy broth without pork bones. Season each bowl, not the pot.',
      details:[{label:'Dish',value:'Chicken paitan ramen'},{label:'Total time',value:'2 hours 30 minutes'},{label:'Steps',value:'Blanch the wings\nBoil hard for two hours\nStrain and season each bowl'}],
      confidence:93 },
    { id:'f2', collection:'food', kind:'recipe', title:'Miso-glazed eggplant', glyph:'🍆',
      tags:['recipe','japan','vegetarian'], date:'Feb 12, 2026', source:'Notion',
      summary:'Broil for 8 minutes and add the glaze at minute 6, so the miso caramelizes without burning.',
      details:[{label:'Dish',value:'Miso-glazed eggplant'},{label:'Ingredients',value:'2 tbsp white miso\n1 tbsp mirin\n1 tbsp sake\n1 tsp sugar'},{label:'Total time',value:'15 minutes'}],
      confidence:84 },
  ];

  // Triage queue — items not yet routed
  const triageQueue = [
    { id:'q1', kind:'shopping', title:'Handmade stoneware mugs', glyph:'☕', source:'Xiaohongshu', user:'@slowhome',
      text:'Each mug is thrown by hand, so the glaze varies a little. Holds 300 ml and is dishwasher safe.',
      details:[{label:'Product',value:'Stoneware mug, 300 ml'},{label:'Price',value:'¥88'}],
      tags:['shopping','home','coffee'], aiGuess:'Shopping Finds', aiConfidence:94, color:'linear-gradient(135deg,#1a3a6a,#2d5a8a)' },
    { id:'q2', kind:'travel', title:'Belém before the crowds', glyph:'⛪', source:'Instagram', user:'@lisbon_days',
      text:'Reach the monastery when it opens, then walk to the river. By late morning the queue reaches the tram stop.',
      details:[{label:'Place',value:'Belém'},{label:'City or area',value:'Lisbon'},{label:'Tips',value:'Arrive when it opens'}],
      tags:['travel','portugal'], aiGuess:'Travel & Places', aiConfidence:91, color:'linear-gradient(135deg,#2a3520,#4a5530)' },
    { id:'q3', kind:'design', title:'Type sizes for phone screens', glyph:'📱', source:'Notion', user:'@type_today',
      text:'Four sizes are enough: title, body, label and caption. Keep body text at 17 so it stays comfortable to read.',
      details:[{label:'Style',value:'Four text sizes, one typeface'}],
      tags:['design','typography'], aiGuess:'Design Inspiration', aiConfidence:96, color:'linear-gradient(135deg,#1f1a28,#382a4a)' },
    { id:'q4', kind:'article_quote', title:'Cities built around walking', glyph:'🚶', source:'Zhihu', user:'@urbanist',
      text:'Short blocks, shops at street level and shade do more for a neighbourhood than a new road. A useful checklist.',
      details:[{label:'Main argument',value:'Small street details decide whether people walk'}],
      tags:['reading','cities'], aiGuess:'Reading & Articles', aiConfidence:88, color:'linear-gradient(135deg,#152030,#28384a)' },
    { id:'q5', kind:'travel', title:'Kyoto temples at sunrise', glyph:'⛩', source:'Xiaohongshu', user:'@slow_travel',
      text:'Some temple grounds open at dawn. Go before 8 am for quiet paths and soft light, then have breakfast nearby.',
      details:[{label:'Place',value:'Kyoto temples'},{label:'Best time',value:'Before 8 am'}],
      tags:['travel','japan'], aiGuess:'Travel & Places', aiConfidence:92, color:'linear-gradient(135deg,#1a2840,#2a3a55)' },
    { id:'q6', kind:'design', title:'Bold colour blocks on posters', glyph:'🟧', source:'Pinterest', user:'@print_studies',
      text:'Three flat colours and one typeface. Letting a single colour take half the poster makes it readable from far away.',
      details:[{label:'Style',value:'Flat colour, one typeface'}],
      tags:['design','colour','print'], aiGuess:'Design Inspiration', aiConfidence:90, color:'linear-gradient(135deg,#28201a,#3a3225)' },
    { id:'q7', kind:'food', title:'A quiet late-night noodle bar', glyph:'🍜', source:'Dianping', user:'@citybites',
      text:'Eight seats at a counter and one broth on the menu. Go after 9 pm to skip the queue.',
      details:[{label:'Price per person',value:'¥45'},{label:'Queue or booking',value:'Go after 9 pm'}],
      tags:['food','noodles'], aiGuess:'Food & Recipes', aiConfidence:89, color:'linear-gradient(135deg,#2a1a1a,#3a2828)' },
    { id:'q8', kind:'article_quote', title:'Where your free time really goes', glyph:'⏳', source:'WeChat', user:'@oliverc',
      text:'Write down where your free time went for one week. The list is usually more surprising than any advice.',
      details:[{label:'Main argument',value:'Track your time before trying to change it'}],
      tags:['reading','habits'], aiGuess:'Reading & Articles', aiConfidence:85, color:'linear-gradient(135deg,#1a1a28,#2a2a3a)' },
  ];

  // Raise this when the samples above change, so browsers that already saved the old ones get the new wording.
  const sampleVersion = 2;

  return { collections, captures, triageQueue, sampleVersion };
})();
