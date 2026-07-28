'use client';

import { useState, useEffect } from 'react';
import { Download, Search as SearchIcon, FilterX, LoaderIcon } from 'lucide-react';
import CandidateCard from '@/components/CandidateCard';

export default function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [workMode, setWorkMode] = useState('');
  
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Lists for dropdown options (naive extraction for MVP from full database)
  const [uniqueIndustries, setUniqueIndustries] = useState<string[]>([]);
  const [uniqueExperiences, setUniqueExperiences] = useState<string[]>([]);
  const [uniqueWorkModes, setUniqueWorkModes] = useState<string[]>([]);

  // Fetch unique criteria on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/candidates')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        setUniqueIndustries(Array.from(new Set(data.map(c => c.primary_industry).filter(Boolean))));
        setUniqueExperiences(Array.from(new Set(data.map(c => c.experience_level).filter(Boolean))));
        setUniqueWorkModes(Array.from(new Set(data.map(c => c.work_mode).filter(Boolean))));
      })
      .catch(console.error);
  }, []);

  // Fetch filtered candidates when rules change
  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (industry) params.append('industry', industry);
      if (experience) params.append('experience', experience);
      if (workMode) params.append('work_mode', workMode);

      try {
        const response = await fetch(`http://localhost:8000/api/candidates?${params.toString()}`);
        const data = await response.json();
        setCandidates(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    // Add small debounce timeout for text typing
    const timeoutId = setTimeout(() => {
      fetchFiltered();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [keyword, industry, experience, workMode]);


  const clearFilters = () => {
    setKeyword('');
    setIndustry('');
    setExperience('');
    setWorkMode('');
  };

  const downloadCSV = () => {
    if (candidates.length === 0) return;
    
    const headers = ['ID', 'Name', 'Role', 'Primary Industry', 'Experience Level', 'Work Mode', 'Skills'];
    const csvContent = [
      headers.join(','),
      ...candidates.map(c => 
        `"${c.id}","${c.name}","${c.role}","${c.primary_industry}","${c.experience_level}","${c.work_mode}","${(c.skills || []).join('; ')}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `candidates_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Smart Candidate Discovery</h1>
        <button onClick={downloadCSV} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#48bb78' }} disabled={candidates.length === 0 || loading}>
           <Download size={16} /> Download CSV
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          
          <div style={{ position: 'relative' }}>
             <SearchIcon size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
             <input 
               type="text" 
               placeholder="Search skills, tools, or keywords within resumes..." 
               className="input"
               style={{ paddingLeft: '3rem', fontSize: '1rem' }}
               value={keyword}
               onChange={(e) => setKeyword(e.target.value)}
             />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">All Industries</option>
              {uniqueIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>
            
            <select className="input" value={experience} onChange={(e) => setExperience(e.target.value)}>
              <option value="">All Experience Levels</option>
              {uniqueExperiences.map(exp => <option key={exp} value={exp}>{exp}</option>)}
            </select>

            <select className="input" value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
              <option value="">All Work Modes</option>
              {uniqueWorkModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>

            {(keyword || industry || experience || workMode) && (
              <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#e53e3e', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <FilterX size={16} /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Showing {candidates.length} candidate{candidates.length === 1 ? '' : 's'}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
             <LoaderIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
             <p>Querying intelligence database...</p>
          </div>
        ) : candidates.length > 0 ? (
          candidates.map(candidate => (
            <CandidateCard key={candidate.id} candidate={{
              id: candidate.id,
              name: candidate.name,
              role: candidate.role,
              industry: candidate.primary_industry,
              experience: candidate.experience_level,
              workMode: candidate.work_mode,
              resumeText: candidate.resume_text,
              skills: candidate.skills
            }} 
            onDelete={(id) => setCandidates(prev => prev.filter(c => c.id !== id))}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <SearchIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 500 }}>No candidates found matching your criteria</h3>
            <p>Try adjusting your search filters or keyword.</p>
          </div>
        )}
      </div>
    </div>
  );
}
