import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { interviewApi } from '../api';
import Navbar from '../components/Navbar';
import {
  ArrowLeft,
  Plus,
  X,
  Zap,
  Sliders,
  Code2,
  FileText,
  Sparkles,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

const schema = z.object({
  targetRole: z.string().min(2, 'Role title is required (at least 2 characters)'),
  experienceLevel: z.enum(['fresher', 'junior', 'mid', 'senior']),
  interviewType: z.enum(['technical', 'behavioral', 'hr', 'mixed']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  companyType: z.enum(['startup', 'product', 'service', 'enterprise']),
  questionCount: z.coerce.number().min(1, 'At least 1 question required').max(30, 'Max 30 questions'),
  timeLimitMinutes: z.coerce.number().min(5, 'Minimum 5 minutes').max(120, 'Maximum 120 minutes'),
  jobDescription: z.string().optional(),
  adaptiveEnabled: z.boolean().optional(),
});

const TECH_SUGGESTIONS = [
  'React',
  'Node.js',
  'TypeScript',
  'Java',
  'SQL',
  'MongoDB',
  'DSA',
  'Next.js',
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

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [technologies, setTechnologies] = useState([]);
  const [techInput, setTechInput] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      targetRole: '',
      experienceLevel: 'junior',
      interviewType: 'technical',
      difficulty: 'medium',
      companyType: 'product',
      questionCount: 8,
      timeLimitMinutes: 30,
      adaptiveEnabled: true,
      jobDescription: '',
    },
  });

  const addTech = (tech) => {
    const t = tech.trim();
    if (t && !technologies.includes(t)) {
      setTechnologies((prev) => [...prev, t]);
    }
    setTechInput('');
  };

  const removeTech = (tech) => {
    setTechnologies((prev) => prev.filter((t) => t !== tech));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await interviewApi.create({ ...data, technologies });
      toast.success('Interview session created successfully!');
      navigate(`/interview/${res.data.session._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create interview session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: '90px', paddingBottom: '60px' }}>
      <Navbar />

      <div className="container-narrow">
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/dashboard')}
            style={{ gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <span className="badge badge-accent">
            <Sparkles size={12} /> AI Interview Setup
          </span>
        </div>

        {/* Page Title */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '8px' }}>
            Configure Practice Interview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Customize the role, seniority level, question length, and tech stack for your practice session.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Target Role & Experience */}
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
                <Sliders size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Target Role & Parameters</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Define what role you are preparing for</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              {/* Target Role */}
              <div style={{ gridColumn: '1 / -1' }} className="form-group">
                <label className="form-label" htmlFor="setup-role">
                  Target Role Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  {...register('targetRole')}
                  className={`form-input ${errors.targetRole ? 'error' : ''}`}
                  placeholder="e.g. Frontend Developer, Backend Developer, Full-Stack Developer, Graphic Designer, Cybersecurity"S
                  id="setup-role"
                />
                {errors.targetRole && (
                  <span className="form-error">{errors.targetRole.message}</span>
                )}
              </div>

              {/* Experience Level */}
              <div className="form-group">
                <label className="form-label" htmlFor="setup-level">
                  Experience Level
                </label>
                <select {...register('experienceLevel')} className="form-select" id="setup-level">
                  <option value="fresher">Fresher / Graduate (0–1 yr)</option>
                  <option value="junior">Junior Engineer (1–3 yrs)</option>
                  <option value="mid">Mid-Level Engineer (3–6 yrs)</option>
                  <option value="senior">Senior / Lead (6+ yrs)</option>
                </select>
              </div>

              {/* Interview Type */}
              <div className="form-group">
                <label className="form-label" htmlFor="setup-type">
                  Interview Track
                </label>
                <select {...register('interviewType')} className="form-select" id="setup-type">
                  <option value="technical">Technical & Coding Architecture</option>
                  <option value="behavioral">Behavioral & Leadership</option>
                  <option value="hr">HR & Culture Fit</option>
                  <option value="mixed">Mixed (Technical + Behavioral)</option>
                </select>
              </div>

              {/* Difficulty */}
              <div className="form-group">
                <label className="form-label" htmlFor="setup-difficulty">
                  Difficulty Level
                </label>
                <select {...register('difficulty')} className="form-select" id="setup-difficulty">
                  <option value="easy">Easy (Fundamentals & Core Concepts)</option>
                  <option value="medium">Medium (Standard Production Questions)</option>
                  <option value="hard">Hard (Deep Dives & Complex Scenarios)</option>
                </select>
              </div>

              {/* Company Type */}
              <div className="form-group">
                <label className="form-label" htmlFor="setup-company">
                  Company Environment
                </label>
                <select {...register('companyType')} className="form-select" id="setup-company">
                  <option value="startup">High-Growth Startup</option>
                  <option value="product">Product-Based Tech Company</option>
                  <option value="service">Global Consulting / Service</option>
                  <option value="enterprise">Large Enterprise / Fortune 500</option>
                </select>
              </div>

              {/* Question Count */}
              <div className="form-group">
                <label className="form-label" htmlFor="setup-qcount">
                  Number of Questions (1–30)
                </label>
                <input
                  {...register('questionCount')}
                  type="number"
                  min={1}
                  max={30}
                  className={`form-input ${errors.questionCount ? 'error' : ''}`}
                  id="setup-qcount"
                />
                {errors.questionCount && (
                  <span className="form-error">{errors.questionCount.message}</span>
                )}
              </div>

              {/* Time Limit */}
              <div className="form-group">
                <label className="form-label" htmlFor="setup-time">
                  Time Limit (Minutes)
                </label>
                <input
                  {...register('timeLimitMinutes')}
                  type="number"
                  min={5}
                  max={120}
                  className={`form-input ${errors.timeLimitMinutes ? 'error' : ''}`}
                  id="setup-time"
                />
                {errors.timeLimitMinutes && (
                  <span className="form-error">{errors.timeLimitMinutes.message}</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Technologies & Skills */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
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
                <Code2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Technologies & Skills</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Add languages, libraries, frameworks, or database technologies
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTech(techInput);
                  }
                }}
                className="form-input"
                placeholder="e.g. Next.js, Redis, Kafka (press Enter)"
                id="setup-tech-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addTech(techInput)}
                aria-label="Add technology"
              >
                <Plus size={16} /> Add
              </button>
            </div>

            {/* Quick Suggestions */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Quick suggestions:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {TECH_SUGGESTIONS.filter((t) => !technologies.includes(t)).map((tech) => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => addTech(tech)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    + {tech}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Chips */}
            {technologies.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                {technologies.map((tech) => (
                  <span
                    key={tech}
                    className="badge badge-accent"
                    style={{ gap: '6px', fontSize: '13px', padding: '5px 10px' }}
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'inherit',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      aria-label={`Remove ${tech}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Optional Job Description & Adaptive Switch */}
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
                <FileText size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Customization & Intelligence</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Paste a company job description or enable intelligent follow-up questions
                </p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="setup-jd" required>
                Target Job Description (Optional)
              </label>
              <textarea
                {...register('jobDescription')}
                className="form-textarea"
                placeholder="Paste the job requirements, responsibilities, or tech stack here to make AI questions accurately align with the actual posting..."
                id="setup-jd"
                style={{ minHeight: '110px' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px',
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              <input
                type="checkbox"
                {...register('adaptiveEnabled')}
                id="setup-adaptive"
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: 'var(--accent)',
                  marginTop: '2px',
                  cursor: 'pointer',
                }}
              />
              <label htmlFor="setup-adaptive" style={{ cursor: 'pointer', flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Enable Adaptive Follow-up Probing
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  The AI interviewer will adapt successive questions dynamically based on how deep or concise your answers are.
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            id="setup-submit"
            style={{ justifyContent: 'center', fontSize: '16px' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                <span>Generating Personalized Interview...</span>
              </>
            ) : (
              <>
                <Zap size={18} />
                <span>Generate Questions & Launch Interview</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
