import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/User';
import { IssueCategory } from '../models/IssueCategory';
import { Department } from '../models/Department';
import { Report } from '../models/Report';
import { UserRole, ReportStatus, Severity } from '../types';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pathhole';

const categories = [
  {
    name: 'Pothole / Road Damage',
    slug: 'pothole-road-damage',
    description: 'Potholes, road surface damage, cracks, and deteriorating pavement',
    icon: '🕳️',
    color: '#EF4444',
    slaHours: { low: 168, medium: 72, high: 48, critical: 24 },
    sortOrder: 1,
  },
  {
    name: 'Electrical / Wire Problem',
    slug: 'electrical-wire',
    description: 'Exposed wires, damaged electrical infrastructure, power line hazards',
    icon: '⚡',
    color: '#F59E0B',
    slaHours: { low: 72, medium: 48, high: 24, critical: 6 },
    sortOrder: 2,
  },
  {
    name: 'Street Light',
    slug: 'street-light',
    description: 'Non-functioning, damaged, or missing street lights',
    icon: '💡',
    color: '#FBBF24',
    slaHours: { low: 168, medium: 96, high: 48, critical: 24 },
    sortOrder: 3,
  },
  {
    name: 'Drainage / Sewage',
    slug: 'drainage-sewage',
    description: 'Clogged drains, overflowing sewage, drainage infrastructure issues',
    icon: '🚰',
    color: '#8B5CF6',
    slaHours: { low: 168, medium: 72, high: 48, critical: 12 },
    sortOrder: 4,
  },
  {
    name: 'Garbage / Waste',
    slug: 'garbage-waste',
    description: 'Garbage accumulation, illegal dumping, overflowing bins',
    icon: '🗑️',
    color: '#6B7280',
    slaHours: { low: 120, medium: 72, high: 24, critical: 12 },
    sortOrder: 5,
  },
  {
    name: 'Water / Pipeline',
    slug: 'water-pipeline',
    description: 'Water leakage, broken pipelines, contaminated water supply',
    icon: '💧',
    color: '#3B82F6',
    slaHours: { low: 168, medium: 48, high: 24, critical: 6 },
    sortOrder: 6,
  },
  {
    name: 'Traffic / Signage',
    slug: 'traffic-signage',
    description: 'Damaged traffic signals, missing road signs, broken barriers',
    icon: '🚦',
    color: '#10B981',
    slaHours: { low: 168, medium: 72, high: 24, critical: 6 },
    sortOrder: 7,
  },
  {
    name: 'Public Infrastructure',
    slug: 'public-infrastructure',
    description: 'Damaged public benches, broken footpaths, damaged bridges',
    icon: '🏗️',
    color: '#64748B',
    slaHours: { low: 336, medium: 168, high: 72, critical: 24 },
    sortOrder: 8,
  },
  {
    name: 'Flooding',
    slug: 'flooding',
    description: 'Water logging, flash floods, blocked drainage causing flooding',
    icon: '🌊',
    color: '#0EA5E9',
    slaHours: { low: 72, medium: 24, high: 12, critical: 3 },
    sortOrder: 9,
  },
  {
    name: 'Other',
    slug: 'other',
    description: 'Other public infrastructure or civic issues',
    icon: '📋',
    color: '#94A3B8',
    slaHours: { low: 336, medium: 168, high: 72, critical: 24 },
    sortOrder: 10,
  },
];

const departments = [
  { name: 'Road & Highways', code: 'RH', description: 'Responsible for road construction and maintenance' },
  { name: 'Public Works', code: 'PWD', description: 'Public Works Department' },
  { name: 'Electrical Department', code: 'ELEC', description: 'Manages electrical infrastructure' },
  { name: 'Water Supply', code: 'WS', description: 'Water supply and distribution' },
  { name: 'Drainage & Sewerage', code: 'DS', description: 'Manages drainage systems' },
  { name: 'Sanitation', code: 'SAN', description: 'Waste management and sanitation' },
  { name: 'Street Lighting', code: 'SL', description: 'Street light maintenance' },
  { name: 'Traffic Management', code: 'TM', description: 'Traffic signals and road signs' },
];

