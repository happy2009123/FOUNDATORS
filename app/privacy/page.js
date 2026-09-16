'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Shield, Lock, Eye, Database, Share2, Mail, Calendar } from 'lucide-react';

const LAST_UPDATED = 'September 1, 2026';

const sections = [
  {
    icon: Shield,
    title: '1. Introduction',
    content: `Foundators ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our social networking platform, including our website, mobile applications, and any related services (collectively, the "Service"). By using Foundators, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this Privacy Policy, please do not access the Service.`,
  },
  {
    icon: Eye,
    title: '2. Information We Collect',
    subsections: [
      {
        subtitle: '2.1 Account Information',
        text: 'When you create an account, we collect information you voluntarily provide, including your full name, email address, username, password, profile photograph, bio, professional role, company name, location, and any other details you choose to include in your profile.',
      },
      {
        subtitle: '2.2 User Content',
        text: 'We collect content you create, upload, or share on the Service, including posts, comments, messages, ideas, business plans, pitch decks, files, images, and any other materials you submit or make available to other users.',
      },
      {
        subtitle: '2.3 Usage Data',
        text: 'We automatically collect information about how you interact with the Service, including pages viewed, features used, search queries, posts liked or saved, connections made, messages sent, time and duration of activities, referring URLs, and navigation patterns.',
      },
      {
        subtitle: '2.4 Device and Technical Information',
        text: 'We collect information about the device and network you use to access the Service, including device type, operating system, browser type and version, screen resolution, unique device identifiers, IP address, mobile network information, and language preferences.',
      },
    ],
  },
  {
    icon: Database,
    title: '3. How We Use Your Information',
    content: 'We use the information we collect for the following purposes:',
    items: [
      'To provide, maintain, and improve the Service and its features.',
      'To personalize your experience by delivering relevant content, connections, and recommendations.',
      'To communicate with you, including sending service-related notices, updates, security alerts, and promotional messages (which you may opt out of at any time).',
      'To analyze usage trends and develop new products, features, and services.',
      'To detect, prevent, and address technical issues, fraud, unauthorized access, and other malicious activity.',
      'To enforce our Terms of Service and comply with applicable laws, regulations, and legal processes.',
      'To facilitate connections, matches, and interactions between users based on shared interests and goals.',
    ],
  },
  {
    icon: Share2,
    title: '4. Information Sharing and Disclosure',
    subsections: [
      {
        subtitle: '4.1 With Other Users',
        text: 'Your profile information, including your name, photograph, bio, and professional details, is visible to other users of the Service. Content you share publicly (such as posts in community spaces) is accessible to all users. Messages are visible only to the participants of the conversation.',
      },
      {
        subtitle: '4.2 With Service Providers',
        text: 'We may share your information with trusted third-party service providers who assist us in operating the Service, such as cloud hosting providers, analytics services, payment processors, and communication platforms. These providers are contractually obligated to protect your information and may not use it for purposes other than those we specify.',
      },
      {
        subtitle: '4.3 For Legal Requirements',
        text: 'We may disclose your information if required to do so by law, or in good faith belief that such action is necessary to comply with a legal obligation, protect and defend our rights or property, prevent fraud, or protect the personal safety of users or the public.',
      },
      {
        subtitle: '4.4 Business Transfers',
        text: 'In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change and any choices you may have regarding your information.',
      },
    ],
  },
  {
    icon: Lock,
    title: '5. Data Security',
    content: 'We implement industry-standard technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:',
    items: [
      'Encryption of data in transit (TLS/SSL) and at rest using AES-256 encryption.',
      'Role-based access controls limiting internal access to personal data on a need-to-know basis.',
      'Regular security audits, vulnerability assessments, and penetration testing.',
      'Secure authentication protocols, including password hashing with bcrypt.',
      'Automated monitoring systems to detect and respond to suspicious activity.',
    ],
    extra: 'While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to promptly addressing any security incidents that may occur.',
  },
  {
    icon: Database,
    title: '6. Data Retention',
    content: 'We retain your personal information for as long as your account is active or as needed to provide the Service. We will also retain your information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will remove your profile and personal data within 30 days, though certain information may be retained in backup systems for up to 90 days for disaster recovery purposes. Aggregated or anonymized data that cannot be used to identify you may be retained indefinitely.',
  },
  {
    icon: Eye,
    title: '7. Your Rights',
    content: 'Depending on your jurisdiction, you may have the following rights regarding your personal information:',
    items: [
      'Right of Access — Request a copy of the personal data we hold about you.',
      'Right to Rectification — Request correction of inaccurate or incomplete information.',
      'Right to Erasure — Request deletion of your personal data, subject to legal exceptions.',
      'Right to Data Portability — Request a copy of your data in a commonly used, machine-readable format.',
      'Right to Restrict Processing — Request that we limit how we use your data in certain circumstances.',
      'Right to Object — Object to the processing of your data for specific purposes, including direct marketing.',
      'Right to Withdraw Consent — Where processing is based on consent, withdraw that consent at any time.',
    ],
    extra: 'To exercise any of these rights, contact us at happykirtania@gmail.com. We will respond to your request within 30 days.',
  },
  {
    icon: Database,
    title: '8. Cookies and Tracking Technologies',
    content: 'We use cookies, web beacons, pixels, and similar technologies to maintain your session, remember your preferences, and analyze usage patterns. We use essential cookies to operate the Service, performance cookies to understand how users interact with the Service, and functional cookies to remember your settings. You can control cookies through your browser settings. Disabling certain cookies may affect the functionality of the Service. We do not sell your personal information to third parties for advertising purposes.',
  },
  {
    icon: Shield,
    title: "9. Children's Privacy",
    content: 'The Service is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have inadvertently collected personal information from a child under 13, we will take steps to delete such information promptly. If you are a parent or guardian and believe your child has provided personal information to us, please contact us at happykirtania@gmail.com.',
  },
  {
    icon: Calendar,
    title: '10. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the Service, via email, or by posting a prominent notice before the changes take effect. We encourage you to review this Privacy Policy periodically. Your continued use of the Service after the effective date of any modifications constitutes your acceptance of the updated policy.',
  },
  {
    icon: Mail,
    title: '11. Contact Us',
    content: 'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:',
    contact: {
      email: 'happykirtania@gmail.com',
      entity: 'Happy Kirtania, Founder',
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
