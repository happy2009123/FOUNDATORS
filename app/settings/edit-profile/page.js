'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Camera, X, Plus, Loader2, Check, Copy, Globe } from 'lucide-react';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { getSupabase } from '@/lib/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { updateUserProfile } from '@/lib/firestore';
import Avatar from '@/components/Avatar';
import AuthSkeleton from '@/components/AuthSkeleton';

const BIO_MAX = 200;

export default function EditProfilePage() {
  const ready = useRequireAuth();
  const profileLoaded = useStore((s) => s.profileLoaded);

  // Mount the form only after the profiles row has resolved. The auth
  // bootstrap sets an empty placeholder profile first and fetches the row
  // in a second set(); mounting before that lands seeds every input with
  // blanks (useState never re-initializes), forcing the user to retype.
  if (!ready || !profileLoaded) return <AuthSkeleton />;
  return <EditProfileForm />;
}

function EditProfileForm() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const showToast = useStore((s) => s.showToast);
  const { vibrate, notification } = useHaptics();

  const [authUid, setAuthUid] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      ?.auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setAuthUid(data?.user?.id || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const uid = authUid || profile?.id;

  const [name, setName] = useState(profile.name || '');
  const [handle, setHandle] = useState(profile.handle || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [role, setRole] = useState(profile.role || '');
  const [location, setLocation] = useState(profile.location || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [skills, setSkills] = useState([...(profile.skills || [])]);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState([...(profile.interests || [])]);
  const [interestInput, setInterestInput] = useState('');
  const [experience, setExperience] = useState(Array.isArray(profile.experience) ? profile.experience : []);
  const [education, setEducation] = useState(Array.isArray(profile.education) ? profile.education : []);
  const [openToWork, setOpenToWork] = useState(!!profile.openToWork);
  const [hiring, setHiring] = useState(!!profile.hiring);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar || '');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  function compressImage(dataUrl, maxSize = 512, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB');
      return;
    }
    showToast('Compressing photo...');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const compressed = await compressImage(ev.target.result);
        setAvatarPreview(compressed);
      } catch (err) {
        console.error('Compress failed:', err);
        setAvatarPreview(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function uploadDp(file) {
    try {
      const publicId = `${uid}-${Date.now()}`;
      const url = await uploadToCloudinary(file, 'image', 'profile-photos', publicId);
      console.log('[profile] photo uploaded', url);
      return url;
    } catch (err) {
      console.error('[profile] photo upload failed:', err);
      return null;
    }
  }

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

  function addInterest() {
    const val = interestInput.trim();
    if (!val) return;
    if (interests.includes(val)) {
      showToast('Interest already added');
      return;
    }
    if (interests.length >= 8) {
      showToast('Max 8 interests');
      return;
    }
    vibrate('light');
    setInterests((s) => [...s, val]);
    setInterestInput('');
  }

  function removeInterest(interest) {
    vibrate('light');
    setInterests((s) => s.filter((k) => k !== interest));
  }

  function addExperience() {
    vibrate('light');
    setExperience((s) => [...s, { title: '', company: '', start: '', end: '', description: '' }]);
  }

  function updateExperience(index, field, value) {
    setExperience((s) => s.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removeExperience(index) {
    vibrate('light');
    setExperience((s) => s.filter((_, i) => i !== index));
  }

  function addEducation() {
    vibrate('light');
    setEducation((s) => [...s, { school: '', degree: '', field: '', end: '' }]);
  }

  function updateEducation(index, field, value) {
    setEducation((s) => s.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removeEducation(index) {
    vibrate('light');
    setEducation((s) => s.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      showToast('Name cannot be empty');
      return;
    }
    if (!uid) {
      showToast('Not authenticated');
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      let photoFailed = false;

      if (avatarPreview) {
        setUploading(true);
        try {
          const response = await fetch(avatarPreview);
          const blob = await response.blob();
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          const uploadedUrl = await uploadDp(file);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
          } else {
            photoFailed = true;
          }
        } catch (err) {
          console.error('[profile] photo upload step failed', err);
          photoFailed = true;
        } finally {
          setUploading(false);
        }
      }

      const normalizedWebsite = website.trim()
        ? /^https?:\/\//i.test(website.trim())
          ? website.trim()
          : `https://${website.trim()}`
        : '';

      const data = {
        name: name.trim(),
        handle: handle.trim(),
        bio: bio.trim(),
        role: role.trim(),
        location: location.trim(),
        website: normalizedWebsite,
        skills,
        avatar: finalAvatarUrl,
        interests,
        // Drop half-filled rows so empty cards never persist.
        experience: experience.filter((e) => (e.title || '').trim() || (e.company || '').trim()),
        education: education.filter((e) => (e.school || '').trim() || (e.degree || '').trim()),
        openToWork,
        hiring,
      };

      // updateUserProfile returns { success:false } instead of throwing -
      // without this check a failed DB write showed a success toast while
      // the photo silently never persisted.
      const res = await updateUserProfile(uid, data);
      if (!res || res.success === false) {
        throw new Error((res && res.error) || 'Could not save profile');
      }
      updateProfile(data);

      notification('success');
      showToast(
        photoFailed
          ? 'Photo failed to upload - other changes were saved'
          : 'Profile updated successfully'
      );
      router.back();
    } catch (err) {
      console.error('[profile] save failed:', err);
      showToast('Failed to save profile. Try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-linesoft bg-ink/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-[16px] font-bold">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex items-center gap-1.5 rounded-full bg-gold-grad px-4 py-1.5 text-xs font-extrabold text-[#1a1300] disabled:opacity-50"
        >
          {saving || uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl border border-linesoft bg-card p-4">
          <h3 className="mb-3 text-[13px] font-bold">Profile Photo</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                src={avatarPreview || avatarUrl || profile.avatar}
                name={name || profile.name}
                size={76}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[#1a1300]"
                aria-label="Change photo"
              >
                <Camera size={14} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-text2">Tap the camera icon to upload a new photo</p>
              {avatarPreview && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setAvatarPreview(null)}
                    className="flex items-center gap-1 rounded-full border border-linesoft px-3 py-1.5 text-[11px] font-bold text-text2"
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4 space-y-4">
          <FieldRow label="Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="field-input" />
          </FieldRow>
          <FieldRow label="Handle">
            <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" className="field-input" />
          </FieldRow>
          <FieldRow label="Role">
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder" className="field-input" />
          </FieldRow>
          <FieldRow label="Location">
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="field-input" />
          </FieldRow>
          <FieldRow label="Website">
            <div className="relative">
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. yoursite.com"
                className="field-input pl-9"
                inputMode="url"
              />
              <Globe size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold" />
            </div>
          </FieldRow>
          <FieldRow label="Bio">
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="Tell people about yourself..."
                rows={3}
                className="field-input resize-none pr-14"
                style={{ minHeight: '80px' }}
              />
              <span className={`absolute bottom-2.5 right-3 text-[11px] font-bold tabular-nums ${bio.length >= BIO_MAX ? 'text-brandred' : 'text-text3'}`}>
                {bio.length}/{BIO_MAX}
              </span>
            </div>
          </FieldRow>
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <h3 className="mb-3 text-[13px] font-bold">Skills</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {skills.length === 0 && <span className="text-[12px] text-text3">No skills added yet</span>}
            {skills.map((skill) => (
              <span key={skill} className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold-hi">
                {skill}
                <button onClick={() => removeSkill(skill)} className="ml-0.5 rounded-full p-0.5 text-gold/60 hover:text-white" aria-label={`Remove ${skill}`}>
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
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="Add a skill..."
              className="field-input flex-1"
            />
            <button onClick={addSkill} className="flex flex-none items-center justify-center rounded-xl border border-gold/30 bg-gold/10 px-3 text-gold hover:bg-gold/20" aria-label="Add skill">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <h3 className="mb-3 text-[13px] font-bold">Interests</h3>
          <p className="mb-3 text-[11.5px] text-text2">Shown on your profile and used to rank your feed and People You May Know.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {interests.length === 0 && <span className="text-[12px] text-text3">No interests added yet</span>}
            {interests.map((interest) => (
              <span key={interest} className="flex items-center gap-1.5 rounded-full border border-brandblue/30 bg-brandblue/10 px-3 py-1 text-xs font-bold text-brandblue">
                {interest}
                <button onClick={() => removeInterest(interest)} className="ml-0.5 rounded-full p-0.5 text-brandblue/60 hover:text-white" aria-label={`Remove ${interest}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
              placeholder="Add an interest..."
              className="field-input flex-1"
            />
            <button onClick={addInterest} className="flex flex-none items-center justify-center rounded-xl border border-brandblue/30 bg-brandblue/10 px-3 text-brandblue hover:bg-brandblue/20" aria-label="Add interest">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <h3 className="mb-3 text-[13px] font-bold">Status</h3>
          <div className="space-y-3">
            <ToggleRow
              label="Open to work"
              hint="Shows a green badge on your profile — founders and recruiters can see you're looking."
              active={openToWork}
              onToggle={() => { vibrate('light'); setOpenToWork((v) => !v); }}
            />
            <ToggleRow
              label="Hiring"
              hint="Shows a blue hiring badge — people can reach out with roles and collaborations."
              active={hiring}
              onToggle={() => { vibrate('light'); setHiring((v) => !v); }}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-bold">Experience</h3>
            <button onClick={addExperience} className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold hover:bg-gold/20">
              <Plus size={12} /> Add
            </button>
          </div>
          {experience.length === 0 && <p className="text-[12px] text-text3">No experience added yet</p>}
          <div className="space-y-3">
            {experience.map((item, i) => (
              <div key={i} className="rounded-xl border border-linesoft bg-white/[0.03] p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="pt-1 text-[11px] font-bold text-text3">Role {i + 1}</span>
                  <button onClick={() => removeExperience(i)} className="rounded-full p-1 text-text3 hover:text-brandred" aria-label={`Remove role ${i + 1}`}>
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  <input value={item.title || ''} onChange={(e) => updateExperience(i, 'title', e.target.value)} placeholder="Title (e.g. Founder)" className="field-input" />
                  <input value={item.company || ''} onChange={(e) => updateExperience(i, 'company', e.target.value)} placeholder="Company / project" className="field-input" />
                  <div className="flex gap-2">
                    <input value={item.start || ''} onChange={(e) => updateExperience(i, 'start', e.target.value)} placeholder="Start (e.g. 2023)" className="field-input flex-1" />
                    <input value={item.end || ''} onChange={(e) => updateExperience(i, 'end', e.target.value)} placeholder="End (or Present)" className="field-input flex-1" />
                  </div>
                  <textarea value={item.description || ''} onChange={(e) => updateExperience(i, 'description', e.target.value)} placeholder="What did you do there?" rows={2} className="field-input resize-none" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-bold">Education</h3>
            <button onClick={addEducation} className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold hover:bg-gold/20">
              <Plus size={12} /> Add
            </button>
          </div>
          {education.length === 0 && <p className="text-[12px] text-text3">No education added yet</p>}
          <div className="space-y-3">
            {education.map((item, i) => (
              <div key={i} className="rounded-xl border border-linesoft bg-white/[0.03] p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="pt-1 text-[11px] font-bold text-text3">School {i + 1}</span>
                  <button onClick={() => removeEducation(i)} className="rounded-full p-1 text-text3 hover:text-brandred" aria-label={`Remove school ${i + 1}`}>
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  <input value={item.school || ''} onChange={(e) => updateEducation(i, 'school', e.target.value)} placeholder="School / university" className="field-input" />
                  <div className="flex gap-2">
                    <input value={item.degree || ''} onChange={(e) => updateEducation(i, 'degree', e.target.value)} placeholder="Degree" className="field-input flex-1" />
                    <input value={item.field || ''} onChange={(e) => updateEducation(i, 'field', e.target.value)} placeholder="Field" className="field-input flex-1" />
                  </div>
                  <input value={item.end || ''} onChange={(e) => updateEducation(i, 'end', e.target.value)} placeholder="End year (or expected)" className="field-input" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-linesoft bg-card p-4">
          <span className="text-[12px] font-bold text-text2">Firebase UID</span>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/5 border border-linesoft px-3 py-2.5">
            <span className="flex-1 truncate font-mono text-[13px] font-bold text-gold tracking-wider">{uid || 'N/A'}</span>
            <button onClick={() => { navigator.clipboard?.writeText(uid || '').then(() => showToast('UID copied')); }} className="text-gold" aria-label="Copy UID">
              <Copy size={14} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-3 pb-8">
          <button onClick={() => router.back()} className="flex-1 rounded-xl border border-linesoft bg-white/5 py-3 text-sm font-extrabold text-text2 hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-grad py-3 text-sm font-extrabold text-[#1a1300] hover:opacity-90 disabled:opacity-50"
          >
            {saving || uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: #fff;
          outline: none;
          transition: border-color 0.2s;
        }
        .field-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .field-input:focus {
          border-color: #d9ac3d;
        }
      `}</style>
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

function ToggleRow({ label, hint, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={active}
      className="flex w-full items-center gap-3 rounded-xl border border-linesoft bg-white/[0.03] px-3 py-3 text-left"
    >
      <span className="flex-1">
        <span className="block text-[12.5px] font-bold">{label}</span>
        <span className="mt-0.5 block text-[11px] text-text2">{hint}</span>
      </span>
      <span className={`relative flex h-6 w-11 flex-none items-center rounded-full transition-colors ${active ? 'bg-brandgreen' : 'bg-white/10'}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