const seed = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      IssueCategory.deleteMany({}),
      Department.deleteMany({}),
      Report.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Seed categories
    const createdCategories = await IssueCategory.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Seed departments
    const createdDepts = await Department.insertMany(departments);
    console.log(`✅ Created ${createdDepts.length} departments`);

    // Seed users
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@pathhole.gov.in',
      phone: '9000000001',
      password: 'Admin@1234',
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      isActive: true,
    });

    const admin = await User.create({
      name: 'District Admin',
      email: 'admin@pathhole.gov.in',
      phone: '9000000002',
      password: 'Admin@1234',
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
      jurisdictions: { states: ['Tamil Nadu'], districts: ['Chennai'], cities: ['Chennai'], wards: [] },
    });

    const officer = await User.create({
      name: 'Road Officer Kumar',
      email: 'officer@pathhole.gov.in',
      phone: '9000000003',
      password: 'Admin@1234',
      role: UserRole.OFFICER,
      isVerified: true,
      isActive: true,
      departmentId: createdDepts[0]._id,
    });

    const citizen = await User.create({
      name: 'Ravi Citizen',
      email: 'citizen@example.com',
      phone: '9876543210',
      password: 'Citizen@123',
      role: UserRole.CITIZEN,
      isVerified: true,
      isActive: true,
    });

    console.log('✅ Created 4 users');

    // Seed sample reports
    const sampleReports = [
      {
        reportId: 'CIV-2026-000001',
        userId: citizen._id,
        categoryId: createdCategories[0]._id,
        title: 'Large pothole on Anna Salai near bus stop',
        description: 'There is a very large pothole causing traffic issues and accidents near the bus stop. Vehicles are swerving to avoid it.',
        severity: Severity.HIGH,
        status: ReportStatus.ASSIGNED,
        location: {
          type: 'Point',
          coordinates: [80.2707, 13.0827],
          address: 'Anna Salai, near Gemini Flyover',
          area: 'Gemini',
          city: 'Chennai',
          district: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600002',
        },
        departmentId: createdDepts[0]._id,
        assignedOfficerId: officer._id,
        supportCount: 12,
        slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        statusHistory: [
          { status: ReportStatus.SUBMITTED, changedBy: citizen._id, changedByRole: UserRole.CITIZEN, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { status: ReportStatus.VERIFIED, changedBy: admin._id, changedByRole: UserRole.ADMIN, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { status: ReportStatus.ASSIGNED, changedBy: admin._id, changedByRole: UserRole.ADMIN, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
        attachments: [],
        internalComments: [],
      },
      {
        reportId: 'CIV-2026-000002',
        userId: citizen._id,
        categoryId: createdCategories[1]._id,
        title: 'Exposed live wire hanging near school',
        description: 'A live wire is hanging dangerously low near the school entrance. Very dangerous for school children.',
        severity: Severity.CRITICAL,
        status: ReportStatus.WORK_IN_PROGRESS,
        location: {
          type: 'Point',
          coordinates: [80.2500, 13.0678],
          address: 'T. Nagar, near Pondy Bazaar',
          area: 'T. Nagar',
          city: 'Chennai',
          district: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600017',
        },
        departmentId: createdDepts[2]._id,
        supportCount: 28,
        slaDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000),
        isSlaBreach: false,
        statusHistory: [
          { status: ReportStatus.SUBMITTED, changedBy: citizen._id, changedByRole: UserRole.CITIZEN, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { status: ReportStatus.VERIFIED, changedBy: admin._id, changedByRole: UserRole.ADMIN, timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000) },
          { status: ReportStatus.ASSIGNED, changedBy: admin._id, changedByRole: UserRole.ADMIN, timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000) },
          { status: ReportStatus.WORK_IN_PROGRESS, changedBy: officer._id, changedByRole: UserRole.OFFICER, timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        ],
        attachments: [],
        internalComments: [],
      },
      {
        reportId: 'CIV-2026-000003',
        userId: citizen._id,
        categoryId: createdCategories[4]._id,
        title: 'Overflowing garbage bins on MG Road',
        description: 'Garbage bins have been overflowing for 3 days. Foul smell and stray dogs causing nuisance.',
        severity: Severity.MEDIUM,
        status: ReportStatus.SUBMITTED,
        location: {
          type: 'Point',
          coordinates: [80.2785, 13.0900],
          address: 'MG Road, near Corporation Office',
          area: 'MG Road',
          city: 'Chennai',
          district: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
        },
        supportCount: 5,
        slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
        statusHistory: [
          { status: ReportStatus.SUBMITTED, changedBy: citizen._id, changedByRole: UserRole.CITIZEN, timestamp: new Date() },
        ],
        attachments: [],
        internalComments: [],
      },
      {
        reportId: 'CIV-2026-000004',
        userId: citizen._id,
        categoryId: createdCategories[0]._id,
        title: 'Multiple potholes on OMR stretch',
        description: 'Entire stretch between Sholinganallur and Perungudi has multiple potholes, causing accidents.',
        severity: Severity.HIGH,
        status: ReportStatus.RESOLVED,
        location: {
          type: 'Point',
          coordinates: [80.2299, 12.9399],
          address: 'Old Mahabalipuram Road, Sholinganallur',
          area: 'Sholinganallur',
          city: 'Chennai',
          district: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600119',
        },
        departmentId: createdDepts[0]._id,
        supportCount: 45,
        slaDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        statusHistory: [
          { status: ReportStatus.SUBMITTED, changedBy: citizen._id, changedByRole: UserRole.CITIZEN, timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { status: ReportStatus.RESOLVED, changedBy: officer._id, changedByRole: UserRole.OFFICER, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
        resolution: {
          description: 'All potholes have been filled with hot mix asphalt. Road surface has been leveled.',
          resolvedBy: officer._id,
          resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          beforeImages: [],
          afterImages: [],
        },
        attachments: [],
        internalComments: [],
      },
    ];

    await Report.insertMany(sampleReports);
    console.log(`✅ Created ${sampleReports.length} sample reports`);

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Test Credentials:');
    console.log('─────────────────────────────────────────');
    console.log('Super Admin: superadmin@pathhole.gov.in / Admin@1234');
    console.log('Admin:       admin@pathhole.gov.in       / Admin@1234');
    console.log('Officer:     officer@pathhole.gov.in     / Admin@1234');
    console.log('Citizen:     citizen@example.com         / Citizen@123');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
