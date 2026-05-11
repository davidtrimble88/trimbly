import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Printer } from "lucide-react";

interface Props {
  providerSlug: string | null;
  providerId: string;
  businessName: string;
  category: string;
  city: string;
  state: string;
}

const YardSignQRPanel = ({ providerSlug, providerId, businessName, category, city, state }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const profileUrl = `${window.location.origin}${providerSlug ? `/pros/${providerSlug}` : `/pro/${providerId}`}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, profileUrl, { width: 360, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
    QRCode.toDataURL(profileUrl, { width: 720, margin: 1 }).then(setDataUrl);
  }, [profileUrl]);

  const downloadPNG = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  const printSign = () => {
    const w = window.open("", "_blank", "width=816,height=1056");
    if (!w) return;
    w.document.write(`
      <html><head><title>${businessName} – Yard Sign</title>
      <style>
        @page { size: letter; margin: 0.5in; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; margin: 0; padding: 40px; text-align: center; color: #0f172a; }
        .sign { border: 6px solid #3da06e; border-radius: 20px; padding: 40px 32px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 42px; margin: 0 0 8px; font-weight: 800; }
        .tag { color: #3da06e; font-weight: 700; font-size: 22px; margin-bottom: 4px; }
        .loc { color: #64748b; font-size: 18px; margin-bottom: 24px; }
        img { width: 320px; height: 320px; }
        .cta { font-size: 20px; margin-top: 18px; font-weight: 700; }
        .footer { margin-top: 18px; color: #64748b; font-size: 14px; }
      </style></head>
      <body>
        <div class="sign">
          <div class="tag">${category}</div>
          <h1>${businessName}</h1>
          <div class="loc">${city}, ${state}</div>
          <img src="${dataUrl}" alt="QR code" />
          <div class="cta">Scan to view reviews &amp; book</div>
          <div class="footer">${profileUrl.replace(/^https?:\/\//, "")}</div>
        </div>
        <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="text-primary" size={20} />
          <h2 className="font-bold text-lg text-foreground">Yard Sign QR Code</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Print this sign and stake it at every job site. Homeowners scan to see your reviews and book you directly — your most powerful free advertising.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="bg-white p-3 rounded-lg border border-border shrink-0">
            <canvas ref={canvasRef} className="block" />
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Links to</div>
            <code className="text-xs bg-muted px-2 py-1 rounded break-all block mb-4">{profileUrl}</code>
            <div className="flex flex-wrap gap-2">
              <Button onClick={printSign} className="gap-1.5"><Printer size={14} /> Print Yard Sign</Button>
              <Button variant="outline" onClick={downloadPNG} className="gap-1.5"><Download size={14} /> Download QR</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YardSignQRPanel;
