'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Save, Image as ImageIcon } from 'lucide-react';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import SubpageHeader from '@/components/SubpageHeader';
import ProfilePhotoEditor from '@/components/ProfilePhotoEditor';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';

const BIO_MAX = 200;

export default function EditProfilePage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const showToast = useStore((s) => s.showToast);
  const { vibrate, notification } = useHaptics();

  const [name, setName] = useState(profile.name || '');
  const [handle, setHandle] = useState(profile.handle || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [role, setRole] = useState(profile.role || '');
  const [location, setLocation] = useState(profile.location || '');
  const [skills, setSkills] = useState([...(profile.skills || [])]);
  const [skillInput, setSkillInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar || '');

  if (!ready) return <AuthSkeleton />;

  function addSkill() {
    const val = skillInput.trim();
    if (!val) return;
    if (skills.includes(val)) {
      showToast('Skill already added');
      return;
    }
    if (skills.length >= 10) {
      showToast('Max 10 skills');
      return;
    }
    vibrate('light');
    setSkills((s) => [...s, val]);
    setSkillInput('');
  }

  function removeSkill(skill) {
    vibrate('light');
    setSkills((s) => s.filter((k) => k !== skill));
  }

  function handleSave() {
    if (!name.trim()) {
      showToast('Name cannot be empty');
      return;
    }
    updateProfile({
      name: name.trim(),
      handle: handle.trim(),
      bio: bio.trim(),
      role: role.trim(),
      location: location.trim(),
      skills,
      avatar: avatarUrl.trim(),
    });
    notification('success');
    showToast('Profile updated');
    router.back();
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader
        title="Edit Profile"
        right={
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-full bg-gold-grad px-4 py-1.5 text-xs font-extrabold text-[#1a1300]"
          >
            <Save size={14} />
            Save
          </button>
        }
      />

      <div className="no-scrollbar flex-1 overflow-y-auto px-[18px] py-4">
        {/* Photo & Cover Section */}
        <ProfilePhotoEditor />

        {/* Avatar Section */}
        <SectionLabel>Avatar</SectionLabel>
        <div className="gold-card mb-5 rounded-2xl border border-linesoft bg-card p-4">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl || profile.avatar} name={name || profile.name} size={72} />
            <div className="flex-1 min-w-0">
              <label className="mb-2 flex items-center gap-2 text-xs font-bold text-text2">
                <ImageIcon size={13} className="text-gold" />
                Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full rounded-xl border border-linesoft bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white placeholder:text-text3 focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Fields Section */}
        <SectionLabel>Details</SectionLabel>
        <div className="mb-5 rounded-2xl border border-linesoft bg-card p-4 space-y-4">
          <FieldRow label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="field-input"
            />
          </FieldRow>

          <FieldRow label="Handle">
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@yourhandle"
              className="field-input"
            />
          </FieldRow>

          <FieldRow label="Role">
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Founder · Building X"
              className="field-input"
            />
          </FieldRow>

          <FieldRow label="Location">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="field-input"
            />
          </FieldRow>

          <FieldRow label="Bio">
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="Tell people about yourself..."
                rows={3}
                className="field-input !min-h-[80px] resize-none pr-14"
              />
              <span
                className={`absolute bottom-2.5 right-3 text-[11px] font-bold tabular-nums ${
                  bio.length >= BIO_MAX ? 'text-brandred' : 'text-text3'
                }`}
              >
                {bio.length}/{BIO_MAX}
              </span>
            </div>
          </FieldRow>
        </div>

        {/* Skills Section */}
        <SectionLabel>Skills</SectionLabel>
        <div className="gold-card mb-8 rounded-2xl border border-linesoft bg-card p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {skills.length === 0 && (
              <span className="text-[12px] text-text3">No skills added yet</span>
            )}
            {skills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1.5 rounded-full border border-[rgba(217,172,61,0.3)] bg-[rgba(217,172,61,0.1)] px-3 py-1 text-xs font-bold text-gold-hi"
              >
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-0.5 rounded-full p-0.5 text-gold/60 transition-colors hover:text-white"
                  aria-label={`Remove ${skill}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add a skill..."
              className="field-input flex-1"
            />
            <button
              onClick={addSkill}
              className="flex flex-none items-center justify-center rounded-xl border border-gold/30 bg-[rgba(217,172,61,0.12)] px-3 text-gold transition-colors hover:bg-[rgba(217,172,61,0.22)]"
              aria-label="Add skill"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-linesoft bg-[rgba(255,255,255,0.04)] py-3 text-sm font-extrabold text-text2 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-gold-grad py-3 text-sm font-extrabold text-[#1a1300] transition-opacity hover:opacity-90"
          >
            Save Changes
          </button>
        </div>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border-linesoft, rgba(255, 255, 255, 0.08));
          background: rgba(255, 255, 255, 0.04);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #fff;
          outline: none;
          transition: border-color 0.2s;
        }
        .field-input::placeholder {
          color: var(--text-text3, rgba(255, 255, 255, 0.3));
        }
        .field-input:focus {
          border-color: var(--gold, #d9ac3d);
        }
      `}</style>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text3">
      {children}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-bold text-text2">{label}</label>
      {children}
    </div>
  );
}
