import React, { Fragment, useState } from 'react';

type PortalListing = {
  portal: string;
  url: string;
  project_name?: string;
  title?: string;
  price?: string;
  currency?: string;
  area?: string;
  area_type?: string;
  location?: string;
};

type PropertyListing = {
  project_name?: string;
  property_type?: string;
  distance_from_coordinate?: string;
  portal_listings?: PortalListing[];
};

export default function PriceTable({ data, location, provider = "openai", onTokensUsed }: { data: PropertyListing[], location: string, provider?: string, onTokensUsed?: (tokens: any) => void }) {
  const [expandedUrls, setExpandedUrls] = useState<Record<string, boolean>>({});
  const [extractedListings, setExtractedListings] = useState<Record<string, PortalListing[]>>({});
  const [loadingListings, setLoadingListings] = useState<Record<string, boolean>>({});
  const [showListingsTable, setShowListingsTable] = useState<Record<string, boolean>>({});

  const toggleUrls = (projectName: string) => {
    setExpandedUrls(prev => ({ ...prev, [projectName]: !prev[projectName] }));
  };

  const handleExtractListings = async (projectName: string, portalListings: PortalListing[]) => {
    // If we already extracted them, just toggle the view
    if (extractedListings[projectName]) {
      setShowListingsTable(prev => ({ ...prev, [projectName]: !prev[projectName] }));
      return;
    }

    setLoadingListings(prev => ({ ...prev, [projectName]: true }));
    try {
      const res = await fetch("http://127.0.0.1:8000/extract-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          location: location,
          urls: portalListings.map(pl => ({ url: pl.url, portal: pl.portal })),
          provider: provider
        }),
      });

      if (!res.ok) throw new Error("Failed to extract listings");

      const data = await res.json();
      setExtractedListings(prev => ({ ...prev, [projectName]: data.listings }));
      setShowListingsTable(prev => ({ ...prev, [projectName]: true }));
      if (onTokensUsed && data.token_usage) {
        onTokensUsed(data.token_usage);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to extract listings for " + projectName);
    } finally {
      setLoadingListings(prev => ({ ...prev, [projectName]: false }));
    }
  };

  if (!data || data.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No listings found for this category.</div>;
  }

  // LLM already groups by project. 
  const groupedData = data.reduce((acc, row) => {
    const proj = row.project_name || "Unknown Project";
    if (!acc[proj]) acc[proj] = [];
    acc[proj].push(row);
    return acc;
  }, {} as Record<string, PropertyListing[]>);

  const formatUrl = (url?: string) => {
    if (!url) return "#";
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return "https://" + trimmed;
    }
    return trimmed;
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
        <thead className="bg-[#222636]/50 text-[#a78bfa] border-b border-[#334155]">
          <tr>
            <th className="px-4 py-3 font-medium">Project Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Distance</th>
            <th className="px-4 py-3 font-medium text-center">Listings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#334155]">
          {Object.entries(groupedData).map(([projectName, listings], groupIdx) => {
            const portalListings = listings[0]?.portal_listings || [];
            const hasUrls = portalListings.length > 0;
            const isLoading = loadingListings[projectName];
            const isShowingTable = showListingsTable[projectName];
            const extracted = extractedListings[projectName];

            return (
              <Fragment key={groupIdx}>
                <tr className="hover:bg-[#2a2e40] transition-colors bg-[#1e293b]/50">
                  <td className="px-4 py-3 align-top">
                    <div 
                      className="font-semibold text-gray-100 cursor-pointer flex items-center gap-2 hover:text-indigo-300 transition-colors"
                      onClick={() => toggleUrls(projectName)}
                      title="Click to view raw URLs"
                    >
                      {projectName || "N/A"}
                      {hasUrls && (
                        <span className="text-xs text-gray-500">
                          {expandedUrls[projectName] ? '▼' : '▶'}
                        </span>
                      )}
                    </div>
                    {/* Render Raw URLs dropdown here */}
                    {expandedUrls[projectName] && hasUrls && (
                      <div className="flex flex-col gap-1.5 mt-2 pl-2 border-l-2 border-[#38bdf8]/30">
                        {portalListings.map((pl, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 font-medium w-20 truncate">{pl.portal}</span>
                            <a
                              href={formatUrl(pl.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#38bdf8] hover:underline hover:text-[#7dd3fc] truncate max-w-[200px]"
                              title={pl.url}
                            >
                              - {formatUrl(pl.url)}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 align-top">
                    {listings[0]?.property_type || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-medium align-top">
                    {listings[0]?.distance_from_coordinate || "Distance Missing"}
                  </td>
                  <td className="px-4 py-3 text-center align-top">
                    {hasUrls ? (
                      <button
                        onClick={() => handleExtractListings(projectName, portalListings)}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#38bdf8] bg-[#0284c7]/20 border border-[#0284c7]/30 rounded-md hover:bg-[#0284c7]/40 transition-colors disabled:opacity-50 min-w-[100px]"
                      >
                        {isLoading ? (
                          <span className="animate-pulse">Loading...</span>
                        ) : isShowingTable ? '▼ Hide' : '📋 View'}
                      </button>
                    ) : (
                      <span className="text-gray-500 text-xs italic">No URLs</span>
                    )}
                  </td>
                </tr>
                
                {/* Nested Extracted Listings Table */}
                {isShowingTable && extracted && (
                  <tr>
                    <td colSpan={4} className="p-0 border-b border-[#334155]">
                      <div className="bg-[#0f172a] p-4 m-2 rounded-lg border border-[#334155] shadow-inner">
                        <div className="text-[#a78bfa] font-semibold text-sm mb-3 text-center border-b border-[#334155] pb-2">
                          📋 {projectName} Extracted Listings
                        </div>
                        {extracted.length === 0 ? (
                          <div className="text-center text-xs text-gray-500 italic py-2">
                            Could not extract any detailed listings for this project.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="text-gray-400 border-b border-[#334155]">
                                <tr>
                                  <th className="px-3 py-2 font-medium">Project Name</th>
                                  <th className="px-3 py-2 font-medium">Location</th>
                                  <th className="px-3 py-2 font-medium">Area</th>
                                  <th className="px-3 py-2 font-medium">Unit</th>
                                  <th className="px-3 py-2 font-medium">Price</th>
                                  <th className="px-3 py-2 font-medium text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1e293b]">
                                {extracted.map((pl, idx) => (
                                  <tr key={idx} className="hover:bg-[#1e293b]/60 transition-colors">
                                    <td className="px-3 py-2 text-gray-300 font-medium max-w-[150px] truncate" title={pl.project_name || projectName}>{pl.project_name || projectName}</td>
                                    <td className="px-3 py-2 text-gray-400 max-w-[150px] truncate" title={pl.location || location}>{pl.location || location}</td>
                                    <td className="px-3 py-2 text-gray-400">
                                      {pl.area ? `${pl.area} ${pl.area_type || ''}` : "N/A"}
                                    </td>
                                    <td className="px-3 py-2 text-gray-400 max-w-[150px] truncate" title={pl.title}>{pl.title || "N/A"}</td>
                                    <td className="px-3 py-2 text-emerald-400 font-medium">
                                      {(pl.currency || "") + (pl.price || "N/A")}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <a
                                        href={formatUrl(pl.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[#38bdf8] hover:text-[#7dd3fc] hover:underline"
                                      >
                                        🔗 Open
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
