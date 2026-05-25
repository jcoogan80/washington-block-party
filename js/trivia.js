// js/trivia.js

const LABELS = ['A', 'B', 'C', 'D'];

const QUESTIONS = {
  easy: [
    {
      q: 'In Home Alone, what is the name of the kid left behind?',
      opts: ['Harry McCallister', 'Kevin McCallister', 'Buzz McCallister', 'Mitch McCallister'],
      correct: 1
    },
    {
      q: 'In The Incredibles, what can baby Jack-Jack do?',
      opts: ['Fly and shoot laser beams', 'Turn invisible', 'Create force fields', 'Transform into anything'],
      correct: 3
    },
    {
      q: 'In Shrek, what kind of animal is Donkey?',
      opts: ['A talking horse', 'A talking mule', 'A talking donkey', 'A talking zebra'],
      correct: 2
    },
    {
      q: "In Cars, what is the rusty tow truck's name?",
      opts: ['Chick', 'Ramone', 'Fillmore', 'Mater'],
      correct: 3
    },
    {
      q: "In Up, what is the Wilderness Explorer's name?",
      opts: ['Carl', 'Dug', 'Russell', 'Kevin'],
      correct: 2
    },
    {
      q: "In Despicable Me, what are Gru's helpers called?",
      opts: ['Henchmen', 'Minions', 'Grunts', 'Gremlins'],
      correct: 1
    },
    {
      q: "In The Jungle Book, what is the friendly bear's name?",
      opts: ['Bagheera', 'Shere Khan', 'King Louie', 'Baloo'],
      correct: 3
    },
    {
      q: "In Monsters, Inc., what is the little girl's name?",
      opts: ['Boo', 'Mary', 'Lily', 'Sophie'],
      correct: 0
    },
    {
      q: "In Kung Fu Panda, what is the panda's name?",
      opts: ['Shifu', 'Tigress', 'Oogway', 'Po'],
      correct: 3
    },
    {
      q: 'In Madagascar, what kind of animal is Gloria?',
      opts: ['Zebra', 'Giraffe', 'Hippo', 'Elephant'],
      correct: 2
    }
  ],
  medium: [
    {
      q: 'In Jurassic Park, what dinosaur chases the kids in the kitchen?',
      opts: ['T-Rex', 'Dilophosaurus', 'Velociraptor', 'Triceratops'],
      correct: 2
    },
    {
      q: "In The Goonies, whose treasure are they searching for?",
      opts: ['Long John Silver', 'Captain Hook', 'One-Eyed Willy', 'Blackbeard'],
      correct: 2
    },
    {
      q: 'In Back to the Future, who invents the time machine?',
      opts: ['Marty McFly', 'Biff Tannen', 'Doc Brown', 'Einstein'],
      correct: 2
    },
    {
      q: 'In Ghostbusters, what giant character stomps through NYC?',
      opts: ['Slimer', 'Zuul', 'Gozer', 'Stay Puft Marshmallow Man'],
      correct: 3
    },
    {
      q: "In E.T., what candy does Elliott use to lure E.T.?",
      opts: ["M&M's", 'Skittles', "Reese's Pieces", "Hershey's Kisses"],
      correct: 2
    },
    {
      q: 'In Willy Wonka, what does Charlie find in his chocolate bar?',
      opts: ['Silver Coin', 'Golden Ticket', 'Diamond Ring', 'Ruby Token'],
      correct: 1
    },
    {
      q: 'In The Princess Bride, who says "As you wish"?',
      opts: ['Inigo Montoya', 'Fezzik', 'Humperdinck', 'Westley'],
      correct: 3
    },
    {
      q: 'In Beetlejuice, how many times must you say his name to summon him?',
      opts: ['Once', 'Twice', '3 times', '5 times'],
      correct: 2
    },
    {
      q: "In Ferris Bueller's Day Off, what city do they spend the day in?",
      opts: ['New York', 'Chicago', 'Los Angeles', 'Detroit'],
      correct: 1
    },
    {
      q: 'In Raiders of the Lost Ark, what is Indiana Jones afraid of?',
      opts: ['Heights', 'Rats', 'Spiders', 'Snakes'],
      correct: 3
    }
  ],
  hard: [
    {
      q: 'In The Truman Show, what is the fictional town called?',
      opts: ['Pleasantville', 'Seahaven', 'Harmony', 'Sunnydale'],
      correct: 1
    },
    {
      q: 'In Groundhog Day, what song plays every morning on the alarm clock?',
      opts: [
        '"Wake Me Up Before You Go-Go"',
        '"Good Morning" by Gene Kelly',
        '"I Got You Babe" by Sonny & Cher',
        '"Here Comes the Sun"'
      ],
      correct: 2
    },
    {
      q: 'In the 1985 film Clue, how many different theatrical endings were there?',
      opts: ['1', '2', '3', '4'],
      correct: 2
    },
    {
      q: "In National Lampoon's Vacation, what theme park are they trying to reach?",
      opts: ['Magic Kingdom', 'Six Flags', 'Walley World', 'Wally Land'],
      correct: 2
    },
    {
      q: 'In Fletch, what alter ego does he use in the most memorable scene?',
      opts: ['Ted Nugent', 'Harry S. Truman', 'John Cocktoasten', 'Gordon Liddy'],
      correct: 1
    },
    {
      q: "In The 'Burbs, what is the creepy neighbor family's name?",
      opts: ['Rumsfields', 'Pipers', 'Klopeks', 'Hermanns'],
      correct: 2
    },
    {
      q: "In Three Men and a Baby, what are the three men's names?",
      opts: ['Jack, Steve, Dave', 'Tom, Dick, Harry', 'Jack, Peter, Michael', 'Bob, Ted, Carl'],
      correct: 2
    },
    {
      q: 'In Spaceballs, what planet is Lord Helmet stealing air from?',
      opts: ['Spaceball One', 'Vespa', 'Druidia', "Yogurt's Planet"],
      correct: 2
    },
    {
      q: "In Pee-wee's Big Adventure, where is his bike hidden?",
      opts: [
        'Under the Hollywood sign',
        'The basement of the Alamo',
        'Behind the Magic Screen',
        'Inside the Eiffel Tower'
      ],
      correct: 1
    },
    {
      q: 'In The Money Pit, how long do the contractors say the repairs will take?',
      opts: ['One month', 'Two weeks', 'Three days', 'Six months'],
      correct: 1
    }
  ]
};

