export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="border-2 border-black bg-white p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-accent text-black font-bold px-2 py-1 text-sm">01</span>
          <h1 className="font-bold text-xl uppercase tracking-wide">JEV RESUME ANALYZER</h1>
        </div>
        <div className="border-t-2 border-black mb-6"></div>
        <p className="text-text-secondary text-sm lowercase">
          analyze your resume against job descriptions. get a match score 0–100.
        </p>
      </div>
    </main>
  )
}
