export const DELIVERY_RATES: Record<string, number> = {
  Sunyani: 55,
  Tamale: 60,
  Takoradi: 55,
  Accra: 45,
};

export const KUMASI_RATES = {
  CampusAndEnvirons: 20, // KNUST campus, Ayeduase, Ayigya, Bomso, Kotei
  Other: 35,
};

export interface DeliveryParams {
  region: string;
  kumasiSubArea?: 'CampusAndEnvirons' | 'Other';
}

export function calculateDeliveryCost(params: DeliveryParams): number | null {
  const { region, kumasiSubArea } = params;

  if (region === 'Kumasi') {
    if (kumasiSubArea === 'CampusAndEnvirons') {
      return KUMASI_RATES.CampusAndEnvirons;
    }
    return KUMASI_RATES.Other;
  }

  if (DELIVERY_RATES[region]) {
    return DELIVERY_RATES[region];
  }

  return null;
}