const RESULT_MESSAGES = {
  easy: [
    { min: 10, msg: '🏆 Perfect Score! Family Movie Night Champion!' },
    { min: 8,  msg: '⭐ Great job! You really know your kids movies!' },
    { min: 6,  msg: '😊 Not bad! Time to schedule a movie marathon!' },
    { min: 0,  msg: "🍿 Keep watching — you'll get it next time!" }
  ],
  medium: [
    { min: 10, msg: '🎬 Incredible! 80s & 90s Cinema Master!' },
    { min: 8,  msg: '🌟 Solid work! You know your classics!' },
    { min: 6,  msg: '🎥 Pretty good! Maybe rewatch a few?' },
    { min: 0,  msg: '📼 Rewind and try again!' }
  ],
  hard: [
    { min: 10, msg: "🔥 LEGEND! You're the Block Party Trivia God!" },
    { min: 8,  msg: '💪 Impressive! Deep-cut knowledge on full display!' },
    { min: 6,  msg: '🤔 Decent! Some of these were seriously obscure!' },
    { min: 0,  msg: '🎭 These were tough — no shame in that score!' }
  ]
};

function getResultMessage(difficulty, score) {
  for (const { min, msg } of RESULT_MESSAGES[difficulty]) {
    if (score >= min) return msg;
  }
  return RESULT_MESSAGES[difficulty].at(-1).msg;
}

