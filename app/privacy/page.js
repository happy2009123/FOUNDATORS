'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Shield, Lock, Eye, Database, Share2, Mail, Calendar } from 'lucide-react';

const LAST_UPDATED = 'October 12, 2026';

const sections = [
  {
    icon: Shield,
    title: '1. Introduction & Legal Framework',
    content: `This Privacy Policy is issued by Foundators ("we", "our", "us", the "Data Fiduciary") in accordance with the Digital Personal Data Protection Act, 2023 (India) and applies to all personal data we process about you (the "Data Principal"). It explains what personal data we collect, why we collect it, how we protect it, and the rights you have over it. By creating an account (where you give consent at signup) or by using our platform, you agree to the collection and use of information as described here. If you do not agree, please do not use the Service.`,
  },
  {
    icon: Mail,
    title: '2. Data Fiduciary & Grievance Officer',
    content: 'The Data Fiduciary responsible for your personal data is:',
    contact: {
      email: 'happykirtania@gmail.com',
      entity: 'Happy Kirtania, Founder — Foundators (Grievance Officer under the DPDP Act)',
    },
    extra: 'You may raise any question, complaint, or grievance about the processing of your personal data at the address above. We acknowledge every grievance within 72 hours and work to resolve it within 30 days. You also have the right to file a complaint with the Data Protection Board of India.',
  },
  {
    icon: Eye,
    title: '3. Personal Data We Collect',
    subsections: [
      {
        subtitle: '3.1 Data you provide',
        text: 'Name, email address, password (stored only as a salted hash), profile photo, username/handle, bio, professional role, company, location, skills, and anything else you choose to add to your profile.',
      },
      {
        subtitle: '3.2 Content you create',
        text: 'Posts, comments, messages, ideas, projects, event details, voice-room participation, reactions, and any files or images you upload.',
      },
      {
        subtitle: '3.3 Data collected automatically',
        text: 'Pages viewed, features used, search queries, likes and saves, connections made, messages sent, timestamps of activity, device type, browser, operating system, IP address, and language preferences.',
      },
      {
        subtitle: '3.4 Data from sign-in providers',
        text: 'If you sign up with Google, we receive your name, email address, and profile photo from Google according to your Google account settings.',
      },
    ],
  },
  {
    icon: Database,
    title: '4. Why We Process Your Data (Purpose & Legal Basis)',
    content: 'We process your personal data only for the following purposes, on the basis of the consent you give at signup and of "legitimate uses" recognised by the DPDP Act:',
    items: [
      'To create and maintain your account and provide the Service (profiles, posts, messages, voice rooms, events, projects).',
      'To personalise your experience — matching, recommendations, and founder discovery based on the skills and goals you share.',
      'To send you service-related notices: security alerts, message and collaboration notifications, and updates about rooms you joined.',
      'To keep the platform safe: detect spam, fraud, and misuse, and enforce our Terms.',
      'To understand aggregate usage trends so we can improve the product (analyses use aggregated data wherever possible).',
      'To comply with applicable laws and respond to lawful requests.',
    ],
  },
  {
    icon: Lock,
    title: '5. Your Consent, and Withdrawing It',
    content: 'When you create an account, you are shown this notice and asked to give clear, specific, unconditional consent (and to confirm you are 18 or older) before signing up — by email or with Google. A timestamped record of your consent is stored with your account.',
    items: [
      'You can withdraw consent for optional processing at any time in Settings (for example, notification preferences and privacy controls).',
      'Withdrawing consent for account-essential processing means we can no longer provide the Service to you — in that case, delete your account (Settings → Account).',
      'Deleting your account withdraws consent, erases your personal data from active systems, and stops all processing except where we must retain limited records by law.',
    ],
  },
  {
    icon: Share2,
    title: '6. Sharing, Transfers & Cross-Border Data',
    subsections: [
      {
        subtitle: '6.1 With other users',
        text: 'Your profile (name, photo, bio, professional details) is visible to other users. Public posts are visible to the community. Messages are visible only to conversation participants.',
      },
      {
        subtitle: '6.2 With service providers',
        text: 'We use vetted infrastructure providers to run the Service — including Supabase (database, authentication, storage), Cloudinary (image hosting), and our email provider. They process data only on our instructions and are bound to protect it.',
      },
      {
        subtitle: '6.3 Cross-border transfers',
        text: 'As permitted by the DPDP Act, your data may be stored and processed in countries to which transfers are not restricted by the Government of India. Our providers host data in secure regions and encrypt it in transit and at rest.',
      },
      {
        subtitle: '6.4 Legal requirements & business transfers',
        text: 'We may disclose data where required by law or to protect our rights, other users, or the public. If we are ever merged or acquired, your data may transfer with the business — this policy continues to apply and you will be informed.',
      },
    ],
  },
  {
    icon: Shield,
    title: '7. Data Security',
    content: 'We implement technical and organisational measures appropriate to the risk, including:',
    items: [
      'Encryption of data in transit (TLS) and at rest.',
      'Passwords stored only as salted hashes — never in readable form.',
      'Row-level security and access controls so users can only reach data they are permitted to see.',
      'Least-privilege access for anyone operating the platform.',
      'Automated monitoring for suspicious activity.',
    ],
    extra: 'No method of transmission or storage is 100% secure, but we act promptly on any security incident and notify affected users and the Data Protection Board of India where the law requires it.',
  },
  {
    icon: Database,
    title: '8. Retention & Erasure',
    content: 'We keep your personal data only as long as your account is active or as needed to provide the Service, and to meet legal obligations (for example, records we must keep under law). When you delete your account, your profile and personal data are erased from active systems within 30 days; encrypted backups age out within 90 days. Aggregated data that cannot identify you may be retained. You can also request correction or erasure of specific data at any time by emailing us.',
  },
  {
    icon: Eye,
    title: '9. Your Rights as a Data Principal (DPDP Act, 2023)',
    items: [
      'Right to Access — obtain a summary of the personal data we process about you and of our processing activities. A downloadable copy is available in Settings → Account.',
      'Right to Correction & Erasure — correct inaccurate data (Settings → Edit Profile) or request erasure of your personal data.',
      'Right to Grievance Redressal — raise a complaint with our Grievance Officer (happykirtania@gmail.com); we acknowledge within 72 hours and resolve within 30 days.',
      'Right to Nominate — nominate another individual to exercise your rights in the event of your death or incapacity. To nominate someone, email our Grievance Officer.',
      'Right to Withdraw Consent — stop any non-essential processing at any time (see section 5).',
      'Right to Complaint — approach the Data Protection Board of India if you believe your rights have been infringed.',
    ],
    extra: 'To exercise any of these rights, use Settings → Account (export or delete your data) or contact happykirtania@gmail.com. We respond within 30 days.',
  },
  {
    icon: Shield,
    title: "10. Children's Data",
    content: 'Foundators is a platform for adults. You must be at least 18 years old to create an account (a "child" under the DPDP Act is anyone below 18). We do not knowingly process the personal data of anyone under 18. If we learn that a child has provided us data, we erase it promptly. A parent or guardian who believes their child has used the Service should contact happykirtania@gmail.com.',
  },
  {
    icon: Calendar,
    title: '11. Changes to This Notice',
    content: 'We may update this Privacy Policy from time to time. For material changes we will show a prominent notice in the Service (and where required, seek fresh consent) before they take effect. The "Last updated" date at the top always shows when this notice was last revised. Continued use of the Service after an update means you accept the revised notice.',
  },
  {
    icon: Mail,
    title: '12. Contact',
    content: 'Questions, requests, or grievances about your personal data or this notice:',
    contact: {
      email: 'happykirtania@gmail.com',
      entity: 'Happy Kirtania, Founder — Data Fiduciary & Grievance Officer',
    },
  },
];

export default function PrivacyPage() {
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
          <h2 className="text-[17px] font-extrabold">Privacy Policy</h2>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] py-4 pb-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-grad text-[#1a1300]">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-[22px] font-black">Privacy Policy</h1>
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
            This Privacy Policy is effective as of {LAST_UPDATED}.
          </p>
        </div>
      </div>
    </div>
  );
}
