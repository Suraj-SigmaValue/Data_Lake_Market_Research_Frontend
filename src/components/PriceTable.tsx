"use client";
import React, { Fragment, useState, useRef } from 'react';

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

// ── per-project streaming state ───────────────────────────────────────────────
type StreamState = {
  status: "idle" | "streaming" | "done" | "error";
  statusMessage: string;
  progress: { found: number; target: number; urlIndex: number; totalUrls: number };
  listings: PortalListing[];
};

const INITIAL_STREAM: StreamState = {
  status: "idle",
  statusMessage: "",
  progress: { found: 0, target: 5, urlIndex: 0, totalUrls: 0 },
  listings: [],
};

export default function PriceTable({
  data,
  location,
  provider = "openai",
  onTokensUsed,
}: {
  data: PropertyListing[];
  location: string;
  provider?: string;
  onTokensUsed?: (tokens: any) => void;
}) {
  const [expandedUrls, setExpandedUrls] = useState<Record<string, boolean>>({});
  const [showListingsTable, setShowListingsTable] = useState<Record<string, boolean>>({});
  // Streaming state per project
  const [streams, setStreams] = useState<Record<string, StreamState>>({});
  // Ref to abort controllers so we can cancel in-flight streams
  const abortRefs = useRef<Record<string, AbortController>>({});

  const setStream = (projectName: string, updater: (prev: StreamState) => StreamState) => {
    setStreams(prev => ({
      ...prev,
      [projectName]: updater(prev[projectName] ?? { ...INITIAL_STREAM }),
    }));
  };

  const toggleUrls = (projectName: string) => {
    setExpandedUrls(prev => ({ ...prev, [projectName]: !prev[projectName] }));
  };

  // ── Main streaming handler ──────────────────────────────────────────────────
  const handleExtractListings = async (
    projectName: string,
    portalListings: PortalListing[],
    propertyType: string,
  ) => {
    const stream = streams[projectName];

    // Toggle visibility if already done
    if (stream?.status === "done") {
      setShowListingsTable(prev => ({ ...prev, [projectName]: !prev[projectName] }));
      return;
    }

    // Cancel any existing stream for this project
    if (abortRefs.current[projectName]) {
      abortRefs.current[projectName].abort();
    }

    const controller = new AbortController();
    abortRefs.current[projectName] = controller;

    // Reset state and show table
    setStream(projectName, () => ({
      ...INITIAL_STREAM,
      status: "streaming",
      statusMessage: "Connecting…",
    }));
    setShowListingsTable(prev => ({ ...prev, [projectName]: true }));

    try {
      const res = await fetch("http://127.0.0.1:8000/extract-listings-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          project_name: projectName,
          location,
          urls: portalListings.map(pl => ({ url: pl.url, portal: pl.portal })),
          provider,
          property_type: propertyType,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // SSE parser loop
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by double newlines
        const frames = buffer.split(/\n\n/);
        buffer = frames.pop() ?? ""; // keep incomplete frame

        for (const frame of frames) {
          if (!frame.trim()) continue;

          // Parse "event: xxx\ndata: {...}"
          const eventMatch = frame.match(/^event:\s*(\S+)/m);
          const dataMatch = frame.match(/^data:\s*(.+)$/m);
          if (!dataMatch) continue;

          const eventType = eventMatch?.[1] ?? "message";
          let payload: any = {};
          try { payload = JSON.parse(dataMatch[1]); } catch { continue; }

          switch (eventType) {
            case "status":
              setStream(projectName, prev => ({
                ...prev,
                statusMessage: payload.message ?? "",
                progress: {
                  found: payload.found_so_far ?? prev.progress.found,
                  target: payload.target ?? prev.progress.target,
                  urlIndex: payload.url_index ?? prev.progress.urlIndex,
                  totalUrls: payload.total_urls ?? prev.progress.totalUrls,
                },
              }));
              break;

            case "listing":
              setStream(projectName, prev => ({
                ...prev,
                listings: [...prev.listings, payload.listing],
                progress: {
                  ...prev.progress,
                  found: payload.found_so_far ?? prev.progress.found,
                },
              }));
              break;

            case "tokens":
              // Backend sends running total; do not add to cumulative yet to avoid triangular counting.
              break;

            case "error":
              // Non-fatal — just log to status
              setStream(projectName, prev => ({
                ...prev,
                statusMessage: `⚠ ${payload.message}`,
              }));
              break;

            case "done":
              setStream(projectName, prev => ({
                ...prev,
                status: "done",
                statusMessage: payload.message ?? "Complete",
                progress: { ...prev.progress, found: payload.total_found ?? prev.progress.found },
              }));
              if (onTokensUsed && payload.token_usage) onTokensUsed(payload.token_usage);
              break;
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return; // user cancelled — silent
      setStream(projectName, prev => ({
        ...prev,
        status: "error",
        statusMessage: err?.message ?? "Unknown error",
      }));
    }
  };

  if (!data || data.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No listings found for this category.</div>;
  }

  const groupedData = data.reduce((acc, row) => {
    const proj = row.project_name || "Unknown Project";
    if (!acc[proj]) acc[proj] = [];
    acc[proj].push(row);
    return acc;
  }, {} as Record<string, PropertyListing[]>);

  const formatUrl = (url?: string) => {
    if (!url) return "#";
    const t = url.trim();
    return t.startsWith("http://") || t.startsWith("https://") ? t : "https://" + t;
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
            const stream = streams[projectName] ?? INITIAL_STREAM;
            const isStreaming = stream.status === "streaming";
            const isDone = stream.status === "done";
            const isShowingTable = showListingsTable[projectName];
            const { found, target, urlIndex, totalUrls } = stream.progress;
            const progressPct = totalUrls > 0 ? Math.round((urlIndex / totalUrls) * 100) : 0;

            return (
              <Fragment key={groupIdx}>
                {/* ── Project row ── */}
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

                    {/* Raw URL dropdown */}
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
                  <td className="px-4 py-3 text-gray-300 align-top">{listings[0]?.property_type || "N/A"}</td>
                  <td className="px-4 py-3 text-amber-400 font-medium align-top">
                    {listings[0]?.distance_from_coordinate || "Distance Missing"}
                  </td>
                  <td className="px-4 py-3 text-center align-top">
                    {hasUrls ? (
                      <button
                        onClick={() => handleExtractListings(projectName, portalListings, listings[0]?.property_type || "Property")}
                        disabled={isStreaming}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors min-w-[100px] disabled:opacity-60
                          ${isStreaming
                            ? "text-amber-300 bg-amber-500/10 border-amber-500/30 cursor-wait"
                            : isDone
                              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "text-[#38bdf8] bg-[#0284c7]/20 border-[#0284c7]/30 hover:bg-[#0284c7]/40"
                          }`}
                      >
                        {isStreaming ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            {found}/{target}
                          </span>
                        ) : isDone && isShowingTable ? (
                          `▼ Hide (${stream.listings.length})`
                        ) : isDone ? (
                          `📋 View (${stream.listings.length})`
                        ) : (
                          "📋 View"
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-500 text-xs italic">No URLs</span>
                    )}
                  </td>
                </tr>

                {/* ── Streaming progress + listings panel ── */}
                {isShowingTable && (stream.status !== "idle") && (
                  <tr>
                    <td colSpan={4} className="p-0 border-b border-[#334155]">
                      <div className="bg-[#0f172a] p-4 m-2 rounded-lg border border-[#334155] shadow-inner">

                        {/* Header */}
                        <div className="text-[#a78bfa] font-semibold text-sm mb-3 text-center border-b border-[#334155] pb-2">
                          📋 {projectName} — Extracted Listings
                        </div>

                        {/* Progress bar (visible while streaming) */}
                        {isStreaming && (
                          <div className="mb-3 space-y-1">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span className="truncate max-w-[80%]">{stream.statusMessage}</span>
                              <span className="shrink-0 ml-2 text-amber-400 font-mono">
                                {urlIndex}/{totalUrls} URLs · {found}/{target} found
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(progressPct, 4)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Done message when nothing found */}
                        {isDone && stream.listings.length === 0 && (
                          <div className="text-center text-xs text-gray-500 italic py-2">
                            {stream.statusMessage || "Could not extract any detailed listings for this project."}
                          </div>
                        )}

                        {/* Error state */}
                        {stream.status === "error" && (
                          <div className="text-center text-xs text-red-400 py-2">
                            ⚠ {stream.statusMessage}
                          </div>
                        )}

                        {/* Listings table — rows appear one by one as they stream in */}
                        {stream.listings.length > 0 && (
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
                                {stream.listings.map((pl, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-[#1e293b]/60 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300"
                                  >
                                    <td className="px-3 py-2 text-gray-300 font-medium max-w-[150px] truncate" title={pl.project_name || projectName}>
                                      {pl.project_name || projectName}
                                    </td>
                                    <td className="px-3 py-2 text-gray-400 max-w-[150px] truncate" title={pl.location || location}>
                                      {pl.location || location}
                                    </td>
                                    <td className="px-3 py-2 text-gray-400">
                                      {pl.area ? `${pl.area} ${pl.area_type || ""}`.trim() : "N/A"}
                                    </td>
                                    <td className="px-3 py-2 text-gray-400 max-w-[150px] truncate" title={pl.title}>
                                      {pl.title || "N/A"}
                                    </td>
                                    <td className="px-3 py-2 text-emerald-400 font-medium">
                                      {pl.currency ? `${pl.currency} ` : "₹ "}{pl.price || "N/A"}
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

                                {/* Live "searching…" skeleton row while streaming */}
                                {isStreaming && (
                                  <tr className="animate-pulse">
                                    {[...Array(6)].map((_, i) => (
                                      <td key={i} className="px-3 py-2">
                                        <div className="h-3 bg-[#1e293b] rounded w-3/4" />
                                      </td>
                                    ))}
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Done status footer */}
                        {isDone && stream.listings.length > 0 && (
                          <div className="mt-2 text-center text-xs text-gray-500">
                            {stream.statusMessage}
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
