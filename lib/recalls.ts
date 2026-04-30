export interface Recall {
  NHTSACampaignNumber: string;
  Component: string;
  Summary: string;
  Consequence: string;
  Remedy: string;
  ReportReceivedDate: string;
  ParkIt: boolean;
  ParkOutSide: boolean;
}

interface NhtsaResult {
  NHTSACampaignNumber?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  ReportReceivedDate?: string;
  parkIt?: boolean;
  parkOutSide?: boolean;
}

export const fetchRecalls = async (
  make: string,
  model: string,
  year: number
): Promise<Recall[]> => {
  try {
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
    const response = await fetch(url);
    const data = await response.json();
    const results: NhtsaResult[] = data.results ?? [];
    return results.map((r) => ({
      NHTSACampaignNumber: r.NHTSACampaignNumber ?? '',
      Component: r.Component ?? '',
      Summary: r.Summary ?? '',
      Consequence: r.Consequence ?? '',
      Remedy: r.Remedy ?? '',
      ReportReceivedDate: r.ReportReceivedDate ?? '',
      ParkIt: r.parkIt ?? false,
      ParkOutSide: r.parkOutSide ?? false,
    }));
  } catch (e) {
    console.error('Failed to fetch recalls:', e);
    return [];
  }
};
