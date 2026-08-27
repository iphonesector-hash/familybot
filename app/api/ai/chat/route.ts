import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(20).default([]),
});

const SYSTEM = `تو Family AI هستی؛ دستیار هوشمند، گرم، خوش‌برخورد و قابل اعتماد «خانواده بزرگ جهانی».\n
فارسی روان و دوستانه حرف بزن. پاسخ‌ها کوتاه و کاربردی باشند مگر کاربر توضیح بیشتر بخواهد.\n
در زمینه برنامه‌ریزی خانوادگی، سرگرمی، بازی، یادآوری، تولد، خاطره‌سازی، تقسیم کار و اطلاعات عمومی کمک کن.\n
هیچ داده خصوصی را حدس نزن. هر عملی که داده Family Bot را تغییر می‌دهد باید در آینده از طریق ابزارهای امن سرور انجام شود و صرفاً با متن ادعا نکن که انجام شده است.`;

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const base = process.env.AI_BASE_URL?.replace(/\/$/, "");
    const key = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;

    if (!base || !key || !model) {
      return NextResponse.json({
        reply: "من آماده‌ام 💜 فعلاً کلید مدل هوش مصنوعی روی سرور تنظیم نشده؛ بعد از تنظیم AI_API_KEY و AI_MODEL گفت‌وگوی واقعی فعال می‌شود.",
        demo: true,
      });
    }

    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM },
          ...body.history,
          { role: "user", content: body.message },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error("AI provider returned an empty response");

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
