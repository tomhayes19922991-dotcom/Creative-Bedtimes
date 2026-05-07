"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const T = {
  bg:"#07090f", surface:"#0e1118", card:"#13161f", cardHover:"#181c28",
  border:"#1e2336", borderLight:"#252c42",
  accent:"#f5c842", accentSoft:"#f5c84222",
  rose:"#f25c7a", roseSoft:"#f25c7a22",
  teal:"#3de0c8", tealSoft:"#3de0c822",
  violet:"#9b7ff4", violetSoft:"#9b7ff422",
  gold:"#f5a623", goldSoft:"#f5a62322",
  text:"#eef0f8", textSoft:"#7a86a8", textMuted:"#3d4560",
  head:"'Playfair Display',Georgia,serif",
  body:"'Lora',Georgia,serif",
  ui:"'DM Sans',system-ui,sans-serif",
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const VIBES = [
  {id:"funny",     emoji:"😂", label:"Funny & Silly",      color:T.accent},
  {id:"chaotic",   emoji:"🌀", label:"Totally Chaotic",    color:T.rose},
  {id:"magical",   emoji:"✨", label:"Magical & Dreamy",   color:T.violet},
  {id:"educational",emoji:"🧠",label:"Learning Adventure", color:T.teal},
  {id:"family",    emoji:"👨‍👩‍👧‍👦",label:"Family Story",       color:T.accent},
  {id:"spooky",    emoji:"👻", label:"Spooky & Silly",     color:T.violet},
];
const LENGTHS = [
  {id:"short",  label:"Short",  desc:"~2 min", paragraphs:4},
  {id:"medium", label:"Medium", desc:"~5 min", paragraphs:8},
  {id:"long",   label:"Long",   desc:"~10 min",paragraphs:14},
];
const ILL_STYLES = [
  {id:"watercolour",label:"Watercolour",  emoji:"🎨"},
  {id:"storybook",  label:"Storybook",    emoji:"📖"},
  {id:"cartoon",    label:"Cartoon",      emoji:"🌈"},
  {id:"pencil",     label:"Pencil Sketch",emoji:"✏️"},
];
const CHARS   = ["Dragon","Princess","Robot","Wizard","Knight","Alien","Pirate","Dinosaur","Unicorn","Ninja","Astronaut","Mermaid","Superhero","Witch","Fox","Bear"];
const SETTINGS= ["Enchanted Forest","Outer Space","Underwater Kingdom","Candy Castle","Volcano Island","The Future","Haunted Mansion","Secret Library","North Pole","Jungle","Flying Ship","The Moon","A Tiny Village","The Deep Ocean"];
const LESSONS = ["Friendship","Bravery","Being Kind","Never Give Up","Sharing","Being Yourself","Curiosity","Family Love","Honesty","Patience"];
const AVATARS = ["🌙","🦁","🐻","🦊","🐼","🐯","🦋","🌟","🧙","🐉","🦄","🚀","🍄","🌊","🎠"];
const MOODS   = [{v:1,e:"😴",l:"Fell asleep"},{v:2,e:"😐",l:"It was okay"},{v:3,e:"🙂",l:"Liked it"},{v:4,e:"😄",l:"Loved it"},{v:5,e:"🤩",l:"Best ever!"}];
const NARRATOR_VOICES = [
  {id:"calm",    label:"Calm & Gentle", pitch:1,   rate:0.85},
  {id:"warm",    label:"Warm & Cosy",   pitch:0.9, rate:0.8},
  {id:"playful", label:"Playful & Fun", pitch:1.2, rate:0.95},
  {id:"dramatic",label:"Dramatic",      pitch:0.8, rate:0.75},
];
const BADGES = [
  {id:"first_story", emoji:"🌟",name:"First Story",      desc:"Created your very first story",    req:(s)=>s>=1},
  {id:"story_5",     emoji:"📖",name:"Storyteller",      desc:"Created 5 stories",                req:(s)=>s>=5},
  {id:"story_10",    emoji:"🏆",name:"Master Storyteller",desc:"Created 10 stories",             req:(s)=>s>=10},
  {id:"series_start",emoji:"🎬",name:"Series Creator",   desc:"Started your first series",        req:(_s,ser)=>ser>=1},
  {id:"remix",       emoji:"🔁",name:"Remixer",          desc:"Remixed your first story",         req:(_s,_se,r)=>r>=1},
  {id:"streak_3",    emoji:"🔥",name:"3-Night Streak",   desc:"3 nights in a row",               req:(_s,_se,_r,_i,st)=>st>=3},
  {id:"sharer",      emoji:"🌍",name:"Community Star",   desc:"Shared a story",                   req:(_s,_se,_r,_i,_st,sh)=>sh>=1},
];
const SAMPLE_COMMUNITY = [
  {id:"c1",author:"The Patel Family", avatar:"🦁",title:"Captain Zara and the Moon Pirates",  vibe:"magical",     likes:142,text:"Captain Zara had never seen a pirate ship made of moonbeams before, but then again, she had never sailed the night sky either. The ship sparkled like a thousand falling stars as it drifted towards her bedroom window...",illustrations:[]},
  {id:"c2",author:"House of Millers", avatar:"🐻",title:"Professor Biscuit: Episode 1",         vibe:"educational", likes:98, episode:1,seriesName:"Professor Biscuit",text:"The books started whispering on a Tuesday, which was inconvenient because Tuesdays were usually very quiet days in the library. Professor Biscuit adjusted his spectacles and listened carefully...",illustrations:[]},
  {id:"c3",author:"The O'Brien Crew", avatar:"🦊",title:"When Dad Became a Dragon (Again)",     vibe:"funny",       likes:211,text:"It was the third time this month that Dad had accidentally turned himself into a dragon, and Mum was starting to get tired of it. The living room ceiling had three new scorch marks...",illustrations:[]},
  {id:"c4",author:"The Torres Fam",   avatar:"🐯",title:"Super Rosie Saves the Sandwich",       vibe:"funny",       likes:334,text:"The sandwich had gone missing at 12:04pm and Super Rosie had exactly sixteen minutes before lunch ended to solve the greatest mystery of Year Two...",illustrations:[]},
];

