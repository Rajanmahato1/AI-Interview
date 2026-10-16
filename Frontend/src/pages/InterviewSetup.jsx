import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { interviewApi } from '../api';
import { ArrowLeft, Plus, X, Zap } from 'lucide-react';

const schema = z.object({
  targetRole: z.string().min(2, 'Role is required'),
  experienceLevel: z.enum(['fresher', 'junior', 'mid', 'senior']),
  interviewType: z.enum(['technical', 'behavioral', 'hr', 'mixed']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  companyType: z.enum(['startup', 'product', 'service', 'enterprise']),
  questionCount: z.coerce.number().min(1).max(30),
  timeLimitMinutes: z.coerce.number().min(5).max(120),
  jobDescription: z.string().optional(),
  adaptiveEnabled: z.boolean().optional(),
});

const TECH_SUGGESTIONS = ['React', 'Node.js', 'Python', 'Java', 'TypeScript', 'MongoDB', 'SQL', 'Docker', 'AWS', 'System Design', 'DSA', 'Kubernetes', 'GraphQL', 'Next.js'];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [technologies, setTechnologies] = useState([]);
  const [techInput, setTechInput] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { experienceLevel: 'junior', interviewType: 'technical', difficulty: 'medium', companyType: 'product', questionCount: 10, timeLimitMinutes: 30 },
  });

  const addTech = (tech) => {
    const t = tech.trim();
    if (t && !technologies.includes(t)) setTechnologies(prev => [...prev, t]);
    setTechInput('');
  };

  const removeTech = (tech) => setTechnologies(prev => prev.filter(t => t !== tech));

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await interviewApi.create({ ...data, technologies });
      toast.success('Interview created!');
      navigate(`/interview/${res.data.session._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create interview');
    } finally { setLoading(false); }
  };

  const Field = ({ label, name, children, error }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {error && <span className="form-error">{error.message}</span>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '80px' }}>
      <nav className="navbar"><span className="navbar-brand">⚡ InterviewAI</span><div className="navbar-links"><button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}><ArrowLeft size={14} /> Dashboard</button></div></nav>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Configure Interview</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Set up your practice session</p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '20px', color: 'var(--accent-light)' }}>Basic Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Target Role *" name="targetRole" error={errors.targetRole}>
                  <input {...register('targetRole')} className={`form-input ${errors.targetRole ? 'error' : ''}`} placeholder="e.g. Senior Frontend Developer" id="setup-role" />
                </Field>
              </div>
              <Field label="Experience Level" name="experienceLevel" error={errors.experienceLevel}>
                <select {...register('experienceLevel')} className="form-select" id="setup-level">
                  <option value="fresher">Fresher (0-1 yr)</option>
                  <option value="junior">Junior (1-3 yrs)</option>
                  <option value="mid">Mid-level (3-6 yrs)</option>
                  <option value="senior">Senior (6+ yrs)</option>
                </select>
              </Field>
              <Field label="Interview Type" name="interviewType" error={errors.interviewType}>
                <select {...register('interviewType')} className="form-select" id="setup-type">
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="hr">HR</option>
                  <option value="mixed">Mixed</option>
                </select>
              </Field>
              <Field label="Difficulty" name="difficulty" error={errors.difficulty}>
                <select {...register('difficulty')} className="form-select" id="setup-difficulty">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
              <Field label="Company Type" name="companyType" error={errors.companyType}>
                <select {...register('companyType')} className="form-select" id="setup-company">
                  <option value="startup">Startup</option>
                  <option value="product">Product-based</option>
                  <option value="service">Service-based</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label="Questions (1–30)" name="questionCount" error={errors.questionCount}>
                <input {...register('questionCount')} type="number" min={1} max={30} className="form-input" id="setup-qcount" />
              </Field>
              <Field label="Time Limit (minutes)" name="timeLimitMinutes" error={errors.timeLimitMinutes}>
                <input {...register('timeLimitMinutes')} type="number" min={5} max={120} className="form-input" id="setup-time" />
              </Field>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--accent-light)' }}>Technologies & Skills</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(techInput); } }} className="form-input" placeholder="Add technology (press Enter)" id="setup-tech-input" style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" onClick={() => addTech(techInput)}><Plus size={16} /></button>
            </div>
            {/* Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {TECH_SUGGESTIONS.filter(t => !technologies.includes(t)).map(t => (
                <button key={t} type="button" onClick={() => addTech(t)} style={{ padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent-light)'; }}
                  onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; }}>
                  + {t}
                </button>
              ))}
            </div>
            {technologies.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {technologies.map(t => (
                  <span key={t} className="badge badge-accent" style={{ gap: '6px' }}>
                    {t}
                    <button type="button" onClick={() => removeTech(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', lineHeight: 1, padding: 0 }}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--accent-light)' }}>Additional Context (Optional)</h3>
            <div className="form-group">
              <label className="form-label">Job Description</label>
              <textarea {...register('jobDescription')} className="form-textarea" placeholder="Paste the job description to get more relevant questions..." id="setup-jd" style={{ minHeight: '100px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
              <input type="checkbox" {...register('adaptiveEnabled')} id="setup-adaptive" style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
              <label htmlFor="setup-adaptive" style={{ fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Enable adaptive follow-up questions based on my answers
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} id="setup-submit" style={{ justifyContent: 'center' }}>
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><Zap size={18} /> Start Interview</>}
          </button>
        </form>
      </div>
    </div>
  );
}
