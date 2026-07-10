"use client";

import { useState } from "react";
import PriceTable from "@/components/PriceTable";

type LocationIdentification = {
  latitude: string;
  longitude: string;
  identified_location: string;
  nearest_locality: string;
  sector_or_area: string;
  micro_market: string;
  city: string;
  state: string;
  country: string;
};

type PropertyCategories = {
  residential: any[];
  office: any[];
  retail: any[];
  land: any[];
};

type PipelineResult = {
  location: string;
  location_identification: LocationIdentification;
  property_categories: PropertyCategories;
  error_message?: string;
};

type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  call_count?: number;
};

type AnalyzeResponse = {
  location: string;
  openai_result: PipelineResult;
  groq_result: PipelineResult;
  openai_tokens: TokenUsage;
  groq_tokens: TokenUsage;
};

export default function Home() {
  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [trendResults, setTrendResults] = useState<{openai_trend: string, groq_trend: string, openai_tokens: TokenUsage, groq_tokens: TokenUsage} | null>(null);
  const [appreciationResults, setAppreciationResults] = useState<{openai_appreciation: string, groq_appreciation: string, openai_tokens: TokenUsage, groq_tokens: TokenUsage} | null>(null);
  const [analysisResults, setAnalysisResults] = useState<{openai_analysis: string, groq_analysis: string, openai_tokens: TokenUsage, groq_tokens: TokenUsage} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showOptions, setShowOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<"pricePoint" | "trend" | "appreciation" | "analysis" | null>(null);
  const [extractionTokens, setExtractionTokens] = useState<Record<string, TokenUsage>>({
    openai: { input_tokens: 0, output_tokens: 0, total_tokens: 0, call_count: 0 },
    groq: { input_tokens: 0, output_tokens: 0, total_tokens: 0, call_count: 0 }
  });
  const [clickedOptions, setClickedOptions] = useState({
    pricePoint: false,
    trend: false,
    appreciation: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOptions(true);
    setActiveTab(null);
    setResults(null);
    setTrendResults(null);
    setAppreciationResults(null);
    setAnalysisResults(null);
  };

  const runPricePoint = async () => {
    setActiveTab("pricePoint");
    setClickedOptions(prev => ({ ...prev, pricePoint: true }));
    if (results) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to fetch analysis");
      
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrendClick = async () => {
    setActiveTab("trend");
    setClickedOptions(prev => ({ ...prev, trend: true }));
    if (trendResults) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to fetch trend analysis");
      
      const data = await res.json();
      setTrendResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppreciationClick = async () => {
    setActiveTab("appreciation");
    setClickedOptions(prev => ({ ...prev, appreciation: true }));
    if (appreciationResults) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/appreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to fetch appreciation potential");
      
      const data = await res.json();
      setAppreciationResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisClick = async () => {
    setActiveTab("analysis");
    if (analysisResults) return;

    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      price_point_data: results ? results : {},
      trend_data: trendResults ? trendResults : {},
      appreciation_data: appreciationResults ? appreciationResults : {},
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/final-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to fetch final analysis");
      
      const data = await res.json();
      setAnalysisResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const allClicked = clickedOptions.pricePoint && clickedOptions.trend && clickedOptions.appreciation;

  const renderLocationInfo = (loc: LocationIdentification) => {
    return (
      <div className="grid grid-cols-2 gap-4 text-sm bg-[#222636]/50 p-4 rounded-lg border border-[#334155] mb-6">
        <div><span className="text-gray-400">Location:</span> <span className="text-gray-100">{loc?.identified_location || "N/A"}</span></div>
        <div><span className="text-gray-400">Micro Market:</span> <span className="text-gray-100">{loc?.micro_market || "N/A"}</span></div>
        <div><span className="text-gray-400">Locality:</span> <span className="text-gray-100">{loc?.nearest_locality || "N/A"}</span></div>
        <div><span className="text-gray-400">City/State:</span> <span className="text-gray-100">{loc?.city}, {loc?.state}</span></div>
      </div>
    );
  };

  const renderCategoryTables = (categories: PropertyCategories, provider: "openai" | "groq" = "openai") => {
    if (!categories) return null;
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏠 Residential Flats</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.residential} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleTokensUsed(t, provider)} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏢 Office Spaces</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.office} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleTokensUsed(t, provider)} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏬 Retail/Shops</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.retail} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleTokensUsed(t, provider)} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏞️ Land / Plots</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.land} location={results?.location || ""} provider={provider} onTokensUsed={(t) => handleTokensUsed(t, provider)} />
          </div>
        </div>
      </div>
    );
  };

  const getCumulativeTokens = (provider: "openai" | "groq") => {
    let input = 0, output = 0, total = 0, calls = 0;
    
    if (results) {
      const t = provider === "openai" ? results.openai_tokens : results.groq_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    if (trendResults) {
      const t = provider === "openai" ? trendResults.openai_tokens : trendResults.groq_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    if (appreciationResults) {
      const t = provider === "openai" ? appreciationResults.openai_tokens : appreciationResults.groq_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    if (analysisResults) {
      const t = provider === "openai" ? analysisResults.openai_tokens : analysisResults.groq_tokens;
      if (t) { input += t.input_tokens; output += t.output_tokens; total += t.total_tokens; calls += (t.call_count || 1); }
    }
    
    // Add extraction tokens
    if (extractionTokens && extractionTokens[provider]) {
      input += extractionTokens[provider].input_tokens; 
      output += extractionTokens[provider].output_tokens; 
      total += extractionTokens[provider].total_tokens; 
      calls += extractionTokens[provider].call_count;
    }
    
    return { input_tokens: input, output_tokens: output, total_tokens: total, call_count: calls };
  };

  const handleTokensUsed = (tokens: TokenUsage, provider: "openai" | "groq") => {
    setExtractionTokens(prev => ({
      ...prev,
      [provider]: {
        input_tokens: prev[provider].input_tokens + tokens.input_tokens,
        output_tokens: prev[provider].output_tokens + tokens.output_tokens,
        total_tokens: prev[provider].total_tokens + tokens.total_tokens,
        call_count: prev[provider].call_count + (tokens.call_count || 1)
      }
    }));
  };

  const renderTokenUsage = (current: TokenUsage | undefined, provider: "openai" | "groq") => {
    if (!current) return null;
    const cumulative = getCumulativeTokens(provider);
    return (
      <div className="mt-4 p-3 bg-[#11131c] border border-[#334155] rounded-lg text-xs font-mono text-gray-400 shadow-inner">
        <div className="flex justify-between border-b border-[#334155] pb-2 mb-2">
          <span>Current Section:</span>
          <span className="text-[#3b82f6]">IN: {current.input_tokens} | OUT: {current.output_tokens} | TOT: {current.total_tokens} | CALLS: {current.call_count || 1}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Cumulative:</span>
          <span className="text-[#10b981]">IN: {cumulative.input_tokens} | OUT: {cumulative.output_tokens} | TOT: {cumulative.total_tokens} | CALLS: {cumulative.call_count}</span>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0f111a] text-gray-100 font-sans p-6 md:p-10 selection:bg-[#6366f1] selection:text-white">
      {/* Header */}
      <header className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-3">
          Data Lake Market Research
        </h1>
        <p className="text-gray-400 text-lg">4-Stage Pipeline via OpenAI & Bedrock</p>
      </header>
         {/* Input & Results Section */}
      <section className={`mx-auto bg-[#1a1d29] border border-[#334155] rounded-xl p-6 md:p-8 shadow-2xl mb-12 relative overflow-hidden transition-all duration-500 ${showOptions ? 'w-full max-w-[1800px]' : 'max-w-3xl'}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        
        <div className={showOptions ? "max-w-3xl mx-auto mb-8" : ""}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="latitude" className="text-sm font-medium text-gray-400">
                  Latitude (Box 1)
                </label>
                <input
                  id="latitude"
                  type="text"
                  required
                  placeholder="e.g. 18.602"
                  className="bg-[#222636] border border-[#334155] rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="longitude" className="text-sm font-medium text-gray-400">
                  Longitude (Box 2)
                </label>
                <input
                  id="longitude"
                  type="text"
                  required
                  placeholder="e.g. 73.757"
                  className="bg-[#222636] border border-[#334155] rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="location" className="text-sm font-medium text-gray-400">
                Location (Box 3)
              </label>
              <input
                id="location"
                type="text"
                required
                placeholder="e.g. Wakad, Pune"
                className="bg-[#222636] border border-[#334155] rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            
            {!showOptions && (
              <button
                type="submit"
                className="mt-2 w-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-semibold py-3.5 rounded-lg shadow-lg hover:shadow-[#6366f1]/25 hover:opacity-95 transition-all"
              >
                Generate Insights
              </button>
            )}
          </form>
        </div>

        {showOptions && (
          <div className="mt-8 border-t border-[#334155] pt-8">
            <div className="flex flex-col lg:flex-row gap-6 w-full">
              
              {/* Left Panel (10%) */}
              <div className="w-full lg:w-[15%] xl:w-[12%] flex flex-col gap-3 shrink-0">
                <h3 className="text-sm uppercase tracking-wider font-semibold text-gray-400 mb-2">Options</h3>
                <button
                  type="button"
                  onClick={runPricePoint}
                  disabled={loading && !results}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex justify-center items-center text-center ${
                    activeTab === "pricePoint"
                      ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                      : clickedOptions.pricePoint 
                        ? "bg-[#2a2f42] text-[#8b5cf6] border border-[#334155] hover:bg-[#32384f]"
                        : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                  } ${loading && !results && activeTab === "pricePoint" ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  Price Point
                </button>
                <button
                  type="button"
                  onClick={handleTrendClick}
                  disabled={loading && !trendResults}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex justify-center items-center text-center ${
                    activeTab === "trend"
                      ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                      : clickedOptions.trend
                        ? "bg-[#2a2f42] text-[#8b5cf6] border border-[#334155] hover:bg-[#32384f]"
                        : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                  } ${loading && !trendResults && activeTab === "trend" ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  Price Trend Mircromarket
                </button>
                <button
                  type="button"
                  onClick={handleAppreciationClick}
                  disabled={loading && !appreciationResults}
                  className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex justify-center items-center text-center ${
                    activeTab === "appreciation"
                      ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                      : clickedOptions.appreciation
                        ? "bg-[#2a2f42] text-[#8b5cf6] border border-[#334155] hover:bg-[#32384f]"
                        : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                  } ${loading && !appreciationResults && activeTab === "appreciation" ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  Appreciation Potential
                </button>

                {allClicked && (
                  <div className="mt-4 animate-in fade-in zoom-in duration-300">
                    <button
                      type="button"
                      onClick={handleAnalysisClick}
                      disabled={loading && !analysisResults}
                      className={`w-full py-3 px-3 rounded-lg text-sm font-bold transition-all flex justify-center items-center text-center shadow-lg ${
                        activeTab === "analysis"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20"
                          : analysisResults
                            ? "bg-[#2a2f42] text-teal-400 border border-[#334155] hover:bg-[#32384f]"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 text-gray-200 hover:opacity-90 shadow-emerald-500/10"
                      }`}
                    >
                      Analysis
                    </button>
                  </div>
                )}
              </div>
              
              {/* Right Panels Container */}
              <div className="flex-1 flex flex-col lg:flex-row gap-6 min-w-0">
                
                {/* OpenAI Column (45%) */}
                <div className="flex-1 flex flex-col gap-6 min-w-0 w-full lg:w-1/2">
                  <h3 className="text-xl font-semibold text-center text-[#a78bfa] mb-2 bg-[#1a1d29] py-2 rounded-lg border border-[#334155]">
                    🤖 OpenAI Results
                  </h3>
                  
                  {activeTab === "pricePoint" && results && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Price Point</h4>
                      </div>
                      <div className="p-4 flex-1">
                        {results.openai_result.error_message ? (
                          <div className="text-red-400 text-sm font-medium p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            {results.openai_result.error_message}
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-400 text-sm font-medium mb-3">Location Identification</p>
                            {renderLocationInfo(results.openai_result.location_identification)}
                            {renderCategoryTables(results.openai_result.property_categories, "openai")}
                          </>
                        )}
                        {renderTokenUsage(results.openai_tokens, "openai")}
                      </div>
                    </div>
                  )}

                  {activeTab === "trend" && trendResults && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Trend Analysis</h4>
                      </div>
                      <div className="p-4 flex-1 prose prose-invert max-w-none text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: trendResults.openai_trend }} />
                        {renderTokenUsage(trendResults.openai_tokens, "openai")}
                      </div>
                    </div>
                  )}

                  {activeTab === "appreciation" && appreciationResults && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Appreciation Analysis</h4>
                      </div>
                      <div className="p-4 flex-1 prose prose-invert max-w-none text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: appreciationResults.openai_appreciation }} />
                        {renderTokenUsage(appreciationResults.openai_tokens, "openai")}
                      </div>
                    </div>
                  )}

                  {activeTab === "analysis" && analysisResults && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Final Analysis</h4>
                      </div>
                      <div className="p-4 flex-1 prose prose-invert max-w-none text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: analysisResults.openai_analysis }} />
                        {renderTokenUsage(analysisResults.openai_tokens, "openai")}
                      </div>
                    </div>
                  )}
                </div>

                {/* Groq Column (45%) */}
                <div className="flex-1 flex flex-col gap-6 min-w-0 w-full lg:w-1/2">
                  <h3 className="text-xl font-semibold text-center text-[#10b981] mb-2 bg-[#1a1d29] py-2 rounded-lg border border-[#334155]">
                    ⚡ Groq
                  </h3>
                  
                  {activeTab === "pricePoint" && results && results.groq_result && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Price Point</h4>
                      </div>
                      <div className="p-4 flex-1">
                        {results.groq_result.error_message ? (
                          <div className="text-red-400 text-sm font-medium p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            {results.groq_result.error_message}
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-400 text-sm font-medium mb-3">Location Identification</p>
                            {renderLocationInfo(results.groq_result.location_identification)}
                            {renderCategoryTables(results.groq_result.property_categories, "groq")}
                          </>
                        )}
                        {renderTokenUsage(results.groq_tokens, "groq")}
                      </div>
                    </div>
                  )}

                  {activeTab === "trend" && trendResults && trendResults.groq_trend && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Trend Analysis</h4>
                      </div>
                      <div className="p-4 flex-1 prose prose-invert max-w-none text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: trendResults.groq_trend }} />
                        {renderTokenUsage(trendResults.groq_tokens, "groq")}
                      </div>
                    </div>
                  )}

                  {activeTab === "appreciation" && appreciationResults && appreciationResults.groq_appreciation && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Appreciation Analysis</h4>
                      </div>
                      <div className="p-4 flex-1 prose prose-invert max-w-none text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: appreciationResults.groq_appreciation }} />
                        {renderTokenUsage(appreciationResults.groq_tokens, "groq")}
                      </div>
                    </div>
                  )}

                  {activeTab === "analysis" && analysisResults && analysisResults.groq_analysis && (
                    <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
                      <div className="p-4 border-b border-[#334155] bg-[#222636]">
                        <h4 className="text-md font-semibold text-gray-200">Final Analysis</h4>
                      </div>
                      <div className="p-4 flex-1 prose prose-invert max-w-none text-gray-300">
                        <div dangerouslySetInnerHTML={{ __html: analysisResults.groq_analysis }} />
                        {renderTokenUsage(analysisResults.groq_tokens, "groq")}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </section>

      {/* Error State */}
      {error && (
        <div className="max-w-3xl mx-auto mb-10 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center">
          {error}
        </div>
      )}
    </main>
  );
}
