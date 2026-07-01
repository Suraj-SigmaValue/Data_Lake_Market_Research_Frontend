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
};

type AnalyzeResponse = {
  location: string;
  openai_result: PipelineResult;
  groq_result: PipelineResult;
};

export default function Home() {
  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [trendResults, setTrendResults] = useState<{openai_trend: string, groq_trend: string} | null>(null);
  const [appreciationResults, setAppreciationResults] = useState<{openai_appreciation: string, groq_appreciation: string} | null>(null);
  const [analysisResults, setAnalysisResults] = useState<{openai_analysis: string, groq_analysis: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showOptions, setShowOptions] = useState(false);
  const [clickedOptions, setClickedOptions] = useState({
    pricePoint: false,
    trend: false,
    appreciation: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOptions(true);
    setResults(null);
    setTrendResults(null);
    setAppreciationResults(null);
    setAnalysisResults(null);
  };

  const runPricePoint = async () => {
    setClickedOptions(prev => ({ ...prev, pricePoint: true }));
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
    setClickedOptions(prev => ({ ...prev, trend: true }));
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
    setClickedOptions(prev => ({ ...prev, appreciation: true }));
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

  const renderCategoryTables = (categories: PropertyCategories) => {
    if (!categories) return null;
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏠 Residential Flats</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.residential} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏢 Office Spaces</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.office} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏬 Retail Shops</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.retail} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-200 font-medium mb-2 flex items-center gap-2">🏞️ Land / Plots</h3>
          <div className="bg-[#0f111a] rounded-lg overflow-hidden border border-[#334155]">
            <PriceTable data={categories.land} />
          </div>
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

      {/* Input Section */}
      <section className="max-w-3xl mx-auto bg-[#1a1d29] border border-[#334155] rounded-xl p-6 md:p-8 shadow-2xl mb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        
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

        {showOptions && (
          <div className="mt-8 flex flex-col gap-4 border-t border-[#334155] pt-6">
            <h3 className="text-lg font-medium text-gray-200 text-center mb-4">Select Insight Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={runPricePoint}
                disabled={loading}
                className={`py-3 px-4 rounded-lg font-medium transition-all flex justify-center items-center ${
                  clickedOptions.pricePoint 
                    ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                    : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "Price Point"
                )}
              </button>
              <button
                type="button"
                onClick={handleTrendClick}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  clickedOptions.trend 
                    ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                    : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                }`}
              >
                Price Trend Mircromarket
              </button>
              <button
                type="button"
                onClick={handleAppreciationClick}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  clickedOptions.appreciation 
                    ? "bg-[#6366f1] text-white border border-[#8b5cf6]" 
                    : "bg-[#222636] text-gray-300 border border-[#334155] hover:bg-[#2a2f42]"
                }`}
              >
                Appreciation Potential
              </button>
            </div>
            
            {allClicked && (
              <div className="mt-6 flex justify-center animate-in fade-in zoom-in duration-300">
                <button
                  type="button"
                  onClick={handleAnalysisClick}
                  className="w-full md:w-1/2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all"
                >
                  Analysis
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Error State */}
      {error && (
        <div className="max-w-3xl mx-auto mb-10 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Results Section (Dual Panel) */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto pb-20">
          
          {/* OpenAI Panel */}
          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#a78bfa]">
                <span>🤖</span> OpenAI Analysis (gpt-4o)
              </h2>
            </div>
            <div className="p-6 flex-1">
              <p className="text-gray-400 font-medium mb-3">Location Identification</p>
              {renderLocationInfo(results.openai_result.location_identification)}
              
              {renderCategoryTables(results.openai_result.property_categories)}
            </div>
          </div>

          {/* Groq Panel */}
          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#10b981]">
                <span>⚡</span> Groq + DDG Analysis (Llama-3.3-70b-versatile)
              </h2>
            </div>
            <div className="p-6 flex-1">
              <p className="text-gray-400 font-medium mb-3">Location Identification</p>
              {results.groq_result && renderLocationInfo(results.groq_result.location_identification)}
              
              {results.groq_result && renderCategoryTables(results.groq_result.property_categories)}
            </div>
          </div>

        </div>
      )}

      {/* Trend Results Section */}
      {trendResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto pb-20">
          
          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#a78bfa]">
                <span>🤖</span> OpenAI Trend Analysis
              </h2>
            </div>
            <div 
              className="p-6 flex-1 text-gray-300 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: trendResults.openai_trend }}
            />
          </div>

          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#10b981]">
                <span>⚡</span> Groq Trend Analysis
              </h2>
            </div>
            <div 
              className="p-6 flex-1 text-gray-300 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: trendResults.groq_trend }}
            />
          </div>

        </div>
      )}

      {/* Appreciation Results Section */}
      {appreciationResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto pb-20">
          
          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#a78bfa]">
                <span>🤖</span> OpenAI Appreciation Analysis
              </h2>
            </div>
            <div 
              className="p-6 flex-1 text-gray-300 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: appreciationResults.openai_appreciation }}
            />
          </div>

          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#10b981]">
                <span>⚡</span> Groq Appreciation Analysis
              </h2>
            </div>
            <div 
              className="p-6 flex-1 text-gray-300 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: appreciationResults.groq_appreciation }}
            />
          </div>

        </div>
      )}

      {/* Final Analysis Results Section */}
      {analysisResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1800px] mx-auto pb-20">
          
          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#a78bfa]">
                <span>🤖</span> OpenAI Final Analysis
              </h2>
            </div>
            <div 
              className="p-6 flex-1 text-gray-300 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: analysisResults.openai_analysis }}
            />
          </div>

          <div className="bg-[#1a1d29] border border-[#334155] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-[#334155] bg-gradient-to-r from-[#1a1d29] to-[#222636]">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[#10b981]">
                <span>⚡</span> Groq Final Analysis
              </h2>
            </div>
            <div 
              className="p-6 flex-1 text-gray-300 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: analysisResults.groq_analysis }}
            />
          </div>

        </div>
      )}
    </main>
  );
}