// ── Module Entry Point ────────────────────────────────────────────────────────

export function init(container) {
  let difficulty = null;
  let questions  = [];
  let idx        = 0;
  let score      = 0;
  let answered   = false;

  // ── Initial Render ──────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="trivia-wrap">
      <div class="section-header">
        <h2>🎯 Block Party Trivia</h2>
        <button class="btn btn-outline btn-sm" id="trivia-print-btn">🖨️ Print All Questions</button>
      </div>
      <div id="trivia-game-area"></div>
      <div class="card trivia-qr-card">
        <div class="trivia-qr-inner">
          <div class="trivia-qr-text">
            <h3>📱 Play on Your Phone!</h3>
            <p class="text-muted">Scan to join the trivia on your phone!</p>
            <button class="btn btn-outline btn-sm" id="qr-download-btn">⬇️ Download QR Code</button>
          </div>
          <div id="trivia-qr-code"></div>
        </div>
      </div>
    </div>
  `;

  const gameArea = container.querySelector('#trivia-game-area');

  container.querySelector('#trivia-print-btn').addEventListener('click', printAllQuestions);

  container.querySelector('#qr-download-btn').addEventListener('click', () => {
    const canvas = container.querySelector('#trivia-qr-code canvas');
    if (canvas) {
      const a = document.createElement('a');
      a.download = 'block-party-trivia-qr.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
  });

  setupQRCode(container.querySelector('#trivia-qr-code'));
  showDifficulty();

  // ── Screens ─────────────────────────────────────────────────────────────────

  function showDifficulty() {
    difficulty = null;
    gameArea.innerHTML = `
      <div class="card trivia-start-card">
        <div class="trivia-start-title">🎬 Movie Trivia</div>
        <p class="text-muted" style="text-align:center;margin:.5rem 0 1.75rem">
          30 questions across 3 difficulty levels — how well do you know the classics?
        </p>
        <div class="trivia-diff-grid">
          <button class="trivia-diff-btn" data-diff="easy">
            <span class="trivia-diff-icon">😊</span>
            <span class="trivia-diff-name">Easy</span>
            <span class="trivia-diff-desc">Family-friendly films</span>
          </button>
          <button class="trivia-diff-btn" data-diff="medium">
            <span class="trivia-diff-icon">🎬</span>
            <span class="trivia-diff-name">Medium</span>
            <span class="trivia-diff-desc">80s &amp; 90s classics</span>
          </button>
          <button class="trivia-diff-btn" data-diff="hard">
            <span class="trivia-diff-icon">🔥</span>
            <span class="trivia-diff-name">Hard</span>
            <span class="trivia-diff-desc">Deep cuts only</span>
          </button>
        </div>
      </div>
    `;

    gameArea.querySelectorAll('.trivia-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => startGame(btn.dataset.diff));
    });
  }

  function startGame(diff) {
    difficulty = diff;
    questions  = QUESTIONS[diff];
    idx        = 0;
    score      = 0;
    answered   = false;
    showQuestion();
  }

  function showQuestion() {
    answered = false;
    const q     = questions[idx];
    const num   = idx + 1;
    const total = questions.length;
    const pct   = (idx / total) * 100;

    gameArea.innerHTML = `
      <div class="card trivia-question-card">
        <div class="trivia-progress-bar">
          <div class="trivia-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="trivia-meta">
          <span>Question <strong>${num}</strong> of ${total}</span>
          <span>⭐ ${score} correct</span>
        </div>
        <div class="trivia-question-text">${q.q}</div>
        <div class="trivia-options">
          ${q.opts.map((opt, i) => `
            <button class="trivia-option" data-idx="${i}">
              <span class="trivia-option-label">${LABELS[i]}</span>
              <span class="trivia-option-text">${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="trivia-feedback" id="trivia-feedback" hidden></div>
      </div>
    `;

    gameArea.querySelectorAll('.trivia-option').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.idx)));
    });
  }

  function handleAnswer(chosen) {
    if (answered) return;
    answered = true;

    const q         = questions[idx];
    const isCorrect = chosen === q.correct;
    if (isCorrect) score++;

    gameArea.querySelectorAll('.trivia-option').forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correct)           btn.classList.add('trivia-option-correct');
      else if (i === chosen)         btn.classList.add('trivia-option-wrong');
    });

    const fb = gameArea.querySelector('#trivia-feedback');
    fb.hidden    = false;
    fb.className = `trivia-feedback ${isCorrect ? 'trivia-feedback-correct' : 'trivia-feedback-wrong'}`;
    fb.textContent = isCorrect
      ? '✅ Correct!'
      : `❌ Not quite! The answer was: ${q.opts[q.correct]}`;

    setTimeout(() => {
      idx++;
      if (idx >= questions.length) showResults();
      else showQuestion();
    }, 1800);
  }

  function showResults() {
    const total = questions.length;
    const pct   = Math.round((score / total) * 100);
    const msg   = getResultMessage(difficulty, score);

    gameArea.innerHTML = `
      <div class="card trivia-result-card">
        <div class="trivia-result-score">${score}<span>/${total}</span></div>
        <div class="trivia-result-pct">${pct}%</div>
        <div class="trivia-result-msg">${msg}</div>
        <div class="trivia-result-actions">
          <button class="btn btn-primary" id="trivia-again-btn">🔄 Play Again</button>
          <button class="btn btn-outline" id="trivia-change-diff-btn">Change Difficulty</button>
        </div>
      </div>
    `;

    gameArea.querySelector('#trivia-again-btn').addEventListener('click', () => startGame(difficulty));
    gameArea.querySelector('#trivia-change-diff-btn').addEventListener('click', showDifficulty);
  }
}