// ── LOCAL STORY ENGINE ────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const STORY_TEMPLATES = {
  funny: [
    (chars, setting, lesson, idea, family) => {
      const hero = chars[0] || "the Dragon";
      const friend = chars[1] || "a very surprised Wizard";
      const place = setting || "the Enchanted Forest";
      const twist = pick(["sneezed glitter everywhere","accidentally turned everything purple","sat on the king's hat","ate the entire royal pudding","sang so loudly the clouds fell down"]);
      const fix = pick(["a bucket of moonbeam soup","three backwards somersaults and a whistle","saying sorry and sharing their biscuits","a very long nap","the biggest laugh anyone had ever heard"]);
      const title = `The Day ${hero} ${twist.split(" ")[0].charAt(0).toUpperCase() + twist.split(" ")[0].slice(1)}ed Everything`;
      const paras = [
        `In ${place}, there lived ${hero} who was absolutely, completely, magnificently terrible at one particular thing: being normal.`,
        `It started on a Tuesday — as most disasters do — when ${hero} ${twist}, and everything went wonderfully, hilariously wrong.`,
        `${friend} arrived on the scene with wide eyes and an even wider mouth. "Did you just—" they began. "Yes," said ${hero}. "I absolutely did."`,
        `The whole of ${place} came to have a look. The beetles clicked. The mushrooms giggled. Even the grumpy old oak tree let out a snort.`,
        `${idea ? `Someone had suggested: "${idea}" — and honestly, it didn't help one bit. But it did make things considerably more interesting.` : `Things got considerably more interesting when ${hero} decided to try fixing it by doing the exact same thing again, only louder.`}`,
        `It was ${friend} who finally had the most sensible idea: they would fix everything with ${fix}.`,
        `It worked. Mostly. There were still a few patches of purple, and the clouds were a little closer to the ground than before.`,
        `But as ${hero} and ${friend} curled up together watching the sunset, ${hero} learned something important: ${lesson || "sometimes the funniest moments make the best memories"}.`,
        `"Same time tomorrow?" asked ${friend}. ${hero} grinned the biggest, silliest grin. "Absolutely not," they said. And then immediately started planning it.`,
        `${family ? `And far away, someone who loved them very much — just like ${family} — smiled in their sleep, dreaming of adventures yet to come.` : `And all across ${place}, not a single creature slept without a smile on their face that night.`}`,
        `The moon yawned. The stars pulled up their blankets. And ${hero} drifted off to sleep, already dreaming of tomorrow's mischief.`,
        `The end. (Probably. Knowing ${hero}, it's more of a pause.)`,
      ];
      return { title, paras };
    },
  ],
  chaotic: [
    (chars, setting, lesson, idea, family) => {
      const hero  = chars[0] || "the Robot";
      const chaos = pick(["the laws of gravity stopped working on Wednesdays","every door now led somewhere completely different","all the animals had swapped their voices","the colour blue had gone on holiday"]);
      const place = setting || "The Future";
      const title = `Everything Is Fine (It Is Not Fine): A Story About ${hero}`;
      const paras = [
        `Nobody was quite sure when it started, but one morning in ${place}, ${chaos}, and ${hero} decided this was, in fact, fine.`,
        `"Everything is fine," said ${hero}, floating gently past the ceiling. "This is simply how things are now."`,
        `${chars[1] ? `${chars[1]} disagreed rather strongly, mostly because they were now speaking in the voice of a very small frog.` : `A passing cloud disagreed rather strongly, mostly by raining upwards.`}`,
        `${idea ? `Someone had shouted: "${idea}" — which, in hindsight, was what caused the second explosion.` : `Then came the second explosion. Nobody mentioned the first one.`}`,
        `${hero} made a list. The list immediately floated away, gained sentience, and started making its own lists.`,
        `By lunchtime, three impossible things had happened before breakfast (they were running late), and ${hero} had learned to simply say "ah" and nod.`,
        `"Perhaps," said ${hero}, hanging upside down from a rainbow, "this is what adventure feels like."`,
        `It was, it turned out. And adventures — even completely unhinged ones — always find their way home.`,
        `${lesson ? `As the chaos gently settled, like snow made of biscuit crumbs, ${hero} understood: ${lesson}.` : `As the chaos settled, ${hero} understood that the most chaotic days are often the ones you remember longest.`}`,
        `${family ? `Just like ${family} knows: the best family stories are always the ridiculous ones.` : `The stars rearranged themselves into a smiley face, purely out of solidarity.`}`,
        `${hero} closed their eyes. The world, slightly more chaotic than before but somehow exactly right, hummed them to sleep.`,
      ];
      return { title, paras };
    },
  ],
  magical: [
    (chars, setting, lesson, idea, family) => {
      const hero  = chars[0] || "the young Wizard";
      const place = setting || "the Enchanted Forest";
      const magic = pick(["a door made of starlight appeared in the oldest oak tree","the river began to flow upward towards the moon","every flower whispered a different secret","the northern lights came down to dance on the grass"]);
      const gift  = pick(["a single feather that glowed like dawn","a song that nobody had ever heard before","a stone that was warm no matter how cold the night","a map that showed the way to anywhere you truly needed to go"]);
      const title = `${hero} and the Light Beyond the ${pick(["Stars","Hills","Forest","Sea","Door"])}`;
      const paras = [
        `In the quiet hour between dusk and dark, when the world holds its breath, ${hero} discovered something extraordinary in ${place}.`,
        `It began when ${magic}, and the air smelled of warm bread and distant rain and something else — something that felt like a beginning.`,
        `${hero} had been told that magic wasn't real. But here it was, sitting in front of them like a polite cat, waiting to be acknowledged.`,
        `They reached out. The light reached back.`,
        `${chars[1] ? `${chars[1]} appeared from between the trees, silver-eyed and knowing. "You found it," they whispered. "We knew you would."` : `A silver fox appeared from between the trees, silver-eyed and knowing. "You found it," it whispered. "We knew you would."`}`,
        `${idea ? `"${idea}," said ${hero} softly — and somehow, in this magical place, that made perfect sense.` : `${hero} sat down in the soft moss and just breathed, because some moments deserve nothing but your full attention.`}`,
        `The forest gave ${hero} ${gift} — not because they had done something great, but because they had been brave enough to look.`,
        `"What do I do with it?" ${hero} asked. "You'll know," said the forest, "when the moment comes."`,
        `${lesson ? `And right there, in the warm dark of that magical night, ${hero} understood: ${lesson}.` : `And right there, in the warm dark of that magical night, ${hero} understood that the greatest magic is the kind that lives inside you.`}`,
        `${family ? `${family} would have understood. Some magic runs in families, passed down like old songs and warm hands.` : `The stars understood. They leaned down a little closer to listen.`}`,
        `${hero} walked home through the dark that didn't feel dark anymore, carrying something small and warm and impossibly precious.`,
        `And when they closed their eyes, the magic was still there — the best kind always is.`,
      ];
      return { title, paras };
    },
  ],
  educational: [
    (chars, setting, lesson, idea, family) => {
      const hero   = chars[0] || "Professor Pip";
      const place  = setting || "the Secret Library";
      const topic  = pick(["why the ocean is salty","how bees know which flowers to visit","why the sky turns pink at sunset","what makes rainbows appear","how birds know which way is south"]);
      const answer = pick(["patience and very careful observation","asking the right questions","looking at things from a completely different angle","listening to someone much older and much smaller than you","trying the wrong answer first, on purpose"]);
      const title  = `${hero} and the Mystery of ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
      const paras = [
        `${hero} had a question. This was not unusual. ${hero} always had a question. The unusual part was that this particular question had been stuck in their head for fourteen days.`,
        `The question was: ${topic}?`,
        `${hero} looked in ${place} for the answer. They looked in books with gold spines and books with no spines at all. They looked in the space between the pages.`,
        `${chars[1] ? `${chars[1]} found them there, surrounded by towers of books and one cold cup of tea. "Still looking?" they asked. "Always," said ${hero}.` : `A very old tortoise found them there, surrounded by towers of books. "Still looking?" it asked. "Always," said ${hero}."`}`,
        `${idea ? `"What about this idea," said ${hero}: "${idea}?" It was, it turned out, closer to the answer than anyone expected.` : `"What if," said ${hero} slowly, "we tried the simplest explanation first?"`}`,
        `The answer, it turned out, required ${answer}.`,
        `It took most of the afternoon. There were several wrong turns, one spectacular accident involving a jar of honey, and a moment where everyone had to sit quietly and think very hard.`,
        `But then — there it was. The answer. Small and true and satisfying, like the last piece of a puzzle.`,
        `"Oh," said ${hero}. And then: "Oh! So that means—" And then they grabbed a pencil and started writing so fast the paper nearly caught fire.`,
        `${lesson ? `That evening, ${hero} understood something beyond the answer: ${lesson}.` : `That evening, ${hero} understood the best thing about questions: every answer leads to three more, and that is not a problem. That is an adventure.`}`,
        `${family ? `${family} had always said: the cleverest people are not the ones who know the most, but the ones who keep asking.` : `The tortoise nodded wisely and went back to sleep. It had always known. It had simply been waiting to be asked.`}`,
        `${hero} closed their notebook, said goodnight to ${place}, and dreamed of the next question already forming at the edges of their mind.`,
      ];
      return { title, paras };
    },
  ],
  family: [
    (chars, setting, lesson, idea, family) => {
      const fam  = family || "the family";
      const place= setting || "somewhere magical";
      const mem  = pick(["an afternoon at the beach that went wonderfully wrong","a rainy day that turned into the best day","a road trip with seventeen wrong turns","a birthday that nobody planned but everybody remembered","a Tuesday that refused to be ordinary"]);
      const title= `The ${pick(["Best","Most Wonderful","Perfectly Imperfect","Unforgettable","Legendary"])} Day ${fam} Ever Had`;
      const paras = [
        `It wasn't supposed to be a special day. That's the thing about the best days — they never announce themselves.`,
        `${fam} woke up to ${mem}, and everything changed from there.`,
        `${chars[0] ? `${chars[0]} was the first to notice something was different. "Today," they said, with great authority, "is going to be an adventure."` : `The youngest one was the first to notice something was different. "Today," they announced, with great authority, "is going to be an adventure."`}`,
        `They were right. Though not in the way any of them expected.`,
        `There was a moment — somewhere in the middle of the day, between the chaos and the laughter — where everything was exactly, perfectly right.`,
        `${idea ? `Someone had the idea: "${idea}". And because this family was the kind that said yes to things like that, they did it.` : `Someone said "why not?" And because this was that kind of family, they didn't need any more reason than that.`}`,
        `${chars[1] ? `${chars[1]} held someone's hand. Someone held it back. The whole world was in that hand-hold.` : `Someone held someone's hand. The whole world was in that hand-hold.`}`,
        `They ate something that was probably not supposed to be eaten that way. They laughed about it for years afterwards.`,
        `As the sun went down over ${place}, somebody said "I love you" without planning to, and it was the truest thing anyone said all day.`,
        `${lesson ? `And they all understood, without quite saying it, that ${lesson}.` : `And they all understood, without quite saying it, that the best adventures aren't the ones you plan — they're the ones you stumble into together.`}`,
        `${fam} went home slowly, because nobody wanted the day to end. The sky was pink and the air was warm and everything was good.`,
        `That night, falling asleep, everyone was smiling at exactly the same thing. Family days have a magic all their own.`,
      ];
      return { title, paras };
    },
  ],
  spooky: [
    (chars, setting, lesson, idea, family) => {
      const hero  = chars[0] || "the brave young Knight";
      const place = setting || "the Haunted Mansion";
      const spook = pick(["a ghost who was terrified of the dark","a monster under the bed who just wanted a bedtime story","a creaking door that was actually just the house sighing","a shadow that turned out to be a very dramatic cat","a howling noise that was definitely, absolutely, one hundred percent just the wind (probably)"]);
      const title = `${hero} and the ${pick(["Slightly","Mostly","Rather","Completely","Allegedly"])} Haunted ${pick(["House","Tower","Library","Cupboard","Wardrobe"])}`;
      const paras = [
        `${place} had a reputation. People said it was haunted. They said strange lights appeared at night. They said you could hear howling.`,
        `${hero} was not scared. (They were a little bit scared. But only a very small bit, hardly worth mentioning.)`,
        `The first strange thing was ${spook}.`,
        `${hero} took a deep breath. Then another. Then they did what brave people actually do — they went towards the scary thing instead of away from it.`,
        `${chars[1] ? `${chars[1]} followed closely behind, holding onto ${hero}'s cloak and pretending very hard that they weren't.` : `Their heart hammered like a tiny drum. Their feet kept going anyway. That's what brave is.`}`,
        `${idea ? `"${idea}," said ${hero}, mostly to themselves. Saying something out loud made the dark feel smaller.` : `"Hello?" said ${hero} into the dark. The dark, surprisingly, said hello back.`}`,
        `What they found wasn't frightening at all, when you really looked at it. Most scary things aren't, in the end.`,
        `They sat down with the ${pick(["ghost","monster","shadow","something"])} and had a conversation. It lasted an hour. They learned three surprising things and shared a biscuit.`,
        `${lesson ? `Walking home under the stars, ${hero} thought about what they'd learned: ${lesson}.` : `Walking home under the stars, ${hero} thought: the scariest things and the most interesting things are usually the same things.`}`,
        `${family ? `${family} was waiting with warm drinks and open arms. That's the best thing to come home to after an adventure.` : `Someone was waiting with warm drinks and open arms. That's the best thing to come home to after an adventure.`}`,
        `${hero} climbed into bed, listened to the house settle around them, and realised: it didn't sound haunted anymore. It sounded like home.`,
        `They closed their eyes. Outside, the night was peaceful and kind. The moon kept watch. Everything was safe.`,
      ];
      return { title, paras };
    },
  ],
};

