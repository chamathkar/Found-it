const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/db');
const Item = require('../models/Item');
const Claim = require('../models/Claim');

const sampleItems = [
  {
    title: 'Apple AirPods Pro (2nd Gen) in White Case',
    description: 'Found on the 3rd-floor study desk in the Main Campus Library. Has a small mountain sticker on the back of the case.',
    type: 'found',
    category: 'Electronics',
    location: 'Main Library 3rd Floor, West Wing',
    dateFoundOrLost: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80',
    contactName: 'Sarah Jenkins (Library Desk)',
    contactEmail: 'library-frontdesk@campus.edu',
    contactPhone: '+1 (555) 234-5678',
    rewardOffered: false,
  },
  {
    title: 'Student ID Card - Marcus Chen (ID #849201)',
    description: 'Found near the Cashier register at the Student Union Cafeteria during lunchtime.',
    type: 'found',
    category: 'Cards & IDs',
    location: 'Student Union Cafeteria',
    dateFoundOrLost: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    contactName: 'Cafeteria Information Counter',
    contactEmail: 'union-lostfound@campus.edu',
    contactPhone: '+1 (555) 345-6789',
    rewardOffered: false,
  },
  {
    title: 'Lost: Navy Blue Fjällräven Kånken Backpack',
    description: 'Left behind in Science Hall Lecture Room 102 after BIO 201 lecture. Contains chemistry lab notebook and prescription glasses in a brown case.',
    type: 'lost',
    category: 'Bags & Wallets',
    location: 'Science Hall, Room 102',
    dateFoundOrLost: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    contactName: 'Elena Rostova',
    contactEmail: 'erostova@student.campus.edu',
    contactPhone: '+1 (555) 890-1234',
    rewardOffered: true,
  },
  {
    title: 'Dorm & Bicycle Keys on Red Lanyard',
    description: 'Set of 3 keys with a metal bike lock key and red "Stanford Alumni" lanyard found on the bench by the athletic track.',
    type: 'found',
    category: 'Keys',
    location: 'Athletic Field & Track Bleachers',
    dateFoundOrLost: new Date(Date.now() - 1000 * 60 * 60 * 12),
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&auto=format&fit=crop&q=80',
    contactName: 'Coach Miller',
    contactEmail: 'athletics-desk@campus.edu',
    contactPhone: '+1 (555) 901-2345',
    rewardOffered: false,
  },
  {
    title: 'Lost: Space Gray iPad Air with Apple Pencil',
    description: 'Forgot in Engineering Center 2nd-floor quiet lounge. In a dark green magnetic folio case. Screen has a matte paper-feel protector.',
    type: 'lost',
    category: 'Electronics',
    location: 'Engineering Innovation Center (EIC) 204',
    dateFoundOrLost: new Date(Date.now() - 1000 * 60 * 60 * 48),
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
    contactName: 'Devon Vance',
    contactEmail: 'dvance@student.campus.edu',
    contactPhone: '+1 (555) 456-7890',
    rewardOffered: true,
  },
  {
    title: 'Graphing Calculator TI-84 Plus CE (Black)',
    description: 'Found in Mathematics Hall Room 304 after Calculus midterm. Has initials "A.K." engraved slightly on the bottom.',
    type: 'found',
    category: 'Electronics',
    location: 'Mathematics Hall Room 304',
    dateFoundOrLost: new Date(Date.now() - 1000 * 60 * 60 * 72),
    status: 'claimed',
    imageUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80',
    contactName: 'Prof. Hernandez Office',
    contactEmail: 'math-dept@campus.edu',
    contactPhone: '+1 (555) 678-9012',
    rewardOffered: false,
  },
  {
    title: 'Lost: Organic Chemistry 8th Edition Hardcover',
    description: 'Thick blue textbook with handwritten lecture notes slipped inside front cover. Misplaced in North Lawn picnic area.',
    type: 'lost',
    category: 'Books & Stationery',
    location: 'North Lawn Quad',
    dateFoundOrLost: new Date(Date.now() - 1000 * 60 * 60 * 60),
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    contactName: 'Chloe Bennett',
    contactEmail: 'cbennett@student.campus.edu',
    contactPhone: '+1 (555) 789-0123',
    rewardOffered: false,
  },
];

const seedData = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Seed] Seeding is disabled in production to prevent data loss.');
    process.exit(1);
  }

  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing items & claims...');
    await Item.deleteMany({});
    await Claim.deleteMany({});

    console.log('[Seed] Inserting sample items...');
    const insertedItems = await Item.insertMany(sampleItems);
    console.log(`[Seed] Successfully seeded ${insertedItems.length} campus items!`);

    await disconnectDB();
    console.log('[Seed] Database disconnected cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
