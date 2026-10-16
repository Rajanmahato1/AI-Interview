import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Save, ArrowLeft, User } from 'lucide-react';

const SKILLS_SUGGESTIONS = ['JavaScript', 'React', 'Node.js', 'Python', 'Java', 'TypeScript', 'SQL', 'MongoDB', 'Docker', 'AWS', 'Kubernetes', 'GraphQL', 'System Design', 'DSA'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    targetRole: user?.profile?.targetRole || '',
    experienceLevel: user?.profile?.experienceLevel || 'junior',
    preferredDifficulty: user?.profile?.preferredDifficulty || 'medium',
    defaultDuration: user?.profile?.defaultDuration || 30,
    adaptiveEnabled: user?.profile?.adaptiveEnabled ?? true,
    theme: user?.profile?.theme || 'dark',
    skills: user?.profile?.skills || [],
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleSkill = (skill) => {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill],
    }));
  };

  const handleSave = async () => {
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
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '80px' }}>
      <nav className="navbar"><span className="navbar-brand">⚡ InterviewAI</span><div className="navbar-links"><button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}><ArrowLeft size={14} /> Dashboard</button></div></nav>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div><h1 style={{ fontSize: '24px' }}>Profile & Settings</h1><p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{user?.email}</p></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--accent-light)' }}>Personal Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} className="form-input" id="profile-name" />
              </div>
              <div className="form-group">
                <label className="form-label">Target Role</label>
                <input name="targetRole" value={form.targetRole} onChange={handleChange} className="form-input" placeholder="e.g. Full Stack Developer" id="profile-role" />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--accent-light)' }}>Interview Preferences</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Experience Level</label>
                <select name="experienceLevel" value={form.experienceLevel} onChange={handleChange} className="form-select" id="profile-level">
                  <option value="fresher">Fresher</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid-level</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Difficulty</label>
                <select name="preferredDifficulty" value={form.preferredDifficulty} onChange={handleChange} className="form-select" id="profile-difficulty">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Default Duration (min)</label>
                <input name="defaultDuration" type="number" min={5} max={120} value={form.defaultDuration} onChange={handleChange} className="form-input" id="profile-duration" />
              </div>
              <div className="form-group">
                <label className="form-label">Theme</label>
                <select name="theme" value={form.theme} onChange={handleChange} className="form-select" id="profile-theme">
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
              <input type="checkbox" name="adaptiveEnabled" checked={form.adaptiveEnabled} onChange={handleChange} id="profile-adaptive" style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
              <label htmlFor="profile-adaptive" style={{ fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Enable adaptive follow-up questions by default</label>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--accent-light)' }}>Skills</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SKILLS_SUGGESTIONS.map(s => (
                <button key={s} type="button" onClick={() => toggleSkill(s)} className={form.skills.includes(s) ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} style={{ borderRadius: '999px' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-full" onClick={handleSave} disabled={loading} id="profile-save" style={{ justifyContent: 'center' }}>
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
