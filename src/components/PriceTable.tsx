import React, { Fragment } from 'react';

type PropertyListing = {
  project_name?: string;
  property_type?: string;
  listing_type?: string;
  
  // Flat properties (Old structure)
  total_price?: string;
  area?: string;
  area_unit?: string;
  area_basis?: string;
  calculated_rate?: string;
  rate_unit?: string;
  portal?: string;
  url?: string;
  distance_from_coordinate?: string;

  // Nested properties (New structure)
  average_project_rate?: string;
  transactions?: {
    total_price?: string;
    area?: string;
    area_unit?: string;
    area_basis?: string;
    calculated_rate?: string;
    normalized_net_carpet_rate?: string;
    url?: string;
    portal?: string;
  }[];
};

export default function PriceTable({ data }: { data: PropertyListing[] }) {
  if (!data || data.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No listings found for this category.</div>;
  }

  // In the new structure, LLM already groups by project. 
  // We handle both flat and pre-grouped structures seamlessly.
  const groupedData = data.reduce((acc, row) => {
    const proj = row.project_name || "Unknown Project";
    if (!acc[proj]) acc[proj] = [];
    acc[proj].push(row);
    return acc;
  }, {} as Record<string, PropertyListing[]>);

  const parseRate = (rateStr?: string) => {
    if (!rateStr) return 0;
    const num = parseFloat(rateStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const parseArea = (areaStr?: string) => {
    if (!areaStr) return 0;
    const num = parseFloat(areaStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const getCarpetArea = (area: number, basis?: string) => {
    if (!basis) return area;
    const b = basis.toLowerCase();
    if (b.includes("super")) return area * 0.7; // Super built-up roughly 70%
    if (b.includes("built")) return area * 0.85; // Built-up roughly 85%
    return area; // Net carpet / carpet area
  };

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
            <th className="px-4 py-3 font-medium">Total Price</th>
            <th className="px-4 py-3 font-medium">Net Carpet Area</th>
            <th className="px-4 py-3 font-medium">Rate</th>
            <th className="px-4 py-3 font-medium">Distance</th>
            <th className="px-4 py-3 font-medium">Portal / URL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#334155]">
          {Object.entries(groupedData).map(([projectName, listings], groupIdx) => {
            
            // Extract all flat items AND nested transactions into a unified flat list
            const allTransactions: any[] = [];
            let avgProjectRateStr = "";
            let rootDistance = "";
            let rootRateUnit = "";
            let rootPortal = "";
            let rootUrl = "";
            
            listings.forEach(listing => {
              if (listing.average_project_rate) avgProjectRateStr = listing.average_project_rate;
              if (listing.distance_from_coordinate) rootDistance = listing.distance_from_coordinate;
              if (listing.rate_unit) rootRateUnit = listing.rate_unit;
              if (listing.portal) rootPortal = listing.portal;
              if (listing.url) rootUrl = listing.url;

              if (listing.transactions && listing.transactions.length > 0) {
                // Nested format
                listing.transactions.forEach(t => allTransactions.push(t));
              } else {
                // Flat format
                allTransactions.push(listing);
              }
            });

            const hasMultiple = allTransactions.length > 1;
            let avgRate = parseRate(avgProjectRateStr);
            let rateUnit = rootRateUnit || listings[0]?.rate_unit || "";

            if (hasMultiple) {
              let totalRate = 0;
              let totalArea = 0;
              let validAreaCount = 0;
              let validRateCount = 0;

              allTransactions.forEach(item => {
                const r = parseRate(item.normalized_net_carpet_rate || item.calculated_rate);
                if (r > 0) {
                  totalRate += r;
                  validRateCount++;
                }
                const a = parseArea(item.area);
                if (a > 0) {
                  totalArea += getCarpetArea(a, item.area_basis);
                  validAreaCount++;
                }
              });

              // If LLM didn't provide an average, we calculate it
              if (avgRate === 0 && validRateCount > 0) {
                avgRate = totalRate / validRateCount;
              }
              
              let avgArea = 0;
              if (validAreaCount > 0) {
                avgArea = totalArea / validAreaCount;
              }
              
              // Get unique sources
              const uniqueSources: { portal: string, url: string }[] = [];
              const seenUrls = new Set<string>();
              allTransactions.forEach(l => {
                const link = l.url || rootUrl;
                if (link && !seenUrls.has(link)) {
                  seenUrls.add(link);
                  uniqueSources.push({ portal: l.portal || rootPortal || "Link", url: link });
                }
              });

              return (
                <tr key={groupIdx} className="hover:bg-[#2a2e40] transition-colors bg-[#1e293b]/50">
                  <td className="px-4 py-3 font-semibold text-gray-100">{projectName || "N/A"}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {listings[0]?.property_type || "N/A"} <span className="text-xs text-gray-400 font-medium">({allTransactions.length} listings)</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 italic">Varies</td>
                  <td className="px-4 py-3 text-gray-300">
                    {avgArea > 0 ? `${Math.round(avgArea).toLocaleString()} sqft` : "Varies"}
                    <div className="text-xs text-gray-400 font-normal mt-1">(Est. Avg Carpet Area)</div>
                  </td>
                  <td className="px-4 py-3 text-[#10b981] font-bold">
                    {Math.round(avgRate).toLocaleString()} {rateUnit} <span className="text-xs font-normal text-gray-400">(Avg)</span>
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-medium">
                    {rootDistance || listings[0]?.distance_from_coordinate || "Distance Missing"}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] flex flex-wrap gap-1">
                    {uniqueSources.length > 0 ? (
                      uniqueSources.map((s, i) => (
                        <a
                          key={i}
                          href={formatUrl(s.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[#818cf8] bg-[#6366f1]/10 border border-[#6366f1]/20 rounded hover:bg-[#6366f1]/20 transition-colors"
                        >
                          🔗 {s.portal}
                        </a>
                      ))
                    ) : (
                      <span className="text-gray-400 text-xs italic">No Links</span>
                    )}
                  </td>
                </tr>
              );
            }

            // Single listing case
            const row = allTransactions[0];
            const singleLink = row?.url || rootUrl;
            return (
              <tr key={groupIdx} className="hover:bg-[#2a2e40] transition-colors">
                <td className="px-4 py-3 font-semibold text-gray-100">{projectName || "N/A"}</td>
                <td className="px-4 py-3 text-gray-300">
                  {listings[0]?.property_type || "N/A"} <span className="text-xs text-gray-500">({listings[0]?.listing_type || "N/A"})</span>
                </td>
                <td className="px-4 py-3 text-[#10b981] font-medium">{row?.total_price || "N/A"}</td>
                <td className="px-4 py-3 text-gray-300">
                  {row?.area ? `${row?.area} ${row?.area_unit}` : "N/A"}
                  <div className="text-xs text-[#a78bfa] font-medium mt-1">
                    {row?.area_basis || "Net Carpet Area"}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {avgProjectRateStr ? `${avgProjectRateStr} ${rateUnit}` : (row?.normalized_net_carpet_rate || row?.calculated_rate ? `${row?.normalized_net_carpet_rate || row?.calculated_rate} ${rateUnit}` : "N/A")}
                </td>
                <td className="px-4 py-3 text-amber-400 font-medium">
                  {rootDistance || listings[0]?.distance_from_coordinate || "Distance Missing"}
                </td>
                <td className="px-4 py-3">
                  {singleLink ? (
                    <a
                      href={formatUrl(singleLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#818cf8] bg-[#6366f1]/10 border border-[#6366f1]/20 rounded hover:bg-[#6366f1]/20 transition-colors"
                    >
                      🔗 {row?.portal || rootPortal || "View"}
                    </a>
                  ) : (
                    <span className="text-gray-500 text-xs">{row?.portal || rootPortal || "N/A"}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