function generateLocalStory(vibe, chars, setting, lesson, idea, familyNote, length, isRemix, seriesName, epNum) {
  const templates = STORY_TEMPLATES[vibe] || STORY_TEMPLATES.magical;
  const template  = pick(templates);
  let { title, paras } = template(chars, setting, lesson, idea, familyNote);

  // Remix: shuffle middle paragraphs and swap some phrases
  if (isRemix) {
    const middle = paras.slice(2, -2).sort(() => Math.random() - 0.5);
    paras = [paras[0], paras[1], ...middle, paras[paras.length-2], paras[paras.length-1]];
    title = "✨ Remixed: " + title;
  }

  // Trim/extend to match length
  const targetParas = LENGTHS.find(l => l.id === length)?.paragraphs || 8;
  while (paras.length < targetParas && paras.length > 0) {
    paras.push(pick([
      `The stars above ${setting || "the land"} twinkled their approval.`,
      `And everyone agreed it had been quite the most remarkable day.`,
      `Somewhere nearby, something small and magical happened that nobody noticed. But it was there.`,
      `The night was soft and warm and full of good things.`,
    ]));
  }
  paras = paras.slice(0, targetParas);

  // Series prefix
  if (seriesName && epNum) title = `${seriesName}: Episode ${epNum} — ${title.replace("✨ Remixed: ", "")}`;

  return { title, text: paras.join("\n\n") };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2,10); }

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
function Stars() {
  const stars = useRef(Array.from({length:55},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,size:Math.random()*2+0.5,delay:Math.random()*4,speed:2+Math.random()*3}))).current;
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      {stars.map(s=>(
        <div key={s.id} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,width:s.size,height:s.size,borderRadius:"50%",background:s.id%5===0?T.accent:s.id%7===0?T.violet:"#fff",opacity:0.4,animation:`twinkle ${s.speed}s ease-in-out infinite alternate`,animationDelay:`${s.delay}s`}}/>
      ))}
    </div>
  );
}

function VibeBadge({vibe}) {
  const v = VIBES.find(x=>x.id===vibe);
  if(!v) return null;
  return <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:v.color+"22",color:v.color,fontFamily:T.ui,fontWeight:700}}>{v.emoji} {v.label}</span>;
}

function Ava({emoji,size=40}) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:T.accentSoft,border:`1.5px solid ${T.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.45,flexShrink:0}}>{emoji}</div>;
}

function Btn({children,variant="primary",onClick,disabled,style:xtra={},small}) {
  const base = {padding:small?"8px 18px":"13px 28px",borderRadius:999,border:"none",cursor:disabled?"not-allowed":"pointer",fontSize:small?13:15,fontFamily:T.ui,fontWeight:700,transition:"all 0.18s",opacity:disabled?0.45:1,lineHeight:1};
  const vs   = {primary:{background:T.accent,color:"#07090f"},rose:{background:T.rose,color:"#fff"},ghost:{background:"transparent",color:T.textSoft,border:`1.5px solid ${T.border}`},outline:{background:"transparent",color:T.accent,border:`1.5px solid ${T.accent}`},teal:{background:T.teal,color:"#07090f"},violet:{background:T.violet,color:"#fff"},gold:{background:T.gold,color:"#07090f"}};
  return <button onClick={disabled?undefined:onClick} style={{...base,...vs[variant],...xtra}}>{children}</button>;
}

function Pill({selected,onClick,children,color}) {
  const c = color||T.accent;
  return <button onClick={onClick} style={{padding:"8px 16px",borderRadius:999,border:`1.5px solid ${selected?c:T.border}`,background:selected?c+"22":"transparent",color:selected?c:T.textSoft,cursor:"pointer",fontSize:14,fontFamily:T.ui,fontWeight:selected?700:500,transition:"all 0.15s"}}>{children}</button>;
}

function Card({children,style:xtra={},onClick}) {
  const [hov,setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov&&onClick?T.cardHover:T.card,border:`1px solid ${hov&&onClick?T.borderLight:T.border}`,borderRadius:20,padding:24,boxShadow:hov&&onClick?"0 8px 32px #00000055":"0 2px 12px #00000033",transition:"all 0.2s",cursor:onClick?"pointer":"default",transform:hov&&onClick?"translateY(-2px)":"none",...xtra}}>
      {children}
    </div>
  );
}

function Inp({value,onChange,placeholder,rows,style:xtra={}}) {
  const base = {width:"100%",padding:"12px 16px",borderRadius:12,border:`1.5px solid ${T.border}`,background:T.surface,color:T.text,fontFamily:T.body,fontSize:15,outline:"none",boxSizing:"border-box",resize:rows?"vertical":undefined};
  if(rows) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...base,...xtra}}/>;
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...base,...xtra}}/>;
}

function MicBtn({onResult}) {
  const [on,setOn] = useState(false);
  const ref = useRef(null);
  const go  = () => {
    if(!("webkitSpeechRecognition" in window||"SpeechRecognition" in window)){alert("Use Chrome for voice input!");return;}
    if(on){ref.current?.stop();setOn(false);return;}
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    const r  = new SR(); r.lang="en-US";
    r.onresult = e=>{onResult(e.results[0][0].transcript);setOn(false);};
    r.onerror  = ()=>setOn(false);
    r.onend    = ()=>setOn(false);
    r.start(); ref.current=r; setOn(true);
  };
  return <button onClick={go} style={{padding:"10px 14px",borderRadius:999,border:`1.5px solid ${on?T.rose:T.accent}`,background:on?T.rose+"22":T.accentSoft,color:on?T.rose:T.accent,cursor:"pointer",fontSize:18,flexShrink:0,animation:on?"pulse 1s ease-in-out infinite":"none"}}>{on?"⏹️":"🎙️"}</button>;
}

function ProgBar({step,total}) {
  return <div style={{height:3,background:T.border,borderRadius:4,marginBottom:28,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${T.accent},${T.violet})`,width:`${((step+1)/total)*100}%`,transition:"width 0.4s ease"}}/></div>;
}

