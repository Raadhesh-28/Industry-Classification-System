'use client';

import { Users, Briefcase, Laptop, Building2 } from 'lucide-react';
import TopCard from '@/components/TopCard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/candidates')
      .then(res => res.json())
      .then(data => {
        setCandidates(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const totalCandidates = candidates.length;
  const seniorProfiles = candidates.filter(c => c.experience_level && c.experience_level.includes('Senior')).length;
  const remoteReady = candidates.filter(c => c.work_mode === 'Remote' || c.work_mode === 'Hybrid').length;
  const uniqueIndustries = new Set(candidates.map(c => c.primary_industry).filter(Boolean)).size;

  // Process data for charts
  const industryCounts: Record<string, number> = {};
  candidates.forEach(c => {
    if (c.primary_industry) {
      industryCounts[c.primary_industry] = (industryCounts[c.primary_industry] || 0) + 1;
    }
  });
  
  const pieData = Object.keys(industryCounts).map(key => ({
    name: key, value: industryCounts[key]
  })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5

  const expCounts: Record<string, number> = {};
  candidates.forEach(c => {
    if (c.experience_level) {
      let label = 'Entry';
      if (c.experience_level.includes('Mid')) label = 'Mid';
      if (c.experience_level.includes('Senior')) label = 'Senior';
      if (c.experience_level.includes('Executive')) label = 'Exec';
      expCounts[label] = (expCounts[label] || 0) + 1;
    }
  });
  
  const barData = Object.keys(expCounts).map(key => ({
    name: key, count: expCounts[key]
  }));

  const COLORS = ['#3178c6', '#48bb78', '#ecc94b', '#ed8936', '#9f7aea', '#ed64a6'];

  if (loading) {
    return <div>Loading live Dashboard datastream...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Talent Intelligence Dashboard</h1>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <TopCard title="Total Candidates" value={totalCandidates.toLocaleString()} icon={<Users />} />
        <TopCard title="Senior Profiles" value={seniorProfiles} icon={<Briefcase />} />
        <TopCard title="Remote Ready" value={remoteReady} icon={<Laptop />} />
        <TopCard title="Industries" value={uniqueIndustries} icon={<Building2 />} />
      </div>

      {/* Charts Section */}
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          Talent Analytics
        </h2>
        
        <div style={{ display: 'flex', gap: '2rem', height: '350px' }}>
          
          {/* Pie Chart */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500 }}>
              Top 5 Industries
            </h3>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {pieData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}`, 'Candidates']} />
                    <Legend iconType="circle" />
                  </PieChart>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data to display</div>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vertical Divider */}
          <div style={{ width: '1px', backgroundColor: 'var(--border)' }} />

          {/* Bar Chart */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500 }}>
              Experience Level
            </h3>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {barData.length > 0 ? (
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="count" fill="var(--primary)" barSize={40} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data to display</div>
                )}
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
