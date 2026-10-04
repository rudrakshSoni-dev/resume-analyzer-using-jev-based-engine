import React from 'react';

export function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="bg-[#FFC107] text-black font-bold px-2 py-0.5 text-sm uppercase">
          {num}
        </span>
        <h2 className="uppercase font-bold tracking-widest text-black m-0">{title}</h2>
      </div>
      <div className="w-full h-[2px] bg-black"></div>
    </div>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border-2 border-black p-6 ${className}`}>
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const baseStyle = "border-2 border-black font-bold uppercase tracking-wider px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-white text-black hover:bg-gray-100",
  };
  
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full border-2 border-black bg-white p-3 font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FFC107] placeholder-gray-500"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full border-2 border-black bg-white p-3 font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FFC107] placeholder-gray-500 min-h-[150px]"
      {...props}
    />
  );
}

export function ScoreCallout({ score }: { score: number }) {
  return (
    <div className="bg-[#FFC107] border-2 border-black p-8 text-center">
      <div className="text-sm font-bold uppercase tracking-widest mb-2 text-black">JEV Score</div>
      <div className="text-6xl font-bold text-black">{score}/100</div>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <div className="text-red-600 text-sm font-bold lowercase mt-1">{children}</div>;
}

export function Caption({ children }: { children: React.ReactNode }) {
  return <div className="text-gray-500 text-sm lowercase mt-1">{children}</div>;
}

interface ScoreBreakdownProps {
  items: {
    label: string;
    score: number;
    maxScore?: number;
    highlight?: boolean;
    details?: React.ReactNode;
  }[];
}

export function ScoreBreakdown({ items }: ScoreBreakdownProps) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => (
        <div 
          key={i} 
          className={`border-2 border-black p-4 ${item.highlight ? 'bg-[#FFC107]/10' : 'bg-white'}`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold uppercase tracking-wider text-black">
              {item.highlight && <span className="bg-[#FFC107] text-black px-1 mr-2 text-xs">TOP</span>}
              {item.label}
            </span>
            <span className="font-bold text-black">
              {item.score}{item.maxScore ? `/${item.maxScore}` : ''}
            </span>
          </div>
          {item.highlight ? (
            <div className="w-full h-3 border-2 border-black bg-white relative">
              <div 
                className="absolute top-0 left-0 h-full bg-black" 
                style={{ width: `${item.maxScore ? (item.score / item.maxScore) * 100 : item.score}%` }}
              ></div>
            </div>
          ) : (
            <div className="w-full h-3 border-2 border-black bg-white relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gray-300" 
                style={{ width: `${item.maxScore ? (item.score / item.maxScore) * 100 : item.score}%` }}
              ></div>
            </div>
          )}
          {item.details && (
            <div className="mt-3 text-sm border-t-2 border-black border-dashed pt-3">
              {item.details}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