// ── QR Code Setup ─────────────────────────────────────────────────────────────

function setupQRCode(el) {
  if (typeof QRCode === 'undefined') {
    el.innerHTML = '<p class="text-muted" style="font-size:.8rem">QR code unavailable</p>';
    return;
  }
  new QRCode(el, {
    text:         'https://washingtonblockparty.netlify.app',
    width:        148,
    height:       148,
    colorDark:    '#1B2B5E',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

// ── Print All Questions ────────────────────────────────────────────────────────

function printAllQuestions() {
  const sections = [
    { label: '😊 Easy',   key: 'easy'   },
    { label: '🎬 Medium', key: 'medium' },
    { label: '🔥 Hard',   key: 'hard'   }
  ];

  const body = sections.map(({ label, key }) => `
    <h2>${label}</h2>
    ${QUESTIONS[key].map((q, i) => `
      <div class="q-block">
        <p class="q-text">${i + 1}. ${q.q}</p>
        <ul>
          ${q.opts.map((opt, oi) => `
            <li class="${oi === q.correct ? 'correct' : ''}">${LABELS[oi]}) ${opt}${oi === q.correct ? ' ✓' : ''}</li>
          `).join('')}
        </ul>
      </div>
    `).join('')}
  `).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Washington Street Block Party Trivia</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 720px; margin: 2rem auto; color: #2C2C2C; line-height: 1.5; }
    h1 { color: #1B2B5E; text-align: center; margin-bottom: 2rem; font-size: 1.6rem; }
    h2 { color: #1B2B5E; border-bottom: 3px solid #F5A623; padding-bottom: .35rem; margin: 2rem 0 1rem; font-size: 1.2rem; }
    .q-block { margin-bottom: 1.4rem; page-break-inside: avoid; }
    .q-text { font-weight: bold; margin: 0 0 .35rem; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: .2rem .5rem; border-radius: 4px; }
    li.correct { background: #E6F4EA; color: #1E7E34; font-weight: bold; }
    @media print {
      h2:not(:first-of-type) { break-before: page; }
      .q-block { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>🎯 Washington Street Block Party — Trivia Questions</h1>
  ${body}
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
  win.document.close();
}
