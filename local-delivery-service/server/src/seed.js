import { db, initSchema } from './db.js';

initSchema();

// Wipe
db.exec(`
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM inventory;
  DELETE FROM items;
  DELETE FROM distribution_centers;
`);

const dcs = [
  { id: 1, name: 'SF Mission DC',     lat: 37.7599, lng: -122.4148 },
  { id: 2, name: 'SF SoMa DC',        lat: 37.7785, lng: -122.4056 },
  { id: 3, name: 'Oakland DC',        lat: 37.8044, lng: -122.2712 },
  { id: 4, name: 'San Jose DC',       lat: 37.3382, lng: -121.8863 },
  { id: 5, name: 'NYC Midtown DC',    lat: 40.7549, lng:  -73.9840 },
  { id: 6, name: 'NYC Brooklyn DC',   lat: 40.6782, lng:  -73.9442 },
  { id: 7, name: 'LA Downtown DC',    lat: 34.0522, lng: -118.2437 },
];

const items = [
  { id: 1,  name: 'Cheetos',          description: 'Cheesy crunch',           price_cents:  299 },
  { id: 2,  name: 'Doritos',          description: 'Nacho cheese',            price_cents:  349 },
  { id: 3,  name: 'Coca-Cola 12pk',   description: '12 x 12oz cans',          price_cents:  799 },
  { id: 4,  name: 'Bananas (bunch)',  description: 'Fresh produce',           price_cents:  199 },
  { id: 5,  name: 'Milk 1gal',        description: 'Whole milk',              price_cents:  449 },
  { id: 6,  name: 'Eggs (dozen)',     description: 'Grade A large',           price_cents:  549 },
  { id: 7,  name: 'Bread loaf',       description: 'Sliced white',            price_cents:  399 },
  { id: 8,  name: 'Tylenol 50ct',     description: 'Pain relief',             price_cents:  999 },
  { id: 9,  name: 'Paper towels 6pk', description: 'Strong & absorbent',      price_cents: 1299 },
  { id: 10, name: 'Ice cream pint',   description: 'Vanilla',                 price_cents:  649 },
];

const insertDc = db.prepare('INSERT INTO distribution_centers (id,name,lat,lng) VALUES (?,?,?,?)');
const insertItem = db.prepare('INSERT INTO items (id,name,description,price_cents) VALUES (?,?,?,?)');
const insertInv = db.prepare('INSERT INTO inventory (dc_id,item_id,quantity) VALUES (?,?,?)');

const tx = db.transaction(() => {
  for (const d of dcs)   insertDc.run(d.id, d.name, d.lat, d.lng);
  for (const i of items) insertItem.run(i.id, i.name, i.description, i.price_cents);
  for (const d of dcs) {
    for (const i of items) {
      // Random-ish but deterministic stock per (dc, item)
      const qty = ((d.id * 7 + i.id * 13) % 40) + 5;
      insertInv.run(d.id, i.id, qty);
    }
  }
});
tx();

console.log(`Seeded ${dcs.length} DCs, ${items.length} items, ${dcs.length * items.length} inventory rows.`);
