import type { NextConfig } from "next";

const nextConfig:NextConfig={
  async headers(){
    return [{
      source:"/:path*",
      headers:[
        {key:"Content-Security-Policy",value:"frame-src https://*.bale.ai; frame-ancestors https://*.bale.ai https://ble.ir"},
        {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      ],
    }];
  },
};

export default nextConfig;
