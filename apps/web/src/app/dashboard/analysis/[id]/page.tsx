'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AnalysisDetailDto } from '@jev/shared';
import { SectionLabel, Panel, ScoreCallout, ScoreBreakdown, Button } from '@/components/ui';

export default function AnalysisResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalysis(id as string)
      .then(res => setAnalysis(res.analysis))
      .catch(err => setError(err.message || 'Analysis not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 font-mono lowercase">loading...</div>;
  
  if (error || !analysis) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold uppercase mb-4">Error</h2>
        <p className="text-red-600 mb-8 font-mono lowercase">{error}</p>
        <Button onClick={() => router.push('/dashboard')}>BACK TO DASHBOARD</Button>
      </div>
    );
  }

  const { jobDescription, resume, breakdown } = analysis;

  // Determine top scorer to highlight
  const scores = [
    { key: 'skills', score: breakdown.skills.score, max: 100 },
    { key: 'experience', score: breakdown.experience.score, max: 100 },
    { key: 'relevance', score: breakdown.relevance.score, max: 100 },
    { key: 'education', score: breakdown.education.score, max: 100 },
  ];
  
  const maxScore = Math.max(...scores.map(s => s.score));
  
  const breakdownItems = [
    {
      label: 'Skills Match',
      score: breakdown.skills.score,
      maxScore: 100,
      highlight: breakdown.skills.score === maxScore && maxScore > 0,
      details: (
        <div className="space-y-2">
          <div className="flex gap-2 items-start">
            <span className="font-bold shrink-0">FOUND:</span>
            <span className="text-green-700">{breakdown.skills.matchedSkills.join(', ') || 'none'}</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="font-bold shrink-0">MISSING:</span>
            <span className="text-red-700">{breakdown.skills.missingSkills.join(', ') || 'none'}</span>
          </div>
        </div>
      )
    },
    {
      label: 'Experience',
      score: breakdown.experience.score,
      maxScore: 100,
      highlight: breakdown.experience.score === maxScore && maxScore > 0,
      details: (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block font-bold mb-1">REQUIRED</span>
            <div className="lowercase">Years: {breakdown.experience.requiredYears ?? 'any'}</div>
            <div className="lowercase">Level: {breakdown.experience.requiredSeniority ?? 'any'}</div>
          </div>
          <div>
            <span className="block font-bold mb-1">DETECTED</span>
            <div className="lowercase">Years: {breakdown.experience.extractedYears ?? 'unknown'}</div>
            <div className="lowercase">Level: {breakdown.experience.detectedSeniority ?? 'unknown'}</div>
          </div>
        </div>
      )
    },
    {
      label: 'Domain Relevance',
      score: breakdown.relevance.score,
      maxScore: 100,
      highlight: breakdown.relevance.score === maxScore && maxScore > 0,
      details: (
        <div>
          <span className="font-bold">KEYWORDS: </span>
          <span>{breakdown.relevance.matchedKeywords.join(', ') || 'none'}</span>
        </div>
      )
    },
    {
      label: 'Education',
      score: breakdown.education.score,
      maxScore: 100,
      highlight: breakdown.education.score === maxScore && maxScore > 0,
      details: (
        <div>
          <div className="lowercase mb-1"><span className="font-bold uppercase">Required:</span> {breakdown.education.requiredDegree ?? 'none'}</div>
          <div className="lowercase"><span className="font-bold uppercase">Found:</span> {breakdown.education.detectedDegrees.join(', ') || 'none'}</div>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-bold uppercase tracking-wider hover:underline flex items-center gap-2">
          <span>← BACK TO DASHBOARD</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-6">
          <ScoreCallout score={analysis.score} />
          
          <Panel>
            <div className="font-bold uppercase mb-2 border-b-2 border-black pb-2">Target Role</div>
            <div className="text-xl font-bold">{jobDescription.title}</div>
            {jobDescription.company && (
              <div className="text-gray-600 lowercase mt-1">{jobDescription.company}</div>
            )}
            
            <div className="font-bold uppercase mt-6 mb-2 border-b-2 border-black pb-2">Resume</div>
            <div className="lowercase break-all">{resume.filename}</div>
            <div className="text-xs text-gray-500 mt-1">
              uploaded {new Date(resume.createdAt).toLocaleDateString()}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <SectionLabel num="DETAILS" title="Scoring Breakdown" />
          <ScoreBreakdown items={breakdownItems} />
        </div>
      </div>
    </div>
  );
}
