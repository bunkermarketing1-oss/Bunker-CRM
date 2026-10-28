import React from "react";

export type SocialAccountType =
  | "facebook_page"
  | "facebook"
  | "instagram_business"
  | "instagram"
  | "meta_ad_account"
  | "meta"
  | "tiktok_advertiser"
  | "tiktok"
  | "google"
  | "google_ads"
  | string;

interface SocialNetworkIconProps {
  type?: SocialAccountType;
  provider?: SocialAccountType;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  xs: {
    container: "w-5 h-5 rounded-md",
    icon: "w-3 h-3",
  },
  sm: {
    container: "w-7 h-7 rounded-lg",
    icon: "w-4 h-4",
  },
  md: {
    container: "w-9 h-9 rounded-xl",
    icon: "w-5 h-5",
  },
  lg: {
    container: "w-11 h-11 rounded-2xl",
    icon: "w-6 h-6",
  },
};

export function SocialNetworkIcon({
  type,
  provider,
  size = "md",
  className = "",
}: SocialNetworkIconProps) {
  const norm = (type || provider || "").toLowerCase();
  const currentSize = SIZE_MAP[size] || SIZE_MAP.md;

  // 1. Facebook Page / Facebook
  if (norm === "facebook_page" || norm.includes("facebook")) {
    return (
      <div
        className={`${currentSize.container} bg-[#1877F2] text-white flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
        title="Facebook"
        aria-label="Facebook"
      >
        <svg viewBox="0 0 24 24" className={`${currentSize.icon} fill-current`} aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </div>
    );
  }

  // 2. Instagram Profile / Instagram Business
  if (norm === "instagram_business" || norm.includes("instagram")) {
    return (
      <div
        className={`${currentSize.container} bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
        title="Instagram"
        aria-label="Instagram"
      >
        <svg viewBox="0 0 24 24" className={`${currentSize.icon} fill-current`} aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </div>
    );
  }

  // 3. Meta Ads / Meta Ad Account
  if (norm === "meta_ad_account" || norm === "meta" || norm.includes("meta") || norm.includes("ad_account")) {
    return (
      <div
        className={`${currentSize.container} bg-gradient-to-br from-[#0081FB] to-[#0668E1] text-white flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
        title="Meta Ads"
        aria-label="Meta Ads"
      >
        <svg viewBox="0 0 24 24" className={`${currentSize.icon} fill-current`} aria-hidden="true">
          <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" />
        </svg>
      </div>
    );
  }

  // 4. TikTok Ads / TikTok Advertiser
  if (norm === "tiktok_advertiser" || norm.includes("tiktok")) {
    return (
      <div
        className={`${currentSize.container} bg-black text-white flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
        title="TikTok"
        aria-label="TikTok"
      >
        <svg viewBox="0 0 24 24" className={`${currentSize.icon} fill-current`} aria-hidden="true">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      </div>
    );
  }

  // 5. Google / Google Ads
  if (norm.includes("google")) {
    return (
      <div
        className={`${currentSize.container} bg-white border border-[#E8E6DF] text-[#1F1E1D] flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
        title="Google Ads"
        aria-label="Google Ads"
      >
        <svg viewBox="0 0 24 24" className={`${currentSize.icon}`} aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      </div>
    );
  }

  // 6. WhatsApp
  if (norm.includes("whatsapp")) {
    return (
      <div
        className={`${currentSize.container} bg-[#25D366] text-white flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
        title="WhatsApp"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" className={`${currentSize.icon} fill-current`} aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </div>
    );
  }

  // 7. Twilio SMS
  if (norm.includes("sms")) {
    return (
      <div
        className={`${currentSize.container} bg-[#7C3AED] text-white flex items-center justify-center shadow-xs flex-shrink-0 ${className}`}
        title="Twilio SMS"
        aria-label="SMS"
      >
        <svg viewBox="0 0 24 24" className={`${currentSize.icon} fill-current`} aria-hidden="true">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z" />
        </svg>
      </div>
    );
  }

  // Fallback
  return (
    <div
      className={`${currentSize.container} bg-[#1F1E1D] text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0 ${className}`}
    >
      {((type || provider) || "BM").substring(0, 2).toUpperCase()}
    </div>
  );
}

export default SocialNetworkIcon;
