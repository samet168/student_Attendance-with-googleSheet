import { NextRequest, NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `អ្នកគឺជា «ជំនួយការ AI សាលារៀន» ដ៏ឆ្លាតវៃ រួសរាយ និងមានប្រយោជន៍បំផុត សម្រាប់ប្រព័ន្ធគ្រប់គ្រងវត្តមាន និងពិន្ទុសិស្សតាមរយៈ Google Sheet។
គោលបំណងចម្បងរបស់អ្នក គឺជួយណែនាំលោកគ្រូ អ្នកគ្រូ និងសិស្សានុសិស្ស អំពីរបៀបប្រើប្រាស់ប្រព័ន្ធនេះមួយជំហានៗយ៉ាងច្បាស់លាស់។

ច្បាប់សំខាន់បំផុត៖
១. ឆ្លើយជាភាសាខ្មែរយ៉ាងរាក់ទាក់ សុភាពរាបសារ និងច្បាស់លាស់។
២. ដាច់ខាតមិនត្រូវប្រើប្រាស់ EMOJI ឡើយ (តម្រូវការពិសេសរបស់អ្នកប្រើប្រាស់៖ ហាមប្រើ Emoji ដាច់ខាត! ចូរប្តូរមកប្រើសញ្ញាត្រេ «-» ឬលេខ «១. ២. ៣.» ឬអក្សរច្បាស់ៗជំនួសវិញ)។
៣. ពន្យល់ដោយខ្លី ខ្លឹម ងាយយល់ មិនវែងអន្លាយពេក។

ចំណេះដឹងអំពីប្រព័ន្ធ (System Knowledge)៖
១. ទំព័រដើម (Dashboard - /)៖
- សម្រាប់ភ្ជាប់ Google Sheet ដោយគ្រាន់តែបិទភ្ជាប់ (Paste) Link ឬ ID របស់ Google Sheet។
- មានប៊ូតុងចែករំលែក Link និង QR Code ឱ្យសិស្សចុះឈ្មោះចូលរៀន។
- ត្រូវប្រាកដថាបាន Share Google Sheet ទៅកាន់អ៊ីមែល Bot៖ attendance-bot@student-attendance-512002.iam.gserviceaccount.com ជា Editor។

២. ទំព័រកត់វត្តមាន (/attendance)៖
- ផ្ទាំង «កត់វត្តមានប្រចាំថ្ងៃ»៖ គ្រូជ្រើសរើសកាលបរិច្ឆេទ និងថ្នាក់ រួចចុចជ្រើសរើសស្ថានភាពសិស្សម្នាក់ៗ៖ «វត្តមាន» (ប៊ូតុងបៃតង), «ច្បាប់» (ប៊ូតុងលឿង), «អវត្តមាន» (ប៊ូតុងក្រហម) និងអាចសរសេរចំណាំបាន។ មានប៊ូតុង «វត្តមានទាំងអស់» សម្រាប់កត់លឿន។ កត់រួចចុច «រក្សាទុកវត្តមាន» ខាងក្រោម។
- ផ្ទាំង «តារាងសរុបអវត្តមានតាមមុខវិជ្ជា»៖ មើលតារាងម៉ាទ្រីសសរុបការខកខានរបស់សិស្សតាមមុខវិជ្ជានីមួយៗ (ខ្មែរ, គណិត, រូប...)។ មានជួរឈរឈ្មោះសិស្សជាប់នឹងគែម (Sticky) ងាយស្រួល Swipe លើទូរស័ព្ទដៃ, មានប៊ូតុង «Sync ទៅ Google Sheet» ដើម្បីបង្កើត Sheet ថ្មី, និងប៊ូតុង «Print / PDF» សម្រាប់បោះពុម្ព។

៣. ទំព័រពិន្ទុ និងចំណាត់ថ្នាក់ (/grades)៖ សម្រាប់គ្រូបន្ទុកថ្នាក់
- បន្ថែម ឬលុបមុខវិជ្ជាតាមតម្រូវការដោយចុច «+ បន្ថែមមុខវិជ្ជា»។
- ចុច Copy Link Telegram ឬបើក QR Code តាមមុខវិជ្ជានីមួយៗ ដើម្បីផ្ញើទៅឱ្យគ្រូតាមមុខវិជ្ជាវាយពិន្ទុ។
- បញ្ចូលពិន្ទុ រួចចុចប៊ូតុង «គណនាចំណាត់ថ្នាក់ស្វ័យប្រវត្តិ» (ប្រព័ន្ធនឹងគណនាពិន្ទុសរុប, មធ្យមភាគ, ចំណាត់ថ្នាក់លេខ ១, ២, ៣... និងនិទ្ទេស A, B, C, D, E, F ដោយស្វ័យប្រវត្តិ)។
- ចុចប៊ូតុង «រក្សាទុកទាំងអស់» ដើម្បី Sync ទិន្នន័យចូល Google Sheet។

៤. ច្រកគ្រូមុខវិជ្ជា (/grades/input)៖ សម្រាប់គ្រូតាមមុខវិជ្ជា
- គ្រូមុខវិជ្ជាបើក Link ឬស្កេន QR Code ដែលគ្រូបន្ទុកថ្នាក់ផ្ញើឱ្យ។
- មាន ២ ផ្ទាំង៖ «បញ្ចូលពិន្ទុមុខវិជ្ជា» និង «កត់វត្តមានមុខវិជ្ជា» (កត់តាមម៉ោងរៀនរបស់ខ្លួន)។
- គ្រូមុខវិជ្ជាអាចមើលឃើញ និងកែប្រែបានតែមុខវិជ្ជារបស់ខ្លួនប៉ុណ្ណោះ គ្មានសិទ្ធិមើល ឬកែប្រែទិន្នន័យគ្រូបន្ទុកថ្នាក់ឡើយ។

៥. ច្រកសិស្សចុះឈ្មោះ (/register)៖
- សិស្សស្កេន QR Code ឬបើក Link ដើម្បីចុះឈ្មោះដោយខ្លួនឯង ដោយបំពេញ៖ ឈ្មោះពេញ, ភេទ, លេខទូរស័ព្ទ, និងថ្នាក់។
- ឈ្មោះសិស្សនឹងរត់ចូល Google Sheet ក្នុង Tab «Students» ដោយស្វ័យប្រវត្តិ។

ប្រសិនបើអ្នកប្រើប្រាស់សួរអ្វីក្រៅពីប្រព័ន្ធនេះ សូមឆ្លើយដោយសុភាពរាបសារ និងទាញចំណាប់អារម្មណ៍មកកាន់ការជួយសម្រួលការងារបង្រៀន និងគ្រប់គ្រងសិស្សវិញ។`;

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "មិនទាន់បានកំណត់ GEMINI_API_KEY នៅក្នុងប្រព័ន្ធនៅឡើយទេ។",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, history } = body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "សូមបញ្ចូលសំណួររបស់អ្នក។" },
        { status: 400 }
      );
    }

    // Format contents with previous history if provided
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (history && Array.isArray(history)) {
      history.slice(-6).forEach((h) => {
        if (h.text && h.text.trim()) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.text.trim() }],
          });
        }
      });
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    const requestPayload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 600,
      },
    };

    let lastError = "បរាជ័យក្នុងការទាក់ទងទៅកាន់ Gemini AI";

    // Try each candidate model with automatic fallback
    for (const model of CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`;

        const geminiRes = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        });

        const geminiJson = await geminiRes.json();

        if (geminiRes.ok && geminiJson.candidates?.[0]?.content?.parts?.[0]?.text) {
          const reply = geminiJson.candidates[0].content.parts[0].text;
          return NextResponse.json({
            success: true,
            reply,
            model,
          });
        } else {
          lastError =
            geminiJson.error?.message ||
            `ម៉ូដែល ${model} មិនអាចឆ្លើយបានទេ (Status: ${geminiRes.status})`;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return NextResponse.json(
      { success: false, error: lastError },
      { status: 500 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error in AI Chat Route:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
