'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { ResumeDto, AnalysisListItemDto } from '@jev/shared';
import { SectionLabel, Panel, Button, Input, Textarea, ErrorText, Caption } from '@/components/ui';

export default function DashboardPage() {
  const router = useRouter();
  
  // State
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [history, setHistory] = useState<AnalysisListItemDto[]>([]);
  
  // Form state
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resRes, histRes] = await Promise.all([
          api.listResumes(),
          api.listAnalyses()
        ]);
        setResumes(resRes.resumes);
        setHistory(histRes.analyses);
      } catch (e) {
        console.error(e);
      } finally {
        setInitialLoad(false);
      }
    }
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('file size must be under 5MB');
        setFile(null);
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      setSelectedResumeId('new'); // switch to new file mode
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);

    try {
      let finalResumeId = selectedResumeId;

      // 1. Upload resume if new
      if (selectedResumeId === 'new' || !selectedResumeId) {
        if (!file) throw new Error('Please select a resume file');
        const { resume } = await api.uploadResume(file);
        finalResumeId = resume.id;
      }

      if (!finalResumeId) throw new Error('Please select a resume');
      if (!jobTitle) throw new Error('Please enter a job title');
      if (!jobDescription) throw new Error('Please enter a job description');

      // 2. Create job description
      const { job } = await api.createJob({
        title: jobTitle,
        company: company || undefined,
        description: jobDescription,
      });

      // 3. Create analysis
      const { id } = await api.createAnalysis({
        resumeId: finalResumeId,
        jobDescriptionId: job.id,
      });

      // 4. Redirect to result
      router.push(`/dashboard/analysis/${id}`);
      
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err.message || 'An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  if (initialLoad) return <div className="p-8 font-mono lowercase">loading...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-12">
        {/* Step 1: Resume */}
        <section>
          <SectionLabel num="01" title="Your Resume" />
          <Panel>
            <div className="space-y-4">
              {resumes.length > 0 && (
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Select existing</label>
                  <select 
                    className="w-full border-2 border-black bg-white p-3 font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FFC107]"
                    value={selectedResumeId}
                    onChange={(e) => {
                      setSelectedResumeId(e.target.value);
                      if (e.target.value !== 'new') setFile(null);
                    }}
                  >
                    <option value="" disabled>-- choose a resume --</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.filename}</option>
                    ))}
                    <option value="new">-- upload new --</option>
                  </select>
                </div>
              )}
              
              {(!resumes.length || selectedResumeId === 'new' || !selectedResumeId) && (
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Upload new (PDF only)</label>
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="w-full border-2 border-black bg-white p-2 font-mono"
                  />
                  <Caption>max size: 5mb.</Caption>
                </div>
              )}
            </div>
          </Panel>
        </section>

        {/* Step 2: Job Description */}
        <section>
          <SectionLabel num="02" title="Job Description" />
          <Panel>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase mb-1">Job Title</label>
                  <Input 
                    placeholder="e.g. Frontend Engineer" 
                    value={jobTitle} 
                    onChange={e => setJobTitle(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-1">Company (Optional)</label>
                  <Input 
                    placeholder="e.g. Acme Corp" 
                    value={company} 
                    onChange={e => setCompany(e.target.value)} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold uppercase mb-1">Full Description</label>
                <Textarea 
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  className="min-h-[250px]"
                />
              </div>
            </div>
          </Panel>
        </section>

        {/* Action */}
        <div className="pt-4 border-t-2 border-black border-dashed">
          {error && <div className="mb-4"><ErrorText>{error}</ErrorText></div>}
          <Button 
            className="w-full text-lg py-4" 
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? 'ANALYZING...' : 'ANALYZE MATCH'}
          </Button>
        </div>
      </div>

      {/* History Sidebar */}
      <div>
        <SectionLabel num="03" title="History" />
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="p-4 border-2 border-black border-dashed text-gray-500 lowercase text-sm">
              no past analyses found.
            </div>
          ) : (
            history.map(item => (
              <Link key={item.id} href={`/dashboard/analysis/${item.id}`} className="block">
                <Panel className="hover:bg-[#FFC107]/10 transition-colors cursor-pointer !p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold uppercase text-black line-clamp-1" title={item.jobDescription.title}>
                      {item.jobDescription.title}
                    </div>
                    <div className="font-bold bg-black text-white px-2 py-0.5 text-xs">
                      {item.score}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 lowercase mb-1">
                    {item.jobDescription.company || 'unknown company'}
                  </div>
                  <div className="text-xs text-gray-400 lowercase truncate">
                    resume: {item.resume.filename}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 text-right">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </Panel>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
