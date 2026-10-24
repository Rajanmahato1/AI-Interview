import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import {
  Save,
  User,
  Sliders,
  Code2,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Check,
  Shield,
} from 'lucide-react';

const SKILLS_SUGGESTIONS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Java',
  'SQL',
  'MongoDB',
  'Docker',
  'System Design',
  'DSA',
  'Next.js',
  'Redis',
  'Adobe Photoshop',
  'Adobe Illustrator',
  "Figma",
  "Canva",
  "UI Design",
  "UX Design",
  "Ethical Hacking",
  "Network Security",
  "Linux",
  "Kali Linux",
  "Penetration Testing",
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    targetRole: user?.profile?.targetRole || '',
    experienceLevel: user?.profile?.experienceLevel || 'junior',
    preferredDifficulty: user?.profile?.preferredDifficulty || 'medium',
    defaultDuration: user?.profile?.defaultDuration || 30,
    adaptiveEnabled: user?.profile?.adaptiveEnabled ?? true,
    theme: user?.profile?.theme || theme || 'dark',
    skills: user?.profile?.skills || [],
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || '',
        targetRole: user.profile?.targetRole || '',
        experienceLevel: user.profile?.experienceLevel || 'junior',
        preferredDifficulty: user.profile?.preferredDifficulty || 'medium',
        defaultDuration: user.profile?.defaultDuration || 30,
        adaptiveEnabled: user.profile?.adaptiveEnabled ?? true,
        theme: user.profile?.theme || theme,
        skills: user.profile?.skills || [],
      }));
    }
  }, [user, theme]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextVal = type === 'checkbox' ? checked : value;
    setForm((f) => ({ ...f, [name]: nextVal }));

    if (name === 'theme') {
      setTheme(value);
    }
  };

  const toggleSkill = (skill) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter((s) => s !== skill)
        : [...f.skills, skill],
    }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await profileApi.update({
        name: form.name,
        profile: {
          targetRole: form.targetRole,
          experienceLevel: form.experienceLevel,
          preferredDifficulty: form.preferredDifficulty,
          defaultDuration: Number(form.defaultDuration),
          adaptiveEnabled: form.adaptiveEnabled,
          theme: form.theme,
          skills: form.skills,
        },
      });
      updateUser(res.data.user);
      setTheme(form.theme);
      toast.success('Profile and preferences updated!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        {/* Header with Avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'var(--gradient-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>
              Profile & Preferences
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {user?.email} • Account managed via Secure JWT
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Personal Info */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Personal Information</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your candidate name and target title</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">
                  Full Name
                </label>
                <input
                  name="name"
                  id="profile-name"
                  value={form.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-role">
                  Target Engineering Role
                </label>
                <input
                  name="targetRole"
                  id="profile-role"
                  value={form.targetRole}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. Senior Full Stack Engineer"
                />
              </div>
            </div>
          </div>

          {/* Interview Preferences */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--info-bg)',
                  color: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sliders size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Interview Defaults</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Prepopulate new session settings</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-level">
                  Experience Level
                </label>
                <select
                  name="experienceLevel"
                  id="profile-level"
                  value={form.experienceLevel}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="fresher">Fresher (0–1 yr)</option>
                  <option value="junior">Junior (1–3 yrs)</option>
                  <option value="mid">Mid-level (3–6 yrs)</option>
                  <option value="senior">Senior (6+ yrs)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-difficulty">
                  Default Difficulty
                </label>
                <select
                  name="preferredDifficulty"
                  id="profile-difficulty"
                  value={form.preferredDifficulty}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-duration">
                  Default Time Limit (min)
                </label>
                <input
                  name="defaultDuration"
                  id="profile-duration"
                  type="number"
                  min={5}
                  max={120}
                  value={form.defaultDuration}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-theme">
                  Color Theme
                </label>
                <select
                  name="theme"
                  id="profile-theme"
                  value={form.theme}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="dark">Dark Theme (Deep Navy)</option>
                  <option value="light">Light Theme (Clean Slate)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                background: 'var(--bg-elevated)',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <input
                type="checkbox"
                name="adaptiveEnabled"
                id="profile-adaptive"
                checked={form.adaptiveEnabled}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <label htmlFor="profile-adaptive" style={{ fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Default to adaptive probing questions during active practice sessions
              </label>
            </div>
          </div>

          {/* Primary Skills Chips */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Code2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Primary Technical Stack</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Click to select technologies that appear in your question generation pool
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SKILLS_SUGGESTIONS.map((skill) => {
                const isSelected = form.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={isSelected ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    style={{
                      borderRadius: '999px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      gap: '6px',
                    }}
                  >
                    {isSelected && <Check size={13} />}
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            id="profile-save"
            style={{ justifyContent: 'center', fontSize: '15.5px' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Profile & Preferences</span>
              </>
            )}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
