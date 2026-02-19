'use client'
import Link from 'next/link'

export default function MethodPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-white mb-3">How ForecastIQ Works</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            A plain-English guide to the method behind the predictions — and how to use the app.
          </p>
        </div>

        {/* Section 1: The Big Idea */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">1</div>
            <h2 className="text-xl font-bold text-white">The Big Idea</h2>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 text-slate-300 leading-relaxed">
            <p>
              Most people predict things by gut feeling. They read the news, form an opinion, and say "I think X will happen." The problem is that gut feelings are often wrong — and we rarely keep score.
            </p>
            <p>
              ForecastIQ uses a method developed by <span className="text-white font-medium">Philip Tetlock</span>, a professor who spent 20 years studying thousands of predictions made by experts and ordinary people. His finding? <span className="text-yellow-400 font-medium">Most experts are barely better than random chance</span> — but a small group of "superforecasters" could consistently beat the odds.
            </p>
            <p>
              What made superforecasters different wasn't insider knowledge. It was their <span className="text-white font-medium">process</span>. This app follows that process.
            </p>
          </div>
        </section>

        {/* Section 2: The Two Views */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">2</div>
            <h2 className="text-xl font-bold text-white">Two Views, One Number</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-5">
              <div className="text-cyan-400 font-bold text-lg mb-2">📐 Outside View</div>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                Start by forgetting everything specific about the situation. Instead ask: <span className="text-white italic">"How often does this type of thing happen in general?"</span>
              </p>
              <div className="bg-slate-900/60 rounded-lg p-3 text-xs text-slate-400">
                <span className="text-cyan-400 font-medium">Example:</span> Before predicting whether a specific government will call a snap election, ask: historically, how often do governments call snap elections? The answer is about 18% of the time per year. That's your starting point.
              </div>
            </div>
            <div className="bg-purple-950/30 border border-purple-900/40 rounded-xl p-5">
              <div className="text-purple-400 font-bold text-lg mb-2">🔍 Inside View</div>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                Now bring in the specifics. What's actually happening in this case right now? The app searches current news and scores 6 key factors.
              </p>
              <div className="bg-slate-900/60 rounded-lg p-3 text-xs text-slate-400">
                <span className="text-purple-400 font-medium">Example:</span> For that same government — how stable is it? What's the economic situation? What are experts saying? What does the media narrative look like? Each factor gets scored from the news.
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm text-slate-400 mb-4 text-center">The two views are combined using this formula:</div>
            <div className="font-mono text-sm text-slate-300 bg-slate-800 rounded-lg p-4 text-center mb-4">
              Final % = <span className="text-cyan-400">(Outside View × 1)</span> + <span className="text-purple-400">(Factor₁ × w₁) + (Factor₂ × w₂) + …</span><br/>
              <span className="text-slate-500 text-xs mt-2 block">÷ (number of inside factors + 1)</span>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-4 text-xs text-slate-400 space-y-2">
              <div className="text-white font-medium mb-2">Example with 6 inside factors:</div>
              <div><span className="text-cyan-400">Outside view (base rate):</span> 45% × 1 = 45.00</div>
              <div><span className="text-purple-400">Factor 1 (Polling, 20% weight):</span> 70% × 0.20 = 14.00</div>
              <div><span className="text-purple-400">Factor 2 (Stability, 20%):</span> 60% × 0.20 = 12.00</div>
              <div className="text-slate-600">… + 4 more factors …</div>
              <div className="border-t border-slate-700 pt-2 text-white">Sum ÷ 7 (6 factors + 1) = <span className="text-green-400 font-bold">Final Probability</span></div>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">The outside view always counts as one full term. Each inside factor is weighted by how important it is.</p>
          </div>
        </section>

        {/* Section 3: The 6 Factors */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">3</div>
            <h2 className="text-xl font-bold text-white">The 6 Factors (Inside View)</h2>
          </div>
          <p className="text-slate-400 mb-5 leading-relaxed">For political forecasts, the app automatically searches the news and scores these six factors. Each has a weight showing how much it matters. <span className="text-white">You can customise these weights</span> in the Weights page.</p>
          <div className="space-y-3">
            {[
              { icon: '📊', name: 'Polling & Public Sentiment', weight: '20%', desc: 'What do polls, surveys, and approval ratings say? High poll numbers = positive signal.' },
              { icon: '🏛️', name: 'Political Stability & Leadership', weight: '20%', desc: 'Is the government stable? Is there opposition pressure, protests, or a strong incumbent? Stability is a powerful predictor.' },
              { icon: '🌍', name: 'Geopolitical & External Pressure', weight: '20%', desc: 'What are foreign governments, international bodies, or external actors doing? Sanctions, diplomacy, or proxy interference all shift probabilities.' },
              { icon: '💰', name: 'Economic Indicators & Coercion', weight: '15%', desc: 'GDP growth, inflation, unemployment, and trade pressure. Economic pain often precedes political change.' },
              { icon: '🎯', name: 'Expert Consensus & Prediction Markets', weight: '15%', desc: 'What are analysts, think tanks, and prediction markets saying? Aggregated expert opinion is a strong signal.' },
              { icon: '📰', name: 'Media Narrative & Information Environment', weight: '10%', desc: 'How is the media framing the story? Is the narrative turning positive or negative? Propaganda and disinformation are also factored in.' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-2xl shrink-0">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{f.name}</span>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{f.weight} default</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Source Credibility */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">4</div>
            <h2 className="text-xl font-bold text-white">Not All News Is Equal</h2>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-300 leading-relaxed mb-5">The app assigns a credibility score to every news source it finds. A Reuters article counts more than a random blog. This prevents low-quality sources from skewing the result.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { tier: 'Tier 1', weight: '1.00×', color: 'text-green-400 bg-green-900/20 border-green-900/40', examples: 'Reuters, AP, BBC, NYT, FT' },
                { tier: 'Tier 2', weight: '0.85×', color: 'text-blue-400 bg-blue-900/20 border-blue-900/40', examples: 'CNN, Bloomberg, Politico, WSJ' },
                { tier: 'Tier 3', weight: '0.65×', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-900/40', examples: 'Established regional outlets' },
                { tier: 'Tier 4', weight: '0.50×', color: 'text-slate-400 bg-slate-800 border-slate-700', examples: 'Unknown / blogs' },
              ].map(t => (
                <div key={t.tier} className={`rounded-lg border p-3 text-center ${t.color}`}>
                  <div className="font-bold text-sm mb-1">{t.tier}</div>
                  <div className="font-mono text-lg font-bold mb-1">{t.weight}</div>
                  <div className="text-xs text-slate-500">{t.examples}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Brier Score */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">5</div>
            <h2 className="text-xl font-bold text-white">Keeping Score — The Brier Score</h2>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <p className="text-slate-300 leading-relaxed">
              The point of forecasting is to <span className="text-white font-medium">get better over time</span>. ForecastIQ tracks your accuracy using the <span className="text-white font-medium">Brier Score</span> — the standard measure used by forecasting researchers.
            </p>
            <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-center">
              <span className="text-slate-400">Brier Score = </span>
              <span className="text-white">(your probability − actual outcome)²</span>
            </div>
            <div className="text-sm text-slate-400 leading-relaxed">
              <span className="text-white font-medium">Example:</span> You said there was a 70% chance (0.70) of an event. It happened (outcome = 1).<br/>
              Brier = (0.70 − 1.00)² = 0.09 → <span className="text-green-400">Very Good!</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[
                { range: '< 0.10', label: '🏆 Superforecaster', color: 'text-green-400', bg: 'bg-green-900/20 border-green-900/40' },
                { range: '0.10–0.20', label: '✅ Very Good', color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-900/40' },
                { range: '0.20–0.25', label: '⚖️ Average', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-900/40' },
                { range: '0.50', label: '🎲 Random Guess', color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' },
              ].map(s => (
                <div key={s.range} className={`rounded-lg border p-3 text-center ${s.bg}`}>
                  <div className={`font-mono font-bold text-sm mb-1 ${s.color}`}>{s.range}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6: How to Use */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">→</div>
            <h2 className="text-xl font-bold text-white">How to Use ForecastIQ</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                step: '1', color: 'bg-blue-600',
                title: 'Enter a username',
                desc: 'No password needed. Just pick a username on the homepage to start tracking your forecasts and building your accuracy score over time.',
              },
              {
                step: '2', color: 'bg-blue-600',
                title: 'Ask a clear, resolvable question',
                desc: 'Good forecast questions have a definite YES or NO answer by a specific date. Example: "Will X happen before December 2026?" Bad: "Will things get better?"',
              },
              {
                step: '3', color: 'bg-blue-600',
                title: 'Choose Political Forecasts or Sports',
                desc: 'Political mode automatically searches current news and scores 6 factors. Sports mode lets you manually score 6 factors with sliders.',
              },
              {
                step: '4', color: 'bg-blue-600',
                title: 'Set the news window (political only)',
                desc: 'Choose how many days back to search for news — from 7 days (very current) to 90 days (longer trend). Default is 14 days.',
              },
              {
                step: '5', color: 'bg-blue-600',
                title: 'Watch the live calculation',
                desc: 'The centre panel streams every step in real-time — searching news, scoring factors, applying weights, calculating the blend. You can see exactly how the number was reached.',
              },
              {
                step: '6', color: 'bg-blue-600',
                title: 'Review the result and evidence',
                desc: 'The right panel shows your final probability, the outside view base rate, and an evidence trail. Click "View Dataset" to see the academic sources behind the base rate.',
              },
              {
                step: '7', color: 'bg-blue-600',
                title: 'Customise your weights (optional)',
                desc: 'Go to Weights to adjust how much each factor matters. If you think polling matters more than media sentiment for a particular type of question, adjust accordingly.',
              },
              {
                step: '8', color: 'bg-green-600',
                title: 'Resolve and build your score',
                desc: 'When the event happens (or doesn\'t), go to History or Profile and mark the outcome YES or NO. Your Brier score updates automatically. Over time, you\'ll see how well-calibrated you are.',
              },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className={`w-8 h-8 ${s.color} rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5`}>{s.step}</div>
                <div>
                  <div className="text-white font-semibold mb-1">{s.title}</div>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 7: Tips */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">💡</div>
            <h2 className="text-xl font-bold text-white">Tips for Better Forecasts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { tip: 'Don\'t ignore the base rate', detail: 'Many people jump straight to "but this situation is different." Start with the base rate first, then adjust.' },
              { tip: 'Use specific numbers', detail: 'Say 63%, not "probably." Vague language hides bad thinking. Exact numbers force you to commit.' },
              { tip: 'Update when new information arrives', detail: 'Run the forecast again with a fresh news window as events evolve. Small updates beat big flip-flops.' },
              { tip: 'Resolve your forecasts', detail: 'Your Brier score only improves if you mark outcomes. Don\'t forecast and forget — close the loop.' },
              { tip: 'Compare with the community', detail: 'Check the Community page to see how others have forecasted the same type of question. Learn from superforecasters.' },
              { tip: 'Customise weights for your domain', detail: 'If you\'re an expert in economics, weight the economic indicator factor higher. Your domain knowledge should be reflected in your weights.' },
            ].map((t, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-yellow-400 font-medium text-sm mb-1">→ {t.tip}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{t.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-900/40 rounded-2xl p-8">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="text-xl font-bold text-white mb-2">Ready to make your first forecast?</h3>
          <p className="text-slate-400 mb-5 text-sm">It takes less than a minute. Pick a question, run the model, see the result.</p>
          <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition text-sm">
            Start Forecasting →
          </Link>
        </div>

        <div className="mt-8 text-center text-xs text-slate-600">
          Method based on Tetlock & Gardner, <em>Superforecasting: The Art and Science of Prediction</em> (2015) · Good Judgment Project · IARPA ACE Tournament
        </div>
      </div>
    </div>
  )
}
