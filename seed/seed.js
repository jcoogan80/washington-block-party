const admin = require('firebase-admin');
const serviceAccount = require('./serviceaccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedCollection(collectionName, docs) {
  console.log(`\nSeeding ${collectionName}...`);
  const col = db.collection(collectionName);
  for (const doc of docs) {
    const existing = await col.where('name', '==', doc.name || '').limit(1).get();
    if (!existing.empty) {
      console.log(`  ⏭  Skipping (exists): ${doc.name || doc.time || doc.year}`);
      continue;
    }
    await col.add({ ...doc, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`  ✅ Added: ${doc.name || doc.time || doc.year || JSON.stringify(doc).slice(0, 60)}`);
  }
}

// ── SCHEDULE ─────────────────────────────────────────────────────────────────
const schedule = [
  { time: '11:00 AM', order: 1,  event: 'Block closes for traffic' },
  { time: '12:00 PM', order: 2,  event: 'Bounce House is up' },
  { time: '1:00 PM',  order: 3,  event: 'Music starts' },
  { time: '3:00 PM',  order: 4,  event: 'Sno cone machine up' },
  { time: '4:00 PM',  order: 5,  event: 'Grill food' },
  { time: '5:00 PM',  order: 6,  event: 'Decorate cupcakes' },
  { time: '6:00 PM',  order: 7,  event: 'Piñata' },
  { time: '8:00 PM',  order: 8,  event: 'Bring out glow bracelets' },
  { time: '9:00 PM',  order: 9,  event: 'Projector movie on for kids' },
  { time: '9:00 PM',  order: 10, event: 'Light fire pit' },
  { time: '9:00 PM',  order: 11, event: 'Turn off inflatable' },
  { time: '11:00 PM', order: 12, event: 'Open block up to street traffic' },
];

// ── ACTIVITIES ────────────────────────────────────────────────────────────────
const activities = [
  { name: 'Bounce House',                  assignedTo: 'Hyde yard (paid by Coogan)', cost: 650,  maxVolunteers: 2, volunteers: [] },
  { name: 'Costco Run',                    assignedTo: 'Hagenbart',                  cost: 855,  maxVolunteers: 2, volunteers: [] },
  { name: 'Piñata',                        assignedTo: 'Lynch',                      cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Sno Cone Machine',              assignedTo: 'Hyde',                       cost: 115,  maxVolunteers: 2, volunteers: [] },
  { name: 'Face Paint / Balloons',         assignedTo: 'Coogan',                     cost: 50,   maxVolunteers: 2, volunteers: [] },
  { name: 'Projector & Movie',             assignedTo: 'Reome Garage',               cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'BBQ / Grills',                  assignedTo: 'Christiansen & G. Reome',    cost: 0,    maxVolunteers: 3, volunteers: [] },
  { name: 'Glow Bracelets',               assignedTo: 'Christiansen',               cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Water Balloons',               assignedTo: 'Elinski',                    cost: 0,    maxVolunteers: 2, volunteers: [] },
  { name: 'Chalk & Tape',                 assignedTo: 'Hyde / Elinski',             cost: 40,   maxVolunteers: 2, volunteers: [] },
  { name: 'Garden Produce',               assignedTo: 'Wells',                      cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Burger Condiments',            assignedTo: 'Rolsing',                    cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Late Night Dominos Order',     assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Pulled Pork & Sides',          assignedTo: 'Fath / Gomez',               cost: 0,    maxVolunteers: 2, volunteers: [] },
  { name: 'Watermelon',                   assignedTo: 'Mills',                      cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Craft Activity',               assignedTo: 'Rolsing & Wells',            cost: 0,    maxVolunteers: 2, volunteers: [] },
  { name: 'Flyers',                       assignedTo: 'Fath / Gomez',               cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Burgers (72)',                 assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Burger Buns (72)',             assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Hot Dogs (48)',                assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Hot Dog Buns (48)',            assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Water Bottles (72)',           assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Juice Boxes',                 assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Cheese Slices',               assignedTo: '',                           cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Brownies',                    assignedTo: 'Reome',                      cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Side Dish - Salad',           assignedTo: 'Christiansen',               cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Side Dish - Three Bean Salad',assignedTo: 'Ibarra',                     cost: 0,    maxVolunteers: 1, volunteers: [] },
  { name: 'Paper Plates / Napkins / Cutlery', assignedTo: '',                      cost: 0,    maxVolunteers: 1, volunteers: [] },
];

// ── DIRECTORY ─────────────────────────────────────────────────────────────────
const directory = [
  { name: 'Kiokemeister',      address: '300 Elm',           side: 'West', emails: [] },
  { name: 'Veremis',           address: '303 N. Washington', side: 'West', emails: [] },
  { name: 'Nash / Peano',      address: '304 N. Washington', side: 'West', emails: [] },
  { name: 'Wells',             address: '305 N. Washington', side: 'West', emails: ['jeannebwells@yahoo.com'] },
  { name: 'Nashan',            address: '309 N. Washington', side: 'West', emails: [] },
  { name: 'Rauscher',          address: '310 N. Washington', side: 'West', emails: [] },
  { name: 'Mills',             address: '314 N. Washington', side: 'West', emails: ['rmills75@hotmail.com', 'wilbur_mills@hotmail.com'] },
  { name: 'Rendina',           address: '315 N. Washington', side: 'West', emails: [] },
  { name: 'Maggio',            address: '316 N. Washington', side: 'West', emails: [] },
  { name: 'Fath / Gomez',      address: '319 N. Washington', side: 'West', emails: ['rfath2@gmail.com', 'erwingomez@gmail.com'] },
  { name: 'Elinski / Olson',   address: '320 N. Washington', side: 'West', emails: ['Jackieelinski@gmail.com'] },
  { name: 'Sasenick',          address: '321 N. Washington', side: 'West', emails: [] },
  { name: 'Rolsing',           address: '322 N. Washington', side: 'West', emails: ['rrolsing@comcast.net'] },
  { name: 'Coogan',            address: '403 N. Washington', side: 'East', emails: [] },
  { name: 'Broderick',         address: '404 N. Washington', side: 'East', emails: [] },
  { name: 'Christiansen',      address: '405 N. Washington', side: 'East', emails: ['mchristiansen@post.com'] },
  { name: 'Hagenbart',         address: '408 N. Washington', side: 'East', emails: [] },
  { name: 'Ibarra',            address: '410 N. Washington', side: 'East', emails: ['frankibarra@gmail.com', 'laurenclarkibarra@gmail.com'] },
  { name: 'Pappas',            address: '411 N. Washington', side: 'East', emails: [] },
  { name: 'Hyde',              address: '414 N. Washington', side: 'East', emails: [] },
  { name: 'Deverman / Nolan',  address: '415 N. Washington', side: 'East', emails: [] },
  { name: 'Lynch',             address: '419 N. Washington', side: 'East', emails: ['Jessemlynch@gmail.com', 'Mdes004@gmail.com'] },
  { name: 'Reome',             address: '420 N. Washington', side: 'East', emails: [] },
  { name: 'Huston',            address: '423 N. Washington', side: 'East', emails: [] },
  { name: 'Croon',             address: '424 N. Washington', side: 'East', emails: [] },
  { name: 'Miulli',            address: '426 N. Washington', side: 'East', emails: [] },
  { name: 'Kilroy',            address: '427 N. Washington', side: 'East', emails: ['1036kilroy@gmail.com'] },
  { name: 'Uhler',             address: '430 N. Washington', side: 'East', emails: [] },
  { name: 'Sheffert',          address: '431 N. Washington', side: 'East', emails: [] },
  { name: 'Mickelson',         address: '435 N. Washington', side: 'East', emails: [] },
];

// ── HISTORY ───────────────────────────────────────────────────────────────────
const history = [
  {
    year: 2024, name: '2024',
    adults: 24, kids: 18, guests: 27, totalAttending: 69,
    collected: 1000, target: 1020,
    highlights: 'Bounce house, sno cone machine, projector movie night, fire pit, piñata, craft activities, face painting',
    notes: '11am–11pm. Strong turnout. Dominos late night.',
    photos: []
  },
  { year: 2023, name: '2023', highlights: '', notes: '', photos: [] },
  { year: 2022, name: '2022', highlights: '', notes: '', photos: [] },
  { year: 2021, name: '2021', highlights: '', notes: '', photos: [] },
  { year: 2020, name: '2020', highlights: '', notes: '', photos: [] },
  { year: 2019, name: '2019', highlights: '', notes: '', photos: [] },
  { year: 2018, name: '2018', highlights: '', notes: '', photos: [] },
  { year: 2017, name: '2017', highlights: '', notes: '', photos: [] },
  { year: 2016, name: '2016', highlights: '', notes: '', photos: [] },
  { year: 2015, name: '2015', highlights: '', notes: '', photos: [] },
  { year: 2014, name: '2014', highlights: '', notes: '', photos: [] },
  { year: 2013, name: '2013', highlights: '', notes: '', photos: [] },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Schedule (use time+event as unique key)
  console.log('\nSeeding schedule...');
  for (const item of schedule) {
    const existing = await db.collection('schedule')
      .where('time', '==', item.time)
      .where('event', '==', item.event)
      .limit(1).get();
    if (!existing.empty) {
      console.log(`  ⏭  Skipping: ${item.time} ${item.event}`);
      continue;
    }
    await db.collection('schedule').add(item);
    console.log(`  ✅ Added: ${item.time} - ${item.event}`);
  }

  await seedCollection('activities', activities);

  // Directory (use address as unique key)
  console.log('\nSeeding directory...');
  for (const item of directory) {
    const existing = await db.collection('directory')
      .where('address', '==', item.address)
      .limit(1).get();
    if (!existing.empty) {
      console.log(`  ⏭  Skipping: ${item.address}`);
      continue;
    }
    await db.collection('directory').add(item);
    console.log(`  ✅ Added: ${item.address} - ${item.name}`);
  }

  // History (use year as unique key)
  console.log('\nSeeding history...');
  for (const item of history) {
    const existing = await db.collection('history')
      .where('year', '==', item.year)
      .limit(1).get();
    if (!existing.empty) {
      console.log(`  ⏭  Skipping: ${item.year}`);
      continue;
    }
    await db.collection('history').add(item);
    console.log(`  ✅ Added: ${item.year}`);
  }

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
