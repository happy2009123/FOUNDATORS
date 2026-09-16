'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, AlertTriangle, Shield, Scale, Mail, Calendar, Ban, Gavel, UserX, Globe } from 'lucide-react';

const LAST_UPDATED = 'September 1, 2026';

const sections = [
  {
    icon: FileText,
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Foundators platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. These Terms constitute a legally binding agreement between you and Foundators. We reserve the right to modify these Terms at any time, and such modifications shall be effective immediately upon posting. Your continued use of the Service after any modifications indicates your acceptance of the modified Terms.`,
  },
  {
    icon: Globe,
    title: '2. Description of Service',
    content: 'Foundators is a social networking platform designed for founders, entrepreneurs, and startup professionals. The Service enables users to:',
    items: [
      'Create professional profiles and connect with other founders and entrepreneurs.',
      'Share ideas, business plans, and startup-related content with the community.',
      'Discover co-founders, mentors, programmers, funding opportunities, and collaborative projects.',
      'Participate in community discussions, challenges, and events.',
      'Communicate directly with other users through private messaging.',
    ],
    extra: 'We reserve the right to modify, suspend, or discontinue any part of the Service at any time without prior notice. We are not liable for any interruption, modification, or discontinuation of the Service.',
  },
  {
    icon: UserX,
    title: '3. User Accounts',
    subsections: [
      {
        subtitle: '3.1 Eligibility',
        text: 'You must be at least 18 years of age to create an account on Foundators. By creating an account, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.',
      },
      {
        subtitle: '3.2 Account Responsibility',
        text: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to immediately notify us of any unauthorized use of your account. We are not responsible for any loss or damage arising from your failure to secure your account.',
      },
      {
        subtitle: '3.3 Account Accuracy',
        text: 'You agree to provide accurate, current, and complete information during registration and to keep your account information up to date. You may not impersonate another person, create multiple accounts for the same individual, or use a false or misleading identity.',
      },
    ],
  },
  {
    icon: Shield,
    title: '4. User Content',
    subsections: [
      {
        subtitle: '4.1 Ownership',
        text: 'You retain full ownership of all content you create, upload, or share on the Service, including posts, messages, ideas, files, images, and any other materials ("User Content"). These Terms do not grant us any ownership rights to your User Content.',
      },
      {
        subtitle: '4.2 License Grant',
        text: 'By posting or sharing User Content on the Service, you grant Foundators a non-exclusive, worldwide, royalty-free, sublicensable license to use, reproduce, modify, distribute, display, and perform such content solely for the purpose of operating, improving, and promoting the Service. This license terminates when you delete your content or your account, except to the extent necessary for archival or backup purposes.',
      },
      {
        subtitle: '4.3 Content Standards',
        text: 'You are solely responsible for your User Content. You represent and warrant that you own or have the necessary rights to share your User Content and that it does not violate the rights of any third party, including intellectual property, privacy, and publicity rights.',
      },
    ],
  },
  {
    icon: Ban,
    title: '5. Prohibited Conduct',
    content: 'You agree not to engage in any of the following prohibited activities on the Service:',
    items: [
      'Harassing, bullying, threatening, or intimidating other users.',
      'Sending spam, unsolicited messages, or repetitive content to other users.',
      'Posting illegal, obscene, defamatory, or otherwise objectionable material.',
      'Impersonating another person, entity, or organization.',
      'Attempting to gain unauthorized access to other user accounts, systems, or networks.',
      'Using the Service for any unlawful purpose or in violation of any applicable law or regulation.',
      'Distributing malware, viruses, or any other malicious code.',
      'Scraping, crawling, or using automated tools to collect data from the Service without our express written permission.',
      'Circumventing or attempting to circumvent any security features, rate limits, or access controls.',
      'Engaging in any activity that could damage, disable, or impair the Service or interfere with other users\' ability to use the Service.',
    ],
    extra: 'We reserve the right to investigate and take appropriate action against anyone who violates this section, including removing offending content, suspending or terminating accounts, and reporting violations to law enforcement.',
  },
  {
    icon: Shield,
    title: '6. Intellectual Property',
    content: 'All intellectual property rights in the Service, including but not limited to the Foundators name, logo, design, text, graphics, software, and other materials, are owned by or licensed to Foundators. These Terms do not grant you any right, title, or interest in the Service or any of its content, features, or functionality, except for the limited right to use the Service as expressly permitted in these Terms. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.',
  },
  {
    icon: UserX,
    title: '7. Termination',
    subsections: [
      {
        subtitle: '7.1 Termination by You',
        text: 'You may terminate your account at any time by deleting it through the Service settings or by contacting us. Termination does not relieve you of any obligations incurred prior to termination.',
      },
      {
        subtitle: '7.2 Termination by Foundators',
        text: 'We reserve the right to suspend or terminate your account at any time, without prior notice or liability, for any reason, including but not limited to a breach of these Terms. We may also terminate accounts that have been inactive for an extended period.',
      },
      {
        subtitle: '7.3 Effect of Termination',
        text: 'Upon termination, your right to use the Service ceases immediately. We may retain certain data as required by law or for legitimate business purposes. Sections of these Terms that by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, indemnification, and limitations of liability.',
      },
    ],
  },
  {
    icon: AlertTriangle,
    title: '8. Disclaimers',
    content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.

WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY CONTENT OR INFORMATION AVAILABLE THROUGH THE SERVICE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK. WE ARE NOT RESPONSIBLE FOR ANY DECISIONS OR ACTIONS YOU TAKE BASED ON INFORMATION OBTAINED THROUGH THE SERVICE.`,
  },
  {
    icon: Gavel,
    title: '9. Limitation of Liability',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FOUNDATORS, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO:

(A) YOUR ACCESS TO OR USE OF (OR INABILITY TO ACCESS OR USE) THE SERVICE;
(B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE;
(C) ANY CONTENT OBTAINED FROM THE SERVICE; OR
(D) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.

IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU HAVE PAID TO FOUNDATORS IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED INDIAN RUPEES, WHICHEVER IS LESS.`,
  },
  {
    icon: Scale,
    title: '10. Governing Law',
    content: 'These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in India. You agree to submit to the personal jurisdiction of such courts and waive any objection to the laying of venue in such courts.',
  },
  {
    icon: Calendar,
    title: '11. Changes to Terms',
    content: 'We reserve the right to update or modify these Terms at any time. When we make material changes, we will notify you through the Service, via email, or by posting a prominent notice before the changes take effect. The "Last Updated" date at the top of these Terms reflects the date of the most recent revision. Your continued use of the Service after any modifications constitutes your acceptance of the updated Terms. We encourage you to review these Terms periodically.',
  },
  {
    icon: Mail,
    title: '12. Contact',
    content: 'If you have any questions about these Terms of Service, please contact us at:',
    contact: {
      email: 'happykirtania@gmail.com',
      entity: 'Happy Kirtania, Founder',
    },
  },
];

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center justify-between border-b border-linesoft px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-gold-hi"
          >
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
          <h2 className="text-[17px] font-extrabold">Terms of Service</h2>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] py-4 pb-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-grad text-[#1a1300]">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-[22px] font-black">Terms of Service</h1>
            <p className="text-[12px] text-text2">Foundators</p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-linesoft bg-card px-4 py-3">
          <Calendar size={14} className="text-gold" />
          <span className="text-[12px] text-text2">Last updated: {LAST_UPDATED}</span>
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={idx}>
              <div className="mb-3 flex items-center gap-2.5">
                <section.icon size={16} className="text-gold" />
                <h2 className="text-[15px] font-extrabold">{section.title}</h2>
              </div>

              {section.content && (
                <p className="text-[13px] leading-6 text-text2">{section.content}</p>
              )}

              {section.subsections && (
                <div className="space-y-4">
                  {section.subsections.map((sub, si) => (
                    <div key={si}>
                      <h3 className="mb-1.5 text-[13px] font-bold text-gold-hi">{sub.subtitle}</h3>
                      <p className="text-[13px] leading-6 text-text2">{sub.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.items && (
                <ul className="mt-2 space-y-2">
                  {section.items.map((item, ii) => (
                    <li key={ii} className="flex gap-2 text-[13px] leading-6 text-text2">
                      <span className="mt-1.5 flex-none text-gold">&#8226;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.extra && (
                <p className="mt-3 text-[13px] leading-6 text-text2">{section.extra}</p>
              )}

              {section.contact && (
                <div className="mt-3 rounded-2xl border border-linesoft bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gold" />
                    <span className="text-[13px] font-bold">{section.contact.entity}</span>
                  </div>
                  <a
                    href={`mailto:${section.contact.email}`}
                    className="mt-2 block text-[13px] text-gold"
                  >
                    {section.contact.email}
                  </a>
                </div>
              )}

              {idx < sections.length - 1 && (
                <div className="mt-6 border-b border-linesoft" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-linesoft bg-card p-4 text-center">
          <p className="text-[11px] text-text3">
            These Terms of Service are effective as of {LAST_UPDATED}.
          </p>
        </div>
      </div>
    </div>
  );
}