// ── NARRATION PLAYER ──────────────────────────────────────────────────────────
function NarrationPlayer({text}) {
  const [playing,  setPlaying]   = useState(false);
  const [voice,    setVoice]     = useState("calm");
  const [showV,    setShowV]     = useState(false);
  const [progress, setProgress]  = useState(0);
  const vc = NARRATOR_VOICES.find(v=>v.id===voice)||NARRATOR_VOICES[0];

  const stop = useCallback(()=>{window.speechSynthesis?.cancel();setPlaying(false);setProgress(0);},[]);
  const play = useCallback(()=>{
    if(!("speechSynthesis" in window)){alert("Text-to-speech not available in this browser.");return;}
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch=vc.pitch; utt.rate=vc.rate; utt.volume=1;
    const voices = window.speechSynthesis.getVoices();
    const eng    = voices.find(v=>v.lang.startsWith("en")&&v.name.includes("Female"))||voices.find(v=>v.lang.startsWith("en"))||voices[0];
    if(eng) utt.voice=eng;
    utt.onstart  = ()=>setPlaying(true);
    utt.onend    = ()=>{setPlaying(false);setProgress(0);};
    utt.onerror  = ()=>setPlaying(false);
    utt.onboundary = e=>{if(e.name==="word"&&text.length>0)setProgress(Math.round((e.charIndex/text.length)*100));};
    window.speechSynthesis.speak(utt);
  },[text,vc]);
  useEffect(()=>()=>window.speechSynthesis?.cancel(),[]);

  return (
    <div style={{borderRadius:16,border:`1px solid ${T.teal}44`,background:T.tealSoft,padding:"16px 20px",marginBottom:24}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:showV?16:0}}>
        <button onClick={playing?stop:play} style={{width:44,height:44,borderRadius:"50%",border:"none",background:T.teal,color:"#07090f",cursor:"pointer",fontSize:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{playing?"⏸":"▶"}</button>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:13,fontWeight:700,color:T.teal,fontFamily:T.ui}}>🎙️ {vc.label}</span>
            <button onClick={()=>setShowV(!showV)} style={{background:"transparent",border:"none",color:T.textSoft,cursor:"pointer",fontSize:12,fontFamily:T.ui}}>{showV?"Hide ↑":"Change voice ↓"}</button>
          </div>
          <div style={{height:4,background:T.border,borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",background:T.teal,borderRadius:4,width:`${progress}%`,transition:"width 0.3s"}}/>
          </div>
        </div>
      </div>
      {showV && (
        <div style={{display:"flex",flexWrap:"wrap",gap:8,paddingTop:4}}>
          {NARRATOR_VOICES.map(v=>(
            <button key={v.id} onClick={()=>{setVoice(v.id);if(playing){stop();setTimeout(play,100);}}} style={{padding:"6px 14px",borderRadius:999,border:`1.5px solid ${voice===v.id?T.teal:T.border}`,background:voice===v.id?T.tealSoft:"transparent",color:voice===v.id?T.teal:T.textSoft,cursor:"pointer",fontFamily:T.ui,fontSize:13,fontWeight:voice===v.id?700:400}}>
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PICTURE BOOK ──────────────────────────────────────────────────────────────
function PictureBook({story}) {
  const paras = (story.text||"").split("\n").filter(p=>p.trim().length>0);
  if(!paras.length) return null;
  return (
    <div>
      {paras.map((p,i)=>(
        <p key={i} style={{fontSize:17,lineHeight:2,color:T.text,fontFamily:T.body,marginBottom:20,textIndent:"1.5em"}}>{p}</p>
      ))}
    </div>
  );
}

// ── MOOD RATER ────────────────────────────────────────────────────────────────
function MoodRater({storyId,currentMood,onRate}) {
  return (
    <div style={{borderRadius:16,border:`1px solid ${T.border}`,background:T.surface,padding:"16px 20px",marginTop:20}}>
      <div style={{fontSize:13,fontWeight:700,color:T.textSoft,fontFamily:T.ui,marginBottom:12}}>⭐ How did the kids react?</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {MOODS.map(m=>(
          <button key={m.v} onClick={()=>onRate(storyId,m.v)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px 14px",borderRadius:14,border:`1.5px solid ${currentMood===m.v?T.gold:T.border}`,background:currentMood===m.v?T.goldSoft:"transparent",cursor:"pointer",transition:"all 0.15s",flex:1,minWidth:55}}>
            <span style={{fontSize:24}}>{m.e}</span>
            <span style={{fontSize:10,color:currentMood===m.v?T.gold:T.textSoft,fontFamily:T.ui,fontWeight:currentMood===m.v?700:400,textAlign:"center",lineHeight:1.2}}>{m.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── BADGE SHELF ───────────────────────────────────────────────────────────────
function BadgeShelf({earned}) {
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
      {BADGES.map(b=>{
        const got = earned.includes(b.id);
        return (
          <div key={b.id} title={b.desc} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"12px 14px",borderRadius:14,border:`1.5px solid ${got?T.gold:T.border}`,background:got?T.goldSoft:T.surface,opacity:got?1:0.4,transition:"all 0.2s",flex:"1 1 80px",minWidth:80}}>
            <span style={{fontSize:28,filter:got?"none":"grayscale(1)"}}>{b.emoji}</span>
            <span style={{fontSize:11,color:got?T.gold:T.textSoft,fontFamily:T.ui,fontWeight:700,textAlign:"center",lineHeight:1.2}}>{b.name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── PDF EXPORT ────────────────────────────────────────────────────────────────
function exportPDF(story) {
  const w = window.open("","_blank");
  if(!w) return;
  const paras = (story.text||"").split("\n").filter(p=>p.trim());
  const bodyHtml = paras.map(p=>`<p>${p}</p>`).join("");
  const vibe = VIBES.find(v=>v.id===story.vibe);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${story.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lora:ital,wght@0,400;1,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#fdf8f0;font-family:'Lora',Georgia,serif;color:#2a1a0a}
  .cover{background:linear-gradient(135deg,#1a0a2e,#0d1525);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;text-align:center;page-break-after:always}
  .moon{font-size:80px;margin-bottom:24px}
  .brand{font-size:14px;color:#f5c84288;letter-spacing:3px;text-transform:uppercase;margin-bottom:32px}
  .ctitle{font-family:'Playfair Display',serif;font-size:40px;font-weight:900;color:#f5c842;line-height:1.2;margin-bottom:16px}
  .badge{display:inline-block;padding:6px 20px;border-radius:999px;border:1.5px solid #f5c84244;color:#f5c84299;font-size:14px;margin-bottom:24px}
  .date{color:#7a86a888;font-size:13px}
  .story{max-width:680px;margin:0 auto;padding:60px 40px}
  p{font-size:17px;line-height:2;margin-bottom:20px;text-indent:1.5em}
  .footer{text-align:center;padding:40px;color:#c8b89888;font-size:13px;border-top:1px solid #e8d5b7;margin-top:40px}
</style></head><body>
<div class="cover">
  <div class="moon">🌙</div>
  <div class="brand">Creative Bedtimes</div>
  <h1 class="ctitle">${story.title}</h1>
  <div class="badge">${vibe?vibe.emoji:""} ${vibe?vibe.label:""}</div>
  <div class="date">${story.date||""}</div>
</div>
<div class="story">${bodyHtml}</div>
<div class="footer">Created with Creative Bedtimes · A magical story made just for your family 🌙</div>
<script>window.onload=function(){setTimeout(function(){window.print();},800);};<\/script>
</body></html>`);
  w.document.close();
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,      setUser]      = useState(null);
  const [authOpen,  setAuthOpen]  = useState(false);
  const [authMode,  setAuthMode]  = useState("login");
  const [aName,     setAName]     = useState("");
  const [aEmail,    setAEmail]    = useState("");
  const [aAvatar,   setAAvatar]   = useState("🌙");
  const [aFamily,   setAFamily]   = useState("");

  const [screen,       setScreen]      = useState("home");
  const [stories,      setStories]     = useState([]);
  const [seriesList,   setSeriesList]  = useState([]);
  const [activeStory,  setActiveStory] = useState(null);
  const [activeSeries, setActiveSeries]= useState(null);
  const [likes,        setLikes]       = useState({});
  const [moods,        setMoods]       = useState({});
  const [streak,       setStreak]      = useState({count:0,lastDate:null});
  const [earnedBadges, setEarnedBadges]= useState([]);
  const [newBadge,     setNewBadge]    = useState(null);
  const [remixCount,   setRemixCount]  = useState(0);
  const [shareCount,   setShareCount]  = useState(0);

  const [bStep,     setBStep]     = useState(0);
  const [bVibe,     setBVibe]     = useState(null);
  const [bLen,      setBLen]      = useState("medium");
  const [bChars,    setBChars]    = useState([]);
  const [bSetting,  setBSetting]  = useState(null);
  const [bLesson,   setBLesson]   = useState(null);
  const [bIdea,     setBIdea]     = useState("");
  const [bFam,      setBFam]      = useState(false);
  const [bFamNote,  setBFamNote]  = useState("");
  const [bSeriesId, setBSeriesId] = useState(null);
  const [bNewSeries,setBNewSeries]= useState("");
  const [generating,setGenerating]= useState(false);

  const [starterOpen,   setStarterOpen]   = useState(false);
  const [starterLine,   setStarterLine]   = useState("");
  const [starterChild,  setStarterChild]  = useState("");
  const [starterStep,   setStarterStep]   = useState(0);
  const [starterLoading,setStarterLoading]= useState(false);

  const [seriesModal,setSeriesModal]= useState(false);
  const [nsName,     setNsName]     = useState("");
  const [nsDesc,     setNsDesc]     = useState("");

  const TOTAL   = 8;
  const SLABELS = ["Vibe","Length","Characters","Setting","Lesson","Your Idea","Family","Series"];

  const row = {display:"flex",alignItems:"center",gap:12};
  const mu  = {fontSize:14,color:T.textSoft,lineHeight:1.6};
  const lbl = {fontSize:11,fontWeight:700,color:T.textSoft,textTransform:"uppercase",letterSpacing:1.2,marginBottom:10,display:"block"};
  const h1s = {fontFamily:T.head,fontSize:32,fontWeight:900,color:T.text,margin:"0 0 8px",lineHeight:1.15};
  const h2s = {fontFamily:T.head,fontSize:22,fontWeight:800,color:T.text,margin:"0 0 6px"};
  const g2  = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};

  function rb() { setBStep(0);setBVibe(null);setBLen("medium");setBChars([]);setBSetting(null);setBLesson(null);setBIdea("");setBFam(false);setBFamNote("");setBSeriesId(null);setBNewSeries(""); }
  function toggleChar(c) { setBChars(p=>p.includes(c)?p.filter(x=>x!==c):p.length<3?[...p,c]:p); }

  function checkBadges(sc,serc,rc,strc,shc) {
    const newOnes = [];
    BADGES.forEach(b=>{
      if(!earnedBadges.includes(b.id)&&b.req(sc,serc,rc,0,strc,shc)) newOnes.push(b.id);
    });
    if(newOnes.length) {
      setEarnedBadges(p=>[...p,...newOnes]);
      setNewBadge(BADGES.find(b=>b.id===newOnes[0]));
      setTimeout(()=>setNewBadge(null),4000);
    }
  }

  function updateStreak() {
    setStreak(prev=>{
      const td = new Date().toDateString();
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
      const yd = yesterday.toDateString();
      const count = prev.lastDate===yd?prev.count+1:prev.lastDate===td?prev.count:1;
      return {count,lastDate:td};
    });
  }

  function getSerCtx(sid) {
    if(!sid) return "";
    const eps = stories.filter(s=>s.seriesId===sid).sort((a,b)=>a.episode-b.episode);
    if(!eps.length) return "";
    return eps.map(e=>`Episode ${e.episode}: ${e.title}`).join(", ");
  }

  function doGenerate(isRemix=false, extraIdea="") {
    setGenerating(true); setScreen("story");
    let sid=bSeriesId; let sname=""; let epn=1;
    if(bNewSeries.trim()) {
      const ns={id:genId(),name:bNewSeries.trim(),desc:"",created:new Date().toLocaleDateString(),episodes:0};
      setSeriesList(p=>[...p,ns]); sid=ns.id; sname=ns.name;
    } else if(sid) {
      const f=seriesList.find(s=>s.id===sid); sname=f?.name||""; epn=stories.filter(s=>s.seriesId===sid).length+1;
    }

    const ideaText = extraIdea || bIdea;
    const famText  = bFam ? bFamNote : "";

    // Small artificial delay so the loading screen shows (feels more magical)
    setTimeout(()=>{
      const {title,text} = generateLocalStory(bVibe||"magical",bChars,bSetting,bLesson,ideaText,famText,bLen,isRemix,sname,sid?epn:null);
      const story = {
        id:genId(), title, text, vibe:bVibe||"magical",
        date:new Date().toLocaleDateString(),
        seriesId:sid||null, seriesName:sname||null, episode:sid?epn:null,
        author:user?`${user.familyName} Family`:"My Family",
        authorAvatar:user?.avatar||"🌙",
        shared:false, likes:0, illustrations:[], isRemix,
      };
      setActiveStory(story);
      setStories(p=>[story,...p]);
      if(sid) setSeriesList(p=>p.map(x=>x.id===sid?{...x,episodes:x.episodes+1}:x));
      if(isRemix) setRemixCount(rc=>rc+1);
      updateStreak();
      checkBadges(stories.length+1,seriesList.length,isRemix?remixCount+1:remixCount,streak.count,shareCount);
      setGenerating(false);
    }, 1800);
  }

  function getStarterLine() {
    setStarterLoading(true);
    const starters = [
      "Nobody expected the library to explode — least of all the librarian.",
      "The dragon arrived on a Tuesday, which was already the worst day of the week.",
      "Someone had left a door in the middle of the forest, and it was most definitely not there yesterday.",
      "The spell worked perfectly, except for one small detail that everyone would later agree was actually quite a large detail.",
      "The map said 'here be treasure' but it did not say anything about the singing crab.",
      "When the stars started falling upward, the wizard checked their notes and said: 'Ah. So that's what that spell does.'",
      "The robot had been very specifically told not to press the orange button.",
      "It began, as most things do, with someone saying 'what's the worst that could happen?'",
    ];
    setTimeout(()=>{
      setStarterLine(pick(starters));
      setStarterLoading(false);
      setStarterStep(1);
    }, 900);
  }

  function finishStarterStory() {
    setStarterOpen(false);
    const idea = `The story starts with: "${starterLine}" and then: ${starterChild}`;
    setBIdea(idea);
    setStarterStep(0); setStarterLine(""); setStarterChild("");
    // Trigger generate with the combined idea
    setGenerating(true); setScreen("story");
    setTimeout(()=>{
      const {title,text} = generateLocalStory(bVibe||"magical",bChars,bSetting,bLesson,idea,"",bLen,false,null,null);
      const story = {id:genId(),title,text,vibe:bVibe||"magical",date:new Date().toLocaleDateString(),seriesId:null,seriesName:null,episode:null,author:user?`${user.familyName} Family`:"My Family",authorAvatar:user?.avatar||"🌙",shared:false,likes:0,illustrations:[],isRemix:false};
      setActiveStory(story); setStories(p=>[story,...p]);
      updateStreak(); checkBadges(stories.length+1,seriesList.length,remixCount,streak.count,shareCount);
      setGenerating(false);
    },1800);
  }

  function doLogin()  { if(!aEmail.trim())return; setUser({name:aName||"Friend",email:aEmail,avatar:aAvatar,familyName:aFamily||"My"}); setAuthOpen(false); }
  function doSignup() { if(!aEmail.trim()||!aFamily.trim())return; setUser({name:aName,email:aEmail,avatar:aAvatar,familyName:aFamily}); setAuthOpen(false); }
  function doMoodRate(sid,v) { setMoods(p=>({...p,[sid]:v})); setStories(p=>p.map(s=>s.id===sid?{...s,mood:v}:s)); if(activeStory?.id===sid) setActiveStory(p=>({...p,mood:v})); }
  function doShare(sid) { setStories(p=>p.map(s=>s.id===sid?{...s,shared:true}:s)); setActiveStory(p=>p?.id===sid?{...p,shared:true}:p); const sc=shareCount+1; setShareCount(sc); checkBadges(stories.length,seriesList.length,remixCount,streak.count,sc); }
  function doCreateSeries() { if(!nsName.trim())return; const ns={id:genId(),name:nsName.trim(),desc:nsDesc.trim(),created:new Date().toLocaleDateString(),episodes:0}; setSeriesList(p=>[...p,ns]); setNsName(""); setNsDesc(""); setSeriesModal(false); checkBadges(stories.length,seriesList.length+1,remixCount,streak.count,shareCount); }

  function CCard({s}) {
    const liked = likes[s.id];
    return (
      <Card>
        <div style={{...row,justifyContent:"space-between",marginBottom:12}}>
          <div style={row}><Ava emoji={s.avatar||"🌙"} size={38}/><div><div style={{fontWeight:700,fontSize:14}}>{s.author}</div><VibeBadge vibe={s.vibe}/></div></div>
          {s.seriesName&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:T.violetSoft,color:T.violet,fontWeight:700}}>{s.seriesName}·Ep{s.episode}</span>}
        </div>
        <div style={{fontFamily:T.head,fontSize:17,fontWeight:800,color:T.text,marginBottom:8}}>{s.title}</div>
        <div style={{...mu,fontSize:13,marginBottom:16,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{s.text}</div>
        <div style={{...row,justifyContent:"space-between"}}>
          <button onClick={()=>setLikes(p=>({...p,[s.id]:!p[s.id]}))} style={{background:liked?T.roseSoft:"transparent",border:`1px solid ${liked?T.rose:T.border}`,color:liked?T.rose:T.textSoft,padding:"6px 14px",borderRadius:999,cursor:"pointer",fontFamily:T.ui,fontSize:13,fontWeight:700}}>{liked?"❤️":"🤍"} {(s.likes||0)+(liked?1:0)}</button>
          {s.mood&&<span style={{fontSize:16}}>{MOODS.find(m=>m.v===s.mood)?.e}</span>}
        </div>
      </Card>
    );
  }

  // ── HOME ──────────────────────────────────────────────────────────────────
  function Home() {
    return (
      <div>
        <div style={{textAlign:"center",padding:"48px 0 36px"}}>
          <div style={{fontSize:72,marginBottom:16,animation:"float 3s ease-in-out infinite"}}>🌙</div>
          <h1 style={{...h1s,fontSize:44,color:T.accent}}>Creative Bedtimes</h1>
          <p style={{...mu,fontSize:17,maxWidth:480,margin:"12px auto 32px"}}>Magical AI-powered bedtime stories — built together by children and parents, every single night.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={()=>{rb();setScreen("build");}} style={{fontSize:17,padding:"16px 36px",boxShadow:`0 4px 24px ${T.accentSoft}`}}>✨ Create Tonight's Story</Btn>
            <Btn variant="outline" onClick={()=>{setStarterOpen(true);setStarterStep(0);}}>⚡ Story Starter</Btn>
            <Btn variant="ghost" onClick={()=>setScreen("community")}>🌍 Community</Btn>
          </div>
        </div>

        {(streak.count>0||earnedBadges.length>0)&&(
          <Card style={{marginBottom:20,border:`1px solid ${T.gold}44`,background:T.goldSoft}}>
            <div style={{...row,justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              {streak.count>0&&<div style={row}><span style={{fontSize:28}}>🔥</span><div><div style={{fontWeight:700,color:T.gold}}>{streak.count}-Night Streak!</div><div style={{...mu,fontSize:12}}>Create a story tonight to keep it going</div></div></div>}
              {earnedBadges.length>0&&<div style={row}><span style={{fontSize:28}}>⭐</span><div><div style={{fontWeight:700,color:T.gold}}>{earnedBadges.length} Badge{earnedBadges.length!==1?"s":""} Earned</div><div style={{...mu,fontSize:12}}>See your profile to view them all</div></div></div>}
            </div>
          </Card>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:32}}>
          {[{i:"✨",t:"AI Stories",d:"Personalised every night"},{i:"⚡",t:"Story Starter",d:"Child leads the way"},{i:"📖",t:"Series",d:"Ongoing adventures"},{i:"🏆",t:"Badges",d:"Earn as you create"},{i:"🎙️",t:"Narration",d:"Reads aloud to kids"},{i:"📄",t:"PDF Export",d:"Printable keepsakes"}].map(f=>(
            <Card key={f.t} style={{textAlign:"center",padding:"18px 12px"}}>
              <div style={{fontSize:28,marginBottom:6}}>{f.i}</div>
              <div style={{fontWeight:700,marginBottom:3,fontSize:13}}>{f.t}</div>
              <div style={{...mu,fontSize:12}}>{f.d}</div>
            </Card>
          ))}
        </div>

        <div style={{...row,justifyContent:"space-between",marginBottom:12}}>
          <h2 style={h2s}>✨ Community Favourites</h2>
          <Btn variant="ghost" small onClick={()=>setScreen("community")}>See all →</Btn>
        </div>
        <div style={{display:"grid",gap:12}}>{SAMPLE_COMMUNITY.slice(0,2).map(s=><CCard key={s.id} s={s}/>)}</div>
      </div>
    );
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────
  function Build() {
    return (
      <div style={{paddingTop:24}}>
        <div style={{...row,justifyContent:"space-between",marginBottom:16}}>
          <Btn variant="ghost" small onClick={()=>{rb();setScreen("home");}}>← Home</Btn>
          <span style={{fontSize:13,color:T.textSoft,fontWeight:700}}>{SLABELS[bStep]}</span>
          <span style={{fontSize:13,color:T.textMuted}}>{bStep+1}/{TOTAL}</span>
        </div>
        <ProgBar step={bStep} total={TOTAL}/>

        {bStep===0&&<Card><h2 style={h2s}>What kind of story tonight? 🎭</h2><p style={{...mu,marginBottom:20}}>Pick the mood for your bedtime adventure.</p><div style={g2}>{VIBES.map(v=><button key={v.id} onClick={()=>setBVibe(v.id)} style={{padding:18,borderRadius:14,border:`1.5px solid ${bVibe===v.id?v.color:T.border}`,background:bVibe===v.id?v.color+"22":"transparent",color:T.text,cursor:"pointer",textAlign:"left",fontFamily:T.ui,transition:"all 0.15s"}}><div style={{fontSize:28,marginBottom:6}}>{v.emoji}</div><div style={{fontSize:14,fontWeight:700}}>{v.label}</div></button>)}</div></Card>}

        {bStep===1&&<Card><h2 style={h2s}>How long tonight? ⏳</h2><div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>{LENGTHS.map(l=><button key={l.id} onClick={()=>setBLen(l.id)} style={{padding:"18px 20px",borderRadius:14,border:`1.5px solid ${bLen===l.id?T.accent:T.border}`,background:bLen===l.id?T.accentSoft:"transparent",color:T.text,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:T.ui,transition:"all 0.15s"}}><span style={{fontWeight:700,fontSize:16}}>{l.label}</span><span style={{color:T.textSoft,fontSize:14}}>{l.desc}</span></button>)}</div></Card>}

        {bStep===2&&<Card><h2 style={h2s}>Who's in the story? 🧙</h2><p style={{...mu,marginBottom:16}}>Pick up to 3 — or skip!</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{CHARS.map(c=><Pill key={c} selected={bChars.includes(c)} onClick={()=>toggleChar(c)}>{c}</Pill>)}</div></Card>}

        {bStep===3&&<Card><h2 style={h2s}>Where does it happen? 🗺️</h2><p style={{...mu,marginBottom:16}}>Or skip!</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{SETTINGS.map(s=><Pill key={s} selected={bSetting===s} onClick={()=>setBSetting(bSetting===s?null:s)}>{s}</Pill>)}</div></Card>}

        {bStep===4&&<Card><h2 style={h2s}>Any lesson to weave in? 💡</h2><p style={{...mu,marginBottom:16}}>Or skip!</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{LESSONS.map(l=><Pill key={l} selected={bLesson===l} onClick={()=>setBLesson(bLesson===l?null:l)}>{l}</Pill>)}</div></Card>}

        {bStep===5&&<Card><h2 style={h2s}>What's your child's idea? 🎤</h2><p style={{...mu,marginBottom:16}}>The weirder the better!</p><div style={{display:"flex",gap:8,alignItems:"flex-start"}}><Inp value={bIdea} onChange={setBIdea} placeholder="e.g. the dragon sneezes glitter and the castle floats away..." rows={4}/><MicBtn onResult={t=>setBIdea(p=>p?p+" "+t:t)}/></div></Card>}

        {bStep===6&&<Card><h2 style={h2s}>Make it personal? 👨‍👩‍👧</h2><p style={{...mu,marginBottom:20}}>Weave your real family into the story.</p><div style={{display:"flex",gap:10,marginBottom:20}}><Pill selected={!bFam} onClick={()=>setBFam(false)}>🏰 Fictional</Pill><Pill selected={bFam} onClick={()=>setBFam(true)}>👨‍👩‍👧 Our family</Pill></div>{bFam&&<div><div style={lbl}>Tell us about your family</div><div style={{display:"flex",gap:8,alignItems:"flex-start"}}><Inp value={bFamNote} onChange={setBFamNote} placeholder="e.g. Mum is Sarah, Dad is Tom, kids are Lily (6) and Jake (4)..." rows={4}/><MicBtn onResult={t=>setBFamNote(p=>p?p+" "+t:t)}/></div></div>}</Card>}

        {bStep===7&&<Card><h2 style={h2s}>Add to a series? 🎬</h2><p style={{...mu,marginBottom:20}}>Build an ongoing adventure, or keep it as a one-off.</p><div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}><Pill selected={!bSeriesId&&!bNewSeries} onClick={()=>{setBSeriesId(null);setBNewSeries("");}}>📖 One-off</Pill></div>{seriesList.length>0&&<div style={{marginBottom:20}}><div style={lbl}>Continue an existing series</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{seriesList.map(s=><Pill key={s.id} selected={bSeriesId===s.id} onClick={()=>{setBSeriesId(s.id);setBNewSeries("");}} color={T.violet}>{s.name} (Ep{stories.filter(st=>st.seriesId===s.id).length+1})</Pill>)}</div></div>}<div><div style={lbl}>Or start a brand new series</div><Inp value={bNewSeries} onChange={v=>{setBNewSeries(v);if(v)setBSeriesId(null);}} placeholder="e.g. The Adventures of Super Rosie"/></div></Card>}

        <div style={{...row,justifyContent:"space-between",marginTop:16}}>
          <Btn variant="ghost" onClick={()=>bStep>0?setBStep(bStep-1):setScreen("home")}>← {bStep===0?"Home":"Back"}</Btn>
          {bStep<TOTAL-1?<Btn onClick={()=>setBStep(bStep+1)} disabled={bStep===0&&!bVibe}>Next →</Btn>:<Btn variant="teal" onClick={()=>doGenerate(false)} style={{boxShadow:`0 4px 20px ${T.tealSoft}`}}>✨ Generate Story!</Btn>}
        </div>
      </div>
    );
  }

  // ── STORY SCREEN ──────────────────────────────────────────────────────────
  function StoryScreen() {
    const s    = activeStory;
    const mood = moods[s?.id];
    return (
      <div style={{paddingTop:24}}>
        <div style={{...row,justifyContent:"space-between",marginBottom:20}}>
          <Btn variant="ghost" small onClick={()=>setScreen("library")}>← Library</Btn>
          <Btn small onClick={()=>{rb();setScreen("build");}}>+ New Story</Btn>
        </div>

        {generating ? (
          <Card style={{textAlign:"center",padding:"56px 24px"}}>
            <div style={{fontSize:64,marginBottom:20,animation:"float 2s ease-in-out infinite"}}>🌙</div>
            <h2 style={{...h2s,textAlign:"center",marginBottom:10}}>Weaving your story…</h2>
            <p style={mu}>The magic is happening. Just a moment!</p>
            <div style={{marginTop:24,display:"flex",justifyContent:"center",gap:8}}>
              {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:T.accent,animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite alternate`}}/>)}
            </div>
          </Card>
        ) : (
          <div>
            <div style={{marginBottom:24}}>
              <div style={{...row,flexWrap:"wrap",gap:8,marginBottom:16}}>
                <VibeBadge vibe={s?.vibe}/>
                {s?.seriesName&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:T.violetSoft,color:T.violet,fontWeight:700}}>{s.seriesName}·Ep{s.episode}</span>}
                {s?.isRemix&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:T.roseSoft,color:T.rose,fontWeight:700}}>🔁 Remixed</span>}
                <span style={{fontSize:12,color:T.textMuted,marginLeft:"auto"}}>{s?.date}</span>
              </div>
              <h1 style={{fontFamily:T.head,fontSize:28,fontWeight:900,color:T.accent,lineHeight:1.2}}>{s?.title}</h1>
            </div>

            {s?.text&&<NarrationPlayer text={s.text}/>}

            <Card style={{padding:"32px 28px",marginBottom:16}}>
              <PictureBook story={s||{text:""}}/>
            </Card>

            {s?.text&&<MoodRater storyId={s.id} currentMood={mood} onRate={doMoodRate}/>}

            <div style={{...row,flexWrap:"wrap",gap:10,marginTop:16}}>
              {s?.text&&<Btn variant="rose" small onClick={()=>doGenerate(true)}>🔁 Remix Story</Btn>}
              {s?.text&&<Btn variant="ghost" small onClick={()=>exportPDF(s)}>📄 Download PDF</Btn>}
              {user&&s&&!s.shared&&stories.find(x=>x.id===s.id)&&<Btn variant="outline" small onClick={()=>doShare(s.id)}>🌍 Share</Btn>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIBRARY ───────────────────────────────────────────────────────────────
  function Library() {
    return (
      <div>
        <div style={{...row,justifyContent:"space-between",padding:"32px 0 24px"}}>
          <div><h1 style={h1s}>📚 My Library</h1><p style={mu}>{stories.length} {stories.length===1?"story":"stories"}</p></div>
          <Btn onClick={()=>{rb();setScreen("build");}}>+ New</Btn>
        </div>
        {stories.length===0?(
          <Card style={{textAlign:"center",padding:48}}><div style={{fontSize:52,marginBottom:16}}>🌙</div><h2 style={h2s}>No stories yet</h2><p style={{...mu,marginBottom:20}}>Create your first bedtime story tonight!</p><Btn onClick={()=>{rb();setScreen("build");}}>✨ Create a Story</Btn></Card>
        ):(
          <div style={{display:"grid",gap:14}}>
            {stories.map(s=>(
              <Card key={s.id} onClick={()=>{setActiveStory(s);setScreen("story");}}>
                <div style={{...row,justifyContent:"space-between",marginBottom:10}}>
                  <VibeBadge vibe={s.vibe}/>
                  <div style={{...row,gap:8}}>
                    {s.seriesName&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:T.violetSoft,color:T.violet,fontWeight:700}}>{s.seriesName}·Ep{s.episode}</span>}
                    {s.isRemix&&<span style={{fontSize:11,color:T.rose}}>🔁</span>}
                    {moods[s.id]&&<span style={{fontSize:14}}>{MOODS.find(m=>m.v===moods[s.id])?.e}</span>}
                    <span style={{fontSize:12,color:T.textMuted}}>{s.date}</span>
                  </div>
                </div>
                <div style={{fontFamily:T.head,fontSize:18,fontWeight:800,marginBottom:8}}>{s.title}</div>
                <div style={{...mu,fontSize:13,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{s.text}</div>
                <div style={{...row,gap:8,marginTop:12}}>
                  <Btn small variant="ghost" onClick={e=>{e.stopPropagation();exportPDF(s);}}>📄 PDF</Btn>
                  {!s.shared&&user&&<Btn small variant="outline" onClick={e=>{e.stopPropagation();doShare(s.id);}}>🌍 Share</Btn>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── SERIES ────────────────────────────────────────────────────────────────
  function SeriesScreen() {
    return (
      <div>
        <div style={{...row,justifyContent:"space-between",padding:"32px 0 24px"}}>
          <div><h1 style={h1s}>🎬 My Series</h1><p style={mu}>Ongoing story worlds your family is building</p></div>
          <Btn onClick={()=>setSeriesModal(true)}>+ New</Btn>
        </div>
        {seriesList.length===0?(
          <Card style={{textAlign:"center",padding:48}}><div style={{fontSize:52,marginBottom:16}}>🎬</div><h2 style={h2s}>No series yet</h2><p style={{...mu,marginBottom:20}}>Create a series and build an ongoing story world night after night.</p><Btn onClick={()=>setSeriesModal(true)}>+ Create a Series</Btn></Card>
        ):(
          <div style={{display:"grid",gap:14}}>
            {seriesList.map(s=>{
              const eps=stories.filter(st=>st.seriesId===s.id);
              return (
                <Card key={s.id} onClick={()=>{setActiveSeries(s);setScreen("seriesView");}}>
                  <div style={{...row,justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:T.violetSoft,color:T.violet,fontWeight:700}}>{eps.length} Episodes</span>
                    <span style={{fontSize:12,color:T.textMuted}}>{s.created}</span>
                  </div>
                  <div style={{fontFamily:T.head,fontSize:20,fontWeight:800,marginBottom:6}}>{s.name}</div>
                  {s.desc&&<div style={mu}>{s.desc}</div>}
                  <div style={{marginTop:14}}><Btn small variant="outline" onClick={e=>{e.stopPropagation();setBSeriesId(s.id);setBNewSeries("");rb();setBSeriesId(s.id);setScreen("build");}}>✨ Write Episode {eps.length+1}</Btn></div>
                </Card>
              );
            })}
          </div>
        )}
        {seriesModal&&(
          <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:24,padding:32,width:"100%",maxWidth:440}}>
              <h2 style={{...h2s,marginBottom:20}}>🎬 New Series</h2>
              <div style={{marginBottom:16}}><div style={lbl}>Series Name *</div><Inp value={nsName} onChange={setNsName} placeholder="e.g. The Adventures of Super Rosie"/></div>
              <div style={{marginBottom:24}}><div style={lbl}>Description (optional)</div><Inp value={nsDesc} onChange={setNsDesc} placeholder="What's this series about?" rows={3}/></div>
              <div style={{display:"flex",gap:10}}><Btn onClick={doCreateSeries} disabled={!nsName.trim()}>Create</Btn><Btn variant="ghost" onClick={()=>{setSeriesModal(false);setNsName("");setNsDesc("");}}>Cancel</Btn></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function SeriesView() {
    if(!activeSeries) return null;
    const eps = stories.filter(s=>s.seriesId===activeSeries.id).sort((a,b)=>a.episode-b.episode);
    return (
      <div>
        <div style={{padding:"32px 0 24px"}}>
          <Btn variant="ghost" small onClick={()=>setScreen("series")} style={{marginBottom:16}}>← Series</Btn>
          <h1 style={h1s}>{activeSeries.name}</h1>
          {activeSeries.desc&&<p style={mu}>{activeSeries.desc}</p>}
          <div style={{marginTop:16}}><Btn onClick={()=>{setBSeriesId(activeSeries.id);setBNewSeries("");rb();setBSeriesId(activeSeries.id);setScreen("build");}}>✨ Write Episode {eps.length+1}</Btn></div>
        </div>
        {eps.length===0?<Card style={{textAlign:"center",padding:40}}><p style={mu}>No episodes yet. Write the first one!</p></Card>:(
          <div style={{display:"grid",gap:12}}>
            {eps.map(ep=>(
              <Card key={ep.id} onClick={()=>{setActiveStory(ep);setScreen("story");}}>
                <div style={{...row,justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:T.violetSoft,color:T.violet,fontWeight:700}}>Episode {ep.episode}</span>
                  <div style={{...row,gap:6}}><VibeBadge vibe={ep.vibe}/>{moods[ep.id]&&<span style={{fontSize:14}}>{MOODS.find(m=>m.v===moods[ep.id])?.e}</span>}</div>
                </div>
                <div style={{fontFamily:T.head,fontSize:17,fontWeight:800,marginBottom:6}}>{ep.title}</div>
                <div style={{...mu,fontSize:13,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{ep.text}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Community() {
    const shared = stories.filter(s=>s.shared);
    return (
      <div>
        <div style={{padding:"32px 0 24px"}}><h1 style={h1s}>🌍 Community Stories</h1><p style={mu}>Discover what families around the world are creating every night.</p></div>
        <div style={{display:"grid",gap:14}}>
          {SAMPLE_COMMUNITY.map(s=><CCard key={s.id} s={s}/>)}
          {shared.map(s=><CCard key={s.id} s={{...s,avatar:s.authorAvatar}}/>)}
        </div>
      </div>
    );
  }

  function About() {
    return (
      <div>
        <div style={{padding:"32px 0 24px"}}><h1 style={h1s}>💡 About Creative Bedtimes</h1></div>
        <Card style={{marginBottom:16}}><h2 style={{...h2s,color:T.accent,marginBottom:12}}>What is Creative Bedtimes?</h2><p style={{...mu,lineHeight:1.85}}>Creative Bedtimes is a family storytelling app. Every night, parents and children work together to build unique, personalised bedtime stories — choosing characters, settings and themes. Stories can be one-offs or part of an ongoing series your family builds together over weeks and months.</p></Card>
        <Card style={{marginBottom:16}}><h2 style={{...h2s,marginBottom:16}}>⚡ Story Starter Mode</h2><p style={{...mu}}>The app gives your child an exciting opening line — then they speak or type what happens next. Both get woven together into a complete story. Children feel like the real author.</p></Card>
        <Card style={{marginBottom:16}}>
          <h2 style={{...h2s,marginBottom:16}}>🛏️ How to Use at Bedtime</h2>
          {[{s:"1",t:"Get cosy first",d:"Settle the kids into bed before you start."},{s:"2",t:"Let children choose",d:"Let them pick the vibe, characters and setting."},{s:"3",t:"Try Story Starter",d:"Let the app give an opening line, then your child speaks what happens next."},{s:"4",t:"Use narration",d:"Tap play and let the story be read aloud in a calm voice."},{s:"5",t:"Rate the story",d:"Give it an emoji rating — you'll learn what your family loves most."},{s:"6",t:"Build a series",d:"Love a character? Create a series and continue the adventure tomorrow night."}].map((item,i,arr)=>(
            <div key={item.s} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:i<arr.length-1?18:0,paddingBottom:i<arr.length-1?18:0,borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:T.accentSoft,border:`1.5px solid ${T.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:T.accent,fontSize:14,flexShrink:0}}>{item.s}</div>
              <div><div style={{fontWeight:700,marginBottom:3}}>{item.t}</div><div style={mu}>{item.d}</div></div>
            </div>
          ))}
        </Card>
        <Card style={{border:`1px solid ${T.rose}44`}}>
          <h2 style={{...h2s,color:T.rose,marginBottom:16}}>🛡️ Content & Safety</h2>
          <div style={{display:"grid",gap:10}}>
            {[{i:"🚫",t:"No curse words or adult language"},{i:"🚫",t:"No violence beyond gentle cartoon silliness"},{i:"🚫",t:"No rude or inappropriate humour"},{i:"✅",t:"All stories end gently to help little ones drift off"},{i:"✅",t:"All content is 100% family-friendly"}].map(w=>(
              <div key={w.t} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:T.surface,border:`1px solid ${T.border}`}}>
                <span style={{fontSize:18,flexShrink:0}}>{w.i}</span><span style={{fontSize:14}}>{w.t}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  function Profile() {
    return (
      <div>
        <div style={{padding:"32px 0 24px"}}><h1 style={h1s}>👤 My Profile</h1></div>
        {user?(
          <>
            <Card style={{marginBottom:16}}>
              <div style={{...row,marginBottom:20}}><Ava emoji={user.avatar} size={60}/><div><div style={{fontFamily:T.head,fontSize:22,fontWeight:800}}>{user.familyName} Family</div><div style={{color:T.textSoft,fontSize:14}}>{user.email}</div></div></div>
              <div style={{display:"flex",gap:24,marginBottom:20}}>
                {[{n:stories.length,l:"Stories"},{n:seriesList.length,l:"Series"},{n:streak.count,l:"🔥 Streak"},{n:earnedBadges.length,l:"⭐ Badges"}].map(stat=>(
                  <div key={stat.l} style={{textAlign:"center"}}><div style={{fontFamily:T.head,fontSize:24,fontWeight:900,color:T.accent}}>{stat.n}</div><div style={{fontSize:12,color:T.textSoft}}>{stat.l}</div></div>
                ))}
              </div>
            </Card>
            <Card style={{marginBottom:16}}><h2 style={{...h2s,marginBottom:16}}>🏆 Badges</h2><BadgeShelf earned={earnedBadges}/></Card>
            <Btn variant="ghost" onClick={()=>{setUser(null);setScreen("home");}}>Sign Out</Btn>
          </>
        ):(
          <Card style={{textAlign:"center",padding:40}}><div style={{fontSize:40,marginBottom:12}}>🌟</div><h2 style={h2s}>Not signed in</h2><p style={{...mu,marginBottom:20}}>Create an account to save stories and earn badges.</p><Btn onClick={()=>{setAuthMode("signup");setAuthOpen(true);}}>Join Creative Bedtimes</Btn></Card>
        )}
      </div>
    );
  }

  // ── MODALS ────────────────────────────────────────────────────────────────
  function StarterModal() {
    return (
      <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:T.card,border:`1px solid ${T.accent}44`,borderRadius:24,padding:32,width:"100%",maxWidth:480}}>
          <div style={{...row,justifyContent:"space-between",marginBottom:24}}>
            <h2 style={h2s}>⚡ Story Starter</h2>
            <button onClick={()=>{setStarterOpen(false);setStarterStep(0);}} style={{background:"transparent",border:"none",color:T.textSoft,cursor:"pointer",fontSize:22}}>✕</button>
          </div>
          {starterStep===0&&(
            <>
              <p style={{...mu,marginBottom:20}}>The app gives your child an exciting opening line. Then they say what happens next — and together you build the whole story!</p>
              <div style={{marginBottom:20}}><div style={lbl}>Vibe for tonight</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{VIBES.map(v=><Pill key={v.id} selected={bVibe===v.id} onClick={()=>setBVibe(v.id)} color={v.color}>{v.emoji} {v.label}</Pill>)}</div></div>
              <Btn onClick={getStarterLine} disabled={!bVibe||starterLoading} style={{width:"100%"}}>{starterLoading?"✨ Crafting your opening line…":"✨ Get My Opening Line!"}</Btn>
            </>
          )}
          {starterStep===1&&(
            <>
              <div style={{padding:"20px 24px",borderRadius:16,background:`linear-gradient(135deg,${T.violet}22,${T.accent}11)`,border:`1px solid ${T.violet}44`,marginBottom:24}}>
                <div style={{fontSize:11,fontWeight:700,color:T.violet,fontFamily:T.ui,letterSpacing:1,marginBottom:10}}>✨ YOUR OPENING LINE</div>
                <p style={{fontFamily:T.body,fontSize:18,color:T.text,lineHeight:1.7,fontStyle:"italic",margin:0}}>"{starterLine}"</p>
              </div>
              <p style={{...mu,marginBottom:16}}>Now it's your child's turn! What happens next?</p>
              <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:20}}>
                <Inp value={starterChild} onChange={setStarterChild} placeholder="e.g. the dragon decided to make a sandwich but the bread was made of clouds..." rows={4}/>
                <MicBtn onResult={t=>setStarterChild(p=>p?p+" "+t:t)}/>
              </div>
              <div style={{display:"flex",gap:10}}>
                <Btn onClick={finishStarterStory} disabled={!starterChild.trim()} style={{flex:1}}>✨ Build the Full Story!</Btn>
                <Btn variant="ghost" onClick={()=>setStarterStep(0)}>← Back</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function AuthModal() {
    return (
      <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:24,padding:32,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{...row,justifyContent:"space-between",marginBottom:24}}>
            <h2 style={h2s}>{authMode==="login"?"🌙 Welcome Back":"🌟 Join Creative Bedtimes"}</h2>
            <button onClick={()=>setAuthOpen(false)} style={{background:"transparent",border:"none",color:T.textSoft,cursor:"pointer",fontSize:22}}>✕</button>
          </div>
          {authMode==="signup"&&<><div style={{marginBottom:16}}><div style={lbl}>Your Name</div><Inp value={aName} onChange={setAName} placeholder="e.g. Sarah"/></div><div style={{marginBottom:16}}><div style={lbl}>Family Name *</div><Inp value={aFamily} onChange={setAFamily} placeholder="e.g. The Johnsons"/></div></>}
          <div style={{marginBottom:16}}><div style={lbl}>Email *</div><Inp value={aEmail} onChange={setAEmail} placeholder="your@email.com"/></div>
          {authMode==="signup"&&<div style={{marginBottom:20}}><div style={lbl}>Family Avatar</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{AVATARS.map(a=><button key={a} onClick={()=>setAAvatar(a)} style={{width:44,height:44,borderRadius:"50%",border:`2px solid ${aAvatar===a?T.accent:T.border}`,background:aAvatar===a?T.accentSoft:T.surface,cursor:"pointer",fontSize:22}}>{a}</button>)}</div></div>}
          <Btn onClick={authMode==="login"?doLogin:doSignup} disabled={!aEmail.trim()||(authMode==="signup"&&!aFamily.trim())} style={{width:"100%",marginBottom:12}}>{authMode==="login"?"Sign In":"Create Account"}</Btn>
          <div style={{textAlign:"center",marginBottom:16}}><span style={{color:T.textSoft,fontSize:13}}>or continue with </span><button style={{background:"transparent",border:"none",color:T.accent,cursor:"pointer",fontFamily:T.ui,fontSize:13,fontWeight:700}}>Google</button><span style={{color:T.textSoft,fontSize:13}}> · </span><button style={{background:"transparent",border:"none",color:T.accent,cursor:"pointer",fontFamily:T.ui,fontSize:13,fontWeight:700}}>Apple</button></div>
          <div style={{textAlign:"center"}}><button onClick={()=>setAuthMode(authMode==="login"?"signup":"login")} style={{background:"transparent",border:"none",color:T.textSoft,cursor:"pointer",fontFamily:T.ui,fontSize:13}}>{authMode==="login"?"Don't have an account? Sign up →":"Already have an account? Sign in →"}</button></div>
        </div>
      </div>
    );
  }

  function BadgeCelebration() {
    if(!newBadge) return null;
    return (
      <div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",zIndex:500,background:T.card,border:`2px solid ${T.gold}`,borderRadius:20,padding:"20px 28px",boxShadow:`0 8px 40px ${T.goldSoft}`,animation:"slideDown 0.4s ease",textAlign:"center",minWidth:240}}>
        <div style={{fontSize:48,marginBottom:8,animation:"float 1s ease-in-out infinite"}}>{newBadge.emoji}</div>
        <div style={{fontFamily:T.head,fontSize:18,fontWeight:800,color:T.gold,marginBottom:4}}>Badge Unlocked!</div>
        <div style={{fontWeight:700,color:T.text,marginBottom:4}}>{newBadge.name}</div>
        <div style={{fontSize:13,color:T.textSoft}}>{newBadge.desc}</div>
      </div>
    );
  }

  const NAV = [{id:"home",l:"Home",i:"🏠"},{id:"community",l:"Community",i:"🌍"},{id:"library",l:"Library",i:"📚"},{id:"series",l:"Series",i:"🎬"},{id:"about",l:"About",i:"💡"}];

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.ui,color:T.text,position:"relative",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes twinkle { from { opacity:0.1; transform:scale(0.7); } to { opacity:0.6; transform:scale(1.3); } }
        @keyframes float   { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
        @keyframes pulse   { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
        @keyframes bounce  { from { transform:translateY(0); } to { transform:translateY(-8px); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        * { box-sizing:border-box; margin:0; padding:0; }
        button { transition:opacity 0.15s, transform 0.12s; }
        button:active { transform:scale(0.96) !important; }
        textarea:focus, input:focus { border-color:${T.accent} !important; outline:none; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:4px; }
      `}</style>

      <Stars/>
      <BadgeCelebration/>

      <div style={{position:"sticky",top:0,zIndex:50,background:`${T.bg}ee`,backdropFilter:"blur(16px)",borderBottom:`1px solid ${T.border}`}}>
        <div style={{maxWidth:720,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <button onClick={()=>setScreen("home")} style={{background:"transparent",border:"none",cursor:"pointer",fontFamily:T.head,fontSize:20,fontWeight:900,color:T.accent,letterSpacing:"-0.5px"}}>🌙 Creative Bedtimes</button>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!user?(
              <><Btn variant="ghost" small onClick={()=>{setAuthMode("login");setAuthOpen(true);}}>Sign In</Btn><Btn small onClick={()=>{setAuthMode("signup");setAuthOpen(true);}}>Join Free</Btn></>
            ):(
              <button onClick={()=>setScreen("profile")} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}><Ava emoji={user.avatar} size={34}/><span style={{fontSize:14,fontWeight:700,color:T.textSoft}}>{user.familyName}</span></button>
            )}
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"0 20px 100px",position:"relative",zIndex:1}}>
        {screen==="home"       && <Home/>}
        {screen==="build"      && <Build/>}
        {screen==="story"      && <StoryScreen/>}
        {screen==="library"    && <Library/>}
        {screen==="series"     && <SeriesScreen/>}
        {screen==="seriesView" && <SeriesView/>}
        {screen==="community"  && <Community/>}
        {screen==="about"      && <About/>}
        {screen==="profile"    && <Profile/>}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:`${T.bg}f0`,backdropFilter:"blur(16px)",borderTop:`1px solid ${T.border}`}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",justifyContent:"space-around",padding:"6px 0 max(6px,env(safe-area-inset-bottom))"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setScreen(n.id)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:screen===n.id?T.accent:T.textMuted,fontFamily:T.ui,fontSize:9,fontWeight:screen===n.id?700:500,padding:"4px 8px",borderRadius:8,transition:"color 0.15s"}}>
              <span style={{fontSize:18}}>{n.i}</span>{n.l}
            </button>
          ))}
        </div>
      </div>

      {authOpen   && <AuthModal/>}
      {starterOpen && <StarterModal/>}
    </div>
  );
}
