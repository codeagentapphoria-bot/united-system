import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const seedFAQs = async () => {
  console.log('🌱 Seeding FAQs...');

  const faqs = [
    {
      question: 'How do I register for the City of Borongan portal?',
      answer:
        "There are two types of subscribers: Non-Citizens and Citizens. Non-Citizens can self-register by visiting the portal signup page and filling out the registration form with personal information, contact details, place of birth, and mother's information. Citizens are registered by administrators and will receive their phone number and password credentials. Once registered, you can log in and start requesting E-Government services.",
      order: 1,
      isActive: true,
    },
    {
      question: 'How do I log in to the portal?',
      answer:
        "Both Citizens and Non-Citizens log in using the same method: your phone number and password. Simply enter your registered phone number and password on the portal login page. If you don't have your credentials yet, please contact the administrator or visit the admin office.",
      order: 2,
      isActive: true,
    },
    {
      question: 'What services are available on the City of Borongan portal?',
      answer:
        'The City of Borongan Local Government System offers various E-Government services including Birth Certificates, Cedulas, RPTAX, BPTAX, NOV, OVRS, BPLS, E-Boss, Death Certificates, and more. Services are managed dynamically and you can view all available services in the E-Government section after logging in.',
      order: 3,
      isActive: true,
    },
    {
      question: 'How do I request a service?',
      answer:
        'After logging into the portal, navigate to the E-Government Services page and select the service you need. Fill out the required information and submit your request. You can track the status of your request in your profile or transaction history.',
      order: 4,
      isActive: true,
    },
    {
      question: 'What government programs are available?',
      answer:
        'The City of Borongan provides access to various government programs including Libre Sakay (free bus services), Libre Medisina (free medicine program), Direkta Ayuda (student financial assistance), Senior Citizen programs, PWD assistance, and Solo Parent support programs. Check the Programs section for details.',
      order: 5,
      isActive: true,
    },
    {
      question: 'How can I track my transaction status?',
      answer:
        'You can track your transaction status by logging into the portal and navigating to the Transactions section. Each transaction will show its current status (Pending, Approved, For Payment, For Printing, For Pick-up, or Released) along with any updates or notes from administrators.',
      order: 6,
      isActive: true,
    },
    {
      question: 'What should I do if I forgot my password?',
      answer:
        'If you forgot your password, please contact the administrator or visit the admin office for assistance. Password reset functionality may be available through the admin panel.',
      order: 7,
      isActive: true,
    },
    {
      question: 'How long does it take to process a service request?',
      answer:
        'Processing times vary depending on the type of service requested. Generally, simple requests like Cedulas may be processed within 1-3 business days, while more complex services like Birth Certificates may take 5-7 business days. You will be notified of any updates through your transaction status.',
      order: 8,
      isActive: true,
    },
    {
      question: 'Can I apply for multiple services at once?',
      answer:
        'Yes, you can submit multiple service requests. Each request will be processed independently and tracked separately in your Transactions section. Make sure to provide all required information for each service request.',
      order: 9,
      isActive: true,
    },
    {
      question: 'What documents do I need to submit?',
      answer:
        'Required documents vary by service type. Common requirements include valid ID, proof of residency, and service-specific documents. Check the service details page for specific requirements before submitting your request.',
      order: 10,
      isActive: true,
    },
    {
      question: 'How do I know if my request has been approved?',
      answer:
        'You will receive a notification when your request status changes. Log into the portal and check your Transactions section to see the updated status. Approved requests will show "Approved" status and may require payment or additional steps.',
      order: 11,
      isActive: true,
    },
  ];

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({
      where: {
        question: faq.question,
      },
    });

    if (!existing) {
      await prisma.faq.create({
        data: {
          question: faq.question,
          answer: faq.answer,
          order: faq.order,
          isActive: faq.isActive,
        },
      });
      totalCreated++;
      console.log(`  ✓ Created: ${faq.question.substring(0, 50)}...`);
    } else {
      totalSkipped++;
      console.log(`  ⊙ Already exists: ${faq.question.substring(0, 50)}...`);
    }
  }

  console.log(`✅ Seeded ${totalCreated} FAQs (${totalSkipped} already existed)`);
  console.log('✅ FAQ seeding completed!');
};
