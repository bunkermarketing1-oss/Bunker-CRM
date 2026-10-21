export interface CampaignAdCreative {
  id: string;
  name: string;
  status: string;
  headline: string;
  body: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  isVideo: boolean;
  callToAction: string | null;
  linkUrl: string | null;
  creativeId: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
}

export interface CampaignAdsResponse {
  success: boolean;
  campaign?: {
    id: string;
    name: string;
    platform: string;
    status: string;
    budget: number | null;
    spent: number;
    conversions: number;
  };
  ads?: CampaignAdCreative[];
  error?: string;
}
