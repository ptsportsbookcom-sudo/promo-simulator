import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold text-white mb-4">
          🎰 Promotions Simulation Platform
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Demo-ready promotion engine with explainable decisions
        </p>
        
        <div className="flex gap-6 justify-center">
          <Link
            href="/player"
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-lg font-semibold transition-colors shadow-lg"
          >
            🎮 Player View
          </Link>
          <Link
            href="/admin"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold transition-colors shadow-lg"
          >
            ⚙️ Admin Panel
          </Link>
        </div>

        <div className="mt-16 text-left max-w-2xl mx-auto bg-slate-800/50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-white mb-4">Features</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✅ 4 Promotion Types: Discovery, Multi-Game Chains, Opt-In Challenges, High-Range Outcomes</li>
            <li>✅ Deterministic & Explainable Engine</li>
            <li>✅ Ladder & Collection Mechanics</li>
            <li>✅ Caps, Cooldowns, and Filters</li>
            <li>✅ Real-time Event Simulation</li>
            <li>✅ Complete Admin CRUD Interface</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
