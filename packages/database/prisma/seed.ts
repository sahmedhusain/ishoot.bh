import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient } from './generated/client';
import bcrypt from 'bcrypt';
import {
  mockCompanySettings,
  mockHeroBanners,
  mockPortfolioCategories,
  mockPortfolioItems,
  mockClientLogos,
  mockStudioEquipment,
  mockInquiries,
  mockContacts,
  mockDeals,
  mockExpenseCategories,
  mockExpenses,
} from '../src/mock-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  // 1. Super Admin User
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ishoot.bh' },
    update: { passwordHash },
    create: {
      email: 'admin@ishoot.bh',
      fullName: 'Super Admin',
      passwordHash,
      role: 'super_admin',
    },
  });
  console.log('✅ Created Super Admin user (admin@ishoot.bh / Admin123!)');

  // 2. Company Settings
  await prisma.companySetting.upsert({
    where: { id: mockCompanySettings.id },
    update: {},
    create: {
      id: mockCompanySettings.id,
      companyNameEn: mockCompanySettings.company_name_en,
      companyNameAr: mockCompanySettings.company_name_ar,
      crNumber: mockCompanySettings.cr_number,
      vatId: mockCompanySettings.vat_id,
      vatEnabled: mockCompanySettings.vat_enabled,
      vatPercentage: mockCompanySettings.vat_percentage,
      defaultCurrency: mockCompanySettings.default_currency,
      currencyDecimals: mockCompanySettings.currency_decimals,
      addressEn: mockCompanySettings.address_en,
      addressAr: mockCompanySettings.address_ar,
      phone: mockCompanySettings.phone,
      email: mockCompanySettings.email,
      website: mockCompanySettings.website,
      bankName: mockCompanySettings.bank_name,
      bankIban: mockCompanySettings.bank_iban,
      bankAccountNumber: mockCompanySettings.bank_account_number,
      bankSwift: mockCompanySettings.bank_swift,
      logoUrl: '/logo.svg',
      paymentTermsDays: mockCompanySettings.payment_terms_days,
      invoicePrefix: mockCompanySettings.invoice_prefix,
      invoiceNextNumber: mockCompanySettings.invoice_next_number,
      receiptPrefix: mockCompanySettings.receipt_prefix,
      receiptNextNumber: mockCompanySettings.receipt_next_number,
    },
  });
  console.log('✅ Created Company Settings');

  // 3. Hero Banners
  for (const banner of mockHeroBanners) {
    await prisma.heroBanner.upsert({
      where: { id: banner.id },
      update: {},
      create: {
        id: banner.id,
        titleEn: banner.title_en,
        titleAr: banner.title_ar,
        subtitleEn: banner.subtitle_en,
        subtitleAr: banner.subtitle_ar,
        mediaType: banner.media_type,
        mediaUrl: banner.media_url,
        posterUrl: banner.poster_url,
        displayOrder: banner.display_order,
        isActive: banner.is_active,
        ctaLabelEn: banner.cta_label_en,
        ctaLabelAr: banner.cta_label_ar,
        ctaLink: banner.cta_link,
      },
    });
  }
  console.log('✅ Created Hero Banners');

  // 4. Portfolio Categories & Items
  for (const cat of mockPortfolioCategories) {
    await prisma.portfolioCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        id: cat.id,
        slug: cat.slug,
        nameEn: cat.name_en,
        nameAr: cat.name_ar,
        displayOrder: cat.display_order,
      },
    });
  }

  for (const item of mockPortfolioItems) {
    await prisma.portfolioItem.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        id: item.id,
        categoryId: item.category_id,
        slug: item.slug,
        titleEn: item.title_en,
        titleAr: item.title_ar,
        clientName: item.client_name,
        year: item.year,
        aspectRatio: item.aspect_ratio || '16:9',
        thumbnailUrl: item.thumbnail_url,
        previewVideoUrl: item.preview_video_url,
        fullVideoUrl: item.full_video_url,
        galleryUrls: item.gallery_urls || [],
        descriptionEn: item.description_en,
        descriptionAr: item.description_ar,
        credits: item.credits || {},
        isFeatured: item.is_featured,
        displayOrder: item.display_order,
      },
    });
  }
  console.log('✅ Created Portfolio Categories & Items');

  // 5. Client Logos
  for (const logo of mockClientLogos) {
    await prisma.clientLogo.upsert({
      where: { id: logo.id },
      update: {},
      create: {
        id: logo.id,
        name: logo.client_name,
        logoUrl: logo.logo_svg_url,
        isDarkLogo: false,
        displayOrder: logo.display_order,
        isActive: logo.is_active,
      },
    });
  }
  console.log('✅ Created Client Logos');

  // 6. Studio Equipment
  for (const eq of mockStudioEquipment) {
    await prisma.studioEquipment.upsert({
      where: { id: eq.id },
      update: {},
      create: {
        id: eq.id,
        category: eq.category,
        nameEn: eq.model_name,
        nameAr: eq.model_name,
        brand: 'Arri/RED',
        quantity: 1,
        descriptionEn: eq.specification,
        descriptionAr: eq.specification,
        imageUrl: undefined,
        displayOrder: eq.display_order,
      },
    });
  }
  console.log('✅ Created Studio Equipment');

  // 7. CRM Contacts & Deals
  for (const contact of mockContacts) {
    const parts = contact.full_name.split(' ');
    await prisma.crmContact.upsert({
      where: { id: contact.id },
      update: {},
      create: {
        id: contact.id,
        firstName: parts[0] || contact.full_name,
        lastName: parts.slice(1).join(' ') || '',
        email: contact.email,
        phone: contact.phone,
        companyName: contact.company,
        jobTitle: contact.job_title,
      },
    });
  }

  for (const deal of mockDeals) {
    await prisma.crmDeal.upsert({
      where: { id: deal.id },
      update: {},
      create: {
        id: deal.id,
        contactId: deal.contact_id,
        title: deal.title,
        dealStage: deal.stage,
        dealValue: deal.value,
        currency: deal.currency,
        probability: deal.probability,
        expectedCloseDate: deal.target_close_date ? new Date(deal.target_close_date) : null,
      },
    });
  }
  console.log('✅ Created CRM Contacts & Deals');

  // 8. Expense Categories & Expenses
  for (const ec of mockExpenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { slug: ec.slug },
      update: {},
      create: {
        id: ec.id,
        slug: ec.slug,
        nameEn: ec.name_en,
        nameAr: ec.name_ar,
        color: ec.color,
        displayOrder: ec.display_order,
      },
    });
  }

  for (const exp of mockExpenses) {
    await prisma.expense.upsert({
      where: { id: exp.id },
      update: {},
      create: {
        id: exp.id,
        categoryId: exp.category_id,
        dealId: exp.deal_id,
        descriptionEn: exp.description_en,
        descriptionAr: exp.description_ar,
        amount: exp.amount,
        currency: exp.currency,
        expenseDate: new Date(exp.expense_date),
        vendorName: exp.vendor_name,
        isRecurring: exp.is_recurring,
        recurrenceInterval: exp.recurrence_interval,
      },
    });
  }
  console.log('✅ Created Expense Categories & Expenses');

  // 9. Inquiries
  for (const inq of mockInquiries) {
    await prisma.inquiry.upsert({
      where: { id: inq.id },
      update: {},
      create: {
        id: inq.id,
        name: inq.full_name,
        email: inq.email,
        phone: inq.phone,
        companyName: inq.company,
        serviceType: inq.services_requested ? inq.services_requested.join(', ') : '',
        budgetRange: inq.budget_range,
        message: inq.message || '',
        status: inq.status,
      },
    });
  }
  console.log('✅ Created Inquiries');

  console.log('🚀 Database seed finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
