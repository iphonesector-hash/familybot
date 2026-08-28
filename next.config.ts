import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://tapi.bale.ai",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://*.bale.ai https://www.openstreetmap.org",
  "frame-ancestors https://*.bale.ai https://ble.ir",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig:NextConfig={
  async headers(){
    return [{
      source:"/:path*",
      headers:[
        {key:"Content-Security-Policy",value:csp},
        {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
        {key:"X-Content-Type-Options",value:"nosniff"},
        {key:"Permissions-Policy",value:"camera=(), geolocation=(self), microphone=(self), payment=(), usb=()"},
        {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"},
      ],
    }];
  },
};

export default nextConfig;
