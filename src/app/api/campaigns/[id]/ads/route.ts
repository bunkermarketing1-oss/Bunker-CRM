import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { countMetaConversions, META_GRAPH_VERSION } from "@/lib/integrations/meta";
import { CampaignAdCreative, CampaignAdsResponse } from "@/types/campaigns";

export const dynamic = "force-dynamic";

interface MetaInsight {
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

interface MetaAdCreative {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_id?: string;
  call_to_action_type?: string;
  object_story_spec?: {
    video_data?: {
      video_id?: string;
      image_url?: string;
      message?: string;
      call_to_action?: {
        type?: string;
        value?: { link?: string };
      };
    };
    link_data?: {
      name?: string;
      title?: string;
      message?: string;
      image_url?: string;
      link?: string;
      call_to_action?: {
        type?: string;
      };
    };
  };
}

interface MetaAdNode {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  creative?: MetaAdCreative;
  insights?: {
    data?: MetaInsight[];
  };
}


interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId: user!.organizationId,
      },
      include: {
        connectedAccount: {
          select: {
            id: true,
            accountName: true,
            externalId: true,
            accountType: true,
            accessTokenEnc: true,
            clientId: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaña no encontrada en su organización." },
        { status: 404 }
      );
    }

    // Aislamiento multi-tenant para usuarios del portal
    if (user!.isClientUser && campaign.connectedAccount?.clientId !== user!.clientId) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado a campañas de otra empresa." },
        { status: 403 }
      );
    }

    if (!campaign.externalId || !campaign.connectedAccount?.accessTokenEnc) {
      return NextResponse.json({
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          status: campaign.status,
          budget: campaign.budget,
          spent: campaign.spent,
          conversions: campaign.conversions,
        },
        ads: [],
      });
    }

    const token = decryptSecret(campaign.connectedAccount.accessTokenEnc);

    // Consulta los anuncios y creativos asociados a la campaña en Meta Marketing API
    const fields = [
      "id",
      "name",
      "status",
      "effective_status",
      "creative{id,name,title,body,image_url,thumbnail_url,video_id,call_to_action_type,object_story_spec,effective_object_story_id}",
      "insights{spend,impressions,reach,clicks,actions}",
    ].join(",");

    const metaRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${campaign.externalId}/ads?fields=${fields}&limit=50&access_token=${token}`,
      { cache: "no-store", signal: AbortSignal.timeout(12000) }
    );

    const metaJson = await metaRes.json().catch(() => ({}));
    const rawAds: MetaAdNode[] = Array.isArray(metaJson?.data) ? metaJson.data : [];

    const ads = rawAds.map((ad) => {
      const cr = ad.creative || {};
      const oss = cr.object_story_spec || {};
      const videoData = oss.video_data || {};
      const linkData = oss.link_data || {};

      const isVideo = Boolean(cr.video_id || videoData.video_id);
      const imageUrl =
        videoData.image_url ||
        linkData.image_url ||
        cr.image_url ||
        cr.thumbnail_url ||
        null;
      const thumbnailUrl =
        videoData.image_url ||
        linkData.image_url ||
        cr.image_url ||
        cr.thumbnail_url ||
        null;

      const headline =
        cr.title ||
        linkData.name ||
        linkData.title ||
        cr.name ||
        ad.name;

      const body =
        cr.body ||
        videoData.message ||
        linkData.message ||
        "";

      const cta =
        cr.call_to_action_type ||
        videoData.call_to_action?.type ||
        linkData.call_to_action?.type ||
        null;

      const linkUrl =
        videoData.call_to_action?.value?.link ||
        linkData.link ||
        null;

      const insight = Array.isArray(ad.insights?.data) ? ad.insights.data[0] : null;
      const spend = insight?.spend ? parseFloat(insight.spend) : 0;
      const impressions = insight?.impressions ? parseInt(insight.impressions, 10) : 0;
      const clicks = insight?.clicks ? parseInt(insight.clicks, 10) : 0;
      const leads = insight?.actions ? countMetaConversions(insight.actions) : 0;

      return {
        id: ad.id,
        name: ad.name,
        status: (ad.effective_status || ad.status || "ACTIVE").toLowerCase(),
        headline,
        body,
        imageUrl,
        thumbnailUrl,
        isVideo,
        callToAction: cta,
        linkUrl,
        creativeId: cr.id || null,
        spend,
        impressions,
        clicks,
        leads,
      };
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        budget: campaign.budget,
        spent: campaign.spent,
        conversions: campaign.conversions,
      },
      ads,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener anuncios de la campaña.";
    console.error("GET /api/campaigns/[id]/ads error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
